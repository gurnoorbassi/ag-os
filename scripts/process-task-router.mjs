import process from "node:process";
import { writeTaskRouteRecord } from "./lib/runtime/task-router-processor.mjs";

function readArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

const jobRecordPath = readArg("--job-record");
const runId = readArg("--run-id");

if (!jobRecordPath) {
  console.error("Usage: node scripts/process-task-router.mjs --job-record .codex/jobs/job-runtime-example.json");
  process.exit(1);
}

const result = writeTaskRouteRecord({ jobRecordPath, runId });
console.log(JSON.stringify({
  processor: "task-router",
  recordPath: result.filePath,
  routeId: result.record.routeId,
  targetDomain: result.record.targetDomain,
  targetAgent: result.record.targetAgent,
  safety: result.record.safety
}, null, 2));
