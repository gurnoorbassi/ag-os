import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { evaluateAnthropicPlannerReadiness } from "../scripts/lib/runtime/anthropic-planner-readiness.mjs";

function workspaceWithApproval() {
  const root = mkdtempSync(path.join(tmpdir(), "ag-os-anthropic-readiness-"));
  mkdirSync(path.join(root, ".codex", "approvals"), { recursive: true });
  mkdirSync(path.join(root, ".codex", "audit"), { recursive: true });
  writeFileSync(path.join(root, ".codex", "approvals", "approval-20260712-anthropic-planning.json"), JSON.stringify({
    approvalId: "approval-20260712-anthropic-planning",
    status: "approved",
    approvalKind: "standing",
    maxUses: 10,
    target: "anthropic:messages-api",
    approvedActions: ["anthropic_plan_generation"],
    approvalRequiredFor: ["paid_actions"],
    budget: { required: true, maxUsd: 1 },
    expiresAt: "2026-08-12T00:00:00.000Z"
  }));
  return root;
}

const readyEnv = {
  AG_OS_AI_PLANNER_ENABLED: "true",
  ANTHROPIC_API_KEY: "present-but-never-returned",
  ANTHROPIC_MODEL: "claude-sonnet-5",
  AG_OS_AI_PLANNER_APPROVAL_ID: "approval-20260712-anthropic-planning",
  ANTHROPIC_INPUT_COST_PER_MILLION_USD: "3",
  ANTHROPIC_OUTPUT_COST_PER_MILLION_USD: "15"
};

test("Anthropic planner readiness requires key, pricing, enablement, and exact approval", () => {
  const result = evaluateAnthropicPlannerReadiness({
    root: workspaceWithApproval(),
    env: readyEnv,
    now: new Date("2026-07-12T12:00:00.000Z")
  });
  assert.equal(result.ready, true);
  assert.equal(result.credentialConfigured, true);
  assert.equal(Object.values(result).includes("present-but-never-returned"), false);
});

test("Anthropic planner readiness fails closed when any activation condition is absent", () => {
  const result = evaluateAnthropicPlannerReadiness({
    root: workspaceWithApproval(),
    env: { ...readyEnv, AG_OS_AI_PLANNER_ENABLED: "false", ANTHROPIC_API_KEY: "" },
    now: new Date("2026-07-12T12:00:00.000Z")
  });
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some((item) => item.includes("disabled")));
  assert.ok(result.blockers.some((item) => item.includes("credential")));
});
