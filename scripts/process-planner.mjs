import process from "node:process";
import { writePlanRecord } from "./lib/runtime/planner-processor.mjs";

function readArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

const routeRecordPath = readArg("--route-record");
const jobRecordPath = readArg("--job-record");
const commandRecordPath = readArg("--command-record");
const planDraftPath = readArg("--plan-draft");
const runId = readArg("--run-id");

if (!routeRecordPath) {
  console.error("Usage: node scripts/process-planner.mjs --route-record .codex/router/route-runtime-example.json --job-record .codex/jobs/job-runtime-example.json --command-record .codex/commands/command-intake-runtime-example.json");
  process.exit(1);
}

const result = writePlanRecord({
  routeRecordPath,
  jobRecordPath,
  commandRecordPath,
  planDraftPath,
  runId
});

console.log(JSON.stringify({
  processor: "planner",
  recordPath: result.filePath,
  planId: result.record.planId,
  estimatedCostUsd: result.record.estimatedCostUsd,
  approvalGates: result.record.approvalGates.map((gate) => gate.gateId),
  safety: result.record.safety
}, null, 2));
