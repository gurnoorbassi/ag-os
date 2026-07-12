import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
const completionEvidence = {
  policyVersion: 1,
  qualityScorePath: ".codex/quality-scores/quality-score-runtime-construction-website-dry-run.json",
  lessonCandidatePaths: [
    ".codex/memory/lessons/candidates/lesson-runtime-construction-website-dry-run-01.json"
  ],
  generatedBy: "scripts/lib/runtime/job-completion-processor.mjs"
};

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

test("marks dry-run jobs done only with completion evidence, or failed/waiting approval", () => {
  const { job } = buildChain();

  assert.throws(
    () => buildDryRunJobUpdate({ job, validationPassed: true, now: fixedNow }),
    /completed jobs require quality score and lesson candidate evidence/
  );
  assert.equal(buildDryRunJobUpdate({
    job,
    validationPassed: true,
    completionEvidence,
    now: fixedNow
  }).status, "done");
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
    const planRecordPath = `.codex/plans/${plan.planId}.json`;
    const planAbsolutePath = path.join(root, planRecordPath);
    const archetypeAbsolutePath = path.join(root, ".codex/archetypes/website.json");
    mkdirSync(path.dirname(planAbsolutePath), { recursive: true });
    mkdirSync(path.dirname(archetypeAbsolutePath), { recursive: true });
    writeFileSync(planAbsolutePath, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
    writeFileSync(
      archetypeAbsolutePath,
      readFileSync(path.join(process.cwd(), ".codex/archetypes/website.json"), "utf8"),
      "utf8"
    );

    const result = writeExecutionDryRunRecords({
      job,
      plan,
      planRecordPath,
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
    assert.equal(updatedJob.completionEvidence.policyVersion, 1);
    assert.equal(result.completion.qualityScore.status, "candidate");
    assert.equal(result.completion.qualityScore.scoreType, "plan_quality_score");
    assert.ok(result.completion.lessonCandidatePaths.length >= 1);
    assert.equal(
      result.completion.qualityScore.lessonCandidates.length,
      result.completion.lessonCandidatePaths.length
    );
    for (const evidencePath of [
      result.completion.qualityScorePath,
      ...result.completion.lessonCandidatePaths
    ]) {
      assert.equal(Boolean(readFileSync(path.join(root, evidencePath), "utf8")), true);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
