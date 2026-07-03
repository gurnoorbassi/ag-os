import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildBootRunRecord,
  writeBootRunRecord
} from "../scripts/lib/runtime/boot-runner-processor.mjs";

const fixedNow = new Date("2026-07-03T12:00:00.000Z");
const readyReport = {
  bootCheck: "offline",
  status: "ready",
  generatedAt: fixedNow.toISOString(),
  checks: [
    {
      checkId: "constitution-status",
      status: "pass",
      required: true,
      evidence: "Constitution v1.0 is active."
    },
    {
      checkId: "validation-status",
      status: "pass",
      required: true,
      evidence: "Local validation passed."
    },
    {
      checkId: "active-approvals",
      status: "pass",
      required: true,
      evidence: "No active approval lock records found."
    }
  ]
};

test("builds a ready boot-run record from the offline boot report", () => {
  const record = buildBootRunRecord({
    bootReport: readyReport,
    runId: "construction-website-dry-run",
    now: fixedNow
  });

  assert.equal(record.bootRunId, "boot-runtime-construction-website-dry-run");
  assert.equal(record.status, "ready");
  assert.equal(record.checks.length, 3);
  assert.equal(record.checks[0].checkType, "constitution");
  assert.equal(record.checks[1].checkType, "validation");
  assert.equal(record.checks[2].checkType, "approval");
  assert.deepEqual(record.safety, {
    usesLiveService: false,
    usesCredentials: false,
    changesFiles: false,
    triggersDeployment: false,
    usesPaidAction: false
  });
  assert.equal(JSON.stringify(record).includes("REQUIRED_"), false);
});

test("marks the boot-run blocked when a required check fails", () => {
  const record = buildBootRunRecord({
    bootReport: {
      ...readyReport,
      checks: [
        ...readyReport.checks,
        {
          checkId: "cost-budget",
          status: "failed",
          required: true,
          evidence: "Cost budget is invalid."
        }
      ]
    },
    runId: "construction-website-dry-run",
    now: fixedNow
  });

  assert.equal(record.status, "blocked");
  assert.equal(record.checks.at(-1).checkType, "cost");
  assert.equal(record.checks.at(-1).status, "failed");
});

test("writes boot-run records to a local workspace only", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "ag-os-boot-runner-"));

  try {
    const result = writeBootRunRecord({
      bootReport: readyReport,
      runId: "construction-website-dry-run",
      now: fixedNow,
      root
    });

    assert.equal(result.filePath, ".codex/boot/boot-runtime-construction-website-dry-run.json");
    const written = JSON.parse(readFileSync(path.join(root, result.filePath), "utf8"));
    assert.equal(written.bootRunId, result.record.bootRunId);
    assert.equal(written.safety.usesLiveService, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
