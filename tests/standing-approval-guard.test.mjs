import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildStandingApprovalUseAudit,
  evaluateStandingApprovalUse
} from "../scripts/lib/runtime/standing-approval-guard.mjs";

const approval = {
  approvalId: "approval-20260709-ag-os-codex-draft-pr-standing",
  approvalKind: "standing",
  status: "approved",
  approvedActions: ["push_codex_branch", "open_draft_pull_request"],
  riskLevel: "R4",
  dataClass: "internal",
  maxUses: 10,
  expiresAt: "2026-08-09T06:59:59Z"
};
const gates = {
  dashboardPassed: true,
  validationPassed: true,
  bootPassed: true,
  testsPassed: true,
  secretScanPassed: true,
  diffCheckPassed: true
};

function withTempDir(assertion) {
  const root = mkdtempSync(path.join(os.tmpdir(), "ag-os-standing-approval-"));
  try {
    mkdirSync(path.join(root, ".codex/audit"), { recursive: true });
    return assertion(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function allowedInput(root) {
  return {
    approval,
    repository: "gurnoorbassi/ag-os",
    branch: "codex/dashboard-copy-update",
    requestedActions: ["push_codex_branch", "open_draft_pull_request"],
    changedFiles: ["dashboard/app.js", "docs/dashboard-read-model.md"],
    gates,
    root,
    now: new Date("2026-07-10T00:00:00Z")
  };
}

test("allows only exact repo, codex branch, approved actions, and passed gates", () => withTempDir((root) => {
  const result = evaluateStandingApprovalUse(allowedInput(root));
  assert.equal(result.allowed, true);
  assert.equal(result.used, 0);
  assert.equal(result.remainingAfterUse, 9);
  assert.equal(result.mergeAuthorized, false);
}));

test("blocks excluded files, failed secret scan, wrong repo, and non-codex branches", () => withTempDir((root) => {
  for (const overrides of [
    { changedFiles: ["scripts/validate-foundation.mjs"] },
    { gates: { ...gates, secretScanPassed: false } },
    { repository: "gurnoorbassi/other" },
    { branch: "main" }
  ]) {
    const result = evaluateStandingApprovalUse({ ...allowedInput(root), ...overrides });
    assert.equal(result.allowed, false);
  }
}));

test("derives use count from audit events and blocks after ten uses", () => withTempDir((root) => {
  for (let index = 1; index <= 10; index += 1) {
    writeFileSync(path.join(root, `.codex/audit/audit-use-${index}.json`), `${JSON.stringify({
      eventType: "standing_approval_used",
      relatedArtifacts: [{ type: "approval", reference: approval.approvalId }]
    })}\n`);
  }
  const result = evaluateStandingApprovalUse(allowedInput(root));
  assert.equal(result.allowed, false);
  assert.equal(result.reasons.includes("standing_approval_usage_exhausted"), true);
}));

test("creates a per-use audit only after successful push and draft PR evidence", () => withTempDir((root) => {
  assert.throws(
    () => buildStandingApprovalUseAudit({ ...allowedInput(root), result: { pushSucceeded: true } }),
    /requires successful push and draft PR evidence/
  );
  const audit = buildStandingApprovalUseAudit({
    ...allowedInput(root),
    result: { pushSucceeded: true, draftPrUrl: "https://github.com/gurnoorbassi/ag-os/pull/200" }
  });
  assert.equal(audit.eventType, "standing_approval_used");
  assert.equal(audit.liveServiceTouched, true);
  assert.equal(audit.relatedArtifacts.some((artifact) => artifact.type === "approval"), true);
}));
