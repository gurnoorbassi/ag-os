import { existsSync, readFileSync, readdirSync, unlinkSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { buildAuditEventRecord, writeAuditEventRecord } from "./audit-writer.mjs";
import { DEFAULT_OWNER_ID, isoTimestamp, slugify, writeJson } from "./common.mjs";

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function records(directory, predicate = () => true) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory)
    .filter((name) => name.endsWith(".json") && !name.includes("template"))
    .filter(predicate)
    .map((name) => {
      try { return readJson(path.join(directory, name)); } catch { return null; }
    })
    .filter(Boolean);
}

function readinessCheck(record, checkId) {
  const check = record?.requiredChecks?.find((item) => item.checkId === checkId);
  return {
    status: check?.status || "missing",
    evidence: check?.evidence || []
  };
}

function resolutionRecords(root) {
  return records(
    path.join(root, ".codex", "watchdog"),
    (name) => name.startsWith("watchdog-resolution-")
  ).filter((record) => record.status === "resolved" && typeof record.scope === "string");
}

function unresolvedOperationalFindings({ jobs, connectorExecutions, root }) {
  const resolutions = new Map(resolutionRecords(root).map((record) => [record.scope, record]));
  const findings = [
    ...jobs.filter((job) => job.status === "failed").map((job) => ({
      findingId: job.jobId,
      findingType: "failed_job",
      status: job.status,
      detail: job.blockedReason || "Job failed without a recorded reason.",
      updatedAt: job.updatedAt,
      recordPath: `.codex/jobs/${job.jobId}.json`
    })),
    ...connectorExecutions.filter((record) => ["failed", "blocked"].includes(record.status)).map((record) => ({
      findingId: record.connectorExecutionId,
      findingType: "connector_execution",
      status: record.status,
      detail: record.result?.blockedReason || record.notes || "Connector execution did not complete.",
      updatedAt: record.updatedAt,
      recordPath: `.codex/connectors/${record.connectorExecutionId}.json`
    }))
  ];
  return {
    active: findings.filter((finding) => !resolutions.has(finding.findingId)),
    resolved: findings.filter((finding) => resolutions.has(finding.findingId)).map((finding) => ({
      ...finding,
      resolvedAt: resolutions.get(finding.findingId).updatedAt
    }))
  };
}

export function resolveOperationalFinding({
  findingId,
  reason,
  confirmation,
  root = process.cwd(),
  now = new Date()
} = {}) {
  if (!/^(?:job|connector-exec)-[a-z0-9-]+$/.test(findingId ?? "")) {
    throw new Error("a valid failed job or connector execution ID is required");
  }
  if (confirmation !== `RESOLVE ${findingId}`) {
    throw new Error(`confirmation must equal RESOLVE ${findingId}`);
  }
  if (typeof reason !== "string" || reason.trim().length < 8) {
    throw new Error("a resolution reason of at least 8 characters is required");
  }
  const jobs = records(path.join(root, ".codex", "jobs"), (name) => name.startsWith("job-runtime-operator-"));
  const connectorExecutions = records(path.join(root, ".codex", "connectors"), (name) => name.startsWith("connector-exec-"));
  const findings = unresolvedOperationalFindings({ jobs, connectorExecutions, root });
  const finding = findings.active.find((item) => item.findingId === findingId);
  if (!finding) throw new Error(`active operational finding not found: ${findingId}`);

  const timestamp = isoTimestamp(now);
  const resolution = {
    "$schema": "../../schemas/watchdog-check.schema.json",
    watchdogCheckId: `watchdog-resolution-${slugify(findingId)}`,
    status: "resolved",
    checkType: finding.findingType === "failed_job" ? "incident" : "connector",
    scope: findingId,
    severity: "info",
    finding: `Owner acknowledged ${finding.findingType.replaceAll("_", " ")} ${findingId}: ${reason.trim()}`,
    evidence: [finding.recordPath],
    blockedAction: false,
    recommendedAction: "No current action is required. The original failure remains preserved in history.",
    safety: {
      usesLiveMonitoring: false,
      usesCredentials: false,
      callsConnector: false,
      sendsAlert: false,
      triggersDeployment: false
    },
    createdAt: timestamp,
    updatedAt: timestamp
  };
  const recordPath = `.codex/watchdog/${resolution.watchdogCheckId}.json`;
  writeJson(recordPath, resolution, root);
  try {
    const audit = buildAuditEventRecord({
      runId: `watchdog-resolve-${findingId}-${timestamp}`,
      actor: DEFAULT_OWNER_ID,
      eventType: "validation_run",
      summary: `Owner resolved Watchdog attention for ${findingId} without deleting or retrying the original record.`,
      scope: findingId,
      source: "owner_instruction",
      relatedArtifacts: [
        { type: "other", reference: finding.recordPath },
        { type: "other", reference: recordPath }
      ],
      riskLevel: "R2",
      liveServiceTouched: false,
      notes: reason.trim(),
      now
    });
    const auditResult = writeAuditEventRecord({ auditEvent: audit, root });
    return { finding, resolution, recordPath, auditPath: auditResult.filePath };
  } catch (error) {
    unlinkSync(path.join(root, recordPath));
    throw error;
  }
}

