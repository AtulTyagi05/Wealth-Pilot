import "server-only";
import pg from "pg";

const globalForPg = globalThis as unknown as { wpPool?: pg.Pool };

/** One pool per server process (survives dev hot-reloads). */
export function db(): pg.Pool {
  if (!globalForPg.wpPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is not set");
    globalForPg.wpPool = new pg.Pool({
      connectionString,
      max: Number(process.env.DATABASE_POOL_MAX || 10),
      idleTimeoutMillis: 30_000,
      // Require TLS to the database in production unless explicitly disabled (e.g. a private network).
      ssl: process.env.NODE_ENV === "production" && process.env.DATABASE_SSL !== "disable" ? { rejectUnauthorized: true } : undefined,
    });
  }
  return globalForPg.wpPool;
}

export const isDbConfigured = () => Boolean(process.env.DATABASE_URL);
