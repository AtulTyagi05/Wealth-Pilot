import { NextResponse } from "next/server";
import { assertSameOrigin, clearSessionCookie, destroySession, errorResponse, getSessionUser } from "@/server/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const user = await getSessionUser(req);
    if (user) await destroySession(user.sessionId);
    const res = NextResponse.json({ ok: true });
    clearSessionCookie(res);
    return res;
  } catch (e) {
    return errorResponse(e);
  }
}
