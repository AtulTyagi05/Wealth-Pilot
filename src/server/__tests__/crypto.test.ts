import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { hashPassword, verifyPassword, parseKeyring, seal, open, hashToken, newSessionToken } from "../crypto.ts";

test("password hash verifies and rejects wrong passwords", async () => {
  const h = await hashPassword("correct horse battery");
  assert.ok(h.startsWith("scrypt$131072$8$1$"));
  assert.equal(await verifyPassword("correct horse battery", h), true);
  assert.equal(await verifyPassword("wrong password!!", h), false);
  assert.notEqual(h, await hashPassword("correct horse battery")); // salted
});

const k = (v: number) => `${v}:${randomBytes(32).toString("base64")}`;

test("seal/open round-trips and uses the newest key", () => {
  const ring = parseKeyring(`${k(1)},${k(2)}`);
  const s = seal(JSON.stringify({ salary: 100000 }), "user-a", ring);
  assert.equal(s.keyVersion, 2);
  assert.ok(!s.ciphertext.toString("utf8").includes("100000"));
  assert.equal(JSON.parse(open(s, "user-a", ring)).salary, 100000);
});

test("ciphertext is bound to its user (AAD) and tamper-evident", () => {
  const ring = parseKeyring(k(1));
  const s = seal("secret", "user-a", ring);
  assert.throws(() => open(s, "user-b", ring));
  const tampered = { ...s, ciphertext: Buffer.from(s.ciphertext) };
  tampered.ciphertext[0] ^= 1;
  assert.throws(() => open(tampered, "user-a", ring));
});

test("old key versions still decrypt after rotation", () => {
  const v1 = k(1);
  const old = seal("data", "u", parseKeyring(v1));
  assert.equal(open(old, "u", parseKeyring(`${v1},${k(2)}`)), "data");
});

test("keyring rejects bad keys", () => {
  assert.throws(() => parseKeyring("1:short"));
  assert.throws(() => parseKeyring(undefined));
});

test("session tokens are random and hashed", () => {
  const t = newSessionToken();
  assert.ok(t.length >= 43);
  assert.notEqual(t, newSessionToken());
  assert.equal(hashToken(t).length, 32);
});
