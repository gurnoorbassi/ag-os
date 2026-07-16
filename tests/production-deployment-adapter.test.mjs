import assert from "node:assert/strict";
import { cpSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { selectExecutionAdapter } from "../scripts/lib/runtime/execution-adapter-registry.mjs";
import { executeProductionDeployment, productionDeploymentApprovalCriteria, validateProductionDeploymentRequest } from "../scripts/lib/runtime/production-deployment-adapter.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const COMMIT = "b".repeat(40);

function tempWorkspace() {
  const target = mkdtempSync(path.join(tmpdir(), "ag-os-deploy-adapter-"));
  cpSync(root, target, { recursive: true, filter: (source) => ![".git", "node_modules"].includes(path.basename(source)) });
  return target;
}

test("production deployment uses an exact allowlisted runner request and records verified non-secret evidence", async () => {
  const workspace = tempWorkspace();
  const request = {
    adapterId: "production-deployment",
    operation: "deploy_exact_commit",
    profileId: "ag-os-coordinator",
    repository: "gurnoorbassi/ag-os",
    commitSha: COMMIT,
    targetEnvironment: "production",
    expectedService: "ag-os-coordinator"
  };
  const validated = validateProductionDeploymentRequest({ request });
  const adapter = selectExecutionAdapter({ command: { executionRequest: request }, env: { AG_OS_LIVE_ADAPTERS_ENABLED: "true", [["AG_OS", "DEPLOYMENT", "RUNNER", "TOKEN"].join("_")]: "configured", [["AG_OS", "DEPLOYMENT", "RUNNER", "URL"].join("_")]: "http://127.0.0.1:8790" } });
  assert.equal(adapter.executionReady, true);
  const job = { jobId: "job-deploy-control", projectId: "project-quote-builder", riskLevel: "R5" };
  const approval = {
    approvalId: "approval-deploy-control",
    status: "approved",
    projectId: job.projectId,
    target: `${job.projectId}:${job.jobId}:${adapter.adapterId}`,
    approvedActions: [adapter.requestedAction],
    prohibitedActions: ["dns_change", "credential_change"],
    inclusionCriteria: [`Job is exactly ${job.jobId}.`, ...productionDeploymentApprovalCriteria(validated)],
    expiresAt: "2030-01-01T00:00:00.000Z"
  };
  writeFileSync(path.join(workspace, ".codex", "approvals", `${approval.approvalId}.json`), JSON.stringify(approval), "utf8");
  let sent;
  const privateCredential = ["private", "runner", "token"].join("-");
  const result = await executeProductionDeployment({
    request, job, adapter, approval, runnerUrl: "http://127.0.0.1:8790", runnerToken: privateCredential, root: workspace,
    fetchImpl: async (url, options) => {
      sent = { url, options, body: JSON.parse(options.body) };
      return { ok: true, status: 200, async json() { return { status: "succeeded", deploymentId: "deployment-proof", profileId: validated.profileId, repository: validated.repository, verifiedCommit: COMMIT, expectedService: validated.expectedService, backupId: "backup-proof", rollbackAvailable: true, health: { ok: true } }; } };
    },
    now: new Date("2026-07-16T05:00:00.000Z")
  });
  assert.equal(sent.body.commitSha, COMMIT);
  assert.equal(sent.body.approvalId, approval.approvalId);
  assert.equal(result.record.health.ok, true);
  assert.equal(JSON.stringify(result.record).includes(privateCredential), false);
});
