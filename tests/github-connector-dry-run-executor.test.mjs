import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildGitHubExecutionPlan } from "../scripts/lib/runtime/github-execution-plan.mjs";
import {
  buildGitHubConnectorDryRun,
  writeGitHubConnectorDryRun
} from "../scripts/lib/runtime/github-connector-dry-run-executor.mjs";

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

test("builds GitHub connector dry-run records from the execution plan", () => {
  const result = buildGitHubConnectorDryRun({
    githubPlan: buildPlan(),
    runId: "construction-website-repo",
    now: fixedNow
  });

  assert.equal(result.connectorRecords.length, 7);
  assert.equal(result.connectorRecords.every((record) => record.connectorId === "connector-github-mcp"), true);
  assert.equal(result.connectorRecords.every((record) => record.status === "waiting_approval"), true);
  assert.equal(result.connectorRecords.every((record) => record.approvalRequired === true), true);
  assert.equal(result.connectorRecords.every((record) => record.safety.executesLiveAction === false), true);
  assert.equal(result.connectorRecords.find((record) => record.requestedAction === "merge_pr").evidenceRequired.includes("ci_passed"), true);
  assert.equal(result.audit.id, "audit-runtime-construction-website-repo-github-dry-run");
  assert.equal(result.audit.eventType, "validation_run");
  assert.equal(result.audit.liveServiceTouched, false);
});

test("writes GitHub connector dry-run records and audit locally only", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "ag-os-github-dry-run-"));

  try {
    const result = writeGitHubConnectorDryRun({
      githubPlan: buildPlan(),
      runId: "construction-website-repo",
      now: fixedNow,
      root
    });

    assert.equal(result.connectorPaths.length, 7);
    assert.equal(result.auditPath, ".codex/audit/audit-runtime-construction-website-repo-github-dry-run.json");
    const firstRecord = JSON.parse(readFileSync(path.join(root, result.connectorPaths[0]), "utf8"));
    const audit = JSON.parse(readFileSync(path.join(root, result.auditPath), "utf8"));
    assert.equal(firstRecord.connectorId, "connector-github-mcp");
    assert.equal(firstRecord.safety.usesCredentials, false);
    assert.equal(audit.liveServiceTouched, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
