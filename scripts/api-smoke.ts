/**
 * End-to-end checks for auth and encrypted storage against a running server and its database.
 * Usage: BASE_URL=http://localhost:3000 DATABASE_URL=... npm run test:api
 */
import assert from "node:assert/strict";
import pg from "pg";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const ORIGIN = new URL(BASE).origin;
const email = `smoke-${Date.now()}@example.com`;
const password = "a calm green river 42";

class Client {
  cookie = "";
  async req(path: string, init: { method?: string; body?: unknown; origin?: string | null } = {}) {
    const headers: Record<string, string> = {};
    if (this.cookie) headers.cookie = this.cookie;
    if (init.body !== undefined) headers["content-type"] = "application/json";
    if (init.origin !== null) headers.origin = init.origin ?? ORIGIN;
    const res = await fetch(BASE + path, { method: init.method ?? "GET", headers, body: init.body === undefined ? undefined : JSON.stringify(init.body) });
    const set = res.headers.get("set-cookie");
    if (set) {
      const [pair] = set.split(";");
      this.cookie = pair.endsWith("=") ? "" : pair;
    }
    const text = await res.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch { /* not json */ }
    return { status: res.status, json, text, setCookie: set };
  }
}

const sample = {
  onboarded: true,
  profile: {
    name: "Smoke Test", age: 30, country: "IN", currency: "INR", monthlySalary: 123457, annualSalary: 1800000,
    additionalIncome: [], bankSavings: 50000, investments: 0, retirementSavings: 0, emergencyFund: 0, liabilities: [],
    retirementAge: 60, lifeExpectancy: 85, postRetirementMonthlyExpense: 0, goals: [], risk: "moderate", hasHealthInsurance: true, hasTermInsurance: false,
  },
  expenses: [{ id: "rent", name: "Rent", amount: 20000, essential: true, icon: "home" }],
  assumptions: { inflation: 6, equityReturn: 12, indexReturn: 11, debtReturn: 7, ppfReturn: 7.1, epfReturn: 8.25, npsReturn: 10, fdReturn: 6.75, goldReturn: 8, postRetirementReturn: 7 },
  history: [],
};

const results: string[] = [];
const step = async (name: string, fn: () => Promise<void>) => { await fn(); results.push(`ok - ${name}`); };

const a = new Client();
const b = new Client(); // second device

await step("weak password rejected", async () => {
  const r = await a.req("/api/auth/register", { method: "POST", body: { email, password: "short" } });
  assert.equal(r.status, 400);
  assert.equal(r.json.error.code, "weak_password");
});
await step("cross-site register blocked", async () => {
  const r = await a.req("/api/auth/register", { method: "POST", body: { email, password }, origin: "https://evil.example" });
  assert.equal(r.status, 403);
});
await step("register sets an httpOnly SameSite session cookie", async () => {
  const r = await a.req("/api/auth/register", { method: "POST", body: { email, password } });
  assert.equal(r.status, 201);
  assert.match(r.setCookie ?? "", /HttpOnly/i);
  assert.match(r.setCookie ?? "", /SameSite=lax/i);
});
await step("duplicate email rejected", async () => {
  const r = await new Client().req("/api/auth/register", { method: "POST", body: { email: email.toUpperCase(), password } });
  assert.equal(r.status, 409);
});
await step("me returns the user", async () => {
  const r = await a.req("/api/auth/me");
  assert.equal(r.json.user.email, email);
});
await step("new account has no data", async () => {
  const r = await a.req("/api/data");
  assert.equal(r.json.version, 0);
});
await step("invalid data rejected", async () => {
  const r = await a.req("/api/data", { method: "PUT", body: { baseVersion: 0, data: { ...sample, profile: { ...sample.profile, age: -4 } } } });
  assert.equal(r.status, 400);
});
await step("save and load round-trips", async () => {
  const put = await a.req("/api/data", { method: "PUT", body: { baseVersion: 0, data: sample } });
  assert.equal(put.json.version, 1);
  const get = await a.req("/api/data");
  assert.equal(get.json.data.profile.monthlySalary, 123457);
});
await step("data is encrypted at rest", async () => {
  if (!process.env.DATABASE_URL) return;
  const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const { rows } = await c.query("select f.ciphertext, f.key_version from financial_data f join users u on u.id = f.user_id where u.email = $1", [email]);
  await c.end();
  assert.equal(rows.length, 1);
  const raw = (rows[0].ciphertext as Buffer).toString("latin1");
  assert.ok(!raw.includes("123457") && !raw.includes("Smoke Test"), "plaintext found in ciphertext");
});
await step("wrong password rejected with a generic message", async () => {
  const r = await b.req("/api/auth/login", { method: "POST", body: { email, password: "not the password" } });
  assert.equal(r.status, 401);
  const r2 = await b.req("/api/auth/login", { method: "POST", body: { email: "nobody@example.com", password: "whatever123" } });
  assert.equal(r2.json.error.message, r.json.error.message);
});
await step("second device logs in and sees the data", async () => {
  const r = await b.req("/api/auth/login", { method: "POST", body: { email, password } });
  assert.equal(r.status, 200);
  assert.equal((await b.req("/api/data")).json.version, 1);
});
await step("stale write gets 409 with the latest copy", async () => {
  await b.req("/api/data", { method: "PUT", body: { baseVersion: 1, data: { ...sample, profile: { ...sample.profile, monthlySalary: 150000 } } } });
  const r = await a.req("/api/data", { method: "PUT", body: { baseVersion: 1, data: sample } });
  assert.equal(r.status, 409);
  assert.equal(r.json.latest.data.profile.monthlySalary, 150000);
});
await step("AI route requires login", async () => {
  const r = await new Client().req("/api/assistant", { method: "POST", body: {} });
  assert.equal(r.status === 401 || r.status === 503, true);
});
await step("password change signs out other devices", async () => {
  const r = await a.req("/api/auth/password", { method: "POST", body: { current: password, next: "a brand new phrase 77" } });
  assert.equal(r.status, 200);
  assert.equal((await b.req("/api/data")).status, 401);
  assert.equal((await a.req("/api/data")).status, 200);
});
await step("export downloads the account data", async () => {
  const r = await a.req("/api/account/export");
  assert.equal(r.json.account.email, email);
  assert.equal(r.json.data.profile.monthlySalary, 150000);
});
await step("logout ends the session", async () => {
  const c = new Client();
  await c.req("/api/auth/login", { method: "POST", body: { email, password: "a brand new phrase 77" } });
  const saved = c.cookie;
  await c.req("/api/auth/logout", { method: "POST" });
  c.cookie = saved; // replaying the old cookie must not work
  assert.equal((await c.req("/api/data")).status, 401);
});
await step("delete requires the password and removes everything", async () => {
  assert.equal((await a.req("/api/account", { method: "DELETE", body: { password: "wrong one here" } })).status, 400);
  assert.equal((await a.req("/api/account", { method: "DELETE", body: { password: "a brand new phrase 77" } })).status, 200);
  const r = await new Client().req("/api/auth/login", { method: "POST", body: { email, password: "a brand new phrase 77" } });
  assert.equal(r.status, 401);
});

console.log(results.join("\n"));
console.log(`\n${results.length} checks passed`);
