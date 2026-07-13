import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { assertOwnerCommand, submitOwnerCommand } from "../scripts/lib/runtime/live-command-service.mjs";
import { tokenMatches } from "../scripts/live-server.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function tempWorkspace() {
  const target = mkdtempSync(path.join(tmpdir(), "ag-os-live-"));
  cpSync(root, target, {
    recursive: true,
    filter: (source) => ![".git", "node_modules"].includes(path.basename(source))
  });
  return target;
}

test("owner token comparison fails closed", () => {
  assert.equal(tokenMatches("expected", "expected"), true);
  assert.equal(tokenMatches("expected", "wrong"), false);
  assert.equal(tokenMatches("", "expected"), false);
});

test("owner commands require non-empty bounded input", () => {
  assert.throws(() => assertOwnerCommand(""), /command is required/);
  assert.throws(() => assertOwnerCommand("x".repeat(10_001)), /10000 characters/);
});

test("authenticated command service creates a complete gated work package", async () => {
  const workspace = tempWorkspace();
  const result = await submitOwnerCommand({
    command: "Build a dashboard for my internal operations",
    root: workspace,
    now: new Date("2026-07-11T12:00:00.000Z")
  });

  assert.equal(result.status, "planned");
  assert.equal(result.safety.liveActionExecuted, false);
  assert.ok(result.recordsCreated.length >= 9);
  for (const relative of result.recordsCreated) {
    assert.doesNotThrow(() => readFileSync(path.join(workspace, relative), "utf8"));
  }

  const plan = JSON.parse(readFileSync(path.join(workspace, `.codex/plans/${result.planId}.json`), "utf8"));
  assert.equal(plan.safety.executionAuthorized, false);
  assert.ok(plan.approvalGates.some((gate) => gate.gateId === "approval-preview-or-production-deploy"));
});

test("authenticated command service uses an approved AI plan and audits cost without external business actions", async () => {
  const workspace = tempWorkspace();
  const result = await submitOwnerCommand({
    command: "Build a dashboard for my internal operations",
    useAiPlanner: true,
    aiPlannerReadiness: {
      ready: true,
      approvalId: "approval-20260712-anthropic-planning",
      approval: { budget: { maxUsd: 1 } },
      inputCostPerMillionUsd: 3,
      outputCostPerMillionUsd: 15,
      blockers: []
    },
    planDraftProvider: async () => ({
      model: "claude-sonnet-5",
      usage: { input_tokens: 1000, output_tokens: 500 },
      planDraft: {
        summary: "Build and verify the internal dashboard locally.",
        tools: ["local-filesystem"],
        tasks: [{ taskId: "work-dashboard", description: "Build the dashboard.", owner: "builder", status: "planned" }],
        expectedOutput: "A locally validated dashboard.",
        estimatedCostUsd: 0.02,
        approvalGates: ["Separate approval before deployment."],
        stopConditions: ["Stop before live services."]
      }
    }),
    root: workspace,
    now: new Date("2026-07-12T12:00:00.000Z")
  });

  assert.equal(result.aiPlanner.used, true);
  assert.equal(result.aiPlanner.actualCostUsd, 0.0105);
  assert.equal(result.safety.paidActionTriggered, true);
  assert.equal(result.safety.externalBusinessActionExecuted, false);
  const usageAuditPath = result.recordsCreated.find((item) => item.includes("anthropic-planner-use"));
  const usageAudit = JSON.parse(readFileSync(path.join(workspace, usageAuditPath), "utf8"));
  assert.equal(usageAudit.eventType, "standing_approval_used");
  assert.equal(usageAudit.liveServiceTouched, true);

  const ownerCommandAuditPath = result.recordsCreated.find((item) => item.includes(result.auditId));
  const ownerCommandAudit = JSON.parse(readFileSync(path.join(workspace, ownerCommandAuditPath), "utf8"));
  assert.equal(ownerCommandAudit.eventType, "owner_command_received");
  assert.equal(ownerCommandAudit.source, "ag_os_coordinator");

  const validation = spawnSync(process.execPath, ["scripts/validate-foundation.mjs"], {
    cwd: workspace,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.equal(validation.status, 0, validation.stderr || validation.stdout);
});
