import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { adapterDefinition } from "../scripts/lib/runtime/execution-adapter-registry.mjs";
import {
  executeNetlifyContinuousDeployment,
  netlifyContinuousDeploymentApprovalCriteria,
  validateNetlifyContinuousDeploymentRequest
} from "../scripts/lib/runtime/netlify-continuous-deployment-adapter.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function tempWorkspace() {
  const target = mkdtempSync(path.join(tmpdir(), "ag-os-netlify-cd-"));
  cpSync(root, target, { recursive: true, filter: (source) => ![".git", "node_modules"].includes(path.basename(source)) });
  return target;
}

test("Netlify continuous deployment links only the exact approved GitHub target", async () => {
  const workspace = tempWorkspace();
  const request = {
    adapterId: "netlify-continuous-deployment",
    operation: "link_github_repository",
    siteId: "fa4f3001-ecac-4b9a-9eb0-16de7f254b11",
    siteName: "foreman-quote-studio",
    repository: { owner: "gurnoorbassi", name: "Foreman-Quote-Maker", id: 1302187689, private: false },
    branch: "main",
    buildCommand: "npm run build",
    publishDirectory: ".next",
    stopBuilds: true,
    projectRecordPath: ".codex/projects/quote-builder.json"
  };
  const validated = validateNetlifyContinuousDeploymentRequest({ request, root: workspace });
  const job = { jobId: "job-runtime-operator-netlify-cd", projectId: "project-quote-builder", riskLevel: "R5" };
  const adapter = adapterDefinition("netlify-continuous-deployment");
  const approval = {
    approvalId: "approval-netlify-cd-test",
    status: "approved",
    projectId: job.projectId,
    approvedActions: [adapter.requestedAction],
    target: `${job.projectId}:${job.jobId}:${adapter.adapterId}`,
    inclusionCriteria: netlifyContinuousDeploymentApprovalCriteria(validated),
    expiresAt: "2026-07-16T05:00:00.000Z"
  };
  writeFileSync(path.join(workspace, ".codex/approvals", `${approval.approvalId}.json`), `${JSON.stringify(approval, null, 2)}\n`, "utf8");
  let body;
  const fetchImpl = async (_url, options) => {
    body = JSON.parse(options.body);
    return Response.json({
      name: request.siteName,
      build_settings: { provider: "github", repo_path: validated.repository, repo_branch: validated.branch, stop_builds: true }
    });
  };
  const result = await executeNetlifyContinuousDeployment({
    request,
    job,
    adapter,
    approval,
    token: "test-token-never-written",
    fetchImpl,
    root: workspace,
    now: new Date("2026-07-16T04:00:00.000Z")
  });
  assert.equal(body.repo.repo, validated.repository);
  assert.equal(body.repo.private, false);
  assert.equal(body.repo.branch, "main");
  assert.equal(body.repo.stop_builds, true);
  assert.equal(result.record.result.continuousDeploymentConnected, true);
  const project = JSON.parse(readFileSync(path.join(workspace, request.projectRecordPath), "utf8"));
  assert.equal(project.ownerWorkspace.adapters.find((entry) => entry.adapterId === adapter.adapterId).status, "connected");
});

test("private Netlify repositories fail closed without a GitHub App installation id", () => {
  assert.throws(() => validateNetlifyContinuousDeploymentRequest({
    request: {
      adapterId: "netlify-continuous-deployment",
      operation: "link_github_repository",
      siteId: "5658564d-6e64-428d-9168-f2c8154c794c",
      repository: { owner: "gurnoorbassi", name: "AG-Digitalz-Website", id: 1, private: true },
      branch: "main",
      buildCommand: "npm run build",
      publishDirectory: ".",
      stopBuilds: true,
      projectRecordPath: ".codex/projects/quote-builder.json"
    },
    root
  }), /installation id/);
});
