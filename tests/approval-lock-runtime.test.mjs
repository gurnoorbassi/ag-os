import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildApprovalGrantedAuditEvent,
  buildApprovalLockRecord,
  expireApprovalLock,
  revokeApprovalLock,
  validateApprovalLockRecord,
  writeApprovalLockWithAudit
} from "../scripts/lib/runtime/approval-lock-runtime.mjs";

const fixedNow = new Date("2026-07-03T12:00:00.000Z");
const expiresAt = "2026-07-10T12:00:00.000Z";

function buildValidApproval() {
  return buildApprovalLockRecord({
    slug: "github-repo-create",
    commandCategory: "build",
    requestedAction: "create_github_repository",
    target: "project-unregistered-construction-website",
    scope: "Allow GitHub repository creation planning records for the construction website request only.",
    riskLevel: "R3",
    approvalRequiredFor: ["github_repo_create"],
    approvedActions: ["create_github_repository"],
    prohibitedActions: ["deploy", "change_domain", "use_paid_service", "access_production_data"],
    evidence: [
      {
        type: "owner_instruction",
        reference: "Owner approved scoped GitHub repository creation dry-run gate.",
        verified: true
      }
    ],
    approvalText: "Owner approval for scoped GitHub repository creation gate.",
    expiresAt,
    now: fixedNow
  });
}

test("builds a schema-shaped approval lock for a scoped owner-approved action", () => {
  const record = buildValidApproval();

  assert.equal(record.approvalId, "approval-20260703-github-repo-create");
  assert.equal(record.status, "approved");
  assert.equal(record.ownerId, "owner-gurnoor-bassi");
  assert.equal(record.approvedBy, "owner-gurnoor-bassi");
  assert.equal(record.commandCategory, "build");
  assert.equal(record.riskLevel, "R3");
  assert.equal(record.dataClass, "internal");
  assert.equal(record.scope.includes("construction website"), true);
  assert.equal(record.approvedActions.length, 1);
  assert.equal(record.evidence.length, 1);
  assert.equal(record.revocationPath.length > 0, true);
  assert.equal(record.createdAt, fixedNow.toISOString());
  assert.equal(JSON.stringify(record).includes("REQUIRED_"), false);
});

test("validates required approval lock fields before gated execution", () => {
  const valid = validateApprovalLockRecord(buildValidApproval());
  assert.deepEqual(valid, { valid: true, errors: [] });

  const invalid = validateApprovalLockRecord({
    ...buildValidApproval(),
    approvedBy: "",
    approvedActions: [],
    evidence: [],
    revocationPath: ""
  });

  assert.equal(invalid.valid, false);
  assert.equal(invalid.errors.includes("approvedBy is required"), true);
  assert.equal(invalid.errors.includes("approvedActions must not be empty"), true);
  assert.equal(invalid.errors.includes("evidence must not be empty"), true);
  assert.equal(invalid.errors.includes("revocationPath is required"), true);
});

test("supports revocation and expiration status updates", () => {
  const approval = buildValidApproval();
  const revoked = revokeApprovalLock({
    approval,
    reason: "Owner revoked this scoped approval.",
    now: fixedNow
  });
  assert.equal(revoked.status, "revoked");
  assert.equal(revoked.revocationPath.includes("Owner revoked"), true);

  const expired = expireApprovalLock({
    approval,
    now: new Date("2026-07-11T12:00:00.000Z")
  });
  assert.equal(expired.status, "expired");
  assert.equal(expired.revocationPath.includes("expired"), true);
});

test("builds an approval-granted audit event for approval creation", () => {
  const approval = buildValidApproval();
  const audit = buildApprovalGrantedAuditEvent({
    approval,
    runId: "github-repo-create",
    now: fixedNow
  });

  assert.equal(audit.id, "audit-runtime-github-repo-create-approval-granted");
  assert.equal(audit.eventType, "approval_granted");
  assert.equal(audit.source, "owner_instruction");
  assert.equal(audit.relatedArtifacts[0].type, "approval");
  assert.equal(audit.relatedArtifacts[0].reference, approval.approvalId);
  assert.equal(audit.liveServiceTouched, false);
});

test("writes approval lock and audit records to a local workspace only", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "ag-os-approval-lock-"));

  try {
    const result = writeApprovalLockWithAudit({
      approval: buildValidApproval(),
      runId: "github-repo-create",
      now: fixedNow,
      root
    });

    assert.equal(result.approvalPath, ".codex/approvals/approval-20260703-github-repo-create.json");
    assert.equal(result.auditPath, ".codex/audit/audit-runtime-github-repo-create-approval-granted.json");
    const approval = JSON.parse(readFileSync(path.join(root, result.approvalPath), "utf8"));
    const audit = JSON.parse(readFileSync(path.join(root, result.auditPath), "utf8"));
    assert.equal(approval.approvalId, "approval-20260703-github-repo-create");
    assert.equal(audit.liveServiceTouched, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
