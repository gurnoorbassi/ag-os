import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { isoTimestamp, slugify, writeJson } from "./common.mjs";

export const DEFAULT_ANTHROPIC_DAILY_CALL_LIMIT = 20;

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function readCostRecords(root) {
  const directory = path.join(root, ".codex", "costs");
  if (!existsSync(directory)) return [];
  return readdirSync(directory)
    .filter((name) => name.startsWith("cost-ledger-") && name.endsWith(".json") && !name.includes("template"))
    .map((name) => {
      try { return readJson(path.join(directory, name)); } catch { return null; }
    })
    .filter(Boolean);
}

function requirePositiveNumber(value, label) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${label} must be a non-negative number`);
  return parsed;
}

function loadBudget(root) {
  const budgetPath = path.join(root, ".codex", "costs", "budget.json");
  if (!existsSync(budgetPath)) throw new Error("Anthropic budget configuration is missing");
  const budget = readJson(budgetPath);
  const limits = {
    perTaskMax: Number(budget.limits?.perTaskMaxUsd),
    dailyMax: Number(budget.limits?.dailyMaxUsd),
    monthlyMax: Number(budget.limits?.monthlyMaxUsd)
  };
  if (Object.values(limits).some((value) => !Number.isFinite(value) || value <= 0)) {
    throw new Error("Anthropic budget limits are missing or invalid");
  }
  return limits;
}

function recordJobId(record) {
  return record.entries?.find((entry) => entry.jobId)?.jobId || null;
}

function recordDate(record) {
  const parsed = new Date(record.createdAt);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function actualSpend(records, predicate) {
  return records
    .filter((record) => !record.costLedgerId?.startsWith("cost-ledger-anthropic-budget-blocked-"))
    .filter((record) => !record.costLedgerId?.startsWith("cost-ledger-anthropic-call-") || record.summary?.billingReconciled === false)
    .filter(predicate)
    .reduce((total, record) => total + Number(record.summary?.actualTaskCostUsd || 0), 0);
}

function activeReservedSpend(records, predicate) {
  return records
    .filter((record) => record.status === "active" && record.costLedgerId?.startsWith("cost-ledger-anthropic-call-"))
    .filter(predicate)
    .reduce((total, record) => total + Number(record.entries?.[0]?.amountUsd || 0), 0);
}

export function anthropicBudgetStatus({ root = process.cwd(), env = process.env, now = new Date() } = {}) {
  const records = readCostRecords(root);
  const limits = loadBudget(root);
  const day = isoTimestamp(now).slice(0, 10);
  const month = day.slice(0, 7);
  const sameDay = (record) => recordDate(record)?.toISOString().slice(0, 10) === day;
  const sameMonth = (record) => recordDate(record)?.toISOString().slice(0, 7) === month;
  const dailyCallLimit = Number(env.AG_OS_ANTHROPIC_DAILY_CALL_LIMIT ?? DEFAULT_ANTHROPIC_DAILY_CALL_LIMIT);
  if (!Number.isInteger(dailyCallLimit) || dailyCallLimit <= 0) throw new Error("AG_OS_ANTHROPIC_DAILY_CALL_LIMIT must be a positive integer");
  return {
    dailyCallCount: records.filter((record) => record.costLedgerId?.startsWith("cost-ledger-anthropic-call-") && sameDay(record)).length,
    dailyCallLimit,
    dailyActualUsd: actualSpend(records, sameDay),
    monthlyActualUsd: actualSpend(records, sameMonth),
    limits: {
      perTaskMaxUsd: limits.perTaskMax,
      dailyMaxUsd: limits.dailyMax,
      monthlyMaxUsd: limits.monthlyMax
    },
    breakerArmed: true
  };
}

function uniqueLedgerId(kind, jobId, status, now) {
  const instant = isoTimestamp(now).replace(/[^0-9]/g, "");
  return `cost-ledger-anthropic-${status}-${slugify(kind)}-${slugify(jobId)}-${instant}-${randomUUID().slice(0, 8)}`;
}

function buildBudgetRecord({ ledgerId, status, jobId, projectId, approvalId, estimatedCostUsd, taskActualUsd, dailyActualUsd, monthlyActualUsd, limits, now }) {
  const timestamp = isoTimestamp(now);
  return {
    costLedgerId: ledgerId,
    status,
    budgetLimitsUsd: limits,
    entries: [{
      costEntryId: `cost-entry-${ledgerId.replace(/^cost-ledger-/, "")}`,
      jobId,
      projectId,
      costType: status === "blocked" ? "estimated" : "reserved",
      amountUsd: estimatedCostUsd,
      approvalRequired: true,
      ...(approvalId ? { approvalId } : {}),
      status: status === "blocked" ? "blocked" : "approved"
    }],
    summary: {
      estimatedTaskCostUsd: estimatedCostUsd,
      actualTaskCostUsd: taskActualUsd,
      dailyActualUsd,
      monthlyActualUsd,
      budgetStatus: status === "blocked" ? "blocked" : "within_limit"
    },
    safety: {
      createsBillingChange: false,
      usesPaidService: true,
      usesLiveApi: true,
      requiresOwnerApproval: true
    },
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function atOrOver(current, estimate, limit) {
  return current >= limit || current + estimate >= limit;
}

export function estimateAnthropicCallCostUsd({ requestBody, maxTokens, inputCostPerMillionUsd, outputCostPerMillionUsd }) {
  const inputPrice = requirePositiveNumber(inputCostPerMillionUsd, "Anthropic input token price");
  const outputPrice = requirePositiveNumber(outputCostPerMillionUsd, "Anthropic output token price");
  if (!Number.isInteger(maxTokens) || maxTokens <= 0) throw new Error("Anthropic max_tokens must be a positive integer");
  const estimatedInputTokens = Math.max(1, Math.ceil(Buffer.byteLength(JSON.stringify(requestBody), "utf8") / 4));
  return Number(((estimatedInputTokens * inputPrice + maxTokens * outputPrice) / 1_000_000).toFixed(6));
}

export function reserveAnthropicBudget({
  kind,
  job,
  requestBody,
  maxTokens,
  inputCostPerMillionUsd,
  outputCostPerMillionUsd,
  approvalId,
  approvalMaxUsd,
  root = process.cwd(),
  env = process.env,
  now = new Date()
}) {
  if (!job?.jobId || !job?.projectId) throw new Error("Anthropic budget check requires a jobId and projectId");
  const limits = loadBudget(root);
  const estimate = estimateAnthropicCallCostUsd({ requestBody, maxTokens, inputCostPerMillionUsd, outputCostPerMillionUsd });
  const records = readCostRecords(root);
  const day = isoTimestamp(now).slice(0, 10);
  const month = day.slice(0, 7);
  const sameTask = (record) => recordJobId(record) === job.jobId;
  const sameDay = (record) => recordDate(record)?.toISOString().slice(0, 10) === day;
  const sameMonth = (record) => recordDate(record)?.toISOString().slice(0, 7) === month;
  const taskActualUsd = actualSpend(records, sameTask);
  const dailyActualUsd = actualSpend(records, sameDay);
  const monthlyActualUsd = actualSpend(records, sameMonth);
  const taskCommittedUsd = taskActualUsd + activeReservedSpend(records, sameTask);
  const dailyCommittedUsd = dailyActualUsd + activeReservedSpend(records, sameDay);
  const monthlyCommittedUsd = monthlyActualUsd + activeReservedSpend(records, sameMonth);
  const configuredCallLimit = env.AG_OS_ANTHROPIC_DAILY_CALL_LIMIT ?? DEFAULT_ANTHROPIC_DAILY_CALL_LIMIT;
  const dailyCallLimit = Number(configuredCallLimit);
  if (!Number.isInteger(dailyCallLimit) || dailyCallLimit <= 0) throw new Error("AG_OS_ANTHROPIC_DAILY_CALL_LIMIT must be a positive integer");
  const dailyCallCount = records.filter((record) =>
    record.costLedgerId?.startsWith("cost-ledger-anthropic-call-") && sameDay(record)
  ).length;
  const reasons = [];
  if (atOrOver(taskCommittedUsd, estimate, limits.perTaskMax)) reasons.push("per-task budget cap reached");
  if (atOrOver(dailyCommittedUsd, estimate, limits.dailyMax)) reasons.push("daily budget cap reached");
  if (atOrOver(monthlyCommittedUsd, estimate, limits.monthlyMax)) reasons.push("monthly budget cap reached");
  if (Number.isFinite(Number(approvalMaxUsd)) && atOrOver(0, estimate, Number(approvalMaxUsd))) reasons.push("approval per-use budget cap reached");
  if (dailyCallCount >= dailyCallLimit) reasons.push("daily Anthropic call-count breaker reached");

  if (reasons.length > 0) {
    const ledgerId = uniqueLedgerId(kind, job.jobId, "budget-blocked", now);
    const record = buildBudgetRecord({
      ledgerId,
      status: "blocked",
      jobId: job.jobId,
      projectId: job.projectId,
      approvalId,
      estimatedCostUsd: estimate,
      taskActualUsd,
      dailyActualUsd,
      monthlyActualUsd,
      limits,
      now
    });
    const recordPath = `.codex/costs/${ledgerId}.json`;
    writeJson(recordPath, record, root);
    const error = new Error(`Anthropic ${kind} blocked by budget: ${reasons.join("; ")}`);
    error.code = "blocked_budget";
    error.result = { status: "blocked_budget", reasons, recordPath, estimatedCostUsd: estimate };
    throw error;
  }

  const ledgerId = uniqueLedgerId(kind, job.jobId, "call", now);
  const recordPath = `.codex/costs/${ledgerId}.json`;
  writeJson(recordPath, buildBudgetRecord({
    ledgerId,
    status: "active",
    jobId: job.jobId,
    projectId: job.projectId,
    approvalId,
    estimatedCostUsd: estimate,
    taskActualUsd,
    dailyActualUsd,
    monthlyActualUsd,
    limits,
    now
  }), root);
  return { recordPath, estimatedCostUsd: estimate, dailyCallCount, dailyCallLimit };
}

export function finalizeAnthropicBudgetReservation({ reservation, consumed, actualCostUsd, root = process.cwd(), now = new Date() }) {
  if (!reservation?.recordPath) return null;
  const absolute = path.join(root, reservation.recordPath);
  if (!existsSync(absolute)) throw new Error(`Anthropic budget reservation is missing: ${reservation.recordPath}`);
  const record = readJson(absolute);
  if (record.status !== "active") throw new Error(`Anthropic budget reservation is not active: ${reservation.recordPath}`);
  const updated = {
    ...record,
    status: "archived",
    entries: record.entries.map((entry) => ({
      ...entry,
      costType: consumed ? "actual" : "reversed",
      ...(consumed ? { amountUsd: Number.isFinite(Number(actualCostUsd)) ? Number(actualCostUsd) : Number(entry.amountUsd) } : {}),
      status: consumed ? "recorded" : "reversed"
    })),
    summary: {
      ...record.summary,
      ...(consumed ? {
        actualTaskCostUsd: Number.isFinite(Number(actualCostUsd)) ? Number(actualCostUsd) : Number(record.summary.estimatedTaskCostUsd),
        billingReconciled: Number.isFinite(Number(actualCostUsd))
      } : { billingReconciled: true })
    },
    updatedAt: isoTimestamp(now)
  };
  writeJson(reservation.recordPath, updated, root);
  return updated;
}
