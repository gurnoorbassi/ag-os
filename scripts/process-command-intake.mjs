import { readFileSync } from "node:fs";
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
const projectId = readArg("--project-id");
const runId = readArg("--run-id");
const understandingPath = readArg("--understanding");

if (!command) {
  console.error("Usage: node scripts/process-command-intake.mjs --command \"make me a construction website\" --run-id construction-website [--project-id project-id] [--understanding path/to/understanding.json]");
  process.exit(1);
}

const understanding = understandingPath
  ? JSON.parse(readFileSync(understandingPath, "utf8"))
  : undefined;

const result = writeCommandIntakeRecord({ command, projectId, runId, understanding });
console.log(JSON.stringify({
  processor: "command-intake",
  recordPath: result.filePath,
  commandIntakeId: result.record.commandIntakeId,
  safety: result.record.safety
}, null, 2));
