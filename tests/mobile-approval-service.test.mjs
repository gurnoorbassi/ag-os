import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { consumeMobileApproval, createMobileApprovalLink, deliverMobileApprovalLink, mobileApprovalReadiness } from "../scripts/lib/runtime/mobile-approval-service.mjs";
import { normalizeRunId } from "../scripts/lib/runtime/common.mjs";

function writeJson(root, relative, value) { const target = path.join(root, relative); mkdirSync(path.dirname(target), { recursive: true }); writeFileSync(target, JSON.stringify(value)); }
function fixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), "ag-os-mobile-"));
  const jobId = "job-runtime-mobile-test";
  writeJson(root, `.codex/jobs/${jobId}.json`, { jobId, commandId: "command-mobile-test", projectId: "project-one-off", status: "waiting_approval", riskLevel: "R1", commandType: "build", queueTimestamps: { queuedAt: "2026-07-19T00:00:00.000Z" } });
  writeJson(root, ".codex/commands/command-mobile-test.json", { commandIntakeId: "command-mobile-test", rawCommand: "Create a private repository", executionRequest: { adapterId: "github-private-repository", operation: "create_private_repository", repository: { owner: "gurnoorbassi", name: "test" }, projectId: "project-one-off", projectRecordPath: ".codex/projects/project-one-off.json", description: "test" } });
  writeJson(root, ".codex/connectors/registry.json", { connectors: [] });
  return { root, jobId };
}

test("mobile readiness requires a strong signing key and safe URL", () => {
  assert.equal(mobileApprovalReadiness({ env: {} }).ready, false);
  assert.equal(mobileApprovalReadiness({ env: { AG_OS_MOBILE_APPROVAL_SIGNING_KEY: "x".repeat(32), AG_OS_MOBILE_APPROVAL_BASE_URL: "http://public.example.com" } }).ready, false);
  assert.equal(mobileApprovalReadiness({ env: { AG_OS_MOBILE_APPROVAL_SIGNING_KEY: "x".repeat(32), AG_OS_MOBILE_APPROVAL_BASE_URL: "https://private.example.com" } }).ready, true);
});

test("mobile links keep plaintext tokens out of persisted state and are one use", () => {
  const { root, jobId } = fixture();
  const env = { AG_OS_MOBILE_APPROVAL_SIGNING_KEY: "s".repeat(64), AG_OS_MOBILE_APPROVAL_BASE_URL: "https://private.example.com", AG_OS_LIVE_ADAPTERS_ENABLED: "true", GITHUB_TOKEN: "test" };
  const created = createMobileApprovalLink({ jobId, root, env, now: new Date("2026-07-19T00:00:00.000Z") });
  const token = decodeURIComponent(new URL(created.link).hash.slice("#token=".length));
  const persisted = JSON.parse(readFileSync(path.join(root, created.recordPath), "utf8"));
  assert.equal(JSON.stringify(persisted).includes(token), false);
  const result = consumeMobileApproval({ token, decision: "reject", root, env, now: new Date("2026-07-19T00:01:00.000Z") });
  assert.equal(result.result.job.status, "cancelled");
  assert.throws(() => consumeMobileApproval({ token, decision: "reject", root, env, now: new Date("2026-07-19T00:02:00.000Z") }), /already been used/);
});

test("tampered and expired mobile links fail closed", () => {
  const { root, jobId } = fixture();
  const env = { AG_OS_MOBILE_APPROVAL_SIGNING_KEY: "s".repeat(64), AG_OS_MOBILE_APPROVAL_BASE_URL: "https://private.example.com" };
  const created = createMobileApprovalLink({ jobId, root, env, now: new Date("2026-07-19T00:00:00.000Z"), ttlMs: 60_000 });
  const token = decodeURIComponent(new URL(created.link).hash.slice("#token=".length));
  assert.throws(() => consumeMobileApproval({ token: `${token}x`, decision: "reject", root, env, now: new Date("2026-07-19T00:00:30.000Z") }), /invalid/);
  assert.throws(() => consumeMobileApproval({ token, decision: "reject", root, env, now: new Date("2026-07-19T00:02:00.000Z") }), /expired/);
});

