import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { writeAuditEventRecord } from "./audit-writer.mjs";
import { isoTimestamp, readJson, writeJson } from "./common.mjs";
import { writeExecutionDryRunRecords } from "./execution-dry-run-processor.mjs";

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

export function listAutonomousJobs({ root = process.cwd(), limit = 25 } = {}) {
  const directory = path.join(root, ".codex/jobs");
  if (!existsSync(directory)) return [];
  return readdirSync(directory)
    .filter((name) => name.startsWith(LIVE_JOB_PREFIX) && name.endsWith(".json"))
    .map((name) => JSON.parse(readFileSync(path.join(directory, name), "utf8")))
    .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)))
    .slice(0, Math.max(1, Math.min(limit, 100)))
    .map((job) => ({
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
      createdAt: job.createdAt,
      updatedAt: job.updatedAt
    }));
}

export function processAutonomousJob({ jobId, root = process.cwd(), now = new Date(), runValidation = true }) {
  const sourceJob = readJson(jobPath(jobId), root);
  if (!sourceJob.jobId.startsWith(LIVE_JOB_PREFIX)) {
    throw new Error("the autonomous runner only processes authenticated owner-console jobs");
  }
  if (sourceJob.status !== "queued") {
    return { status: "skipped", job: sourceJob, reason: `job is ${sourceJob.status}` };
  }

  const commandRecordPath = commandPath(sourceJob);
  const command = readJson(commandRecordPath, root);
  const planRecordPath = planPathForJob(sourceJob, root);
  const plan = readJson(planRecordPath, root);

  if (sourceJob.approvalRequired === true || requiresPermanentGate(command)) {
    const waiting = writeJobState(sourceJob, root, now, {
      status: "waiting_approval",
      approvalRequired: true,
      blockedReason: "A permanent live-action gate was detected. Exact owner approval and a registered execution adapter are required before this job can resume."
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
    return { status: "waiting_approval", job: waiting, auditPath: audit.filePath };
  }

  const running = writeJobState(sourceJob, root, now, {
    status: "running",
    blockedReason: undefined,
    queueTimestamps: { runningStartedAt: isoTimestamp(now) }
  });

  try {
    const execution = writeExecutionDryRunRecords({
      job: running,
      plan,
      jobRecordPath: jobPath(running.jobId),
      planRecordPath,
      runId: running.jobId.replace(/^job-/, ""),
      now,
      runValidation,
      root
    });
    const audit = writeAuditEventRecord({
      runId: `${sourceJob.jobId}-automatic-completion`,
      eventType: "validation_run",
      summary: execution.job.status === "done"
        ? `Autonomous local job ${sourceJob.jobId} completed with mandatory quality and lesson evidence.`
        : `Autonomous local job ${sourceJob.jobId} failed validation.`,
      scope: sourceJob.jobId,
      source: "ag_os_coordinator",
      relatedArtifacts: [
        { type: "other", reference: execution.executionPath },
        ...(execution.completion ? [
          { type: "other", reference: execution.completion.qualityScorePath },
          ...execution.completion.lessonCandidatePaths.map((reference) => ({ type: "other", reference }))
        ] : [])
      ],
      riskLevel: sourceJob.riskLevel,
      liveServiceTouched: false,
      notes: "The automatic runner executed only the built-in local validation adapter. Permanent live-action gates remain blocked.",
      now,
      root
    });
    return { status: execution.job.status, ...execution, auditPath: audit.filePath };
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

export function processQueuedJobs({
  root = process.cwd(),
  now = new Date(),
  runValidation = true,
  dashboardBuilder = runDashboardBuild
} = {}) {
  if (processing) return { status: "busy", processed: [] };
  processing = true;
  try {
    const queued = listAutonomousJobs({ root, limit: 100 }).filter((job) => job.status === "queued");
    const processed = queued.map((job) => {
      try {
        return processAutonomousJob({ jobId: job.jobId, root, now, runValidation });
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
        return { status: "failed", job: failed, error: error.message };
      }
    });
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
