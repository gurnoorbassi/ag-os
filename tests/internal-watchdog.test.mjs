import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { runInternalWatchdog } from "../scripts/lib/runtime/internal-watchdog.mjs";
import { getOperatingSystems } from "../scripts/lib/runtime/control-center-service.mjs";

function writeJson(root, relativePath, record) {
  const target = path.join(root, relativePath);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(record, null, 2)}\n`, "utf8");
}

test("internal watchdog records recurring local checks without external side effects", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "ag-os-watchdog-"));
  const now = new Date("2026-07-15T15:00:00.000Z");
  try {
    writeJson(root, ".codex/production/production-readiness-ag-os-coordinator-v1.json", {
      requiredChecks: [], activationAllowed: false
    });
    const result = runInternalWatchdog({ root, now });
    const record = JSON.parse(readFileSync(path.join(root, result.filePath), "utf8"));
    assert.equal(record.status, "pass");
    assert.deepEqual(record.safety, {
      usesLiveMonitoring: false,
      usesCredentials: false,
      callsConnector: false,
      sendsAlert: false,
      triggersDeployment: false
    });
    const watchdog = getOperatingSystems({ root, now }).find((system) => system.id === "watchdog-os");
    assert.equal(watchdog.status, "operational");
    assert.equal(watchdog.metric, "Every 60 seconds");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("stale watchdog evidence does not claim recurring monitoring is active", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "ag-os-watchdog-stale-"));
  try {
    writeJson(root, ".codex/watchdog/watchdog-runtime-internal-state.json", {
      watchdogCheckId: "watchdog-runtime-internal-state",
      status: "pass",
      updatedAt: "2026-07-15T14:00:00.000Z"
    });
    const watchdog = getOperatingSystems({ root, now: new Date("2026-07-15T15:00:00.000Z") })
      .find((system) => system.id === "watchdog-os");
    assert.equal(watchdog.status, "setup_needed");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
