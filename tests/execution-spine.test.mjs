import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { listExecutionAdapters, selectExecutionAdapter } from "../scripts/lib/runtime/execution-adapter-registry.mjs";
import { decideJob } from "../scripts/lib/runtime/job-approval-service.mjs";
import { processAutonomousJob } from "../scripts/lib/runtime/autonomous-runner.mjs";
import { submitOwnerCommand } from "../scripts/lib/runtime/live-command-service.mjs";
import { executeGitHubDraftPr, validateGitHubDraftPrRequest } from "../scripts/lib/runtime/github-draft-pr-adapter.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE_SHA = "a".repeat(40);

function tempWorkspace() {
  const target = mkdtempSync(path.join(tmpdir(), "ag-os-execution-spine-"));
  cpSync(root, target, {
    recursive: true,
    filter: (source) => ![".git", "node_modules"].includes(path.basename(source))
  });
  return target;
}

test("registered local worker creates a real work product before product scoring", async () => {
  const workspace = tempWorkspace();
  const command = await submitOwnerCommand({
    command: "Create a professional internal operations dashboard for AG OS",
    projectId: "project-ag-os-coordinator-runtime",
    root: workspace,
    now: new Date("2026-07-13T23:10:00.000Z")
  });
  const result = await processAutonomousJob({
    jobId: command.jobId,
    root: workspace,
    runValidation: false,
    now: new Date("2026-07-13T23:11:00.000Z")
  });

  assert.equal(result.status, "done");
  assert.equal(result.adapter.adapterId, "local-work-product");
  assert.equal(existsSync(path.join(workspace, result.workProductPath)), true);
  assert.match(readFileSync(path.join(workspace, result.workProductPath), "utf8"), /## Owner outcome/);
  const score = JSON.parse(readFileSync(path.join(workspace, result.completion.qualityScorePath), "utf8"));
  assert.equal(score.scoreType, "product_quality_score");
  assert.ok(score.evidence.includes(result.workProductPath));
});

test("exact owner approval requeues one job but an unavailable live adapter remains fail-closed", async () => {
  const workspace = tempWorkspace();
  const command = await submitOwnerCommand({
    command: "Deploy the AG OS dashboard to production",
    projectId: "project-ag-os-coordinator-runtime",
    root: workspace,
    now: new Date("2026-07-13T23:20:00.000Z")
  });
  const waiting = await processAutonomousJob({ jobId: command.jobId, root: workspace, runValidation: false });
  assert.equal(waiting.status, "waiting_approval");
  assert.equal(waiting.adapter.adapterId, "production-deployment");

  const approved = decideJob({
    jobId: command.jobId,
    decision: "approve",
    confirmation: `APPROVE ${command.jobId}`,
    root: workspace,
    now: new Date("2026-07-13T23:21:00.000Z")
  });
  assert.equal(approved.job.status, "queued");
  assert.equal(approved.approval.approvedActions.includes("production_deployment"), true);
  assert.equal(existsSync(path.join(workspace, approved.approvalPath)), true);

  const stillWaiting = await processAutonomousJob({
    jobId: command.jobId,
    root: workspace,
    env: { AG_OS_LIVE_ADAPTERS_ENABLED: "true" },
    runValidation: false,
    now: new Date("2026-07-13T23:22:00.000Z")
  });
  assert.equal(stillWaiting.status, "waiting_approval");
  assert.equal(stillWaiting.job.approvalRequired, false);
  assert.match(stillWaiting.job.blockedReason, /transport is not installed/);

  const rejected = decideJob({
    jobId: command.jobId,
    decision: "reject",
    confirmation: `REJECT ${command.jobId}`,
    root: workspace,
    now: new Date("2026-07-13T23:23:00.000Z")
  });
  assert.equal(rejected.job.status, "cancelled");
});

test("connector adapter registry reports credential and implementation blockers without exposing values", () => {
  const adapters = listExecutionAdapters({ env: { AG_OS_LIVE_ADAPTERS_ENABLED: "true" } });
  const github = adapters.find((adapter) => adapter.adapterId === "github-draft-pr");
  assert.equal(github.credentialConfigured, false);
  assert.equal(github.executionReady, false);
  assert.match(github.blockers.join(" "), /credential is not configured/);
  assert.equal(github.implemented, true);
  assert.equal(selectExecutionAdapter({ command: "Open a draft PR on GitHub" }).adapterId, "github-draft-pr");
  const unstructured = selectExecutionAdapter({
    command: { rawCommand: "Open a draft PR on GitHub" },
    env: { AG_OS_LIVE_ADAPTERS_ENABLED: "true", AG_OS_GITHUB_TOKEN: "configured" }
  });
  assert.equal(unstructured.executionReady, false);
  assert.match(unstructured.blockers.join(" "), /executionRequest/);
  assert.equal(selectExecutionAdapter({ command: "Deploy this to production" }).adapterId, "production-deployment");
});

test("owner can immediately revoke an exact queued adapter approval", async () => {
  const workspace = tempWorkspace();
  const command = await submitOwnerCommand({
    command: "Deploy the AG OS dashboard to production",
    projectId: "project-ag-os-coordinator-runtime",
    root: workspace,
    now: new Date("2026-07-13T23:24:00.000Z")
  });
  await processAutonomousJob({ jobId: command.jobId, root: workspace, runValidation: false });
  const approved = decideJob({
    jobId: command.jobId,
    decision: "approve",
    confirmation: `APPROVE ${command.jobId}`,
    root: workspace,
    now: new Date("2026-07-13T23:25:00.000Z")
  });
  const revoked = decideJob({
    jobId: command.jobId,
    decision: "revoke",
    confirmation: `REVOKE ${command.jobId}`,
    root: workspace,
    now: new Date("2026-07-13T23:26:00.000Z")
  });
  assert.equal(revoked.approval.status, "revoked");
  assert.equal(revoked.job.status, "waiting_approval");
  assert.equal(revoked.job.approvalRequired, true);
  assert.equal(revoked.job.approvalId, approved.approval.approvalId);
});

test("GitHub adapter secret-scans an isolated work product and creates only a codex branch plus draft PR", async () => {
  const workspace = tempWorkspace();
  const sourceDirectory = ".codex/workspaces/project-ag-os-coordinator-runtime/job-source/deliverables";
  mkdirSync(path.join(workspace, sourceDirectory), { recursive: true });
  writeFileSync(path.join(workspace, sourceDirectory, "WORK_PRODUCT.md"), "# Complete work product\n", "utf8");
  writeFileSync(path.join(workspace, sourceDirectory, "app.js"), "export const ready = true;\n", "utf8");
  const request = {
    adapterId: "github-draft-pr",
    operation: "create_draft_pr",
    repository: { owner: "gurnoorbassi", name: "ag-os" },
    baseBranch: "main",
    expectedBaseCommit: BASE_SHA,
    branch: "codex/runtime-proof",
    sourceDirectory,
    title: "Runtime proof",
    body: "Review this generated work product."
  };
  const validated = validateGitHubDraftPrRequest({ request, root: workspace });
  assert.equal(validated.secretScanPassed, true);
  assert.equal(validated.source.files.length, 2);

  const calls = [];
  const responses = [
    { object: { sha: BASE_SHA } },
    { tree: { sha: "base-tree" } },
    { sha: "blob-one" },
    { sha: "blob-two" },
    { sha: "new-tree" },
    { sha: "head-sha" },
    { ref: "refs/heads/codex/runtime-proof" },
    { number: 42, html_url: "https://github.test/gurnoorbassi/ag-os/pull/42", draft: true }
  ];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options, body: options.body ? JSON.parse(options.body) : null });
    return { ok: true, status: 200, async json() { return responses.shift(); } };
  };
  const adapter = selectExecutionAdapter({
    command: { executionRequest: request },
    env: { AG_OS_LIVE_ADAPTERS_ENABLED: "true", AG_OS_GITHUB_TOKEN: "configured" }
  });
  const job = {
    jobId: "job-github-runtime-proof",
    projectId: "project-ag-os-coordinator-runtime",
    riskLevel: "R3"
  };
  const approval = {
    approvalId: "approval-20260713-github-runtime-proof",
    status: "approved",
    projectId: job.projectId,
    target: `${job.projectId}:${job.jobId}:github-draft-pr`,
    approvedActions: ["github_draft_pr_create"],
    prohibitedActions: ["merge_pull_request", "production_deployment"],
    inclusionCriteria: [
      `Job is exactly ${job.jobId}.`,
      `Repository is exactly ${validated.repository}.`,
      `Branch is exactly ${validated.branch}.`,
      `Base commit is exactly ${validated.expectedBaseCommit}.`,
      `Source digest is exactly sha256:${validated.sourceDigest}.`
    ],
    expiresAt: "2026-07-14T23:30:00.000Z"
  };
  writeFileSync(path.join(workspace, ".codex", "approvals", `${approval.approvalId}.json`), JSON.stringify(approval), "utf8");
  const result = await executeGitHubDraftPr({
    request,
    job,
    plan: { planId: "plan-github-runtime-proof" },
    adapter,
    approval,
    token: "private-test-token",
    fetchImpl,
    root: workspace,
    now: new Date("2026-07-13T23:30:00.000Z")
  });

  assert.equal(calls.at(-1).body.draft, true);
  assert.equal(calls.some((call) => call.url.includes("/merges")), false);
  assert.equal(calls.some((call) => call.options.method === "DELETE"), false);
  assert.equal(result.record.result.headCommit, "head-sha");
  assert.equal(result.record.result.secretScanPassed, true);
  assert.equal(result.record.safety.triggersDeployment, false);
  assert.equal(existsSync(path.join(workspace, result.filePath)), true);

  writeFileSync(path.join(workspace, sourceDirectory, "app.js"), "export const ready = false;\n", "utf8");
  let changedSourceCalls = 0;
  await assert.rejects(() => executeGitHubDraftPr({
    request,
    job,
    plan: { planId: "plan-github-runtime-proof" },
    adapter,
    approval,
    token: "private-test-token",
    fetchImpl: async () => {
      changedSourceCalls += 1;
      throw new Error("transport must not be reached");
    },
    root: workspace
  }), /source digest does not match/);
  assert.equal(changedSourceCalls, 0);
  writeFileSync(path.join(workspace, sourceDirectory, "app.js"), "export const ready = true;\n", "utf8");

  const secretLikeContent = `${["API", "KEY"].join("_")}=${"abcdefghijklmnopqrstuvwxyz"}`;
  writeFileSync(path.join(workspace, sourceDirectory, "leak.txt"), secretLikeContent, "utf8");
  assert.throws(() => validateGitHubDraftPrRequest({ request, root: workspace }), /secret scan failed/);
});

