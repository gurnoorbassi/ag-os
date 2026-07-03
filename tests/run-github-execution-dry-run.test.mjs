import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("GitHub execution dry-run script is locked to approved command and offline safety", () => {
  const source = readFileSync("scripts/run-github-execution-dry-run.mjs", "utf8");

  assert.equal(source.includes('const COMMAND = "make me a simple construction website repo";'), true);
  assert.equal(source.includes("writeGitHubExecutionPlan"), true);
  assert.equal(source.includes("writeGitHubConnectorDryRun"), true);
  assert.equal(source.includes("writeGitHubMcpExecutionGate"), true);
  assert.equal(source.includes("No actual GitHub calls, repository creation, branch creation, file writes, pull request creation, CI polling, or merge execution occurred."), true);
  assert.equal(source.includes("liveServiceCalls: false"), true);
  assert.equal(source.includes("credentialsUsed: false"), true);
  assert.equal(source.includes("deployments: false"), true);
  assert.equal(source.includes("paidUsage: false"), true);
});
