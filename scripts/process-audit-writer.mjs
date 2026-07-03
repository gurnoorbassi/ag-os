import process from "node:process";
import { writeAuditEventRecord } from "./lib/runtime/audit-writer.mjs";

function readArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

const runId = readArg("--run-id");
const summary = readArg("--summary");
const scope = readArg("--scope") || "runtime_processor_dry_run";
const riskLevel = readArg("--risk-level") || "R1";

if (!summary) {
  console.error("Usage: node scripts/process-audit-writer.mjs --summary \"Processor action completed\" --run-id construction-website");
  process.exit(1);
}

const result = writeAuditEventRecord({
  runId,
  summary,
  scope,
  riskLevel,
  relatedArtifacts: []
});

console.log(JSON.stringify({
  processor: "audit-writer",
  recordPath: result.filePath,
  auditId: result.record.id,
  eventType: result.record.eventType,
  liveServiceTouched: result.record.liveServiceTouched
}, null, 2));
