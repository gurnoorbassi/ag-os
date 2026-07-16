import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { writeAuditEventRecord } from "./audit-writer.mjs";
import { isoTimestamp, readJson, writeJson } from "./common.mjs";
import { runLocalValidation } from "./execution-dry-run-processor.mjs";
import { listExecutionAdapters, selectExecutionAdapter } from "./execution-adapter-registry.mjs";
import { activeJobApproval } from "./job-approval-service.mjs";
import { writeJobCompletionArtifacts } from "./job-completion-processor.mjs";
import { executeLocalWorkProduct } from "./local-work-product-adapter.mjs";
import { executeGitHubDraftPr } from "./github-draft-pr-adapter.mjs";
import { executeGitHubPrivateRepository } from "./github-private-repository-adapter.mjs";
import { executeN8nDisabledWorkflow } from "./n8n-disabled-workflow-adapter.mjs";
import { executeNetlifyStagingDeploy } from "./netlify-staging-adapter.mjs";
import { executeNetlifyContinuousDeployment } from "./netlify-continuous-deployment-adapter.mjs";
import { jobDeliverableSummary } from "./deliverable-service.mjs";
import { executeN8nWorkflowControl } from "./n8n-workflow-control-adapter.mjs";
import { executeProductionDeployment } from "./production-deployment-adapter.mjs";

const LIVE_JOB_PREFIX = "job-runtime-operator-";
let processing = false;
const pendingDashboardRefreshRoots = new Set();

function runDashboardBuild(root) {
  const result = spawnSync(process.execPath, ["scripts/build-dashboard.mjs"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  if (result.status !== 0) {
    throw new Error(`dashboard refresh failed: ${result.stderr || result.stdout}`);
  }
}

function refreshDashboardReadModel({ root, dashboardBuilder, required }) {
  const refreshRequired = required || pendingDashboardRefreshRoots.has(root);
  if (!refreshRequired) {
    return { attempted: false, passed: true };
  }
  try {
    dashboardBuilder(root);
    pendingDashboardRefreshRoots.delete(root);
    return { attempted: true, passed: true };
  } catch (error) {
    pendingDashboardRefreshRoots.add(root);
    return { attempted: true, passed: false, error: error.message };
  }
}

function jobPath(jobId) {
  return `.codex/jobs/${jobId}.json`;
}

function commandPath(job) {
  return `.codex/commands/${job.commandId}.json`;
}

function planPathForJob(job, root) {
  const command = readJson(commandPath(job), root);
  const expected = `.codex/plans/${command.nextRecord.planId}.json`;
  if (!existsSync(path.join(root, expected))) {
    throw new Error(`plan record is missing for ${job.jobId}`);
  }
  return expected;
}

function requiresPermanentGate(command) {
  const classification = command.classification || {};
  return command.riskLevel !== "R0" && (
    classification.requiresApproval === true ||
    classification.requiresLiveService === true ||
    classification.requiresDeployment === true ||
    classification.requiresDomainChange === true ||
    classification.requiresPaidAction === true ||
    classification.requiresProductionData === true
  );
}

function writeJobState(job, root, now, updates) {
  const next = {
    ...job,
    ...updates,
    queueTimestamps: {
      ...job.queueTimestamps,
      ...(updates.queueTimestamps || {})
    },
    updatedAt: isoTimestamp(now)
  };
  writeJson(jobPath(job.jobId), next, root);
  return next;
}

export function listAutonomousJobs({ root = process.cwd(), env = process.env, limit = 25 } = {}) {
  const directory = path.join(root, ".codex/jobs");
  if (!existsSync(directory)) return [];
  return readdirSync(directory)
    .filter((name) => name.startsWith(LIVE_JOB_PREFIX) && name.endsWith(".json"))
    .map((name) => JSON.parse(readFileSync(path.join(directory, name), "utf8")))
    .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)))
    .slice(0, Math.max(1, Math.min(limit, 100)))
    .map((job) => {
      const command = readJson(commandPath(job), root);
      const adapter = selectExecutionAdapter({ command, env });
      const approval = activeJobApproval({ job, adapter, root });
      return {
      jobId: job.jobId,
      projectId: job.projectId,
      status: job.status,
      riskLevel: job.riskLevel,
      assignedAgent: job.assignedAgent,
      approvalRequired: job.approvalRequired,
      blockedReason: job.blockedReason,
      expectedOutput: job.expectedOutput,
      qualityScorePath: job.completionEvidence?.qualityScorePath,
      lessonCandidatePaths: job.completionEvidence?.lessonCandidatePaths || [],
      deliverable: jobDeliverableSummary({ job, root }),
      adapter,
      approvalId: job.approvalId,
      approvalValid: approval.valid,
      availableDecisions: job.status === "waiting_approval"
        ? [...(approval.valid ? [] : ["approve"]), "reject", ...(approval.valid ? ["revoke"] : [])]
        : (approval.valid && ["queued", "running"].includes(job.status) ? ["revoke"] : []),
      createdAt: job.createdAt,
      updatedAt: job.updatedAt
      };
    });
}

