import Anthropic from "@anthropic-ai/sdk";
import { assistantRequestSchema, type AssistantEvent } from "@/lib/assistant/schema";
import { SYSTEM_PROMPT, snapshotBlock } from "@/lib/assistant/llm/prompt";
import { buildTools } from "@/lib/assistant/llm/tools";
import { clientIp, rateLimit } from "@/server/rateLimit";
import { getSessionUser } from "@/server/auth";
import { isDbConfigured } from "@/server/db";
import { computeOverview } from "@/lib/finance/overview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = process.env.WP_ASSISTANT_MODEL || "claude-opus-5-5";
const EFFORT = (process.env.WP_ASSISTANT_EFFORT as "low" | "medium" | "high" | undefined) || "medium";
const MAX_BODY_BYTES = 64 * 1024;

const hasCredentials = () => Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

function json(event: AssistantEvent, status: number) {
  return new Response(JSON.stringify(event) + "\n", { status, headers: { "content-type": "application/x-ndjson" } });
}

export async function POST(req: Request) {
  if (!hasCredentials()) return json({ type: "error", code: "not_configured", message: "The AI assistant is not configured on this server." }, 503);

  // With accounts enabled, only signed-in users may use the (paid) model; limits are per user.
  let limitKey = `ip:${clientIp(req)}`;
  if (isDbConfigured()) {
    const user = await getSessionUser(req);
    if (!user) return json({ type: "error", code: "unauthenticated", message: "Log in to use the AI assistant." }, 401);
    limitKey = `user:${user.id}`;
  }
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== (req.headers.get("x-forwarded-host") ?? req.headers.get("host"))) {
    return json({ type: "error", code: "invalid_request", message: "Cross-site request blocked." }, 403);
  }
  if (!rateLimit(`assistant:${limitKey}`)) return json({ type: "error", code: "rate_limited", message: "Too many questions in a short time. Please wait a few minutes." }, 429);

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return json({ type: "error", code: "invalid_request", message: "Request too large." }, 413);
  let parsed;
  try {
    parsed = assistantRequestSchema.safeParse(JSON.parse(raw));
  } catch {
    return json({ type: "error", code: "invalid_request", message: "Invalid JSON." }, 400);
  }
  if (!parsed.success) return json({ type: "error", code: "invalid_request", message: "Invalid request." }, 400);
  const body = parsed.data;
  if (body.messages[body.messages.length - 1].role !== "user") return json({ type: "error", code: "invalid_request", message: "Last message must be from the user." }, 400);

  // Recompute every figure server-side from validated inputs — the model only sees trusted numbers.
  const overview = computeOverview({ ...body.profile, name: "" }, body.expenses, body.assumptions);
  const client = new Anthropic({ maxRetries: 2, timeout: 120_000 });

  const messages: Anthropic.Beta.BetaMessageParam[] = body.messages.map((m) => ({ role: m.role, content: m.text }));
  // History must start with a user turn.
  while (messages.length && messages[0].role !== "user") messages.shift();

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (e: AssistantEvent) => controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
      let runner = client.beta.messages.toolRunner({
        model: MODEL,
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: EFFORT },
        // Send the full history each turn instead of a server-side message thread, so no
        // conversation state about the user's finances is held between requests.
        thread: false,
        max_iterations: 6,
        system: [
          { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
          { type: "text", text: snapshotBlock(body, overview) },
        ],
        tools: buildTools(body, overview),
        messages,
        stream: true,
      });

      let sentText = false;
      try {
        for (let attempt = 0; ; attempt++) {
          try {
            for await (const messageStream of runner) {
              let turnHasText = false;
              for await (const event of messageStream) {
                if (event.type === "content_block_start" && event.content_block.type === "tool_use") {
                  send({ type: "tool", name: event.content_block.name });
                } else if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
                  // Separate text written before and after a tool call with a paragraph break.
                  if (!turnHasText && sentText) send({ type: "text", delta: "\n\n" });
                  turnHasText = sentText = true;
                  send({ type: "text", delta: event.delta.text });
                }
              }
              const message = await messageStream.finalMessage();
              attempt = 0;
              const hasToolUse = message.content.some((b) => b.type === "tool_use");
              if (message.stop_reason === "max_tokens" && hasToolUse) throw new Error("tool input truncated");
              if (message.stop_reason === "refusal") {
                send({ type: "error", code: "refused", message: "I can't help with that one. Try asking about your savings, investments or retirement." });
                return;
              }
            }
            break;
          } catch (err) {
            // Re-issue only for unparseable tool input or a dropped connection; API errors propagate.
            if (err instanceof Anthropic.APIError || attempt >= 2) throw err;
            runner = client.beta.messages.toolRunner({ ...runner.params });
          }
        }
        send({ type: "done" });
      } catch (err) {
        // Never echo upstream error bodies or user data to logs or the client.
        const status = err instanceof Anthropic.APIError ? err.status : undefined;
        console.error("assistant upstream error", status ?? (err as Error).name);
        const message =
          err instanceof Anthropic.RateLimitError ? "The assistant is busy right now. Please try again in a minute."
          : err instanceof Anthropic.AuthenticationError ? "The assistant's API credentials are invalid."
          : "The assistant couldn't answer right now. Please try again.";
        send({ type: "error", code: "upstream", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" } });
}
