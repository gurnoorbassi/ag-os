import {
  createHash,
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const HASH_VERSION = "scrypt-v1";
const SESSION_VERSION = 1;
const SESSION_COOKIE_NAME = "ag_os_owner_session";
const KEY_LENGTH = 64;
const SCRYPT_OPTIONS = Object.freeze({ N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });

function encoded(value) {
  return Buffer.from(value).toString("base64url");
}

function decoded(value) {
  return Buffer.from(value, "base64url");
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.isBuffer(left) ? left : Buffer.from(left);
  const rightBuffer = Buffer.isBuffer(right) ? right : Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function assertOwnerPassword(password) {
  if (typeof password !== "string" || password.length < 12 || password.length > 128) {
    throw new Error("owner password must be between 12 and 128 characters");
  }
  return password;
}

export async function hashOwnerPassword(password, { salt = randomBytes(16) } = {}) {
  assertOwnerPassword(password);
  const digest = await scrypt(password, salt, KEY_LENGTH, SCRYPT_OPTIONS);
  return [
    HASH_VERSION,
    SCRYPT_OPTIONS.N,
    SCRYPT_OPTIONS.r,
    SCRYPT_OPTIONS.p,
    encoded(salt),
    encoded(digest)
  ].join("$");
}

function parsePasswordHash(storedHash) {
  const [version, n, r, p, salt, digest, ...extra] = String(storedHash || "").split("$");
  if (extra.length || version !== HASH_VERSION || !salt || !digest) return null;
  const options = { N: Number(n), r: Number(r), p: Number(p), maxmem: 64 * 1024 * 1024 };
  if (options.N !== SCRYPT_OPTIONS.N || options.r !== SCRYPT_OPTIONS.r || options.p !== SCRYPT_OPTIONS.p) return null;
  try {
    const parsed = { options, salt: decoded(salt), digest: decoded(digest) };
    return parsed.salt.length >= 16 && parsed.digest.length === KEY_LENGTH ? parsed : null;
  } catch {
    return null;
  }
}

export function isOwnerPasswordHash(storedHash) {
  return Boolean(parsePasswordHash(storedHash));
}

export async function verifyOwnerPassword(password, storedHash) {
  const parsed = parsePasswordHash(storedHash);
  if (!parsed || typeof password !== "string" || password.length > 128) return false;
  const candidate = await scrypt(password, parsed.salt, parsed.digest.length, parsed.options);
  return safeEqual(candidate, parsed.digest);
}

function sessionSigningKey(ownerToken, passwordHash) {
  if (!ownerToken || !passwordHash) return null;
  return createHash("sha256")
    .update("ag-os-owner-session-v1\0")
    .update(ownerToken)
    .update("\0")
    .update(passwordHash)
    .digest();
}

export function createOwnerSession({
  ownerToken,
  passwordHash,
  sessionDays = 30,
  now = new Date(),
  nonce = randomBytes(16).toString("base64url")
}) {
  const signingKey = sessionSigningKey(ownerToken, passwordHash);
  const boundedDays = Number(sessionDays);
  if (!signingKey || !Number.isFinite(boundedDays) || boundedDays < 1 || boundedDays > 30) {
    throw new Error("owner session configuration is invalid");
  }
  const issuedAt = Math.floor(now.getTime() / 1000);
  const expiresAt = issuedAt + Math.floor(boundedDays * 86_400);
  const payload = encoded(JSON.stringify({ v: SESSION_VERSION, iat: issuedAt, exp: expiresAt, nonce }));
  const signature = createHmac("sha256", signingKey).update(payload).digest("base64url");
  return { value: `${payload}.${signature}`, issuedAt, expiresAt, maxAgeSeconds: expiresAt - issuedAt };
}

export function verifyOwnerSession({ value, ownerToken, passwordHash, now = new Date() }) {
  const signingKey = sessionSigningKey(ownerToken, passwordHash);
  const [payload, signature, ...extra] = String(value || "").split(".");
  if (!signingKey || extra.length || !payload || !signature) return false;
  const expected = createHmac("sha256", signingKey).update(payload).digest("base64url");
  if (!safeEqual(signature, expected)) return false;
  try {
    const record = JSON.parse(decoded(payload).toString("utf8"));
    const nowSeconds = Math.floor(now.getTime() / 1000);
    return record.v === SESSION_VERSION && Number.isInteger(record.iat) && Number.isInteger(record.exp) &&
      typeof record.nonce === "string" && record.nonce.length >= 16 && record.iat <= nowSeconds + 60 &&
      record.exp > nowSeconds && record.exp - record.iat <= 30 * 86_400;
  } catch {
    return false;
  }
}

export function sessionCookieValue(cookieHeader, name = SESSION_COOKIE_NAME) {
  for (const item of String(cookieHeader || "").split(";")) {
    const separator = item.indexOf("=");
    if (separator === -1 || item.slice(0, separator).trim() !== name) continue;
    return item.slice(separator + 1).trim();
  }
  return "";
}

export function buildOwnerSessionCookie(value, { maxAgeSeconds, secure = false } = {}) {
  const attributes = [
    `${SESSION_COOKIE_NAME}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${Math.max(0, Math.floor(Number(maxAgeSeconds) || 0))}`
  ];
  if (secure) attributes.push("Secure");
  return attributes.join("; ");
}

export function clearOwnerSessionCookie({ secure = false } = {}) {
  return buildOwnerSessionCookie("", { maxAgeSeconds: 0, secure });
}

export function createLoginRateLimiter({ maxFailures = 5, windowMs = 15 * 60_000 } = {}) {
  const failures = new Map();
  function active(key, now = Date.now()) {
    const record = failures.get(key);
    if (!record || now - record.startedAt >= windowMs) {
      failures.delete(key);
      return null;
    }
    return record;
  }
  return {
    isBlocked(key, now = Date.now()) {
      return (active(key, now)?.count || 0) >= maxFailures;
    },
    recordFailure(key, now = Date.now()) {
      const record = active(key, now);
      failures.set(key, record ? { ...record, count: record.count + 1 } : { count: 1, startedAt: now });
    },
    reset(key) {
      failures.delete(key);
    }
  };
}

export { SESSION_COOKIE_NAME };
