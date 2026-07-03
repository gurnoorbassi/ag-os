import process from "node:process";
import { isoTimestamp, normalizeRunId, writeJson } from "./common.mjs";

const SAFE_MERGE_RISK_LEVELS = new Set(["R0", "R1", "R2"]);

const NO_EXECUTION_SAFETY = {
  executesMerge: false,
  liveServiceTouched: false,
  deploys: false,
  changesDomain: false,
  usesPaidAction: false,
  touchesProductionData: false,
  touchesCustomerData: false
};

function ciPassedForCommit(ciStatuses, commitSha) {
  return ciStatuses.some((status) =>
    status?.commitSha === commitSha &&
    status?.status === "completed" &&
    status?.conclusion === "success"
  );
}

function noLiveProdPaidDomainCustomerDataAction(actionFlags = {}) {
  return actionFlags.liveService !== true &&
    actionFlags.productionData !== true &&
    actionFlags.paidAction !== true &&
    actionFlags.domainChange !== true &&
    actionFlags.customerData !== true;
}

function blockingReasonsFromConditions(conditions) {
  const reasons = [];

  if (!conditions.approvalGateAllows) {
    reasons.push("approval gate does not allow merge");
  }

  if (!conditions.ciPassed) {
    reasons.push("CI has not passed for the exact commit SHA");
  }

  if (!conditions.validationPassed) {
    reasons.push("validation has not passed");
  }

  if (!conditions.riskTierAllowed) {
    reasons.push("risk tier is not safe-merge eligible");
  }

  if (!conditions.noBlockedFiles) {
    reasons.push("blocked files are present");
  }

  if (!conditions.noLiveProdPaidDomainCustomerDataAction) {
    reasons.push("live, production, paid, domain, or customer-data action is present");
  }

  if (!conditions.auditEventCreated) {
    reasons.push("audit event has not been created");
  }

  return reasons;
}

export function buildSafeMergeRuntimeRecord({
  runId,
  prNumber,
  commitSha,
  riskLevel,
  approvalGateAllows = false,
  ciStatuses = [],
  validationPassed = false,
  blockedFiles = [],
  actionFlags = {},
  auditEventCreated = false,
  now = new Date()
}) {
  const timestamp = isoTimestamp(now);
  const normalizedRunId = normalizeRunId(runId);
  const conditions = {
    approvalGateAllows: approvalGateAllows === true,
    ciPassed: ciPassedForCommit(ciStatuses, commitSha),
    validationPassed: validationPassed === true,
    riskTierAllowed: SAFE_MERGE_RISK_LEVELS.has(riskLevel),
    noBlockedFiles: blockedFiles.length === 0,
    noLiveProdPaidDomainCustomerDataAction: noLiveProdPaidDomainCustomerDataAction(actionFlags),
    auditEventCreated: auditEventCreated === true
  };
  const blockingReasons = blockingReasonsFromConditions(conditions);

  return {
    safeMergeRuntimeId: `safe-merge-${normalizedRunId}-pr-${prNumber}`,
    status: blockingReasons.length === 0 ? "ready" : "blocked",
    mode: "merge_gate_only",
    prNumber,
    commitSha,
    riskLevel,
    conditions,
    blockedFiles,
    blockingReasons,
    safety: NO_EXECUTION_SAFETY,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

export function validateSafeMergeRuntimeRecord(record) {
  const errors = [];

  if (!record?.safeMergeRuntimeId || !/^safe-merge-[a-z0-9-]+$/.test(record.safeMergeRuntimeId)) {
    errors.push("safeMergeRuntimeId is required");
  }

  if (record?.mode !== "merge_gate_only") {
    errors.push("mode must be merge_gate_only");
  }

  if (!/^[a-fA-F0-9]{7,40}$/.test(record?.commitSha || "")) {
    errors.push("commitSha must be a Git commit SHA");
  }

  if (!Number.isInteger(record?.prNumber) || record.prNumber < 1) {
    errors.push("prNumber must be a positive integer");
  }

  if (!record?.conditions || Object.values(record.conditions).some((value) => typeof value !== "boolean")) {
    errors.push("conditions must be boolean values");
  }

  if (!Array.isArray(record?.blockingReasons)) {
    errors.push("blockingReasons must be an array");
  }

  if (!record?.safety || Object.values(record.safety).some((value) => value !== false)) {
    errors.push("safety flags must all be false for merge_gate_only");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function writeSafeMergeRuntimeRecord({ record, root = process.cwd() }) {
  const validation = validateSafeMergeRuntimeRecord(record);
  if (!validation.valid) {
    throw new Error(`Safe merge runtime record invalid: ${validation.errors.join("; ")}`);
  }

  const filePath = `.codex/merges/${record.safeMergeRuntimeId}.json`;
  writeJson(filePath, record, root);
  return { filePath, record };
}
