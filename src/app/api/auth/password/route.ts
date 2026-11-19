import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, changePassword, errorResponse, HttpError, readJson, requireUser } from "@/server/auth";
import { rateLimit } from "@/server/rateLimit";
import { newPasswordSchema } from "@/lib/stateSchema";

export const runtime = "nodejs";

const bodySchema = z.object({ current: z.string().max(128), next: z.string().max(128) });

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const user = await requireUser(req);
    if (!rateLimit(`pw:${user.id}`, 5, 15 * 60_000)) throw new HttpError(429, "rate_limited", "Too many attempts. Try again later.");
    const body = bodySchema.safeParse(await readJson(req));
    if (!body.success) throw new HttpError(400, "invalid_input", "Invalid input.");
    const pw = newPasswordSchema.safeParse(body.data.next);
    if (!pw.success) throw new HttpError(400, "weak_password", pw.error.issues[0]?.message ?? "Choose a stronger password.");
    if (body.data.current === body.data.next) throw new HttpError(400, "same_password", "Choose a password you haven't used here.");
    await changePassword(user.id, body.data.current, body.data.next, user.sessionId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
