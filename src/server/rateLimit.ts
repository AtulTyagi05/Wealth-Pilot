/** Simple in-memory sliding-window limiter (per server instance). Use Redis or similar when running several instances. */
const hits = new Map<string, number[]>();

export function rateLimit(key: string, limit = 20, windowMs = 5 * 60_000): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 10_000) hits.clear();
  return true;
}

export const clientIp = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