test("GitHub job resumes after exact owner approval and closes completion evidence", async () => {
  const workspace = tempWorkspace();
  const sourceDirectory = ".codex/workspaces/project-ag-os-coordinator-runtime/job-pr-source/deliverables";
  mkdirSync(path.join(workspace, sourceDirectory), { recursive: true });
  writeFileSync(path.join(workspace, sourceDirectory, "WORK_PRODUCT.md"), "# Reviewed source candidate\n", "utf8");
  writeFileSync(path.join(workspace, sourceDirectory, "README.md"), "# AG OS candidate\n", "utf8");
  const executionRequest = {
    adapterId: "github-draft-pr",
    operation: "create_draft_pr",
    repository: { owner: "gurnoorbassi", name: "ag-os" },
    baseBranch: "main",
    expectedBaseCommit: BASE_SHA,
    branch: "codex/approval-resume-proof",
    sourceDirectory,
    title: "Approval resume proof"
  };
  const command = await submitOwnerCommand({
    command: "Open a GitHub draft PR for the completed dashboard work product",
    projectId: "project-ag-os-coordinator-runtime",
    executionRequest,
    root: workspace,
    now: new Date("2026-07-13T23:35:00.000Z")
  });
  const waiting = await processAutonomousJob({ jobId: command.jobId, root: workspace, runValidation: false });
  assert.equal(waiting.status, "waiting_approval");
  assert.equal(waiting.adapter.adapterId, "github-draft-pr");
  decideJob({
    jobId: command.jobId,
    decision: "approve",
    confirmation: `APPROVE ${command.jobId}`,
    root: workspace,
    now: new Date("2026-07-13T23:36:00.000Z")
  });

  const responses = [
    { object: { sha: BASE_SHA } },
    { tree: { sha: "base-tree" } },
    { sha: "blob-one" },
    { sha: "blob-two" },
    { sha: "new-tree" },
    { sha: "head-sha" },
    { ref: "refs/heads/codex/approval-resume-proof" },
    { number: 77, html_url: "https://github.test/gurnoorbassi/ag-os/pull/77", draft: true }
  ];
  const completed = await processAutonomousJob({
    jobId: command.jobId,
    root: workspace,
    env: { AG_OS_LIVE_ADAPTERS_ENABLED: "true", AG_OS_GITHUB_TOKEN: "configured" },
    githubFetch: async () => ({ ok: true, status: 200, async json() { return responses.shift(); } }),
    runValidation: false,
    now: new Date("2026-07-13T23:37:00.000Z")
  });

  assert.equal(completed.status, "done", completed.error);
  assert.equal(completed.record.result.pullRequestNumber, 77);
  assert.ok(completed.job.completionEvidence.qualityScorePath);
  assert.ok(completed.job.completionEvidence.lessonCandidatePaths.length > 0);
  assert.equal(completed.job.safety.credentialsAllowed, true);
  assert.equal(completed.job.safety.liveServicesAllowed, true);
  assert.equal(completed.job.safety.deploymentAllowed, false);
});
