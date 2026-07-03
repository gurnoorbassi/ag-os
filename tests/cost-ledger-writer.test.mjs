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
  buildCostLedgerRecord,
  writeCostLedgerRecord
} from "../scripts/lib/runtime/cost-ledger-writer.mjs";

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

test("builds a $0 local dry-run cost ledger record", () => {
  const { job, plan } = buildChain();
  const record = buildCostLedgerRecord({
    job,
    plan,
    now: fixedNow
  });

  assert.equal(record.costLedgerId, "cost-ledger-runtime-construction-website-dry-run");
  assert.equal(record.status, "active");
  assert.deepEqual(record.budgetLimitsUsd, {
    perTaskMax: 5,
    dailyMax: 10,
    monthlyMax: 50
  });
  assert.equal(record.entries.length, 1);
  assert.equal(record.entries[0].amountUsd, 0);
  assert.equal(record.entries[0].approvalRequired, false);
  assert.equal(record.summary.estimatedTaskCostUsd, 0);
  assert.equal(record.summary.actualTaskCostUsd, 0);
  assert.equal(record.summary.budgetStatus, "within_limit");
  assert.deepEqual(record.safety, {
    createsBillingChange: false,
    usesPaidService: false,
    usesLiveApi: false,
    requiresOwnerApproval: false
  });
  assert.equal(JSON.stringify(record).includes("REQUIRED_"), false);
});

test("blocks costs above the per-task limit", () => {
  const { job, plan } = buildChain();
  const record = buildCostLedgerRecord({
    job,
    plan,
    estimatedCostUsd: 6,
    now: fixedNow
  });

  assert.equal(record.status, "blocked");
  assert.equal(record.summary.budgetStatus, "over_limit");
  assert.equal(record.safety.requiresOwnerApproval, true);
});

test("writes cost ledger records to a local workspace only", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "ag-os-cost-ledger-"));
  const { job, plan } = buildChain();

  try {
    const result = writeCostLedgerRecord({
      job,
      plan,
      now: fixedNow,
      root
    });

    assert.equal(result.filePath, ".codex/costs/cost-ledger-runtime-construction-website-dry-run.json");
    const written = JSON.parse(readFileSync(path.join(root, result.filePath), "utf8"));
    assert.equal(written.costLedgerId, result.record.costLedgerId);
    assert.equal(written.safety.usesPaidService, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
