import { NextResponse } from "next/server";
import { errorResponse, requireUser } from "@/server/auth";
import { loadData } from "@/server/financialData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Downloads everything stored for the account as JSON (data portability). */
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const stored = await loadData(user.id);
    const body = JSON.stringify({ exportedAt: new Date().toISOString(), account: { email: user.email }, ...stored }, null, 2);
    return new NextResponse(body, {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="wealth-pilot-export-${new Date().toISOString().slice(0, 10)}.json"`,
        "cache-control": "no-store",
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
