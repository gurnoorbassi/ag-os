import process from "node:process";
import { writeJobRecord } from "./lib/runtime/job-queue-processor.mjs";

function readArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

const commandRecordPath = readArg("--command-record");
const runId = readArg("--run-id");

if (!commandRecordPath) {
  console.error("Usage: node scripts/process-job-queue.mjs --command-record .codex/commands/command-intake-runtime-example.json");
  process.exit(1);
}

const result = writeJobRecord({ commandRecordPath, runId });
console.log(JSON.stringify({
  processor: "job-queue",
  recordPath: result.filePath,
  jobId: result.record.jobId,
  status: result.record.status,
  approvalRequired: result.record.approvalRequired,
  safety: result.record.safety
}, null, 2));
