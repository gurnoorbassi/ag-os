import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildCommandIntakeRecord } from "../scripts/lib/runtime/command-intake-processor.mjs";
import { buildJobRecord } from "../scripts/lib/runtime/job-queue-processor.mjs";
import { buildTaskRouteRecord } from "../scripts/lib/runtime/task-router-processor.mjs";
import {
  buildPlanRecord,
  writePlanRecord
} from "../scripts/lib/runtime/planner-processor.mjs";

const fixedNow = new Date("2026-07-03T12:00:00.000Z");

function buildChain() {
  const commandIntake = buildCommandIntakeRecord({
    command: "make me a construction website",
    runId: "construction-website-dry-run",
    now: fixedNow
  });
  const job = buildJobRecord({ commandIntake, now: fixedNow });
  const route = buildTaskRouteRecord({ job, now: fixedNow });
  return { commandIntake, job, route };
}

test("builds a deterministic local dry-run plan for a construction website", () => {
  const { commandIntake, job, route } = buildChain();
  const record = buildPlanRecord({
    route,
    job,
    commandIntake,
    now: fixedNow
  });

  assert.equal(record.planId, "plan-runtime-construction-website-dry-run");
  assert.equal(record.jobId, "job-runtime-construction-website-dry-run");
  assert.equal(record.commandId, "command-intake-runtime-construction-website-dry-run");
  assert.equal(record.projectId, "project-unregistered-construction-website");
  assert.equal(record.summary.includes("Detected project type: website"), true);
  assert.equal(record.estimatedCostUsd, 0);
  assert.equal(record.tools.includes("local-filesystem"), true);
  assert.equal(record.tasks.length, 4);
  assert.equal(record.tasks.every((item) => item.taskId.startsWith("work-")), true);
  assert.equal(record.approvalGates.length, 4);
  assert.equal(record.approvalGates.every((gate) => gate.approvalRequired === true), true);
  assert.equal(record.stopConditions.some((condition) => condition.includes("deployment")), true);
  assert.deepEqual(record.safety, {
    executionAuthorized: false,
    liveServiceUseAllowed: false,
    deploymentAllowed: false,
    productionDataAllowed: false,
    paidActionAllowed: false
  });
  assert.equal(JSON.stringify(record).includes("REQUIRED_"), false);
});

test("writes plan records to a local workspace only", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "ag-os-planner-"));
  const { commandIntake, job, route } = buildChain();

  try {
    const result = writePlanRecord({
      route,
      job,
      commandIntake,
      now: fixedNow,
      root
    });

    assert.equal(result.filePath, ".codex/plans/plan-runtime-construction-website-dry-run.json");
    const written = JSON.parse(readFileSync(path.join(root, result.filePath), "utf8"));
    assert.equal(written.planId, result.record.planId);
    assert.equal(written.safety.liveServiceUseAllowed, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
