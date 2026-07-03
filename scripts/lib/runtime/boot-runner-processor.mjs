import { spawnSync } from "node:child_process";
import process from "node:process";
import { isoTimestamp, normalizeRunId, writeJson } from "./common.mjs";

const CHECK_TYPE_BY_ID = new Map([
  ["constitution-status", "constitution"],
  ["project-registry", "registry"],
  ["connector-registry", "connector"],
  ["command-registry", "registry"],
  ["capability-registry", "registry"],
  ["owner-record", "registry"],
  ["validation-status", "validation"],
  ["cost-budget", "cost"],
  ["active-incidents", "incident"],
  ["active-approvals", "approval"],
  ["stale-locks", "approval"]
]);

function mapCheckType(checkId) {
  return CHECK_TYPE_BY_ID.get(checkId) ?? "engine";
}

function mapCheckStatus(status) {
  if (status === "pass") {
    return "pass";
  }

  if (status === "warn" || status === "warning") {
    return "warn";
  }

  if (status === "blocked") {
    return "blocked";
  }

  if (status === "failed" || status === "fail") {
    return "failed";
  }

  return "pending";
}

export function runOfflineBootCheck({ root = process.cwd() } = {}) {
  const result = spawnSync(process.execPath, ["scripts/boot-check.mjs"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  if (result.status !== 0) {
    throw new Error(`boot-check failed: ${result.stderr || result.stdout}`);
  }

  return JSON.parse(result.stdout);
}

export function buildBootRunRecord({ bootReport, runId, now = new Date() }) {
  if (!bootReport || !Array.isArray(bootReport.checks)) {
    throw new Error("bootReport with checks is required");
  }

  const normalizedRunId = normalizeRunId(runId || "boot-run");
  const timestamp = isoTimestamp(now);
  const checks = bootReport.checks.map((check) => ({
    checkId: check.checkId,
    checkType: mapCheckType(check.checkId),
    status: mapCheckStatus(check.status),
    required: check.required !== false,
    evidence: check.evidence || "No evidence provided."
  }));
  const blockingChecks = checks.filter((check) => check.required && !["pass", "not_applicable"].includes(check.status));

  return {
    bootRunId: `boot-${normalizedRunId}`,
    status: blockingChecks.length === 0 ? "ready" : "blocked",
    checks,
    summary: `Offline boot runner completed with ${checks.length - blockingChecks.length} passing required check(s) and ${blockingChecks.length} blocking check(s).`,
    safety: {
      usesLiveService: false,
      usesCredentials: false,
      changesFiles: false,
      triggersDeployment: false,
      usesPaidAction: false
    },
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

export function writeBootRunRecord({ runId, bootReport, now, root = process.cwd() }) {
  const sourceReport = bootReport ?? runOfflineBootCheck({ root });
  const record = buildBootRunRecord({ bootReport: sourceReport, runId, now });
  const filePath = `.codex/boot/${record.bootRunId}.json`;
  writeJson(filePath, record, root);
  return { filePath, record };
}
