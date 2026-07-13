import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";

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

export function evaluateOperationalSafeguards({ root = process.cwd(), now = new Date() } = {}) {
  const readinessPath = path.join(root, ".codex", "production", "production-readiness-ag-os-coordinator-v1.json");
  const readiness = existsSync(readinessPath) ? readJson(readinessPath) : null;
  const jobs = records(path.join(root, ".codex", "jobs"), (name) => name.startsWith("job-runtime-operator-"));
  const connectorExecutions = records(path.join(root, ".codex", "connectors"), (name) => name.startsWith("connector-exec-"));
  const approvals = records(path.join(root, ".codex", "approvals"));
  const nowMs = now.getTime();
  const staleRunningJobs = jobs.filter((job) => job.status === "running" && nowMs - Date.parse(job.updatedAt) > 15 * 60 * 1000);
  const failedJobs = jobs.filter((job) => job.status === "failed");
  const failedConnectorExecutions = connectorExecutions.filter((record) => ["failed", "blocked"].includes(record.status));
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
      failedJobIds: failedJobs.map((job) => job.jobId),
      failedConnectorExecutionIds: failedConnectorExecutions.map((record) => record.connectorExecutionId)
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
