import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, clearSessionCookie, deleteUser, errorResponse, HttpError, readJson, requireUser } from "@/server/auth";
import { rateLimit } from "@/server/rateLimit";

export const runtime = "nodejs";

/** Permanently deletes the account and all its data. Requires the password. */
export async function DELETE(req: Request) {
  try {
    assertSameOrigin(req);
    const user = await requireUser(req);
    if (!rateLimit(`delete:${user.id}`, 5, 15 * 60_000)) throw new HttpError(429, "rate_limited", "Too many attempts. Try again later.");
    const body = z.object({ password: z.string().max(128) }).safeParse(await readJson(req));
    if (!body.success) throw new HttpError(400, "invalid_input", "Enter your password.");
    await deleteUser(user.id, body.data.password);
    const res = NextResponse.json({ ok: true });
    clearSessionCookie(res);
    return res;
  } catch (e) {
    return errorResponse(e);
  }
}
