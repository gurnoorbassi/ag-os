import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildCommandIntakeRecord } from "../scripts/lib/runtime/command-intake-processor.mjs";
import { buildJobRecord } from "../scripts/lib/runtime/job-queue-processor.mjs";
import { buildTaskRouteRecord } from "../scripts/lib/runtime/task-router-processor.mjs";
import { buildPlanRecord } from "../scripts/lib/runtime/planner-processor.mjs";
import {
  buildDryRunJobUpdate,
  buildExecutionStepRecord,
  writeExecutionDryRunRecords
} from "../scripts/lib/runtime/execution-dry-run-processor.mjs";

const fixedNow = new Date("2026-07-03T12:00:00.000Z");

function buildChain() {
  const commandIntake = buildCommandIntakeRecord({
    command: "make me a construction website",
    runId: "construction-website-dry-run",
    now: fixedNow
  });
  const job = buildJobRecord({ commandIntake, now: fixedNow });
  const route = buildTaskRouteRecord({ job, now: fixedNow });
  const plan = buildPlanRecord({ route, job, commandIntake, now: fixedNow });
  return { job, plan };
}

test("builds a completed local validation execution step", () => {
  const { job, plan } = buildChain();
  const record = buildExecutionStepRecord({
    job,
    plan,
    now: fixedNow
  });

  assert.equal(record.executionStepId, "exec-runtime-construction-website-dry-run-run-validation");
  assert.equal(record.planId, "plan-runtime-construction-website-dry-run");
  assert.equal(record.jobId, "job-runtime-construction-website-dry-run");
  assert.equal(record.stepType, "run_validation");
  assert.equal(record.status, "done");
  assert.equal(record.rollbackRequired, false);
  assert.deepEqual(record.safety, {
    credentialsAllowed: false,
    liveServiceUseAllowed: false,
    deploymentAllowed: false,
    domainChangeAllowed: false,
    productionDataAllowed: false,
    paidActionAllowed: false
  });
  assert.equal(JSON.stringify(record).includes("REQUIRED_"), false);
});

test("marks dry-run jobs done, failed, or waiting_approval based on local state", () => {
  const { job } = buildChain();

  assert.equal(buildDryRunJobUpdate({ job, validationPassed: true, now: fixedNow }).status, "done");
  assert.equal(buildDryRunJobUpdate({ job, validationPassed: false, now: fixedNow }).status, "failed");
  assert.equal(buildDryRunJobUpdate({
    job: {
      ...job,
      approvalRequired: true
    },
    validationPassed: true,
    now: fixedNow
  }).status, "waiting_approval");
});

test("writes execution step and updated job records to a local workspace only", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "ag-os-execution-"));
  const { job, plan } = buildChain();

  try {
    const result = writeExecutionDryRunRecords({
      job,
      plan,
      validationResult: { passed: true, status: 0, stdout: "", stderr: "" },
      now: fixedNow,
      root
    });

    assert.equal(result.executionPath, ".codex/execution/exec-runtime-construction-website-dry-run-run-validation.json");
    assert.equal(result.jobPath, ".codex/jobs/job-runtime-construction-website-dry-run.json");
    const executionStep = JSON.parse(readFileSync(path.join(root, result.executionPath), "utf8"));
    const updatedJob = JSON.parse(readFileSync(path.join(root, result.jobPath), "utf8"));
    assert.equal(executionStep.status, "done");
    assert.equal(updatedJob.status, "done");
    assert.equal(executionStep.safety.liveServiceUseAllowed, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
