import process from "node:process";
import { isoTimestamp, normalizeRunId, readJson, writeJson } from "./common.mjs";

export const COST_LIMITS_USD = {
  perTaskMax: 5,
  dailyMax: 10,
  monthlyMax: 50
};

export function buildCostLedgerRecord({
  job,
  plan,
  runId,
  now = new Date(),
  estimatedCostUsd = 0,
  actualCostUsd = 0,
  usesPaidService = false,
  usesLiveApi = false
}) {
  if (!job?.jobId) {
    throw new Error("job with jobId is required");
  }

  const normalizedRunId = normalizeRunId(runId || job.jobId.replace(/^job-/, ""));
  const timestamp = isoTimestamp(now);
  const projectId = job.projectId || plan?.projectId || "project-unregistered-request";
  const approvalRequired = estimatedCostUsd > 0 || actualCostUsd > 0;
  const overLimit = estimatedCostUsd > COST_LIMITS_USD.perTaskMax || actualCostUsd > COST_LIMITS_USD.perTaskMax;

  return {
    costLedgerId: `cost-ledger-${normalizedRunId}`,
    status: overLimit ? "blocked" : "active",
    budgetLimitsUsd: COST_LIMITS_USD,
    entries: [
      {
        costEntryId: `cost-entry-${normalizedRunId}-estimated`,
        jobId: job.jobId,
        projectId,
        costType: "estimated",
        amountUsd: estimatedCostUsd,
        approvalRequired,
        status: overLimit ? "blocked" : "recorded"
      }
    ],
    summary: {
      estimatedTaskCostUsd: estimatedCostUsd,
      actualTaskCostUsd: actualCostUsd,
      dailyActualUsd: actualCostUsd,
      monthlyActualUsd: actualCostUsd,
      budgetStatus: overLimit ? "over_limit" : "within_limit"
    },
    safety: {
      createsBillingChange: false,
      usesPaidService,
      usesLiveApi,
      requiresOwnerApproval: approvalRequired
    },
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

export function writeCostLedgerRecord({
  job,
  plan,
  jobRecordPath,
  planRecordPath,
  runId,
  now,
  estimatedCostUsd,
  actualCostUsd,
  usesPaidService,
  usesLiveApi,
  root = process.cwd()
}) {
  const sourceJob = job ?? readJson(jobRecordPath, root);
  const sourcePlan = plan ?? (planRecordPath ? readJson(planRecordPath, root) : undefined);
  const record = buildCostLedgerRecord({
    job: sourceJob,
    plan: sourcePlan,
    runId,
    now,
    estimatedCostUsd,
    actualCostUsd,
    usesPaidService,
    usesLiveApi
  });
  const filePath = `.codex/costs/${record.costLedgerId}.json`;
  writeJson(filePath, record, root);
  return { filePath, record };
}
