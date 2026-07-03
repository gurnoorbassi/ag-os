import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildCommandIntakeRecord } from "../scripts/lib/runtime/command-intake-processor.mjs";
import {
  buildJobRecord,
  writeJobRecord
} from "../scripts/lib/runtime/job-queue-processor.mjs";

const fixedNow = new Date("2026-07-03T12:00:00.000Z");

function buildCommandIntake() {
  return buildCommandIntakeRecord({
    command: "make me a construction website",
    runId: "construction-website-dry-run",
    now: fixedNow
  });
}

test("builds a queued job from a command intake record", () => {
  const record = buildJobRecord({
    commandIntake: buildCommandIntake(),
    now: fixedNow
  });

  assert.equal(record.jobId, "job-runtime-construction-website-dry-run");
  assert.equal(record.commandId, "command-intake-runtime-construction-website-dry-run");
  assert.equal(record.projectId, "project-unregistered-construction-website");
  assert.equal(record.status, "queued");
  assert.equal(record.priority, "normal");
  assert.equal(record.riskLevel, "R1");
  assert.equal(record.commandType, "plan_only");
  assert.equal(record.requestedBy, "owner-gurnoor-bassi");
  assert.equal(record.assignedDomain, "command-os");
  assert.equal(record.assignedAgent, "agent-local-runtime");
  assert.equal(record.approvalRequired, false);
  assert.equal(record.queueTimestamps.queuedAt, fixedNow.toISOString());
  assert.deepEqual(record.safety, {
    credentialsAllowed: false,
    liveServicesAllowed: false,
    deploymentAllowed: false,
    domainChangeAllowed: false,
    productionDataAllowed: false,
    paidActionAllowed: false
  });
  assert.equal(JSON.stringify(record).includes("REQUIRED_"), false);
});

test("writes job records to a local workspace only", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "ag-os-job-queue-"));

  try {
    const result = writeJobRecord({
      commandIntake: buildCommandIntake(),
      now: fixedNow,
      root
    });

    assert.equal(result.filePath, ".codex/jobs/job-runtime-construction-website-dry-run.json");
    const written = JSON.parse(readFileSync(path.join(root, result.filePath), "utf8"));
    assert.equal(written.jobId, result.record.jobId);
    assert.equal(written.safety.liveServicesAllowed, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
