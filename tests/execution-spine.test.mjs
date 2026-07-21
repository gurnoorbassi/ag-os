import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { listExecutionAdapters, selectExecutionAdapter } from "../scripts/lib/runtime/execution-adapter-registry.mjs";
import { decideJob } from "../scripts/lib/runtime/job-approval-service.mjs";
import { processAutonomousJob } from "../scripts/lib/runtime/autonomous-runner.mjs";
import { submitOwnerCommand } from "../scripts/lib/runtime/live-command-service.mjs";
import { executeGitHubDraftPr, validateGitHubDraftPrRequest } from "../scripts/lib/runtime/github-draft-pr-adapter.mjs";
import { validateN8nDisabledWorkflowRequest } from "../scripts/lib/runtime/n8n-disabled-workflow-adapter.mjs";
import { validateNetlifyStagingRequest } from "../scripts/lib/runtime/netlify-staging-adapter.mjs";
import { recordJobOutcome } from "../scripts/lib/runtime/outcome-feedback-service.mjs";
import { loadWorkerEvidence } from "../scripts/lib/runtime/worker-evidence-loader.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE_SHA = "a".repeat(40);
const DEPLOYMENT_REQUEST = {
  adapterId: "production-deployment",
  operation: "deploy_exact_commit",
  profileId: "ag-os-coordinator",
  repository: "gurnoorbassi/ag-os",
  commitSha: BASE_SHA,
  targetEnvironment: "production",
  expectedService: "ag-os-coordinator"
};

function tempWorkspace() {
  const target = mkdtempSync(path.join(tmpdir(), "ag-os-execution-spine-"));
  cpSync(root, target, {
    recursive: true,
    filter: (source) => ![".git", "node_modules"].includes(path.basename(source))
  });
  const approvalsDirectory = path.join(target, ".codex", "approvals");
  for (const name of readdirSync(approvalsDirectory)) {
    if (!name.endsWith(".json") || name.endsWith(".template.json")) continue;
    const approvalPath = path.join(approvalsDirectory, name);
    const approval = JSON.parse(readFileSync(approvalPath, "utf8"));
    if (approval.status === "approved" && approval.expiresAt && Date.parse(approval.expiresAt) <= Date.now()) {
      const archiveDirectory = path.join(approvalsDirectory, "archive");
      mkdirSync(archiveDirectory, { recursive: true });
      writeFileSync(path.join(archiveDirectory, name), `${JSON.stringify({ ...approval, status: "expired" }, null, 2)}\n`, "utf8");
      unlinkSync(approvalPath);
    }
  }
  const dashboardBuild = spawnSync(process.execPath, ["scripts/build-dashboard.mjs"], { cwd: target, encoding: "utf8" });
  if (dashboardBuild.status !== 0) throw new Error(dashboardBuild.stderr || dashboardBuild.stdout);
  return target;
}

