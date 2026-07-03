import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildGitHubExecutionPlan } from "../scripts/lib/runtime/github-execution-plan.mjs";
import {
  buildGitHubMcpExecutionGate,
  validateGitHubMcpExecutionGate,
  writeGitHubMcpExecutionGate
} from "../scripts/lib/runtime/github-mcp-execution-gate.mjs";

const fixedNow = new Date("2026-07-03T12:00:00.000Z");

function buildPlan() {
  return buildGitHubExecutionPlan({
    runId: "construction-website-repo",
    commandId: "command-intake-runtime-construction-website-repo",
    projectId: "project-unregistered-construction-website",
    requestedRepositoryName: "owner-approval-required-repository-name",
    now: fixedNow
  });
}

test("builds GitHub MCP execution gates without enabling live execution", () => {
  const gate = buildGitHubMcpExecutionGate({
    githubPlan: buildPlan(),
    validationPassed: true,
    now: fixedNow
  });

  assert.equal(gate.githubMcpExecutionGateId, "github-mcp-gate-runtime-construction-website-repo");
  assert.equal(gate.mode, "execution_gate_only");
  assert.equal(gate.connectorId, "connector-github-mcp");
  assert.equal(gate.status, "blocked");
  assert.equal(gate.actions.length, 7);
  assert.equal(gate.actions.every((action) => action.ownerApprovalRequired === true), true);
  assert.equal(gate.actions.every((action) => action.requiresApprovalLock === true), true);
  assert.equal(gate.actions.every((action) => action.requiresAuditEvent === true), true);
  assert.equal(gate.actions.every((action) => action.executionState === "blocked"), true);
  assert.equal(gate.actions.find((action) => action.actionType === "merge_pr").requiresCiPassed, true);
  assert.equal(gate.safety.executesGitHubAction, false);
  assert.equal(gate.safety.createsRepository, false);
  assert.equal(gate.safety.mergesPullRequest, false);
});

test("marks scoped actions ready after active approval evidence without executing them", () => {
  const gate = buildGitHubMcpExecutionGate({
    githubPlan: buildPlan(),
    activeApprovalLocks: [
      {
        approvalId: "approval-20260703-github-open-pr",
        approvedActions: ["open_pr"],
        scope: {
          projectId: "project-unregistered-construction-website",
          connectorId: "connector-github-mcp"
        },
        status: "active",
        expiresAt: "2026-07-04T12:00:00.000Z"
      }
    ],
    validationPassed: true,
    now: fixedNow
  });

  const openPrGate = gate.actions.find((action) => action.actionType === "open_pr");
  const createRepoGate = gate.actions.find((action) => action.actionType === "create_repo");
  assert.equal(openPrGate.executionState, "ready_after_approval");
  assert.equal(openPrGate.approvalId, "approval-20260703-github-open-pr");
  assert.equal(createRepoGate.executionState, "blocked");
  assert.equal(gate.safety.executesGitHubAction, false);
});

test("validates required GitHub MCP execution gate fields", () => {
  const validGate = buildGitHubMcpExecutionGate({
    githubPlan: buildPlan(),
    validationPassed: true,
    now: fixedNow
  });

  assert.deepEqual(validateGitHubMcpExecutionGate(validGate), { valid: true, errors: [] });

  const invalidGate = {
    ...validGate,
    actions: [],
    safety: {
      ...validGate.safety,
      executesGitHubAction: true
    }
  };
  const validation = validateGitHubMcpExecutionGate(invalidGate);
  assert.equal(validation.valid, false);
  assert.equal(validation.errors.includes("actions must not be empty"), true);
  assert.equal(validation.errors.includes("safety flags must all be false for execution_gate_only"), true);
});

test("writes GitHub MCP execution gate records to a local workspace only", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "ag-os-github-mcp-gate-"));

  try {
    const gate = buildGitHubMcpExecutionGate({
      githubPlan: buildPlan(),
      validationPassed: true,
      now: fixedNow
    });
    const result = writeGitHubMcpExecutionGate({ gate, root });

    assert.equal(result.filePath, ".codex/github/github-mcp-gate-runtime-construction-website-repo.json");
    const writtenGate = JSON.parse(readFileSync(path.join(root, result.filePath), "utf8"));
    assert.equal(writtenGate.mode, "execution_gate_only");
    assert.equal(writtenGate.safety.executesGitHubAction, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