export function evaluateOperationalSafeguards({ root = process.cwd(), now = new Date() } = {}) {
  const readinessPath = path.join(root, ".codex", "production", "production-readiness-ag-os-coordinator-v1.json");
  const readiness = existsSync(readinessPath) ? readJson(readinessPath) : null;
  const jobs = records(path.join(root, ".codex", "jobs"), (name) => name.startsWith("job-runtime-operator-"));
  const connectorExecutions = records(path.join(root, ".codex", "connectors"), (name) => name.startsWith("connector-exec-"));
  const approvals = records(path.join(root, ".codex", "approvals"));
  const nowMs = now.getTime();
  const staleRunningJobs = jobs.filter((job) => job.status === "running" && nowMs - Date.parse(job.updatedAt) > 15 * 60 * 1000);
  const operationalFindings = unresolvedOperationalFindings({ jobs, connectorExecutions, root });
  const failedJobs = operationalFindings.active.filter((finding) => finding.findingType === "failed_job");
  const failedConnectorExecutions = operationalFindings.active.filter((finding) => finding.findingType === "connector_execution");
  const activeApprovals = approvals.filter((approval) => approval.status === "approved" && Date.parse(approval.expiresAt) > nowMs);
  const approvalsWithoutRevocation = activeApprovals.filter((approval) => !approval.revocationPath || approval.revocableImmediately === false);
  const restore = readinessCheck(readiness, "rollback_restore_drill");
  const monitoring = readinessCheck(readiness, "monitoring_active");
  const credentials = readinessCheck(readiness, "credential_rotation_revocation_ready");
  const candidateCi = readinessCheck(readiness, "validation_security_ci_passed");
  const exactApproval = readinessCheck(readiness, "exact_production_approval_active");
  const internalStateFindingCount = staleRunningJobs.length + failedJobs.length + failedConnectorExecutions.length;

  return {
    status: internalStateFindingCount === 0 ? "ready" : "attention",
    checkedAt: now.toISOString(),
    internalActionMonitoring: {
      status: internalStateFindingCount === 0 ? "pass" : "warning",
      usesLiveMonitoring: false,
      jobsChecked: jobs.length,
      connectorExecutionsChecked: connectorExecutions.length,
      staleRunningJobIds: staleRunningJobs.map((job) => job.jobId),
      failedJobIds: failedJobs.map((finding) => finding.findingId),
      failedConnectorExecutionIds: failedConnectorExecutions.map((finding) => finding.findingId),
      findings: operationalFindings.active,
      resolvedFindingIds: operationalFindings.resolved.map((finding) => finding.findingId)
    },
    approvalRevocation: {
      status: approvalsWithoutRevocation.length === 0 ? "pass" : "blocked",
      activeApprovalsChecked: activeApprovals.length,
      approvalsWithoutRevocation: approvalsWithoutRevocation.map((approval) => approval.approvalId),
      exactConfirmationRequired: true,
      connectorMutationsRecheckApproval: true
    },
    restoreDrill: restore,
    externalMonitoring: monitoring,
    credentialRotationRevocation: credentials,
    exactCandidateCi: candidateCi,
    exactProductionApproval: exactApproval,
    externalActionActivationAllowed: readiness?.activationAllowed === true && internalStateFindingCount === 0 && approvalsWithoutRevocation.length === 0,
    boundaries: {
      liveMonitoringPerformedByThisCheck: false,
      credentialsRead: false,
      connectorCalled: false,
      notificationSent: false,
      deploymentTriggered: false
    }
  };
}
