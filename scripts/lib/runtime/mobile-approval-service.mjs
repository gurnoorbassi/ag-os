import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { decideJob } from "./job-approval-service.mjs";
import { isoTimestamp, readJson, slugify, writeJson } from "./common.mjs";
import { writeAuditEventRecord } from "./audit-writer.mjs";
import { fetchWithTimeout } from "./fetch-with-timeout.mjs";

const VERSION = 1;
const MAX_TTL_MS = 60 * 60 * 1000;
const TELEGRAM_ACTION = "mobile_approval_notification";
const TELEGRAM_TARGET = "telegram:bot-api";
const inFlightNotificationApprovals = new Set();

function encode(value) { return Buffer.from(value).toString("base64url"); }
function decode(value) { return Buffer.from(value, "base64url").toString("utf8"); }
function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
}
function tokenHash(token) { return createHash("sha256").update(token).digest("hex"); }

function approvalUseCount(root, approvalId) {
  const directory = path.join(root, ".codex", "audit");
  if (!existsSync(directory)) return 0;
  return readdirSync(directory)
    .filter((name) => name.endsWith(".json") && !name.includes("template"))
    .map((name) => { try { return readJson(`.codex/audit/${name}`, root); } catch { return null; } })
    .filter((record) => record?.eventType === "standing_approval_used")
    .filter((record) => record.relatedArtifacts?.some((item) => item.type === "approval" && item.reference === approvalId))
    .length;
}

export function mobileApprovalReadiness({ root = process.cwd(), env = process.env, now = new Date() } = {}) {
  const signingKey = env.AG_OS_MOBILE_APPROVAL_SIGNING_KEY || "";
  const baseUrl = env.AG_OS_MOBILE_APPROVAL_BASE_URL || "";
  const delivery = env.AG_OS_MOBILE_APPROVAL_DELIVERY || "disabled";
  const blockers = [];
  if (Buffer.byteLength(signingKey) < 32) blockers.push("mobile approval signing key must be at least 32 bytes");
  if (!baseUrl) blockers.push("mobile approval base URL is not configured");
  else {
    try {
      const url = new URL(baseUrl);
      if (url.protocol !== "https:" && !["127.0.0.1", "localhost", "::1"].includes(url.hostname)) blockers.push("mobile approval base URL must use HTTPS or loopback");
    } catch { blockers.push("mobile approval base URL is invalid"); }
  }
  if (!["disabled", "outbox", "telegram"].includes(delivery)) blockers.push("mobile approval delivery mode is invalid");
  let approval = null;
  let uses = 0;
  if (delivery === "telegram") {
    if (!env.AG_OS_TELEGRAM_BOT_TOKEN) blockers.push("Telegram bot credential is not configured");
    if (!/^-?[0-9]{5,20}$/.test(String(env.AG_OS_TELEGRAM_CHAT_ID || ""))) blockers.push("Telegram chat ID is not configured");
    const approvalId = env.AG_OS_MOBILE_NOTIFICATION_APPROVAL_ID || "";
    if (!approvalId) blockers.push("scoped mobile notification approval is not configured");
    else {
      const approvalPath = path.join(root, ".codex", "approvals", `${approvalId}.json`);
      if (!existsSync(approvalPath)) blockers.push("scoped mobile notification approval record does not exist");
      else {
        approval = readJson(`.codex/approvals/${approvalId}.json`, root);
        uses = approvalUseCount(root, approvalId);
        if (approval.status !== "approved" || approval.approvalKind !== "standing") blockers.push("scoped mobile notification approval is not active");
        if (Date.parse(approval.expiresAt) <= now.getTime()) blockers.push("scoped mobile notification approval has expired");
        if (approval.target !== TELEGRAM_TARGET) blockers.push("scoped mobile notification target is invalid");
        if (!approval.approvedActions?.includes(TELEGRAM_ACTION) || !approval.approvalRequiredFor?.includes("message_send")) blockers.push("scoped mobile notification approval does not authorize notification messages");
        if (!Number.isInteger(approval.maxUses) || uses >= approval.maxUses) blockers.push("scoped mobile notification approval has no uses remaining");
      }
    }
  }
  return { ready: blockers.length === 0, deliveryActive: delivery === "telegram", delivery, baseUrl: baseUrl || null, approval, uses, blockers };
}

