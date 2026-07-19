import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { assertDeliverableCritique, createAnthropicDeliverableCritique, writeDeliverableCritique } from "../scripts/lib/runtime/anthropic-critic.mjs";

function setup() {
  const root = mkdtempSync(path.join(os.tmpdir(), "ag-os-critic-"));
  const file = ".codex/workspaces/project-one-off/job-test/deliverables/index.html";
  mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  writeFileSync(path.join(root, file), "<!doctype html><title>Good</title><main>Complete</main>");
  return { root, file };
}

test("critic rejects internally inconsistent pass verdicts", () => {
  assert.throws(() => assertDeliverableCritique({ verdict: "pass", score: 7, summary: "weak", requirementChecks: [], defects: [], requiredFixes: [], safetyFindings: [] }), /cannot pass/);
  assert.throws(() => assertDeliverableCritique({ verdict: "needs_revision", score: 5, summary: "weak", requirementChecks: [], defects: [], requiredFixes: [], safetyFindings: [] }), /requires at least one fix/);
});

test("critic uses a separate budget reservation and writes independent evidence", async () => {
  const { root, file } = setup();
  mkdirSync(path.join(root, ".codex/costs/reservations"), { recursive: true });
  writeFileSync(path.join(root, ".codex/costs/budget.json"), JSON.stringify({ limits: { monthlyMaxUsd: 50, dailyMaxUsd: 10, perTaskMaxUsd: 5 } }));
  const critique = { verdict: "pass", score: 9, summary: "Meets the requested result.", requirementChecks: [{ requirement: "usable", met: true, evidence: "index.html" }], defects: [], requiredFixes: [], safetyFindings: [] };
  const fetchImpl = async () => ({ ok: true, json: async () => ({ model: "critic-model", stop_reason: "end_turn", usage: { input_tokens: 100, output_tokens: 50 }, content: [{ type: "text", text: JSON.stringify(critique) }] }) });
  const result = await createAnthropicDeliverableCritique({
    command: { rawCommand: "Build a website" }, job: { jobId: "job-test", projectId: "project-one-off" }, plan: { planId: "plan-test", expectedOutput: "Website", tasks: [], basis: {} }, execution: { workProductPaths: [file] },
    apiKey: "test-key", model: "critic-model", fetchImpl, root, inputCostPerMillionUsd: 1, outputCostPerMillionUsd: 1, approvalId: "approval-test", approvalMaxUsd: 0.25,
    env: { AG_OS_ANTHROPIC_DAILY_CALL_LIMIT: "20" }, now: new Date("2026-07-19T00:00:00.000Z")
  });
  assert.equal(result.critique.verdict, "pass");
  const written = writeDeliverableCritique({ job: { jobId: "job-test", projectId: "project-one-off" }, plan: { planId: "plan-test" }, execution: { executionPath: ".codex/execution/exec-test.json" }, result, approvalId: "approval-test", root, now: new Date("2026-07-19T00:00:00.000Z") });
  assert.equal(written.record.authority, "quality_gate_only");
  assert.equal(written.record.grantsPermission, false);
});
