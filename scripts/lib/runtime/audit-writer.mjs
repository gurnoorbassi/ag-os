import process from "node:process";
import { DEFAULT_OWNER_ID, isoTimestamp, normalizeRunId, readJson, writeJson } from "./common.mjs";

function mapRiskLevel(riskLevel) {
  if (riskLevel === "R0") {
    return "none";
  }

  if (riskLevel === "R1" || riskLevel === "R2") {
    return "low";
  }

  if (riskLevel === "R3" || riskLevel === "R4") {
    return "medium";
  }

  if (riskLevel === "R5") {
    return "high";
  }

  return "critical";
}

export function buildAuditEventRecord({
  runId,
  actor = DEFAULT_OWNER_ID,
  eventType = "validation_run",
  summary,
  scope = "runtime_processor_dry_run",
  source = "local_validation",
  relatedArtifacts = [],
  riskLevel = "R1",
  dataClassification = "internal",
  liveServiceTouched = false,
  notes,
  now = new Date()
}) {
  if (!summary) {
    throw new Error("summary is required");
  }

  const normalizedRunId = normalizeRunId(runId || summary);
  const timestamp = isoTimestamp(now);

  return {
    id: `audit-${normalizedRunId}`,
    occurredAt: timestamp,
    actor,
    eventType,
    summary,
    scope,
    source,
    relatedArtifacts,
    riskLevel: mapRiskLevel(riskLevel),
    dataClassification,
    liveServiceTouched,
    ...(notes ? { notes } : {}),
    createdAt: timestamp
  };
}

export function applyApprovalGateToJob({
  job,
  gatedActionRequested = false,
  reason = "Gated action requires owner approval before execution.",
  approvalId,
  now = new Date()
}) {
  if (!job?.jobId) {
    throw new Error("job with jobId is required");
  }

  if (!gatedActionRequested) {
    return { ...job };
  }

  return {
    ...job,
    status: "waiting_approval",
    approvalRequired: true,
    ...(approvalId ? { approvalId } : {}),
    blockedReason: reason,
    updatedAt: isoTimestamp(now)
  };
}

export function writeAuditEventRecord({
  auditEvent,
  runId,
  actor,
  eventType,
  summary,
  scope,
  source,
  relatedArtifacts,
  riskLevel,
  dataClassification,
  liveServiceTouched,
  notes,
  now,
  root = process.cwd()
}) {
  const record = auditEvent ?? buildAuditEventRecord({
    runId,
    actor,
    eventType,
    summary,
    scope,
    source,
    relatedArtifacts,
    riskLevel,
    dataClassification,
    liveServiceTouched,
    notes,
    now
  });
  const filePath = `.codex/audit/${record.id}.json`;
  writeJson(filePath, record, root);
  return { filePath, record };
}

export function writeApprovalGateJobUpdate({
  job,
  jobRecordPath,
  gatedActionRequested,
  reason,
  approvalId,
  now,
  root = process.cwd()
}) {
  const sourceJob = job ?? readJson(jobRecordPath, root);
  const record = applyApprovalGateToJob({
    job: sourceJob,
    gatedActionRequested,
    reason,
    approvalId,
    now
  });
  const filePath = `.codex/jobs/${record.jobId}.json`;
  writeJson(filePath, record, root);
  return { filePath, record };
}