export function createMobileApprovalLink({ jobId, root = process.cwd(), env = process.env, now = new Date(), ttlMs = 15 * 60 * 1000 } = {}) {
  const readiness = mobileApprovalReadiness({ root, env, now });
  if (!readiness.ready) throw new Error(`mobile approvals are not ready: ${readiness.blockers.join("; ")}`);
  if (!/^job-[a-z0-9-]+$/.test(jobId || "")) throw new Error("a valid jobId is required");
  if (!Number.isInteger(ttlMs) || ttlMs < 60_000 || ttlMs > MAX_TTL_MS) throw new Error("mobile approval link TTL must be between 1 and 60 minutes");
  const job = readJson(`.codex/jobs/${jobId}.json`, root);
  if (job.status !== "waiting_approval") throw new Error("mobile approval links are only available for jobs waiting for approval");
  const issuedAt = Math.floor(now.getTime() / 1000);
  const expiresAt = issuedAt + Math.floor(ttlMs / 1000);
  const nonce = randomBytes(24).toString("base64url");
  const payload = encode(JSON.stringify({ v: VERSION, jobId, iat: issuedAt, exp: expiresAt, nonce }));
  const signature = createHmac("sha256", env.AG_OS_MOBILE_APPROVAL_SIGNING_KEY).update(payload).digest("base64url");
  const token = `${payload}.${signature}`;
  const requestId = `mobile-approval-${slugify(jobId)}-${nonce.slice(0, 10).toLowerCase()}`;
  const recordPath = `.codex/mobile-approvals/${requestId}.json`;
  writeJson(recordPath, {
    requestId,
    jobId,
    status: "pending",
    tokenHash: tokenHash(token),
    issuedAt: isoTimestamp(new Date(issuedAt * 1000)),
    expiresAt: isoTimestamp(new Date(expiresAt * 1000)),
    allowedDecisions: ["approve", "reject"],
    delivery: { mode: env.AG_OS_MOBILE_APPROVAL_DELIVERY || "disabled", sent: false },
    safety: { getRequestsMutateState: false, exactJobDecisionRequired: true, grantsPermission: false },
    createdAt: isoTimestamp(now),
    updatedAt: isoTimestamp(now)
  }, root);
  return { requestId, jobId, expiresAt: isoTimestamp(new Date(expiresAt * 1000)), link: `${readiness.baseUrl.replace(/\/$/, "")}/mobile-approval#token=${encodeURIComponent(token)}`, recordPath };
}

