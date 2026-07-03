import process from "node:process";
import { writeConnectorDryRunGateRecords } from "./lib/runtime/connector-dry-run-gates.mjs";

function readArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

const planRecordPath = readArg("--plan-record");
const projectId = readArg("--project-id");
const runId = readArg("--run-id");

if (!planRecordPath && !projectId) {
  console.error("Usage: node scripts/process-connector-dry-run-gates.mjs --plan-record .codex/plans/plan-runtime-example.json");
  process.exit(1);
}

const result = writeConnectorDryRunGateRecords({
  planRecordPath,
  projectId,
  runId
});

console.log(JSON.stringify({
  processor: "connector-dry-run-gates",
  records: result.written.map((item) => ({
    recordPath: item.filePath,
    connectorExecutionId: item.record.connectorExecutionId,
    connectorId: item.record.connectorId,
    status: item.record.status,
    approvalRequired: item.record.approvalRequired
  }))
}, null, 2));
