import process from "node:process";
import { evaluateOperationalSafeguards } from "./operational-safeguards.mjs";
import { isoTimestamp, writeJson } from "./common.mjs";

export const INTERNAL_WATCHDOG_RECORD_PATH = ".codex/watchdog/watchdog-runtime-internal-state.json";

export function runInternalWatchdog({ root = process.cwd(), now = new Date() } = {}) {
  const safeguards = evaluateOperationalSafeguards({ root, now });
  const warning = safeguards.status !== "ready";
  const timestamp = isoTimestamp(now);
  const record = {
    watchdogCheckId: "watchdog-runtime-internal-state",
    status: warning ? "warning" : "pass",
    checkType: "engine",
    scope: "ag-os-coordinator-internal-state",
    severity: warning ? "warning" : "info",
    finding: warning
      ? "Recurring internal-state check found owner attention items."
      : "Recurring internal-state check passed with no stale or failed runtime work.",
    evidence: [
      `jobs_checked:${safeguards.internalActionMonitoring.jobsChecked}`,
      `connector_executions_checked:${safeguards.internalActionMonitoring.connectorExecutionsChecked}`,
      `approval_revocation:${safeguards.approvalRevocation.status}`
    ],
    blockedAction: warning,
    recommendedAction: warning
      ? "Open System and Work in the owner dashboard to review the recorded attention items."
      : "No owner action required; keep the coordinator running.",
    safety: {
      usesLiveMonitoring: false,
      usesCredentials: false,
      callsConnector: false,
      sendsAlert: false,
      triggersDeployment: false
    },
    createdAt: timestamp,
    updatedAt: timestamp
  };
  writeJson(INTERNAL_WATCHDOG_RECORD_PATH, record, root);
  return { filePath: INTERNAL_WATCHDOG_RECORD_PATH, record, safeguards };
}

export function startInternalWatchdog({ root = process.cwd(), intervalMs = 60_000, onError = () => {} } = {}) {
  if (!Number.isInteger(intervalMs) || intervalMs < 30_000) {
    throw new Error("internal watchdog interval must be at least 30000ms");
  }
  const check = () => {
    try {
      runInternalWatchdog({ root });
    } catch (error) {
      onError(error);
    }
  };
  check();
  const timer = setInterval(check, intervalMs);
  timer.unref();
  return timer;
}
