import process from "node:process";
import { writeBootRunRecord } from "./lib/runtime/boot-runner-processor.mjs";

function readArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

const runId = readArg("--run-id");
const result = writeBootRunRecord({ runId });

console.log(JSON.stringify({
  processor: "boot-runner",
  recordPath: result.filePath,
  bootRunId: result.record.bootRunId,
  status: result.record.status,
  safety: result.record.safety
}, null, 2));
