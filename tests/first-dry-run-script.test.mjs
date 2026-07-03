import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("automated first dry-run script is locked to the approved command and offline safety", () => {
  const script = readFileSync("scripts/run-first-dry-run.mjs", "utf8");

  assert.equal(script.includes('const COMMAND = "make me a construction website";'), true);
  assert.equal(script.includes("liveServiceCalls: false"), true);
  assert.equal(script.includes("credentialsUsed: false"), true);
  assert.equal(script.includes("deployments: false"), true);
  assert.equal(script.includes("domainChanges: false"), true);
  assert.equal(script.includes("paidUsage: false"), true);
  assert.equal(script.includes("productionData: false"), true);
});