export async function processAutonomousJob({
  jobId,
  root = process.cwd(),
  env = process.env,
  now = new Date(),
  runValidation = true,
  githubFetch = globalThis.fetch,
  n8nFetch = globalThis.fetch,
  netlifyFetch = globalThis.fetch,
  deploymentFetch = globalThis.fetch
}) {
  const sourceJob = readJson(jobPath(jobId), root);
  if (!sourceJob.jobId.startsWith(LIVE_JOB_PREFIX)) {
    throw new Error("the autonomous runner only processes authenticated owner-console jobs");
  }
  if (!["queued", "waiting_approval"].includes(sourceJob.status)) {
    return { status: "skipped", job: sourceJob, reason: `job is ${sourceJob.status}` };
  }

  const commandRecordPath = commandPath(sourceJob);
  const command = readJson(commandRecordPath, root);
  const planRecordPath = planPathForJob(sourceJob, root);
  const plan = readJson(planRecordPath, root);
  const adapter = selectExecutionAdapter({ command, env });
  const approval = activeJobApproval({ job: sourceJob, adapter, root, now });
  const permanentGate = sourceJob.approvalRequired === true || requiresPermanentGate(command) || adapter.approvalRequired;

  if (permanentGate && !approval.valid) {
    const waiting = writeJobState(sourceJob, root, now, {
      status: "waiting_approval",
      approvalRequired: true,
      blockedReason: `A permanent live-action gate requires exact owner approval before ${adapter.adapterId} can run. ${approval.reasons.join("; ")}.`
    });
    const audit = writeAuditEventRecord({
      runId: `${sourceJob.jobId}-waiting-approval`,
      eventType: "approval_requested",
      summary: `Autonomous job ${sourceJob.jobId} paused at a permanent approval gate.`,
      scope: sourceJob.jobId,
      source: "ag_os_coordinator",
      relatedArtifacts: [
        { type: "other", reference: jobPath(sourceJob.jobId) },
        { type: "other", reference: commandRecordPath }
      ],
      riskLevel: sourceJob.riskLevel,
      liveServiceTouched: false,
      notes: "No credentials, connector, deployment, message, post, DNS, paid action, production data, or customer data was touched.",
      now,
      root
    });
    return { status: "waiting_approval", job: waiting, adapter, auditPath: audit.filePath };
  }

  if (!adapter.executionReady) {
    const waiting = writeJobState(sourceJob, root, now, {
      status: "waiting_approval",
      approvalRequired: false,
      blockedReason: `${adapter.name} is approval-valid but not execution-ready: ${adapter.blockers.join("; ")}.`
    });
    return { status: "waiting_approval", job: waiting, adapter, approval: approval.approval };
  }

  const running = writeJobState(sourceJob, root, now, {
    status: "running",
    blockedReason: undefined,
    safety: {
      ...sourceJob.safety,
      credentialsAllowed: adapter.kind === "connector",
      liveServicesAllowed: adapter.kind === "connector"
    },
    queueTimestamps: { runningStartedAt: isoTimestamp(now) }
  });

  try {
    let execution;
    if (adapter.adapterId === "github-private-repository") {
      execution = await executeGitHubPrivateRepository({
          request: command.executionRequest,
          job: running,
          adapter,
          approval: approval.approval,
          token: env[["AG_OS", "GITHUB", "TOKEN"].join("_")],
          fetchImpl: githubFetch,
          now,
          root
        });
    } else if (adapter.adapterId === "github-draft-pr") {
      execution = await executeGitHubDraftPr({
          request: command.executionRequest,
          job: running,
          plan,
          adapter,
          approval: approval.approval,
          token: env[["AG_OS", "GITHUB", "TOKEN"].join("_")],
          fetchImpl: githubFetch,
          now,
          root
        });
    } else if (adapter.adapterId === "n8n-disabled-workflow") {
      execution = await executeN8nDisabledWorkflow({
        request: command.executionRequest,
        job: running,
        adapter,
        approval: approval.approval,
        credential: env[["AG_OS", "N8N", "API", "KEY"].join("_")],
        fetchImpl: n8nFetch,
        now,
        root
      });
    } else if (adapter.adapterId === "n8n-workflow-control") {
      execution = await executeN8nWorkflowControl({
        request: command.executionRequest,
        job: running,
        adapter,
        approval: approval.approval,
        credential: env[["AG_OS", "N8N", "API", "KEY"].join("_")],
        fetchImpl: n8nFetch,
        now,
        root
      });
    } else if (adapter.adapterId === "netlify-staging") {
      execution = await executeNetlifyStagingDeploy({
        request: command.executionRequest,
        job: running,
        adapter,
        approval: approval.approval,
        token: env[["AG_OS", "NETLIFY", "TOKEN"].join("_")],
        fetchImpl: netlifyFetch,
        now,
        root
      });
    } else if (adapter.adapterId === "netlify-continuous-deployment") {
      execution = await executeNetlifyContinuousDeployment({
        request: command.executionRequest,
        job: running,
        adapter,
        approval: approval.approval,
        token: env[["AG_OS", "NETLIFY", "TOKEN"].join("_")],
        fetchImpl: netlifyFetch,
        now,
        root
      });
    } else if (adapter.adapterId === "production-deployment") {
      execution = await executeProductionDeployment({
        request: command.executionRequest,
        job: running,
        adapter,
        approval: approval.approval,
        runnerUrl: env.AG_OS_DEPLOYMENT_RUNNER_URL,
        runnerToken: env.AG_OS_DEPLOYMENT_RUNNER_TOKEN,
        fetchImpl: deploymentFetch,
        now,
        root
      });
    } else {
      execution = executeLocalWorkProduct({
          job: running,
          plan,
          command,
          adapter,
          runId: running.jobId.replace(/^job-/, ""),
          now,
          root
        });
    }
    const validation = runValidation ? runLocalValidation({ root }) : { passed: true, status: 0, stdout: "", stderr: "" };
    if (!validation.passed) throw new Error(`local validation failed: ${validation.stderr || validation.stdout}`);
    const completion = writeJobCompletionArtifacts({
      job: running,
      plan,
      planRecordPath,
      commandRecordPath,
      executionRecordPath: execution.executionPath || execution.filePath,
      workProductPath: execution.workProductPath,
      deliverable: execution.deliverable,
      root,
      now
    });
    const completed = writeJobState(running, root, now, {
      status: "done",
      completionEvidence: completion.completionEvidence,
      queueTimestamps: { completedAt: isoTimestamp(now) }
    });
    const audit = writeAuditEventRecord({
      runId: `${sourceJob.jobId}-automatic-completion`,
      eventType: "validation_run",
      summary: execution.deliverable?.ownerUsable
        ? `Autonomous job ${sourceJob.jobId} created an owner-usable deliverable and completed with mandatory quality and lesson evidence.`
        : `Autonomous job ${sourceJob.jobId} completed planning evidence only with mandatory quality and lesson evidence; no finished product was claimed.`,
      scope: sourceJob.jobId,
      source: "ag_os_coordinator",
      relatedArtifacts: [
        { type: adapter.kind === "connector" ? "pull_request" : "other", reference: execution.record?.result?.pullRequestUrl || execution.executionPath },
        { type: "other", reference: execution.workProductPath },
        { type: "other", reference: completion.qualityScorePath },
        ...completion.lessonCandidatePaths.map((reference) => ({ type: "other", reference })),
        ...completion.archetypeProposalPaths.map((reference) => ({ type: "other", reference }))
      ],
      riskLevel: sourceJob.riskLevel,
      liveServiceTouched: adapter.kind === "connector",
      notes: adapter.kind === "connector"
        ? `The exact approval and ${adapter.adapterId} fail-closed gates passed. Any activation, production publish, merge, credential change, domain, DNS, message, post, or paid action remains separately blocked.`
        : "The registered local work-product adapter wrote only to the isolated AG OS state workspace and ran local validation. Permanent live-action gates remain blocked.",
      now,
      root
    });
    return { status: completed.status, job: completed, ...execution, completion, validationResult: validation, auditPath: audit.filePath };
  } catch (error) {
    const failed = writeJobState(running, root, now, {
      status: "failed",
      blockedReason: `Automatic local execution failed: ${error.message}`,
      queueTimestamps: { completedAt: isoTimestamp(now) }
    });
    const audit = writeAuditEventRecord({
      runId: `${sourceJob.jobId}-automatic-failure`,
      eventType: "validation_run",
      summary: `Autonomous local job ${sourceJob.jobId} failed closed.`,
      scope: sourceJob.jobId,
      source: "ag_os_coordinator",
      relatedArtifacts: [{ type: "other", reference: jobPath(sourceJob.jobId) }],
      riskLevel: sourceJob.riskLevel,
      liveServiceTouched: false,
      notes: error.message,
      now,
      root
    });
    return { status: "failed", job: failed, auditPath: audit.filePath, error: error.message };
  }
}

