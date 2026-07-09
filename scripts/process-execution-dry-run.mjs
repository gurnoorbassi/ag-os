import process from "node:process";
import { writeExecutionDryRunRecords } from "./lib/runtime/execution-dry-run-processor.mjs";

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
const skipValidation = process.argv.includes("--skip-validation");

if (!jobRecordPath || !planRecordPath) {
  console.error("Usage: node scripts/process-execution-dry-run.mjs --job-record .codex/jobs/job-runtime-example.json --plan-record .codex/plans/plan-runtime-example.json");
  process.exit(1);
}

const result = writeExecutionDryRunRecords({
  jobRecordPath,
  planRecordPath,
  runId,
  runValidation: !skipValidation
});

console.log(JSON.stringify({
  processor: "execution-dry-run",
  executionRecordPath: result.executionPath,
  jobRecordPath: result.jobPath,
  executionStepId: result.executionStep.executionStepId,
  executionStatus: result.executionStep.status,
  jobStatus: result.job.status,
  qualityScorePath: result.completion?.qualityScorePath ?? null,
  lessonCandidatePaths: result.completion?.lessonCandidatePaths ?? [],
  validationPassed: result.validationResult.passed,
  safety: result.executionStep.safety
}, null, 2));

if (!result.validationResult.passed) {
  process.exit(1);
}
