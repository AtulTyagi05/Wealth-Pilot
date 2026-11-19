import { NextResponse } from "next/server";
import { assertSameOrigin, authenticate, createSession, errorResponse, HttpError, normaliseEmail, readJson } from "@/server/auth";
import { clientIp, rateLimit } from "@/server/rateLimit";
import { credentialsSchema } from "@/lib/stateSchema";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const body = credentialsSchema.safeParse(await readJson(req));
    if (!body.success) throw new HttpError(400, "invalid_input", "Enter your email and password.");
    // Limit guesses per network and per account.
    const ipOk = rateLimit(`login-ip:${clientIp(req)}`, 30, 15 * 60_000);
    const acctOk = rateLimit(`login-acct:${normaliseEmail(body.data.email)}`, 10, 15 * 60_000);
    if (!ipOk || !acctOk) throw new HttpError(429, "rate_limited", "Too many login attempts. Please wait 15 minutes and try again.");

    const user = await authenticate(body.data.email, body.data.password);
    if (!user) throw new HttpError(401, "invalid_credentials", "Incorrect email or password.");
    const res = NextResponse.json({ user });
    await createSession(res, user.id, req.headers.get("user-agent"));
    return res;
  } catch (e) {
    return errorResponse(e);
  }
}
