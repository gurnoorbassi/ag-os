import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildCommandIntakeRecord } from "../scripts/lib/runtime/command-intake-processor.mjs";
import { buildJobRecord } from "../scripts/lib/runtime/job-queue-processor.mjs";
import { buildTaskRouteRecord } from "../scripts/lib/runtime/task-router-processor.mjs";
import { buildPlanRecord } from "../scripts/lib/runtime/planner-processor.mjs";
import {
  buildConnectorDryRunGateRecords,
  writeConnectorDryRunGateRecords
} from "../scripts/lib/runtime/connector-dry-run-gates.mjs";

const fixedNow = new Date("2026-07-03T12:00:00.000Z");

function buildPlan() {
  const commandIntake = buildCommandIntakeRecord({
    command: "make me a construction website",
    runId: "construction-website-dry-run",
    now: fixedNow
  });
  const job = buildJobRecord({ commandIntake, now: fixedNow });
  const route = buildTaskRouteRecord({ job, now: fixedNow });
  return buildPlanRecord({ route, job, commandIntake, now: fixedNow });
}

test("builds connector dry-run approval gates for known connected MCPs", () => {
  const records = buildConnectorDryRunGateRecords({
    projectId: "project-unregistered-construction-website",
    runId: "construction-website-dry-run",
    now: fixedNow
  });

  assert.equal(records.length, 3);
  assert.deepEqual(records.map((record) => record.connectorId), [
    "connector-github-mcp",
    "connector-netlify-mcp",
    "connector-n8n-mcp"
  ]);
  assert.equal(records.every((record) => record.status === "waiting_approval"), true);
  assert.equal(records.every((record) => record.approvalRequired === true), true);
  assert.equal(records.every((record) => record.safety.executesLiveAction === false), true);
  assert.equal(JSON.stringify(records).includes("REQUIRED_"), false);
});

test("writes connector gate records to a local workspace only", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "ag-os-connector-gates-"));

  try {
    const result = writeConnectorDryRunGateRecords({
      plan: buildPlan(),
      runId: "construction-website-dry-run",
      now: fixedNow,
      root
    });

    assert.equal(result.written.length, 3);
    const githubPath = ".codex/connectors/connector-exec-runtime-construction-website-dry-run-github.json";
    const written = JSON.parse(readFileSync(path.join(root, githubPath), "utf8"));
    assert.equal(written.connectorId, "connector-github-mcp");
    assert.equal(written.safety.usesCredentials, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
