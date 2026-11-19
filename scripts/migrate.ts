/**
 * Minimal forward-only migration runner: applies db/migrations/*.sql in order, once each,
 * inside a transaction. Usage: DATABASE_URL=... npm run db:migrate
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const dir = join(process.cwd(), "db", "migrations");
const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  await client.query("create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())");
  await client.query("select pg_advisory_lock(726354)");
  const done = new Set((await client.query<{ name: string }>("select name from schema_migrations")).rows.map((r) => r.name));
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  for (const f of files) {
    if (done.has(f)) continue;
    await client.query("begin");
    try {
      await client.query(readFileSync(join(dir, f), "utf8"));
      await client.query("insert into schema_migrations(name) values ($1)", [f]);
      await client.query("commit");
      console.log(`applied ${f}`);
    } catch (e) {
      await client.query("rollback");
      throw e;
    }
  }
  console.log("migrations up to date");
} finally {
  await client.end();
}
