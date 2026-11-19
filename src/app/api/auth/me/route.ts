import { NextResponse } from "next/server";
import { errorResponse, getSessionUser } from "@/server/auth";
import { isDbConfigured } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Who is logged in. `accounts: false` means the server has no database, so the app runs device-only. */
export async function GET(req: Request) {
  try {
    if (!isDbConfigured()) return NextResponse.json({ accounts: false, user: null });
    const user = await getSessionUser(req);
    return NextResponse.json({ accounts: true, user: user ? { id: user.id, email: user.email } : null }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return errorResponse(e);
  }
}
