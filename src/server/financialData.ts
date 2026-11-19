import "server-only";
import { db } from "./db";
import { open, parseKeyring, seal, type Keyring } from "./crypto";
import { syncedStateSchema, type SyncedState } from "@/lib/stateSchema";

let ring: Keyring | null = null;
const keyring = () => (ring ??= parseKeyring(process.env.WP_DATA_KEYS));

export interface StoredData {
  version: number;
  updatedAt: string;
  data: SyncedState;
}

export async function loadData(userId: string): Promise<StoredData | null> {
  const { rows } = await db().query<{ version: number; key_version: number; iv: Buffer; auth_tag: Buffer; ciphertext: Buffer; updated_at: Date }>(
    "select version, key_version, iv, auth_tag, ciphertext, updated_at from financial_data where user_id = $1",
    [userId],
  );
  const r = rows[0];
  if (!r) return null;
  const json = open({ keyVersion: r.key_version, iv: r.iv, authTag: r.auth_tag, ciphertext: r.ciphertext }, userId, keyring());
  return { version: r.version, updatedAt: r.updated_at.toISOString(), data: syncedStateSchema.parse(JSON.parse(json)) };
}

/**
 * Saves with optimistic concurrency. `baseVersion` is the version the client last saw
 * (0 = no data yet). Returns the new version, or null if another device saved first.
 */
export async function saveData(userId: string, data: SyncedState, baseVersion: number): Promise<number | null> {
  const s = seal(JSON.stringify(data), userId, keyring());
  if (baseVersion === 0) {
    const { rows } = await db().query<{ version: number }>(
      `insert into financial_data(user_id, version, key_version, iv, auth_tag, ciphertext)
       values ($1, 1, $2, $3, $4, $5) on conflict (user_id) do nothing returning version`,
      [userId, s.keyVersion, s.iv, s.authTag, s.ciphertext],
    );
    return rows[0]?.version ?? null;
  }
  const { rows } = await db().query<{ version: number }>(
    `update financial_data set version = version + 1, key_version = $3, iv = $4, auth_tag = $5, ciphertext = $6, updated_at = now()
      where user_id = $1 and version = $2 returning version`,
    [userId, baseVersion, s.keyVersion, s.iv, s.authTag, s.ciphertext],
  );
  return rows[0]?.version ?? null;
}