test("Telegram delivery requires scoped approval, records one use, and persists no secret or signed link", async () => {
  const { root, jobId } = fixture();
  const now = new Date("2026-07-19T00:00:00.000Z");
  const approvalId = "approval-20260719-mobile-notifications";
  writeJson(root, `.codex/approvals/${approvalId}.json`, {
    approvalId, status: "approved", approvalKind: "standing", actionClass: "mobile_approval_notification",
    inclusionCriteria: ["Only one-time AG OS approval links for exact waiting jobs."], maxUses: 10, usageAuditRequired: true, revocableImmediately: true,
    ownerId: "owner-gurnoor-bassi", requestedBy: "ag-os-coordinator", approvedBy: "owner-gurnoor-bassi", commandCategory: "send_message",
    requestedAction: "Send bounded mobile approval notifications", target: "telegram:bot-api", scope: "Approval notifications only", riskLevel: "R3", dataClass: "internal",
    budget: { required: false, maxUsd: 0 }, approvalRequiredFor: ["message_send"], approvedActions: ["mobile_approval_notification"],
    prohibitedActions: ["customer_data_access", "social_posting", "paid_action", "dns_change", "production_deployment"], revocationPath: "Owner may revoke immediately.",
    evidence: [{ type: "owner_instruction", reference: "test approval", verified: true }], approvalText: "Approve bounded Telegram decision notifications.",
    approvedAt: now.toISOString(), expiresAt: "2026-08-19T00:00:00.000Z", createdAt: now.toISOString(), updatedAt: now.toISOString()
  });
  const env = {
    AG_OS_MOBILE_APPROVAL_SIGNING_KEY: "s".repeat(64), AG_OS_MOBILE_APPROVAL_BASE_URL: "https://private.example.com",
    AG_OS_MOBILE_APPROVAL_DELIVERY: "telegram", AG_OS_TELEGRAM_BOT_TOKEN: "secret-bot-token", AG_OS_TELEGRAM_CHAT_ID: "123456789",
    AG_OS_MOBILE_NOTIFICATION_APPROVAL_ID: approvalId
  };
  assert.equal(mobileApprovalReadiness({ root, env, now }).ready, true);
  const created = createMobileApprovalLink({ jobId, root, env, now });
  let sentBody;
  const delivered = await deliverMobileApprovalLink({
    linkResult: created, root, env, now,
    fetchImpl: async (_url, options) => { sentBody = JSON.parse(options.body); return { ok: true, status: 200, json: async () => ({ ok: true, result: { message_id: 42 } }) }; }
  });
  assert.equal(delivered.delivery.sent, true);
  assert.match(sentBody.text, /#token=/);
  const persisted = readFileSync(path.join(root, created.recordPath), "utf8");
  const audit = readFileSync(path.join(root, delivered.delivery.auditPath), "utf8");
  assert.equal(persisted.includes("secret-bot-token"), false);
  assert.equal(persisted.includes(created.link), false);
  assert.equal(audit.includes("secret-bot-token"), false);
  assert.equal(audit.includes(created.link), false);
  assert.equal(audit.includes("123456789"), false);
});

test("Telegram transport errors are redacted and still consume one conservative approval use", async () => {
  const { root, jobId } = fixture();
  const now = new Date("2026-07-19T00:00:00.000Z");
  const approvalId = "approval-20260719-mobile-failure";
  writeJson(root, `.codex/approvals/${approvalId}.json`, {
    approvalId, status: "approved", approvalKind: "standing", actionClass: "mobile_approval_notification", inclusionCriteria: ["Exact waiting jobs only."], maxUses: 1,
    usageAuditRequired: true, revocableImmediately: true, ownerId: "owner-gurnoor-bassi", requestedBy: "ag-os-coordinator", approvedBy: "owner-gurnoor-bassi",
    commandCategory: "send_message", requestedAction: "Send one decision notification", target: "telegram:bot-api", scope: "Approval notification only", riskLevel: "R3", dataClass: "internal",
    budget: { required: false, maxUsd: 0 }, approvalRequiredFor: ["message_send"], approvedActions: ["mobile_approval_notification"], prohibitedActions: ["paid_action"],
    revocationPath: "Owner may revoke immediately.", evidence: [{ type: "owner_instruction", reference: "test", verified: true }], approvalText: "One test notification.",
    approvedAt: now.toISOString(), expiresAt: "2026-08-19T00:00:00.000Z", createdAt: now.toISOString(), updatedAt: now.toISOString()
  });
  const env = { AG_OS_MOBILE_APPROVAL_SIGNING_KEY: "s".repeat(64), AG_OS_MOBILE_APPROVAL_BASE_URL: "https://private.example.com", AG_OS_MOBILE_APPROVAL_DELIVERY: "telegram", AG_OS_TELEGRAM_BOT_TOKEN: "never-log-this-token", AG_OS_TELEGRAM_CHAT_ID: "123456789", AG_OS_MOBILE_NOTIFICATION_APPROVAL_ID: approvalId };
  const created = createMobileApprovalLink({ jobId, root, env, now });
  await assert.rejects(() => deliverMobileApprovalLink({ linkResult: created, root, env, now, fetchImpl: async (url) => { throw new Error(`failed ${url}`); } }), (error) => error.message === "Telegram approval notification transport failed");
  assert.equal(mobileApprovalReadiness({ root, env, now }).ready, false);
  const auditName = `audit-${normalizeRunId(`${created.requestId}-telegram-delivery`)}.json`;
  assert.equal(readFileSync(path.join(root, ".codex/audit", auditName), "utf8").includes("never-log-this-token"), false);
});
