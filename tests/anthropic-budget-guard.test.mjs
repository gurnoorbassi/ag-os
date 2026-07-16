import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { finalizeAnthropicBudgetReservation, reserveAnthropicBudget } from "../scripts/lib/runtime/anthropic-budget-guard.mjs";
import { createAnthropicPlanDraft } from "../scripts/lib/runtime/anthropic-planner.mjs";

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const now = new Date("2026-07-16T12:00:00.000Z");
const job = { jobId: "job-budget-integrity-test", projectId: "project-quote-builder" };

function budgetRoot() {
  const root = mkdtempSync(path.join(tmpdir(), "ag-os-budget-guard-"));
  mkdirSync(path.join(root, ".codex", "costs"), { recursive: true });
  cpSync(path.join(sourceRoot, ".codex", "costs", "budget.json"), path.join(root, ".codex", "costs", "budget.json"));
  return root;
}

function writeActualLedger(root, amountUsd) {
  const record = {
    costLedgerId: `cost-ledger-existing-${String(amountUsd).replace(".", "-")}`,
    status: "active",
    budgetLimitsUsd: { perTaskMax: 5, dailyMax: 10, monthlyMax: 50 },
    entries: [{
      costEntryId: "cost-entry-existing",
      jobId: job.jobId,
      projectId: job.projectId,
      costType: "actual",
      amountUsd,
      approvalRequired: true,
      status: "recorded"
    }],
    summary: {
      estimatedTaskCostUsd: amountUsd,
      actualTaskCostUsd: amountUsd,
      dailyActualUsd: amountUsd,
      monthlyActualUsd: amountUsd,
      budgetStatus: amountUsd >= 5 ? "over_limit" : "within_limit"
    },
    safety: { createsBillingChange: false, usesPaidService: true, usesLiveApi: true, requiresOwnerApproval: true },
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };
  writeFileSync(path.join(root, ".codex", "costs", `${record.costLedgerId}.json`), `${JSON.stringify(record, null, 2)}\n`);
}

async function assertBudgetRefusal(amountUsd) {
  const root = budgetRoot();
  writeActualLedger(root, amountUsd);
  let fetchCount = 0;
  await assert.rejects(() => createAnthropicPlanDraft({
    commandIntake: { rawCommand: "Plan safely", normalizedCommand: "Plan safely", classification: {}, productContext: {} },
    job,
    route: { riskLevel: "R1", assignedAgent: "planner" },
    apiKey: "test-only",
    model: "claude-sonnet-5",
    fetchImpl: async () => { fetchCount += 1; throw new Error("must not run"); },
    inputCostPerMillionUsd: 2,
    outputCostPerMillionUsd: 10,
    approvalId: "approval-budget-test",
    approvalMaxUsd: 0.25,
    root,
    now
  }), (error) => {
    assert.equal(error.code, "blocked_budget");
    assert.equal(error.result.status, "blocked_budget");
    assert.equal(existsSync(path.join(root, error.result.recordPath)), true);
    const blocked = JSON.parse(readFileSync(path.join(root, error.result.recordPath), "utf8"));
    assert.equal(blocked.status, "blocked");
    assert.equal(blocked.summary.budgetStatus, "blocked");
    return true;
  });
  assert.equal(fetchCount, 0);
}

test("Anthropic API calls are refused and recorded when spend is at or over budget", async () => {
  await assertBudgetRefusal(5);
  await assertBudgetRefusal(5.01);
});

test("independent daily Anthropic call-count breaker refuses the next call", () => {
  const root = budgetRoot();
  const requestBody = { model: "test", max_tokens: 10, messages: [] };
  const first = reserveAnthropicBudget({
    kind: "planner",
    job,
    requestBody,
    maxTokens: 10,
    inputCostPerMillionUsd: 2,
    outputCostPerMillionUsd: 10,
    approvalId: "approval-budget-test",
    approvalMaxUsd: 0.25,
    env: { AG_OS_ANTHROPIC_DAILY_CALL_LIMIT: "1" },
    root,
    now
  });
  finalizeAnthropicBudgetReservation({ reservation: first, consumed: true, root, now });
  assert.throws(() => reserveAnthropicBudget({
    kind: "worker",
    job,
    requestBody,
    maxTokens: 10,
    inputCostPerMillionUsd: 2,
    outputCostPerMillionUsd: 10,
    approvalId: "approval-budget-test",
    approvalMaxUsd: 0.25,
    env: { AG_OS_ANTHROPIC_DAILY_CALL_LIMIT: "1" },
    root,
    now
  }), (error) => error.code === "blocked_budget" && error.result.reasons.some((reason) => reason.includes("call-count")));
  const records = readdirSync(path.join(root, ".codex", "costs")).filter((name) => name.includes("anthropic-budget-blocked"));
  assert.equal(records.length, 1);
});
