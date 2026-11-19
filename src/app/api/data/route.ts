import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, errorResponse, HttpError, readJson, requireUser } from "@/server/auth";
import { loadData, saveData } from "@/server/financialData";
import { rateLimit } from "@/server/rateLimit";
import { syncedStateSchema } from "@/lib/stateSchema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "cache-control": "no-store" };

/** The signed-in user's decrypted planning data. `version: 0` means nothing saved yet. */
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const stored = await loadData(user.id);
    return NextResponse.json(stored ?? { version: 0, updatedAt: null, data: null }, { headers: noStore });
  } catch (e) {
    return errorResponse(e);
  }
}

const putSchema = z.object({ baseVersion: z.number().int().min(0), data: syncedStateSchema });

export async function PUT(req: Request) {
  try {
    assertSameOrigin(req);
    const user = await requireUser(req);
    if (!rateLimit(`data:${user.id}`, 120, 60_000)) throw new HttpError(429, "rate_limited", "Saving too often. Please slow down.");
    const body = putSchema.safeParse(await readJson(req));
    if (!body.success) throw new HttpError(400, "invalid_data", "Some of your data is invalid and couldn't be saved.");
    const version = await saveData(user.id, body.data.data, body.data.baseVersion);
    if (version === null) {
      // Another device saved first: return the latest copy so the client can adopt it.
      const latest = await loadData(user.id);
      return NextResponse.json({ error: { code: "conflict", message: "Your data was updated on another device." }, latest }, { status: 409, headers: noStore });
    }
    return NextResponse.json({ version }, { headers: noStore });
  } catch (e) {
    return errorResponse(e);
  }
}
