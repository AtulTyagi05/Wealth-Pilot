import { NextResponse } from "next/server";
import { assertSameOrigin, createSession, createUser, errorResponse, HttpError, readJson } from "@/server/auth";
import { clientIp, rateLimit } from "@/server/rateLimit";
import { credentialsSchema, newPasswordSchema } from "@/lib/stateSchema";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    if (!rateLimit(`register:${clientIp(req)}`, 5, 60 * 60_000)) throw new HttpError(429, "rate_limited", "Too many sign-ups from this network. Try again later.");
    const body = credentialsSchema.safeParse(await readJson(req));
    if (!body.success) throw new HttpError(400, "invalid_input", body.error.issues[0]?.message ?? "Invalid input.");
    const pw = newPasswordSchema.safeParse(body.data.password);
    if (!pw.success) throw new HttpError(400, "weak_password", pw.error.issues[0]?.message ?? "Choose a stronger password.");

    const user = await createUser(body.data.email, body.data.password);
    if (!user) throw new HttpError(409, "email_taken", "An account with this email already exists. Try logging in.");
    const res = NextResponse.json({ user: { id: user.id, email: user.email } }, { status: 201 });
    await createSession(res, user.id, req.headers.get("user-agent"));
    return res;
  } catch (e) {
    return errorResponse(e);
  }
}
