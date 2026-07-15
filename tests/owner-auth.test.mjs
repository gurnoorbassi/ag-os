import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  buildOwnerSessionCookie,
  clearOwnerSessionCookie,
  createLoginRateLimiter,
  createOwnerSession,
  hashOwnerPassword,
  isOwnerPasswordHash,
  sessionCookieValue,
  verifyOwnerPassword,
  verifyOwnerSession
} from "../scripts/lib/runtime/owner-auth.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const password = "correct horse battery staple";

async function freePort() {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  server.close();
  await once(server, "close");
  return port;
}

async function waitForCoordinator(child) {
  let stdout = "";
  let stderr = "";
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  for await (const chunk of child.stdout) {
    stdout += chunk;
    if (stdout.includes('"status":"listening"')) return;
  }
  throw new Error(`coordinator exited before listening: ${stderr || stdout}`);
}

test("owner passwords use a validated salted scrypt hash", async () => {
  const storedHash = await hashOwnerPassword(password, { salt: Buffer.alloc(16, 7) });
  assert.equal(isOwnerPasswordHash(storedHash), true);
  assert.equal(await verifyOwnerPassword(password, storedHash), true);
  assert.equal(await verifyOwnerPassword("wrong password value", storedHash), false);
  assert.equal(isOwnerPasswordHash("plaintext-password"), false);
  await assert.rejects(() => hashOwnerPassword("too short"), /between 12 and 128/);
});

test("signed owner sessions expire and rotate with either credential", async () => {
  const storedHash = await hashOwnerPassword(password, { salt: Buffer.alloc(16, 9) });
  const now = new Date("2026-07-15T12:00:00.000Z");
  const session = createOwnerSession({
    ownerToken: "owner-recovery-token",
    passwordHash: storedHash,
    sessionDays: 30,
    now,
    nonce: "fixed-session-nonce"
  });
  assert.equal(verifyOwnerSession({ value: session.value, ownerToken: "owner-recovery-token", passwordHash: storedHash, now }), true);
  assert.equal(verifyOwnerSession({ value: session.value, ownerToken: "rotated-token", passwordHash: storedHash, now }), false);
  assert.equal(verifyOwnerSession({ value: session.value, ownerToken: "owner-recovery-token", passwordHash: `${storedHash}x`, now }), false);
  assert.equal(verifyOwnerSession({
    value: session.value,
    ownerToken: "owner-recovery-token",
    passwordHash: storedHash,
    now: new Date("2026-08-15T12:00:01.000Z")
  }), false);
});

test("owner session cookies are HttpOnly, strict, bounded, and parseable", () => {
  const cookie = buildOwnerSessionCookie("signed-value", { maxAgeSeconds: 3600, secure: true });
  assert.match(cookie, /^ag_os_owner_session=signed-value;/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /Max-Age=3600/);
  assert.match(cookie, /Secure/);
  assert.equal(sessionCookieValue(`other=1; ${cookie}`), "signed-value");
  assert.match(clearOwnerSessionCookie(), /Max-Age=0/);
});

test("login rate limiter blocks the sixth attempt and resets", () => {
  const limiter = createLoginRateLimiter({ maxFailures: 5, windowMs: 1000 });
  for (let attempt = 0; attempt < 5; attempt += 1) limiter.recordFailure("owner", 100);
  assert.equal(limiter.isBlocked("owner", 100), true);
  limiter.reset("owner");
  assert.equal(limiter.isBlocked("owner", 100), false);
  limiter.recordFailure("owner", 100);
  assert.equal(limiter.isBlocked("owner", 1200), false);
});

test("live coordinator supports remembered password login and recovery-token fallback", { timeout: 30_000 }, async (t) => {
  const port = await freePort();
  const storedHash = await hashOwnerPassword(password, { salt: Buffer.alloc(16, 11) });
  const child = spawn(process.execPath, ["scripts/live-server.mjs"], {
    cwd: root,
    env: {
      ...process.env,
      AG_OS_HOST: "127.0.0.1",
      AG_OS_PORT: String(port),
      AG_OS_ALLOWED_ORIGIN: `http://127.0.0.1:${port}`,
      AG_OS_OWNER_TOKEN: "integration-recovery-token",
      AG_OS_OWNER_PASSWORD_HASH: storedHash,
      AG_OS_OWNER_SESSION_DAYS: "30",
      AG_OS_AUTOMATION_ENABLED: "false"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  t.after(() => child.kill());
  await waitForCoordinator(child);
  const baseUrl = `http://127.0.0.1:${port}`;
  const origin = { origin: baseUrl };

  assert.equal((await fetch(`${baseUrl}/api/v1/status`)).status, 401);

  const login = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { ...origin, "content-type": "application/json" },
    body: JSON.stringify({ password })
  });
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie").split(";", 1)[0];
  assert.ok(cookie.startsWith("ag_os_owner_session="));

  const sessionStatus = await fetch(`${baseUrl}/api/v1/status`, { headers: { cookie } });
  assert.equal(sessionStatus.status, 200);
  assert.equal((await sessionStatus.json()).authentication.method, "password_session");

  const csrfBlocked = await fetch(`${baseUrl}/api/v1/projects`, {
    method: "POST",
    headers: { cookie, "content-type": "application/json" },
    body: "{}"
  });
  assert.equal(csrfBlocked.status, 403);

  const recoveryStatus = await fetch(`${baseUrl}/api/v1/status`, {
    headers: { authorization: "Bearer integration-recovery-token" }
  });
  assert.equal(recoveryStatus.status, 200);
  assert.equal((await recoveryStatus.json()).authentication.method, "recovery_token");

  const logout = await fetch(`${baseUrl}/api/v1/auth/logout`, {
    method: "POST",
    headers: { ...origin, cookie, "content-type": "application/json" }
  });
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get("set-cookie"), /Max-Age=0/);
});
