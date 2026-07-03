import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildCommandIntakeRecord,
  writeCommandIntakeRecord
} from "../scripts/lib/runtime/command-intake-processor.mjs";

const fixedNow = new Date("2026-07-03T12:00:00.000Z");

test("builds a plan-only command intake record for a construction website", () => {
  const record = buildCommandIntakeRecord({
    command: "make me a construction website",
    runId: "construction-website-dry-run",
    now: fixedNow
  });

  assert.equal(record.commandIntakeId, "command-intake-runtime-construction-website-dry-run");
  assert.equal(record.status, "classified");
  assert.equal(record.rawCommand, "make me a construction website");
  assert.equal(record.commandCategory, "plan_only");
  assert.equal(record.projectId, "project-unregistered-construction-website");
  assert.equal(record.riskLevel, "R1");
  assert.equal(record.classification.requiresPlan, true);
  assert.equal(record.classification.requiresApproval, false);
  assert.equal(record.classification.requiresLiveService, false);
  assert.equal(record.classification.requiresDeployment, false);
  assert.equal(record.classification.requiresDomainChange, false);
  assert.equal(record.classification.requiresPaidAction, false);
  assert.equal(record.classification.requiresProductionData, false);
  assert.equal(record.nextRecord.jobId, "job-runtime-construction-website-dry-run");
  assert.equal(record.nextRecord.planId, "plan-runtime-construction-website-dry-run");
  assert.deepEqual(record.safety, {
    executesCommand: false,
    createsLiveSideEffect: false,
    usesCredentials: false,
    callsConnector: false
  });
  assert.equal(JSON.stringify(record).includes("REQUIRED_"), false);
});

test("writes command intake records to a local workspace only", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "ag-os-command-intake-"));

  try {
    const result = writeCommandIntakeRecord({
      command: "make me a construction website",
      runId: "construction-website-dry-run",
      now: fixedNow,
      root
    });

    assert.equal(result.filePath, ".codex/commands/command-intake-runtime-construction-website-dry-run.json");
    const written = JSON.parse(readFileSync(path.join(root, result.filePath), "utf8"));
    assert.equal(written.commandIntakeId, result.record.commandIntakeId);
    assert.equal(written.safety.callsConnector, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
