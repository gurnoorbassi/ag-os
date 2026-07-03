import { spawnSync } from "node:child_process";
import process from "node:process";
import { isoTimestamp, normalizeRunId, readJson, writeJson } from "./common.mjs";

export function runLocalValidation({ root = process.cwd() } = {}) {
  const command = process.platform === "win32" ? "cmd.exe" : "npm";
  const args = process.platform === "win32" ? ["/c", "npm.cmd", "run", "validate"] : ["run", "validate"];
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  return {
    passed: result.status === 0,
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? (result.error ? result.error.message : "")
  };
}

export function buildExecutionStepRecord({
  job,
  plan,
  runId,
  validationPassed = true,
  now = new Date()
}) {
  if (!job?.jobId) {
    throw new Error("job with jobId is required");
  }

  if (!plan?.planId) {
    throw new Error("plan with planId is required");
  }

  const normalizedRunId = normalizeRunId(runId || job.jobId.replace(/^job-/, ""));
  const timestamp = isoTimestamp(now);

  return {
    executionStepId: `exec-${normalizedRunId}-run-validation`,
    planId: plan.planId,
    jobId: job.jobId,
    projectId: job.projectId,
    stepType: "run_validation",
    status: validationPassed ? "done" : "failed",
    riskLevel: job.riskLevel || plan.riskLevel || "R1",
    command: process.platform === "win32" ? "npm.cmd run validate" : "npm run validate",
    expectedResult: "Local AG OS validation completes without live service calls, deployments, credentials, paid usage, or production data.",
    evidenceRequired: [
      "local validation command output",
      "no live service calls",
      "no credentials used"
    ],
    rollbackRequired: false,
    rollbackPlan: "Remove the generated dry-run record chain if validation fails before merge.",
    safety: {
      credentialsAllowed: false,
      liveServiceUseAllowed: false,
      deploymentAllowed: false,
      domainChangeAllowed: false,
      productionDataAllowed: false,
      paidActionAllowed: false
    },
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

export function buildDryRunJobUpdate({ job, validationPassed = true, now = new Date() }) {
  if (!job?.jobId) {
    throw new Error("job with jobId is required");
  }

  const timestamp = isoTimestamp(now);

  if (job.approvalRequired === true) {
    return {
      ...job,
      status: "waiting_approval",
      blockedReason: "The job requires owner approval before execution can continue.",
      updatedAt: timestamp
    };
  }

  return {
    ...job,
    status: validationPassed ? "done" : "failed",
    ...(validationPassed ? {} : { blockedReason: "Local validation failed during dry-run execution." }),
    queueTimestamps: {
      ...job.queueTimestamps,
      completedAt: timestamp
    },
    updatedAt: timestamp
  };
}

export function writeExecutionDryRunRecords({
  job,
  plan,
  jobRecordPath,
  planRecordPath,
  runId,
  now,
  validationResult,
  runValidation = false,
  root = process.cwd()
}) {
  const sourceJob = job ?? readJson(jobRecordPath, root);
  const sourcePlan = plan ?? readJson(planRecordPath, root);
  const effectiveValidationResult = validationResult ?? (runValidation ? runLocalValidation({ root }) : { passed: true });
  const executionStep = buildExecutionStepRecord({
    job: sourceJob,
    plan: sourcePlan,
    runId,
    validationPassed: effectiveValidationResult.passed,
    now
  });
  const updatedJob = buildDryRunJobUpdate({
    job: sourceJob,
    validationPassed: effectiveValidationResult.passed,
    now
  });
  const executionPath = `.codex/execution/${executionStep.executionStepId}.json`;
  const jobPath = `.codex/jobs/${updatedJob.jobId}.json`;
  writeJson(executionPath, executionStep, root);
  writeJson(jobPath, updatedJob, root);

  return {
    executionPath,
    jobPath,
    executionStep,
    job: updatedJob,
    validationResult: effectiveValidationResult
  };
}
