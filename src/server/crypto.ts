/**
 * Security primitives, built on node:crypto only.
 *  - Passwords: scrypt (N=2^17, r=8, p=1), with a per-password random salt.
 *  - Session tokens: 32 random bytes; only their SHA-256 is stored.
 *  - Financial data: AES-256-GCM with versioned keys, bound to the owning user via AAD.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";

const scrypt = (pw: string, salt: Buffer, len: number, opts: ScryptOptions) =>
  new Promise<Buffer>((res, rej) => scryptCb(pw, salt, len, opts, (err, key) => (err ? rej(err) : res(key))));

const SCRYPT = { N: 2 ** 17, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
const KEYLEN = 32;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password.normalize("NFKC"), salt, KEYLEN, SCRYPT);
  return ["scrypt", SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString("base64"), hash.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, saltB64, hashB64] = parts;
  const expected = Buffer.from(hashB64, "base64");
  const actual = await scrypt(password.normalize("NFKC"), Buffer.from(saltB64, "base64"), expected.length, {
    N: Number(n), r: Number(r), p: Number(p), maxmem: SCRYPT.maxmem,
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** A real hash of a random password, used to equalise timing when an email isn't registered. */
let dummyHash: Promise<string> | null = null;
export const getDummyHash = () => (dummyHash ??= hashPassword(randomBytes(16).toString("hex")));

export const newSessionToken = () => randomBytes(32).toString("base64url");
export const hashToken = (token: string) => createHash("sha256").update(token).digest();

// ---- Data encryption -------------------------------------------------------

export interface Keyring {
  current: number;
  keys: Map<number, Buffer>;
}

/** Parses "1:<base64 32 bytes>,2:<base64 32 bytes>". The highest version encrypts new data. */
export function parseKeyring(spec: string | undefined): Keyring {
  if (!spec) throw new Error("WP_DATA_KEYS is not set");
  const keys = new Map<number, Buffer>();
  for (const entry of spec.split(",").map((s) => s.trim()).filter(Boolean)) {
    const idx = entry.indexOf(":");
    const version = Number(entry.slice(0, idx));
    const key = Buffer.from(entry.slice(idx + 1), "base64");
    if (!Number.isInteger(version) || version < 1) throw new Error("WP_DATA_KEYS: invalid key version");
    if (key.length !== 32) throw new Error(`WP_DATA_KEYS: key ${version} must be 32 bytes (base64)`);
    keys.set(version, key);
  }
  if (!keys.size) throw new Error("WP_DATA_KEYS has no keys");
  return { current: Math.max(...keys.keys()), keys };
}

export interface Sealed {
  keyVersion: number;
  iv: Buffer;
  authTag: Buffer;
  ciphertext: Buffer;
}

const aad = (userId: string) => Buffer.from(`wealth-pilot:financial_data:${userId}`);

export function seal(plaintext: string, userId: string, ring: Keyring): Sealed {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", ring.keys.get(ring.current)!, iv);
  cipher.setAAD(aad(userId));
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return { keyVersion: ring.current, iv, authTag: cipher.getAuthTag(), ciphertext };
}

export function open(s: Sealed, userId: string, ring: Keyring): string {
  const key = ring.keys.get(s.keyVersion);
  if (!key) throw new Error(`No data key for version ${s.keyVersion}`);
  const decipher = createDecipheriv("aes-256-gcm", key, s.iv);
  decipher.setAAD(aad(userId));
  decipher.setAuthTag(s.authTag);
  return Buffer.concat([decipher.update(s.ciphertext), decipher.final()]).toString("utf8");
}
