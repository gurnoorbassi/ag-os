import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  archiveApprovalLock,
  findStaleApprovalLocks,
  listActiveApprovalLocks
} from "../scripts/lib/runtime/stale-approval-manager.mjs";

const fixedNow = new Date("2026-07-06T21:00:00.000Z");

function writeJson(filePath, record) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
}

function buildApproval(overrides = {}) {
  return {
    approvalId: overrides.approvalId ?? "approval-20260704-test-action",
    status: overrides.status ?? "approved",
    ownerId: "owner-gurnoor-bassi",
    requestedBy: "ag-os-runtime",
    approvedBy: "owner-gurnoor-bassi",
    commandCategory: "build",
    requestedAction: "Run one scoped test action.",
    target: "ag-os:test",
    scope: "Allow one scoped local test action only.",
    riskLevel: "R2",
    dataClass: "internal",
    approvalRequiredFor: ["test_action"],
    approvedActions: ["test_action"],
    prohibitedActions: ["deploy", "change_dns", "use_paid_service", "store_credentials"],
    revocationPath: "Owner can revoke this scoped test approval before execution.",
    evidence: [
      {
        type: "owner_instruction",
        reference: "Owner approved scoped local test action.",
        verified: true
      }
    ],
    approvalText: "Owner approval for scoped local test action.",
    approvedAt: "2026-07-04T12:00:00.000Z",
    expiresAt: overrides.expiresAt ?? "2026-07-05T12:00:00.000Z",
    createdAt: "2026-07-04T12:00:00.000Z",
    updatedAt: "2026-07-04T12:00:00.000Z"
  };
}

function withWorkspace(fn) {
  const root = mkdtempSync(path.join(os.tmpdir(), "ag-os-stale-approvals-"));
  try {
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("lists only direct active approval locks and ignores templates or archive records", () => withWorkspace((root) => {
  writeJson(path.join(root, ".codex/approvals/approval-20260704-test-action.json"), buildApproval());
  writeJson(path.join(root, ".codex/approvals/approval-20260704-test-action.template.json"), buildApproval());
  writeJson(path.join(root, ".codex/approvals/archive/approval-20260703-old-action.json"), buildApproval({
    approvalId: "approval-20260703-old-action",
    status: "expired"
  }));

  const active = listActiveApprovalLocks({ root });

  assert.deepEqual(active.map((approval) => approval.approvalId), ["approval-20260704-test-action"]);
  assert.equal(active[0].recordPath, ".codex/approvals/approval-20260704-test-action.json");
}));

test("detects approved approval locks whose expiration has passed", () => withWorkspace((root) => {
  writeJson(path.join(root, ".codex/approvals/approval-20260704-expired-action.json"), buildApproval({
    approvalId: "approval-20260704-expired-action",
    expiresAt: "2026-07-05T12:00:00.000Z"
  }));
  writeJson(path.join(root, ".codex/approvals/approval-20260704-future-action.json"), buildApproval({
    approvalId: "approval-20260704-future-action",
    expiresAt: "2026-07-07T12:00:00.000Z"
  }));
  writeJson(path.join(root, ".codex/approvals/approval-20260704-already-expired-action.json"), buildApproval({
    approvalId: "approval-20260704-already-expired-action",
    status: "expired",
    expiresAt: "2026-07-05T12:00:00.000Z"
  }));

  const stale = findStaleApprovalLocks({ root, now: fixedNow });

  assert.deepEqual(stale.map((approval) => approval.approvalId), ["approval-20260704-expired-action"]);
  assert.equal(stale[0].reason, "expired");
}));

test("archives a stale approval lock without deleting history", () => withWorkspace((root) => {
  const source = path.join(root, ".codex/approvals/approval-20260704-expired-action.json");
  writeJson(source, buildApproval({
    approvalId: "approval-20260704-expired-action",
    expiresAt: "2026-07-05T12:00:00.000Z"
  }));

  const result = archiveApprovalLock({
    root,
    recordPath: ".codex/approvals/approval-20260704-expired-action.json",
    now: fixedNow,
    reason: "Expired approval lock blocked boot."
  });

  assert.equal(result.sourcePath, ".codex/approvals/approval-20260704-expired-action.json");
  assert.equal(result.archivePath, ".codex/approvals/archive/approval-20260704-expired-action.json");
  assert.equal(existsSync(source), false);

  const archived = JSON.parse(readFileSync(path.join(root, result.archivePath), "utf8"));
  assert.equal(archived.status, "expired");
  assert.equal(archived.updatedAt, fixedNow.toISOString());
  assert.equal(archived.revocationPath.includes("Expired approval lock blocked boot."), true);
  assert.equal(archived.revocationPath.includes("no longer valid for gated actions"), true);
}));