test("registered local worker records plan evidence without claiming product completion", async () => {
  const workspace = tempWorkspace();
  const command = await submitOwnerCommand({
    command: "Create a professional internal operations dashboard for AG OS",
    projectId: "project-quote-builder",
    root: workspace,
    now: new Date("2026-07-13T23:10:00.000Z")
  });
  const result = await processAutonomousJob({
    jobId: command.jobId,
    root: workspace,
    runValidation: false,
    now: new Date("2026-07-13T23:11:00.000Z")
  });

  assert.equal(result.status, "plan_ready");
  assert.equal(result.adapter.adapterId, "local-work-product");
  assert.equal(existsSync(path.join(workspace, result.workProductPath)), true);
  assert.match(readFileSync(path.join(workspace, result.workProductPath), "utf8"), /## Owner outcome/);
  const score = JSON.parse(readFileSync(path.join(workspace, result.completion.qualityScorePath), "utf8"));
  assert.equal(score.scoreType, "plan_quality_score");
  assert.ok(score.evidence.includes(result.workProductPath));
});

test("exact owner approval requeues one job but an unavailable live adapter remains fail-closed", async () => {
  const workspace = tempWorkspace();
  const command = await submitOwnerCommand({
    command: "Deploy the AG OS dashboard to production",
    projectId: "project-quote-builder",
    executionRequest: DEPLOYMENT_REQUEST,
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
  assert.match(stillWaiting.job.blockedReason, /credential is not configured|runtime endpoint is not configured/);

  const rejected = decideJob({
    jobId: command.jobId,
    decision: "reject",
    confirmation: `REJECT ${command.jobId}`,
    root: workspace,
    now: new Date("2026-07-13T23:23:00.000Z")
  });
  assert.equal(rejected.job.status, "cancelled");
});

test("full autonomy proof builds, independently reviews, deploys an exact commit, verifies, scores, learns, and returns an owner result", async () => {
  const workspace = tempWorkspace();
  const command = await submitOwnerCommand({
    command: "Build and deploy the exact approved AG OS candidate to production",
    projectId: "project-quote-builder",
    executionRequest: DEPLOYMENT_REQUEST,
    useAiWorker: true,
    aiWorkerReadiness: { ready: true, approvalId: "approval-20260719-builder-proof", approval: { budget: { maxUsd: 0.25 } }, inputCostPerMillionUsd: 2, outputCostPerMillionUsd: 10, blockers: [] },
    aiCriticReadiness: { ready: true, required: true, approvalId: "approval-20260719-critic-proof", approval: { budget: { maxUsd: 0.25 } }, inputCostPerMillionUsd: 1, outputCostPerMillionUsd: 5, blockers: [] },
    workProductProvider: async () => ({ workProduct: { summary: "Verified deployment candidate", files: [{ path: "index.html", content: "<!doctype html><html><title>AG OS proof</title><main>Owner-ready</main></html>", purpose: "Accessible proof result" }], validationNotes: ["HTML entry exists"], qualityEvidence: ["Owner-ready index.html generated"] }, model: "builder-proof", usage: { input_tokens: 100, output_tokens: 100 } }),
    criticProvider: async () => ({ critique: { verdict: "pass", score: 9, summary: "The result is complete and owner-usable.", requirementChecks: [{ requirement: "Owner-ready output", met: true, evidence: "index.html" }], defects: [], requiredFixes: [], safetyFindings: [] }, model: "critic-proof", usage: { input_tokens: 100, output_tokens: 50 } }),
    root: workspace,
    now: new Date("2026-07-19T20:00:00.000Z")
  });
  assert.equal(command.status, "waiting_approval");
  assert.equal(command.aiCritic.verdict, "pass");
  decideJob({ jobId: command.jobId, decision: "approve", confirmation: `APPROVE ${command.jobId}`, root: workspace, now: new Date("2026-07-19T20:01:00.000Z") });
  const response = {
    status: "succeeded", profileId: "ag-os-coordinator", repository: "gurnoorbassi/ag-os", verifiedCommit: BASE_SHA,
    expectedService: "ag-os-coordinator", backupId: "backup-proof", rollbackAvailable: true,
    deploymentId: "deployment-runtime-full-autonomy-proof", health: { ok: true, checkedAt: "2026-07-19T20:02:00.000Z" }
  };
  const deployed = await processAutonomousJob({
    jobId: command.jobId,
    root: workspace,
    env: { AG_OS_LIVE_ADAPTERS_ENABLED: "true", AG_OS_DEPLOYMENT_RUNNER_TOKEN: "configured", AG_OS_DEPLOYMENT_RUNNER_URL: "http://127.0.0.1:8790" },
    deploymentFetch: async () => ({ ok: true, status: 200, json: async () => response }),
    runValidation: false,
    now: new Date("2026-07-19T20:02:00.000Z")
  });
  assert.equal(deployed.status, "done", deployed.error);
  assert.equal(deployed.record.health.ok, true);
  assert.ok(deployed.job.completionEvidence.qualityScorePath);
  assert.ok(deployed.job.completionEvidence.lessonCandidatePaths.length > 0);
  const outcome = recordJobOutcome({ jobId: command.jobId, rating: 5, reason: "Deployment and accessible result verified.", confirmation: `RATE ${command.jobId} 5`, root: workspace, now: new Date("2026-07-19T20:03:00.000Z") });
  assert.equal(outcome.record.rating, 5);
  const futureEvidence = loadWorkerEvidence({ plan: { projectId: "project-quote-builder", basis: { relevantMemory: {} } }, root: workspace });
  assert.equal(futureEvidence.outcomes.some((item) => item.outcomeId === outcome.record.outcomeId), true);
});

test("one plain owner command derives and completes an approved Netlify draft preview without owner tool configuration", async () => {
  const workspace = tempWorkspace();
  const command = await submitOwnerCommand({
    command: "Build a professional landing page and deploy a Netlify preview",
    projectId: "project-quote-builder",
    useAiWorker: true,
    aiWorkerReadiness: { ready: true, approvalId: "approval-20260719-builder-proof", approval: { budget: { maxUsd: 0.25 } }, inputCostPerMillionUsd: 2, outputCostPerMillionUsd: 10, blockers: [] },
    aiCriticReadiness: { ready: true, required: true, approvalId: "approval-20260719-critic-proof", approval: { budget: { maxUsd: 0.25 } }, inputCostPerMillionUsd: 1, outputCostPerMillionUsd: 5, blockers: [] },
    workProductProvider: async () => ({ workProduct: { summary: "Owner-ready landing page", files: [{ path: "index.html", content: "<!doctype html><html><title>Owner preview</title><main>Ready</main></html>", purpose: "Accessible preview" }], validationNotes: ["HTML entry exists"], qualityEvidence: ["Owner-ready index.html generated"] }, model: "builder-proof", usage: { input_tokens: 100, output_tokens: 100 } }),
    criticProvider: async () => ({ critique: { verdict: "pass", score: 9, summary: "The preview is owner-usable.", requirementChecks: [{ requirement: "Landing page", met: true, evidence: "index.html" }], defects: [], requiredFixes: [], safetyFindings: [] }, model: "critic-proof", usage: { input_tokens: 100, output_tokens: 50 } }),
    env: { AG_OS_NETLIFY_PREVIEW_SITE_ID: "site-owner-preview" },
    root: workspace,
    now: new Date("2026-07-19T21:00:00.000Z")
  });
  assert.equal(command.status, "waiting_approval");
  const intakePath = command.recordsCreated.find((item) => item.includes(".codex/commands/"));
  const intake = JSON.parse(readFileSync(path.join(workspace, intakePath), "utf8"));
  assert.equal(intake.executionRequest.adapterId, "netlify-staging");
  assert.equal(intake.executionRequest.siteId, "site-owner-preview");
  assert.equal(intake.executionRequest.draft, true);
  decideJob({ jobId: command.jobId, decision: "approve", confirmation: `APPROVE ${command.jobId}`, root: workspace, now: new Date("2026-07-19T21:01:00.000Z") });
  const completed = await processAutonomousJob({
    jobId: command.jobId, root: workspace,
    env: { AG_OS_LIVE_ADAPTERS_ENABLED: "true", [["AG_OS", "NETLIFY", "TOKEN"].join("_")]: "configured" },
    netlifyFetch: async (_url, options) => options.method === "POST"
      ? { ok: true, status: 200, json: async () => ({ id: "deploy-owner-proof", site_id: "site-owner-preview", draft: true, required: [] }) }
      : { ok: true, status: 200, json: async () => ({ id: "deploy-owner-proof", site_id: "site-owner-preview", draft: true, state: "ready", deploy_ssl_url: "https://deploy-owner-proof--preview.netlify.app", published_at: null }) },
    runValidation: false,
    now: new Date("2026-07-19T21:02:00.000Z")
  });
  assert.equal(completed.status, "done", completed.error);
  assert.equal(completed.record.result.deployUrl, "https://deploy-owner-proof--preview.netlify.app");
  assert.equal(completed.record.result.draft, true);
  assert.ok(completed.job.completionEvidence.qualityScorePath);
  assert.ok(completed.job.completionEvidence.lessonCandidatePaths.length > 0);
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
    projectId: "project-quote-builder",
    executionRequest: DEPLOYMENT_REQUEST,
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
  const sourceDirectory = ".codex/workspaces/project-quote-builder/job-source/deliverables";
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
    projectId: "project-quote-builder",
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
    expiresAt: "2030-07-14T23:30:00.000Z"
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
  const sourceDirectory = ".codex/workspaces/project-quote-builder/job-pr-source/deliverables";
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
    projectId: "project-quote-builder",
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

test("n8n adapter creates and verifies only an exact disabled credential-free workflow", async () => {
  const workspace = tempWorkspace();
  const executionRequest = {
    adapterId: "n8n-disabled-workflow",
    operation: "create_disabled_workflow",
    baseUrl: "https://n8n.example.test/api/v1",
    workflow: {
      name: "AG OS owner review draft",
      nodes: [{ id: "manual", name: "Manual Trigger", type: "n8n-nodes-base.manualTrigger", typeVersion: 1, position: [0, 0], parameters: {} }],
      connections: {},
      settings: {},
      active: false
    }
  };
  const validated = validateN8nDisabledWorkflowRequest({ request: executionRequest });
  assert.match(validated.workflowDigest, /^[a-f0-9]{64}$/);
  const command = await submitOwnerCommand({
    command: "Create this disabled n8n workflow draft",
    projectId: "project-quote-builder",
    executionRequest,
    root: workspace,
    now: new Date("2026-07-14T01:00:00.000Z")
  });
  const waiting = await processAutonomousJob({ jobId: command.jobId, root: workspace, runValidation: false });
  assert.equal(waiting.adapter.adapterId, "n8n-disabled-workflow");
  decideJob({ jobId: command.jobId, decision: "approve", confirmation: `APPROVE ${command.jobId}`, root: workspace, now: new Date("2026-07-14T01:01:00.000Z") });
  const calls = [];
  const completed = await processAutonomousJob({
    jobId: command.jobId,
    root: workspace,
    env: { AG_OS_LIVE_ADAPTERS_ENABLED: "true", [["AG_OS", "N8N", "API", "KEY"].join("_")]: "configured" },
    n8nFetch: async (url, options) => {
      calls.push({ url, options });
      return { ok: true, status: 200, async json() { return { id: "workflow-42", active: false }; } };
    },
    runValidation: false,
    now: new Date("2026-07-14T01:02:00.000Z")
  });
  assert.equal(completed.status, "done", completed.error);
  assert.equal(completed.record.result.active, false);
  assert.equal(calls.filter((call) => call.options.method === "POST").length, 1);
  assert.equal(calls.some((call) => /activate|execute/.test(call.url)), false);
  assert.equal(JSON.parse(calls[0].options.body).active, undefined);
  assert.ok(completed.job.completionEvidence.qualityScorePath);
  assert.throws(() => validateN8nDisabledWorkflowRequest({
    request: { ...executionRequest, workflow: { ...executionRequest.workflow, nodes: [{ ...executionRequest.workflow.nodes[0], credentials: { smtp: { id: "reference-only" } } }] } }
  }), /credential references/);
});

test("Netlify adapter deploys an exact secret-scanned draft preview without production publish", async () => {
  const workspace = tempWorkspace();
  const sourceDirectory = ".codex/workspaces/project-quote-builder/netlify-preview/deliverables";
  mkdirSync(path.join(workspace, sourceDirectory), { recursive: true });
  writeFileSync(path.join(workspace, sourceDirectory, "WORK_PRODUCT.md"), "# Private completion evidence\n", "utf8");
  writeFileSync(path.join(workspace, sourceDirectory, "index.html"), "<!doctype html><title>Preview</title>\n", "utf8");
  writeFileSync(path.join(workspace, sourceDirectory, "sitemap.xml"), "<?xml version=\"1.0\"?><urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\"></urlset>\n", "utf8");
  const safeNetlifyConfig = `[build]\npublish = "."\n\n[[headers]]\nfor = "/*"\n[headers.values]\nX-Content-Type-Options = "nosniff"\n`;
  writeFileSync(path.join(workspace, sourceDirectory, "netlify.toml"), safeNetlifyConfig, "utf8");
  const executionRequest = {
    adapterId: "netlify-staging",
    operation: "create_draft_deploy",
    siteId: "site-preview-42",
    branch: "codex/netlify-preview-proof",
    sourceDirectory,
    title: "AG OS preview proof",
    draft: true
  };
  const validated = validateNetlifyStagingRequest({ request: executionRequest, root: workspace });
  assert.equal(validated.source.files.some((file) => file.path === "WORK_PRODUCT.md"), false);
  assert.equal(validated.source.files.some((file) => file.path === "sitemap.xml"), true);
  assert.equal(validated.source.files.some((file) => file.path === "netlify.toml"), true);
  writeFileSync(path.join(workspace, sourceDirectory, "netlify.toml"), `[build]\ncommand = "npm run build"\npublish = "."\n`, "utf8");
  assert.throws(() => validateNetlifyStagingRequest({ request: executionRequest, root: workspace }), /build setting is not allowed/);
  writeFileSync(path.join(workspace, sourceDirectory, "netlify.toml"), safeNetlifyConfig, "utf8");
  const command = await submitOwnerCommand({
    command: "Create a Netlify staging preview deploy for the dashboard",
    projectId: "project-quote-builder",
    executionRequest,
    root: workspace,
    now: new Date("2026-07-14T01:10:00.000Z")
  });
  await processAutonomousJob({ jobId: command.jobId, root: workspace, runValidation: false });
  decideJob({ jobId: command.jobId, decision: "approve", confirmation: `APPROVE ${command.jobId}`, root: workspace, now: new Date("2026-07-14T01:11:00.000Z") });
  const calls = [];
  const completed = await processAutonomousJob({
    jobId: command.jobId,
    root: workspace,
    env: { AG_OS_LIVE_ADAPTERS_ENABLED: "true", [["AG_OS", "NETLIFY", "TOKEN"].join("_")]: "configured" },
    netlifyFetch: async (url, options) => {
      calls.push({ url, options });
      if (options.method === "POST") {
        const body = JSON.parse(options.body);
        return { ok: true, status: 200, async json() { return { id: "deploy-42", site_id: "site-preview-42", draft: body.draft, required: Object.values(body.files) }; } };
      }
      if (options.method === "PUT") return { ok: true, status: 200, async json() { return { id: "file-42" }; } };
      return { ok: true, status: 200, async json() { return { id: "deploy-42", site_id: "site-preview-42", draft: true, state: "ready", deploy_ssl_url: "https://deploy-42--preview.netlify.app", published_at: null }; } };
    },
    runValidation: false,
    now: new Date("2026-07-14T01:12:00.000Z")
  });
  assert.equal(completed.status, "done", completed.error);
  assert.equal(completed.record.result.draft, true);
  assert.equal(completed.record.result.state, "ready");
  const createBody = JSON.parse(calls.find((call) => call.options.method === "POST").options.body);
  assert.equal(createBody.draft, true);
  assert.equal(createBody.production, undefined);
  assert.equal(calls.some((call) => /restore|rollback|publish/.test(call.url)), false);
  assert.ok(completed.job.completionEvidence.lessonCandidatePaths.length > 0);
});
