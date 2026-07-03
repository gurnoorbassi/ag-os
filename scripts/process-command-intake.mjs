import process from "node:process";
import { writeCommandIntakeRecord } from "./lib/runtime/command-intake-processor.mjs";

function readArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

const command = readArg("--command");
const runId = readArg("--run-id");

if (!command) {
  console.error("Usage: node scripts/process-command-intake.mjs --command \"make me a construction website\" --run-id construction-website");
  process.exit(1);
}

const result = writeCommandIntakeRecord({ command, runId });
console.log(JSON.stringify({
  processor: "command-intake",
  recordPath: result.filePath,
  commandIntakeId: result.record.commandIntakeId,
  safety: result.record.safety
}, null, 2));
