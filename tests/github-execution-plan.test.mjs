import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildGitHubExecutionPlan,
  validateGitHubExecutionPlan,
  writeGitHubExecutionPlan
} from "../scripts/lib/runtime/github-execution-plan.mjs";

const fixedNow = new Date("2026-07-03T12:00:00.000Z");

function buildPlan() {
  return buildGitHubExecutionPlan({
    runId: "construction-website-repo",
    commandId: "command-intake-runtime-construction-website-repo",
    projectId: "project-unregistered-construction-website",
    requestedRepositoryName: "REQUIRED_OWNER_APPROVED_REPO_NAME",
    now: fixedNow
  });
}

test("builds a planning-only GitHub execution plan with all safe action types", () => {
  const plan = buildPlan();

  assert.equal(plan.githubExecutionPlanId, "github-plan-runtime-construction-website-repo");
  assert.equal(plan.status, "planned");
  assert.equal(plan.connectorId, "connector-github-mcp");
  assert.equal(plan.mode, "planning_only");
  assert.deepEqual(plan.plannedActions.map((action) => action.actionType), [
    "create_repo",
    "create_branch",
    "create_files",
    "update_files",
    "open_pr",
    "poll_ci",
    "merge_pr"
  ]);
  assert.equal(plan.plannedActions.every((action) => action.status === "blocked"), true);
  assert.equal(plan.plannedActions.every((action) => action.approvalRequired === true), true);
  assert.equal(plan.plannedActions.find((action) => action.actionType === "merge_pr").requiredEvidence.includes("ci_passed"), true);
  assert.equal(plan.approvalGates.includes("approval-github-repo-create"), true);
  assert.deepEqual(plan.safety, {
    executesGitHubAction: false,
    createsRepository: false,
    writesRepositoryContent: false,
    opensPullRequest: false,
    pollsCi: false,
    mergesPullRequest: false,
    usesCredentials: false,
    touchesProductionData: false,
    usesPaidAction: false
  });
  assert.equal(JSON.stringify(plan).includes("REQUIRED_"), true);
});

test("validates required GitHub execution plan fields and safety defaults", () => {
  assert.deepEqual(validateGitHubExecutionPlan(buildPlan()), { valid: true, errors: [] });

  const invalid = {
    ...buildPlan(),
    plannedActions: [],
    approvalGates: [],
    safety: {
      ...buildPlan().safety,
      executesGitHubAction: true
    }
  };

  const result = validateGitHubExecutionPlan(invalid);
  assert.equal(result.valid, false);
  assert.equal(result.errors.includes("plannedActions must not be empty"), true);
  assert.equal(result.errors.includes("approvalGates must not be empty"), true);
  assert.equal(result.errors.includes("safety flags must all be false for planning_only"), true);
});

test("writes GitHub execution plans to a local workspace only", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "ag-os-github-plan-"));

  try {
    const result = writeGitHubExecutionPlan({
      plan: buildPlan(),
      root
    });

    assert.equal(result.filePath, ".codex/github/github-plan-runtime-construction-website-repo.json");
    const written = JSON.parse(readFileSync(path.join(root, result.filePath), "utf8"));
    assert.equal(written.githubExecutionPlanId, "github-plan-runtime-construction-website-repo");
    assert.equal(written.safety.executesGitHubAction, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
