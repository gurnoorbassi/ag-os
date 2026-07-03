import process from "node:process";
import { buildAuditEventRecord } from "./audit-writer.mjs";
import { DEFAULT_OWNER_ID, isoTimestamp, slugify, writeJson } from "./common.mjs";

const APPROVAL_ID_PATTERN = /^approval-[0-9]{8}-[a-z0-9]+(?:-[a-z0-9]+)*$/;

function dateStamp(now) {
  return isoTimestamp(now).slice(0, 10).replaceAll("-", "");
}

export function buildApprovalLockRecord({
  slug,
  ownerId = DEFAULT_OWNER_ID,
  requestedBy = "ag-os-runtime",
  approvedBy = DEFAULT_OWNER_ID,
  commandCategory,
  requestedAction,
  target,
  scope,
  riskLevel,
  dataClass = "internal",
  approvalRequiredFor,
  approvedActions,
  prohibitedActions,
  revocationPath,
  evidence,
  approvalText,
  approvedAt,
  expiresAt,
  now = new Date()
}) {
  const timestamp = isoTimestamp(now);
  const approvalSlug = slugify(slug || requestedAction);

  return {
    approvalId: `approval-${dateStamp(now)}-${approvalSlug}`,
    status: "approved",
    ownerId,
    requestedBy,
    approvedBy,
    commandCategory,
    requestedAction,
    target,
    scope,
    riskLevel,
    dataClass,
    approvalRequiredFor,
    approvedActions,
    prohibitedActions,
    revocationPath: revocationPath || "Owner can revoke this approval by creating a revoked approval lock record or replacing this record with status revoked before expiration.",
    evidence,
    ...(approvalText ? { approvalText } : {}),
    approvedAt: approvedAt || timestamp,
    expiresAt,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

export function validateApprovalLockRecord(approval) {
  const errors = [];

  if (!approval?.approvalId || !APPROVAL_ID_PATTERN.test(approval.approvalId)) {
    errors.push("approvalId must match approval-YYYYMMDD-slug");
  }

  if (!["approved", "expired", "revoked"].includes(approval?.status)) {
    errors.push("status must be approved, expired, or revoked");
  }

  if (!approval?.approvedBy) {
    errors.push("approvedBy is required");
  }

  if (!Array.isArray(approval?.evidence) || approval.evidence.length === 0) {
    errors.push("evidence must not be empty");
  }

  if (!Array.isArray(approval?.approvedActions) || approval.approvedActions.length === 0) {
    errors.push("approvedActions must not be empty");
  }

  if (!approval?.scope) {
    errors.push("scope is required");
  }

  if (!approval?.expiresAt) {
    errors.push("expiresAt is required");
  }

  if (!approval?.revocationPath) {
    errors.push("revocationPath is required");
  }

  if (!approval?.createdAt) {
    errors.push("createdAt is required");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function revokeApprovalLock({ approval, reason, now = new Date() }) {
  return {
    ...approval,
    status: "revoked",
    revocationPath: reason || "Owner revoked this approval lock.",
    updatedAt: isoTimestamp(now)
  };
}

export function expireApprovalLock({ approval, now = new Date() }) {
  return {
    ...approval,
    status: "expired",
    revocationPath: `Approval expired at ${approval.expiresAt || isoTimestamp(now)} and is no longer valid for gated actions.`,
    updatedAt: isoTimestamp(now)
  };
}

export function buildApprovalGrantedAuditEvent({ approval, runId, now = new Date() }) {
  return buildAuditEventRecord({
    runId: `${runId || approval.approvalId}-approval-granted`,
    actor: approval.approvedBy,
    eventType: "approval_granted",
    summary: `Approval lock ${approval.approvalId} created for ${approval.requestedAction}.`,
    scope: approval.scope,
    source: "owner_instruction",
    relatedArtifacts: [
      {
        type: "approval",
        reference: approval.approvalId
      }
    ],
    riskLevel: approval.riskLevel,
    dataClassification: approval.dataClass,
    liveServiceTouched: false,
    notes: "Local approval lock record only. No live service, credential, deployment, domain, paid, production, or customer-data action was performed.",
    now
  });
}

export function writeApprovalLockWithAudit({
  approval,
  runId,
  now,
  root = process.cwd()
}) {
  const validation = validateApprovalLockRecord(approval);
  if (!validation.valid) {
    throw new Error(`approval lock invalid: ${validation.errors.join("; ")}`);
  }

  const audit = buildApprovalGrantedAuditEvent({ approval, runId, now });
  const approvalPath = `.codex/approvals/${approval.approvalId}.json`;
  const auditPath = `.codex/audit/${audit.id}.json`;
  writeJson(approvalPath, approval, root);
  writeJson(auditPath, audit, root);

  return {
    approvalPath,
    auditPath,
    approval,
    audit
  };
}