export async function processQueuedJobs({
  root = process.cwd(),
  env = process.env,
  now = new Date(),
  runValidation = true,
  dashboardBuilder = runDashboardBuild
} = {}) {
  if (processing) return { status: "busy", processed: [] };
  processing = true;
  try {
    const queued = listAutonomousJobs({ root, env, limit: 100 }).filter((job) =>
      job.status === "queued" || (job.status === "waiting_approval" && job.approvalValid && job.adapter?.executionReady)
    );
    const processed = [];
    for (const job of queued) {
      try {
        processed.push(await processAutonomousJob({ jobId: job.jobId, root, env, now, runValidation }));
      } catch (error) {
        const sourceJob = readJson(jobPath(job.jobId), root);
        const failed = writeJobState(sourceJob, root, now, {
          status: "failed",
          blockedReason: `Automatic queue recovery failed closed: ${error.message}`,
          queueTimestamps: { completedAt: isoTimestamp(now) }
        });
        writeAuditEventRecord({
          runId: `${job.jobId}-queue-recovery-failure`,
          eventType: "validation_run",
          summary: `Autonomous queue recovery for ${job.jobId} failed closed.`,
          scope: job.jobId,
          source: "ag_os_coordinator",
          relatedArtifacts: [{ type: "other", reference: jobPath(job.jobId) }],
          riskLevel: sourceJob.riskLevel,
          liveServiceTouched: false,
          notes: error.message,
          now,
          root
        });
        processed.push({ status: "failed", job: failed, error: error.message });
      }
    }
    const dashboardRefresh = refreshDashboardReadModel({
      root,
      dashboardBuilder,
      required: processed.length > 0
    });
    return { status: "complete", processed, dashboardRefresh };
  } finally {
    processing = false;
  }
}

export function autonomousExecutionStatus({ env = process.env } = {}) {
  const adapters = listExecutionAdapters({ env });
  return {
    enabled: env.AG_OS_AUTOMATION_ENABLED !== "false",
    pollIntervalSeconds: 15,
    adapter: "registered_execution_adapters_v1",
    localExecutionReady: adapters.some((adapter) => adapter.adapterId === "local-work-product" && adapter.readyForUngatedWork),
    liveAdaptersEnabled: env.AG_OS_LIVE_ADAPTERS_ENABLED === "true",
    adapters
  };
}
