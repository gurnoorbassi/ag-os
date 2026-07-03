import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildCommandIntakeRecord } from "../scripts/lib/runtime/command-intake-processor.mjs";
import { buildJobRecord } from "../scripts/lib/runtime/job-queue-processor.mjs";
import {
  buildTaskRouteRecord,
  writeTaskRouteRecord
} from "../scripts/lib/runtime/task-router-processor.mjs";

const fixedNow = new Date("2026-07-03T12:00:00.000Z");

function buildJob() {
  const commandIntake = buildCommandIntakeRecord({
    command: "make me a construction website",
    runId: "construction-website-dry-run",
    now: fixedNow
  });

  return buildJobRecord({ commandIntake, now: fixedNow });
}

test("routes a plan-only website job to the planner foundation", () => {
  const record = buildTaskRouteRecord({
    job: buildJob(),
    now: fixedNow
  });

  assert.equal(record.routeId, "route-runtime-construction-website-dry-run");
  assert.equal(record.jobId, "job-runtime-construction-website-dry-run");
  assert.equal(record.commandType, "plan_only");
  assert.equal(record.projectId, "project-unregistered-construction-website");
  assert.equal(record.riskLevel, "R1");
  assert.deepEqual(record.connectorNeeds, []);
  assert.equal(record.targetDomain, "planner");
  assert.equal(record.targetAgent, "planner-foundation");
  assert.equal(record.approvalGates.includes("future_deployment_requires_owner_approval"), true);
  assert.deepEqual(record.blockedBy, []);
  assert.deepEqual(record.safety, {
    executionAuthorized: false,
    liveConnectorUseAllowed: false,
    deploymentAllowed: false,
    productionDataAllowed: false,
    paidActionAllowed: false
  });
  assert.equal(JSON.stringify(record).includes("REQUIRED_"), false);
});

test("writes route records to a local workspace only", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "ag-os-task-router-"));

  try {
    const result = writeTaskRouteRecord({
      job: buildJob(),
      now: fixedNow,
      root
    });

    assert.equal(result.filePath, ".codex/router/route-runtime-construction-website-dry-run.json");
    const written = JSON.parse(readFileSync(path.join(root, result.filePath), "utf8"));
    assert.equal(written.routeId, result.record.routeId);
    assert.equal(written.safety.liveConnectorUseAllowed, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
