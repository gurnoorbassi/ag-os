import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(root, relativePath), "utf8"));
}

function listConnectorAuthRecords() {
  return readdirSync(path.join(root, ".codex/connectors"))
    .filter((name) => name.startsWith("connector-auth-") && name.endsWith(".json"))
    .map((name) => readJson(`.codex/connectors/${name}`));
}

test("connector auth records exist for every required connector", () => {
  const records = listConnectorAuthRecords();
  const coveredConnectorIds = new Set(records.map((record) => record.connectorId));
  for (const connectorId of ["connector-github-mcp", "connector-n8n-mcp", "connector-netlify-mcp"]) {
    assert.ok(coveredConnectorIds.has(connectorId), `missing connector auth record for ${connectorId}`);
  }
});

test("connector auth records never grant permission or trigger live calls", () => {
  for (const record of listConnectorAuthRecords()) {
    assert.equal(record.grantsPermission, false);
    assert.equal(record.liveCallsUsed, false);
    assert.ok(["authenticated", "expired", "unknown"].includes(record.authStatus));
    assert.ok(
      ["owner_report", "gated_execution_record", "no_recent_observation"].includes(record.observationSource)
    );
  }
});

test("boot check surfaces connector auth as a non-blocking advisory", () => {
  const result = spawnSync(process.execPath, ["scripts/boot-check.mjs"], {
    cwd: root,
    encoding: "utf8"
  });
  assert.equal(result.status, 0, `boot check must not be blocked by connector auth status: ${result.stderr}`);
  const report = JSON.parse(result.stdout);
  const authCheck = report.checks.find((check) => check.checkId === "connector-auth");
  assert.ok(authCheck, "boot check must include a connector-auth check");
  assert.equal(authCheck.required, false, "connector-auth check must be advisory, never blocking");
  assert.ok(Array.isArray(report.briefing.connectorAuth.records));
  assert.equal(report.briefing.connectorAuth.authStatusGrantsPermission, false);
});

test("dashboard surfaces non-authenticated connectors as owner attention items", async () => {
  const { collectDashboardData } = await import("../scripts/build-dashboard.mjs");
  const previousCwd = process.cwd();
  process.chdir(root);
  try {
    const data = collectDashboardData();
    assert.ok(data.connectorAuth, "dashboard data must include connectorAuth");
    assert.equal(data.connectorAuth.authStatusGrantsPermission, false);
    for (const record of data.connectorAuth.records) {
      if (record.authStatus !== "authenticated") {
        assert.ok(
          data.ownerAttention.some((item) => item.id === `connector-auth-${record.connectorId}`),
          `owner attention must surface ${record.connectorId} with status ${record.authStatus}`
        );
      }
    }
  } finally {
    process.chdir(previousCwd);
  }
});
