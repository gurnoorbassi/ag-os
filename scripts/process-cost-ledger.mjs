import process from "node:process";
import { writeCostLedgerRecord } from "./lib/runtime/cost-ledger-writer.mjs";

function readArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

const jobRecordPath = readArg("--job-record");
const planRecordPath = readArg("--plan-record");
const runId = readArg("--run-id");

if (!jobRecordPath) {
  console.error("Usage: node scripts/process-cost-ledger.mjs --job-record .codex/jobs/job-runtime-example.json --plan-record .codex/plans/plan-runtime-example.json");
  process.exit(1);
}

const result = writeCostLedgerRecord({
  jobRecordPath,
  planRecordPath,
  runId,
  estimatedCostUsd: 0,
  actualCostUsd: 0
});

console.log(JSON.stringify({
  processor: "cost-ledger",
  recordPath: result.filePath,
  costLedgerId: result.record.costLedgerId,
  estimatedTaskCostUsd: result.record.summary.estimatedTaskCostUsd,
  budgetStatus: result.record.summary.budgetStatus,
  safety: result.record.safety
}, null, 2));