export async function deliverMobileApprovalLink({ linkResult, root = process.cwd(), env = process.env, fetchImpl = globalThis.fetch, now = new Date() } = {}) {
  if (!linkResult?.recordPath || !linkResult?.link) throw new Error("mobile approval link result is required");
  const readiness = mobileApprovalReadiness({ root, env, now });
  if (!readiness.ready) throw new Error(`mobile approvals are not ready: ${readiness.blockers.join("; ")}`);
  if (readiness.delivery !== "telegram") return { ...linkResult, delivery: { mode: readiness.delivery, sent: false } };
  if (typeof fetchImpl !== "function") throw new Error("Telegram delivery transport is unavailable");
  const approvalId = readiness.approval.approvalId;
  if (inFlightNotificationApprovals.has(approvalId)) throw new Error("mobile notification approval already has a delivery in progress");
  inFlightNotificationApprovals.add(approvalId);
  try {
    // Conservatively consume the approval use before contacting the provider so
    // failures and crashes cannot make an external message invisible to limits.
    const auditOptions = {
      runId: `${linkResult.requestId}-telegram-delivery`, eventType: "standing_approval_used",
      scope: "mobile_approval_notification", source: "connector_metadata",
      relatedArtifacts: [{ type: "approval", reference: approvalId }, { type: "other", reference: linkResult.requestId }],
      riskLevel: "R3", liveServiceTouched: true, now, root
    };
    const audit = writeAuditEventRecord({
      ...auditOptions,
      summary: `Scoped approval ${approvalId} consumed for one attempted AG OS mobile decision notification.`,
      notes: "The use was reserved before transport. No token, link, chat identifier, job payload, or credential is stored in this audit record."
    });
    let response;
    try {
      response = await fetchWithTimeout(fetchImpl, `https://api.telegram.org/bot${env.AG_OS_TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chat_id: env.AG_OS_TELEGRAM_CHAT_ID,
          text: `AG OS needs your decision for ${linkResult.jobId}. Open the secure one-time link:\n${linkResult.link}`,
          disable_web_page_preview: true
        })
      }, env.AG_OS_PROVIDER_TIMEOUT_MS);
    } catch {
      throw new Error("Telegram approval notification transport failed");
    }
    if (!response.ok) throw new Error(`Telegram approval notification failed with HTTP ${response.status}`);
    const body = await response.json();
    if (body?.ok !== true || !Number.isInteger(body?.result?.message_id)) throw new Error("Telegram approval notification response was invalid");

    const record = readJson(linkResult.recordPath, root);
    writeJson(linkResult.recordPath, {
      ...record,
      delivery: { mode: "telegram", sent: true, providerMessageId: String(body.result.message_id) },
      updatedAt: isoTimestamp(now)
    }, root);
    writeAuditEventRecord({
      ...auditOptions,
      summary: `Scoped approval ${approvalId} used for one AG OS mobile decision notification.`,
      notes: `Telegram accepted notification message ${body.result.message_id}. No token, link, chat identifier, job payload, or credential is stored in this audit record.`
    });
    return { ...linkResult, delivery: { mode: "telegram", sent: true, providerMessageId: String(body.result.message_id), auditPath: audit.filePath } };
  } finally {
    inFlightNotificationApprovals.delete(approvalId);
  }
}

function verifyToken({ token, signingKey, now }) {
  const [payload, signature, ...extra] = String(token || "").split(".");
  if (extra.length || !payload || !signature || Buffer.byteLength(signingKey || "") < 32) throw new Error("mobile approval token is invalid");
  const expected = createHmac("sha256", signingKey).update(payload).digest("base64url");
  if (!safeEqual(signature, expected)) throw new Error("mobile approval token is invalid");
  let decoded;
  try { decoded = JSON.parse(decode(payload)); } catch { throw new Error("mobile approval token is invalid"); }
  const nowSeconds = Math.floor(now.getTime() / 1000);
  if (decoded.v !== VERSION || !/^job-[a-z0-9-]+$/.test(decoded.jobId || "") || !Number.isInteger(decoded.iat) || !Number.isInteger(decoded.exp) || decoded.exp <= nowSeconds || decoded.exp - decoded.iat > MAX_TTL_MS / 1000 || decoded.iat > nowSeconds + 60) throw new Error("mobile approval token is expired or invalid");
  return decoded;
}

export function consumeMobileApproval({ token, decision, root = process.cwd(), env = process.env, now = new Date() }) {
  if (!["approve", "reject"].includes(decision)) throw new Error("mobile decision must be approve or reject");
  const payload = verifyToken({ token, signingKey: env.AG_OS_MOBILE_APPROVAL_SIGNING_KEY, now });
  const expectedHash = tokenHash(token);
  const directory = path.join(root, ".codex", "mobile-approvals");
  const requestIdPrefix = `mobile-approval-${slugify(payload.jobId)}-`;
  const match = readdirSync(directory).find((name) => name.startsWith(requestIdPrefix) && name.endsWith(".json") && safeEqual(readJson(`.codex/mobile-approvals/${name}`, root).tokenHash, expectedHash));
  if (!match) throw new Error("mobile approval request does not exist");
  const recordPath = `.codex/mobile-approvals/${match}`;
  const record = readJson(recordPath, root);
  if (record.status !== "pending") throw new Error("mobile approval token has already been used");
  if (Date.parse(record.expiresAt) <= now.getTime()) throw new Error("mobile approval token has expired");
  const result = decideJob({ jobId: payload.jobId, decision, confirmation: `${decision.toUpperCase()} ${payload.jobId}`, root, env, now });
  writeJson(recordPath, { ...record, status: "consumed", decision, consumedAt: isoTimestamp(now), updatedAt: isoTimestamp(now) }, root);
  return { requestId: record.requestId, jobId: payload.jobId, decision, result };
}
