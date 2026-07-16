import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { evaluateOperationalSafeguards, resolveOperationalFinding } from "../scripts/lib/runtime/operational-safeguards.mjs";

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

test("authenticated owner resolution preserves failed history but clears current Watchdog attention", () => {
  const root = mkdtempSync(path.join(tmpdir(), "ag-os-watchdog-resolution-"));
  for (const directory of ["jobs", "connectors", "watchdog", "audit", "approvals"]) {
    mkdirSync(path.join(root, ".codex", directory), { recursive: true });
  }
  const jobId = "job-runtime-operator-watchdog-failed";
  const connectorId = "connector-exec-watchdog-blocked";
  writeFileSync(path.join(root, ".codex", "jobs", `${jobId}.json`), JSON.stringify({
    jobId,
    status: "failed",
    blockedReason: "A local plan did not pass validation.",
    updatedAt: "2026-07-16T18:00:00.000Z"
  }), "utf8");
  writeFileSync(path.join(root, ".codex", "connectors", `${connectorId}.json`), JSON.stringify({
    connectorExecutionId: connectorId,
    status: "blocked",
    result: { blockedReason: "Connector authorization was unavailable." },
    updatedAt: "2026-07-16T18:01:00.000Z"
  }), "utf8");

  const before = evaluateOperationalSafeguards({ root, now: new Date("2026-07-16T19:00:00.000Z") });
  assert.equal(before.status, "attention");
  assert.deepEqual(before.internalActionMonitoring.findings.map((item) => item.findingId), [jobId, connectorId]);
  assert.throws(() => resolveOperationalFinding({
    findingId: jobId,
    reason: "Reviewed and superseded by a later successful run.",
    confirmation: "wrong",
    root
  }), /confirmation must equal/);

  const jobResolution = resolveOperationalFinding({
    findingId: jobId,
    reason: "Reviewed and superseded by a later successful run.",
    confirmation: `RESOLVE ${jobId}`,
    root,
    now: new Date("2026-07-16T19:01:00.000Z")
  });
  assert.equal(existsSync(path.join(root, jobResolution.recordPath)), true);
  assert.equal(existsSync(path.join(root, jobResolution.auditPath)), true);
  assert.equal(evaluateOperationalSafeguards({ root }).internalActionMonitoring.findings.length, 1);

  resolveOperationalFinding({
    findingId: connectorId,
    reason: "A later connector execution completed the same approved proof.",
    confirmation: `RESOLVE ${connectorId}`,
    root,
    now: new Date("2026-07-16T19:02:00.000Z")
  });
  const after = evaluateOperationalSafeguards({ root, now: new Date("2026-07-16T19:03:00.000Z") });
  assert.equal(after.status, "ready");
  assert.deepEqual(after.internalActionMonitoring.findings, []);
  assert.deepEqual(after.internalActionMonitoring.resolvedFindingIds, [jobId, connectorId]);
});

test("Watchdog resolution rolls back when its audit cannot be written", () => {
  const root = mkdtempSync(path.join(tmpdir(), "ag-os-watchdog-audit-failure-"));
  mkdirSync(path.join(root, ".codex", "jobs"), { recursive: true });
  mkdirSync(path.join(root, ".codex", "watchdog"), { recursive: true });
  const jobId = "job-runtime-operator-watchdog-audit-failure";
  writeFileSync(path.join(root, ".codex", "jobs", `${jobId}.json`), JSON.stringify({
    jobId,
    status: "failed",
    blockedReason: "A local validation failed.",
    updatedAt: "2026-07-16T18:00:00.000Z"
  }), "utf8");
  writeFileSync(path.join(root, ".codex", "audit"), "not-a-directory", "utf8");

  assert.throws(() => resolveOperationalFinding({
    findingId: jobId,
    reason: "Owner reviewed the retained failure evidence.",
    confirmation: `RESOLVE ${jobId}`,
    root,
    now: new Date("2026-07-16T19:04:00.000Z")
  }));
  assert.equal(existsSync(path.join(root, ".codex", "watchdog", `watchdog-resolution-${jobId}.json`)), false);
  assert.deepEqual(evaluateOperationalSafeguards({ root }).internalActionMonitoring.failedJobIds, [jobId]);
});
