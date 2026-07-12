import assert from "node:assert/strict";
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

test("authenticated command service creates a complete gated work package", () => {
  const workspace = tempWorkspace();
  const result = submitOwnerCommand({
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
