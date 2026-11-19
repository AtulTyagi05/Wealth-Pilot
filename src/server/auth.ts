import "server-only";
import { NextResponse } from "next/server";
import { db } from "./db";
import { getDummyHash, hashPassword, hashToken, newSessionToken, verifyPassword } from "./crypto";

const PROD = process.env.NODE_ENV === "production";
/** __Host- prefix: cookie is Secure, host-only and path=/ — it can't be set by subdomains or over HTTP. */
export const SESSION_COOKIE = PROD ? "__Host-wp_session" : "wp_session";
const SESSION_DAYS = 30;
const TOUCH_AFTER_MS = 60 * 60 * 1000;

export interface SessionUser {
  id: string;
  email: string;
  sessionId: string;
}

export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export const errorResponse = (e: unknown) => {
  if (e instanceof HttpError) return NextResponse.json({ error: { code: e.code, message: e.message } }, { status: e.status });
  console.error("server error", (e as Error)?.name, (e as Error)?.message);
  return NextResponse.json({ error: { code: "server_error", message: "Something went wrong. Please try again." } }, { status: 500 });
};

// ---- Request helpers ---------------------------------------------------------

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

/**
 * CSRF defence for cookie-authenticated state changes: the browser's Origin header must match
 * this server. Combined with SameSite=Lax cookies and JSON-only bodies.
 */
export function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!origin || !host) throw new HttpError(403, "bad_origin", "Request origin could not be verified.");
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new HttpError(403, "bad_origin", "Request origin could not be verified.");
  }
  if (originHost !== host) throw new HttpError(403, "bad_origin", "Cross-site request blocked.");
}

export async function readJson<T>(req: Request, maxBytes = 256 * 1024): Promise<T> {
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) throw new HttpError(415, "unsupported_media_type", "Expected JSON.");
  const raw = await req.text();
  if (raw.length > maxBytes) throw new HttpError(413, "too_large", "Request too large.");
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new HttpError(400, "invalid_json", "Invalid JSON.");
  }
}

// ---- Users -------------------------------------------------------------------

export const normaliseEmail = (e: string) => e.trim().toLowerCase();

export async function createUser(email: string, password: string) {
  const hash = await hashPassword(password);
  try {
    const { rows } = await db().query<{ id: string; email: string }>(
      "insert into users(email, password_hash) values ($1, $2) returning id, email",
      [normaliseEmail(email), hash],
    );
    return rows[0];
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return null; // email already registered
    throw e;
  }
}

/** Returns the user when the password matches. Always spends one scrypt verification, so timing doesn't reveal whether an email exists. */
export async function authenticate(email: string, password: string) {
  const { rows } = await db().query<{ id: string; email: string; password_hash: string }>(
    "select id, email, password_hash from users where email = $1",
    [normaliseEmail(email)],
  );
  const user = rows[0];
  const ok = await verifyPassword(password, user?.password_hash ?? (await getDummyHash()));
  return user && ok ? { id: user.id, email: user.email } : null;
}

export async function changePassword(userId: string, current: string, next: string, keepSessionId: string) {
  const { rows } = await db().query<{ password_hash: string }>("select password_hash from users where id = $1", [userId]);
  if (!rows[0] || !(await verifyPassword(current, rows[0].password_hash))) throw new HttpError(400, "wrong_password", "Your current password is incorrect.");
  const hash = await hashPassword(next);
  const client = await db().connect();
  try {
    await client.query("begin");
    await client.query("update users set password_hash = $2, password_changed_at = now(), updated_at = now() where id = $1", [userId, hash]);
    // Sign out every other device.
    await client.query("delete from sessions where user_id = $1 and id <> $2", [userId, keepSessionId]);
    await client.query("commit");
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
}

export async function deleteUser(userId: string, password: string) {
  const { rows } = await db().query<{ password_hash: string }>("select password_hash from users where id = $1", [userId]);
  if (!rows[0] || !(await verifyPassword(password, rows[0].password_hash))) throw new HttpError(400, "wrong_password", "Password is incorrect.");
  await db().query("delete from users where id = $1", [userId]); // cascades to sessions and financial_data
}

// ---- Sessions ----------------------------------------------------------------

export async function createSession(res: NextResponse, userId: string, userAgent: string | null) {
  const token = newSessionToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5);
  await db().query("insert into sessions(user_id, token_hash, expires_at, user_agent) values ($1, $2, $3, $4)", [
    userId, hashToken(token), expires, userAgent?.slice(0, 200) ?? null,
  ]);
  res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure: PROD, sameSite: "lax", path: "/", expires });
  // Opportunistic cleanup of expired sessions.
  if (Math.random() < 0.05) await db().query("delete from sessions where expires_at < now()");
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, secure: PROD, sameSite: "lax", path: "/", maxAge: 0 });
}

export async function getSessionUser(req: Request): Promise<SessionUser | null> {
  const token = readCookie(req, SESSION_COOKIE);
  if (!token || token.length > 100) return null;
  const { rows } = await db().query<{ session_id: string; user_id: string; email: string; last_seen_at: Date }>(
    `select s.id as session_id, u.id as user_id, u.email, s.last_seen_at
       from sessions s join users u on u.id = s.user_id
      where s.token_hash = $1 and s.expires_at > now()`,
    [hashToken(token)],
  );
  const row = rows[0];
  if (!row) return null;
  if (Date.now() - row.last_seen_at.getTime() > TOUCH_AFTER_MS) {
    await db().query("update sessions set last_seen_at = now() where id = $1", [row.session_id]);
  }
  return { id: row.user_id, email: row.email, sessionId: row.session_id };
}

export async function requireUser(req: Request): Promise<SessionUser> {
  const user = await getSessionUser(req);
  if (!user) throw new HttpError(401, "unauthenticated", "Please log in.");
  return user;
}

export async function destroySession(sessionId: string) {
  await db().query("delete from sessions where id = $1", [sessionId]);
}
