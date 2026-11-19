"use client";
import type { AssistantEvent } from "./schema";
import type { Assumptions, ExpenseCategory, Profile } from "../types";

export class AssistantUnavailable extends Error {}

const TOOL_LABELS: Record<string, string> = {
  project_sip: "Projecting your SIP",
  retirement_plan: "Calculating your retirement plan",
  salary_plan: "Working out your salary split",
  investment_allocation: "Building an investment mix",
};
export const toolLabel = (name: string) => TOOL_LABELS[name] ?? "Calculating";

/**
 * Streams an answer from /api/assistant. Throws AssistantUnavailable when the server has no
 * LLM configured (or can't be reached) so the caller can fall back to the local engine.
 */
export async function askRemote(opts: {
  history: { role: "user" | "assistant"; text: string }[];
  profile: Profile;
  expenses: ExpenseCategory[];
  assumptions: Assumptions;
  onText: (delta: string) => void;
  onTool: (name: string) => void;
  signal?: AbortSignal;
}): Promise<void> {
  // The user's name is not needed for planning, so it never leaves the device.
  const { name: _name, ...profile } = opts.profile;
  void _name;
  let res: Response;
  try {
    res = await fetch("/api/assistant", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: opts.history.slice(-20), profile, expenses: opts.expenses, assumptions: opts.assumptions }),
      signal: opts.signal,
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new AssistantUnavailable("network");
  }
  if (res.status === 503 || res.status === 404) throw new AssistantUnavailable("not_configured");
  if (res.status === 401) throw new AssistantUnavailable("unauthenticated");
  if (!res.body) throw new Error("Empty response");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let gotText = false;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      const ev = JSON.parse(line) as AssistantEvent;
      if (ev.type === "text") { gotText = true; opts.onText(ev.delta); }
      else if (ev.type === "tool") opts.onTool(ev.name);
      else if (ev.type === "error") {
        if (ev.code === "not_configured") throw new AssistantUnavailable("not_configured");
        if (gotText) opts.onText(`\n\n_${ev.message}_`);
        else throw new Error(ev.message);
      }
    }
  }
}
