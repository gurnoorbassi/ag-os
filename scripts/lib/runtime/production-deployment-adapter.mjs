import process from "node:process";
import { isoTimestamp, normalizeRunId, writeJson } from "./common.mjs";
import { assertApprovalStillActive, assertExactConnectorApproval } from "./connector-approval-guard.mjs";

function safeValue(value, label, pattern, max = 200) {
  const text = String(value || "").trim();
  if (!text || text.length > max || !pattern.test(text)) throw new Error(`invalid production deployment ${label}`);
  return text;
}

export function validateDeploymentRunnerUrl(value) {
  let url;
  try { url = new URL(String(value || "")); } catch { throw new Error("deployment runner URL is invalid"); }
  const loopback = ["127.0.0.1", "localhost", "::1"].includes(url.hostname);
  if ((!loopback && url.protocol !== "https:") || (loopback && !["http:", "https:"].includes(url.protocol)) || url.username || url.password || url.search || url.hash) {
    throw new Error("deployment runner must use HTTPS, except for an authenticated loopback runner");
  }
  return url.toString().replace(/\/$/, "");
}

export function validateProductionDeploymentRequest({ request }) {
  if (request?.adapterId !== "production-deployment" || request?.operation !== "deploy_exact_commit") {
    throw new Error("executionRequest must select production-deployment and deploy_exact_commit");
  }
  return {
    profileId: safeValue(request.profileId, "profileId", /^[a-z0-9][a-z0-9-]{1,79}$/),
    repository: safeValue(request.repository, "repository", /^gurnoorbassi\/[A-Za-z0-9_.-]{1,100}$/),
    commitSha: safeValue(request.commitSha, "commitSha", /^[a-f0-9]{40}$/i, 40).toLowerCase(),
    targetEnvironment: request.targetEnvironment === "production" ? "production" : (() => { throw new Error("targetEnvironment must be production"); })(),
    expectedService: safeValue(request.expectedService, "expectedService", /^[A-Za-z0-9_.-]{2,100}$/)
  };
}

export function productionDeploymentApprovalCriteria(validated) {
  return [
    `Deployment profile is exactly ${validated.profileId}.`,
    `Repository is exactly ${validated.repository}.`,
    `Source commit is exactly ${validated.commitSha}.`,
    `Target environment is exactly ${validated.targetEnvironment}.`,
    `Expected service is exactly ${validated.expectedService}.`,
    "The allowlisted runner must create a backup, verify health, and roll back automatically on failure."
  ];
}

export async function executeProductionDeployment({ request, job, adapter, approval, runnerUrl, runnerToken, fetchImpl = globalThis.fetch, root = process.cwd(), now = new Date() }) {
  if (!runnerToken) throw new Error("deployment runner credential is not configured");
  if (typeof fetchImpl !== "function") throw new Error("deployment runner transport is unavailable");
  const endpoint = validateDeploymentRunnerUrl(runnerUrl);
  const validated = validateProductionDeploymentRequest({ request });
  assertExactConnectorApproval({ approval, job, adapter, criteria: productionDeploymentApprovalCriteria(validated) });
  assertApprovalStillActive({ approvalId: approval.approvalId, connectorName: "production deployment runner", root, now });
  const response = await fetchImpl(`${endpoint}/v1/deployments`, {
    method: "POST",
    headers: { accept: "application/json", authorization: `Bearer ${runnerToken}`, "content-type": "application/json" },
    body: JSON.stringify({
      ...validated,
      jobId: job.jobId,
      projectId: job.projectId,
      approvalId: approval.approvalId
    })
  });
  if (!response.ok) throw new Error(`deployment runner failed with HTTP ${response.status}`);
  const result = await response.json();
  if (result?.status !== "succeeded" || result.profileId !== validated.profileId || result.repository !== validated.repository ||
      String(result.verifiedCommit || "").toLowerCase() !== validated.commitSha || result.expectedService !== validated.expectedService || result.health?.ok !== true || !result.backupId) {
    throw new Error("deployment runner did not return complete exact-candidate verification evidence");
  }
  const timestamp = isoTimestamp(now);
  const runId = normalizeRunId(job.jobId.replace(/^job-/, ""));
  const record = {
    deploymentId: result.deploymentId || `deployment-${runId}`,
    status: "verified",
    projectId: job.projectId,
    environment: "production",
    source: { repository: validated.repository, commitSha: validated.commitSha },
    target: { profileId: validated.profileId, expectedService: validated.expectedService },
    approvalId: approval.approvalId,
    backup: { backupId: result.backupId, rollbackAvailable: result.rollbackAvailable === true },
    health: { ok: true, checkedAt: result.health.checkedAt || timestamp },
    safety: { exactCandidateVerified: true, allowlistedProfileUsed: true, arbitraryCommandAccepted: false, credentialStoredInEvidence: false },
    createdAt: timestamp,
    updatedAt: timestamp
  };
  const filePath = `.codex/deployments/${record.deploymentId}.json`;
  writeJson(filePath, record, root);
  return {
    record,
    filePath,
    executionPath: filePath,
    workProductPath: filePath,
    deliverable: { kind: "deployment_result", ownerUsable: true, previewAvailable: false, entryFile: "", files: [filePath] }
  };
}
