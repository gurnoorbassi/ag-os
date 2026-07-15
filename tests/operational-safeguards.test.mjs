import assert from "node:assert/strict";
import { cpSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { evaluateOperationalSafeguards } from "../scripts/lib/runtime/operational-safeguards.mjs";

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function tempWorkspace() {
  const target = mkdtempSync(path.join(tmpdir(), "ag-os-safeguards-"));
  cpSync(sourceRoot, target, {
    recursive: true,
    filter: (source) => ![".git", "node_modules"].includes(path.basename(source))
  });
  return target;
}

test("operational safeguards expose readiness evidence without live monitoring or credentials", () => {
  const status = evaluateOperationalSafeguards({
    root: sourceRoot,
    now: new Date("2026-07-13T23:45:00.000Z")
  });
  assert.equal(status.restoreDrill.status, "pass");
  assert.equal(status.externalMonitoring.status, "pass");
  assert.equal(status.credentialRotationRevocation.status, "pass");
  assert.equal(status.exactCandidateCi.status, "pass");
  assert.equal(status.exactProductionApproval.status, "blocked");
  assert.equal(status.externalActionActivationAllowed, false);
  assert.deepEqual(status.boundaries, {
    liveMonitoringPerformedByThisCheck: false,
    credentialsRead: false,
    connectorCalled: false,
    notificationSent: false,
    deploymentTriggered: false
  });
});

test("operational safeguards flag stale and failed runtime work", () => {
  const root = tempWorkspace();
  writeFileSync(path.join(root, ".codex", "jobs", "job-runtime-operator-watchdog-test.json"), JSON.stringify({
    jobId: "job-runtime-operator-watchdog-test",
    status: "running",
    updatedAt: "2026-07-13T20:00:00.000Z"
  }), "utf8");
  const status = evaluateOperationalSafeguards({ root, now: new Date("2026-07-13T23:45:00.000Z") });
  assert.equal(status.status, "attention");
  assert.deepEqual(status.internalActionMonitoring.staleRunningJobIds, ["job-runtime-operator-watchdog-test"]);
  assert.equal(status.externalActionActivationAllowed, false);
});
