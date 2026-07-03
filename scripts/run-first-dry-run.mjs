import process from "node:process";
import { writeAuditEventRecord } from "./lib/runtime/audit-writer.mjs";
import { writeBootRunRecord } from "./lib/runtime/boot-runner-processor.mjs";
import { writeCommandIntakeRecord } from "./lib/runtime/command-intake-processor.mjs";
import { writeConnectorDryRunGateRecords } from "./lib/runtime/connector-dry-run-gates.mjs";
import { writeCostLedgerRecord } from "./lib/runtime/cost-ledger-writer.mjs";
import { writeExecutionDryRunRecords } from "./lib/runtime/execution-dry-run-processor.mjs";
import { writeJobRecord } from "./lib/runtime/job-queue-processor.mjs";
import { writePlanRecord } from "./lib/runtime/planner-processor.mjs";
import { writeTaskRouteRecord } from "./lib/runtime/task-router-processor.mjs";

const COMMAND = "make me a construction website";
const RUN_ID = "construction-website-automated-20260703";
const RUN_TIMESTAMP = new Date("2026-07-03T20:20:00.000Z");

function artifact(type, reference) {
  return { type, reference };
}

const command = writeCommandIntakeRecord({
  command: COMMAND,
  runId: RUN_ID,
  now: RUN_TIMESTAMP
});

const boot = writeBootRunRecord({
  runId: RUN_ID,
  now: RUN_TIMESTAMP
});

const job = writeJobRecord({
  commandIntake: command.record,
  runId: RUN_ID,
  now: RUN_TIMESTAMP
});

const route = writeTaskRouteRecord({
  job: job.record,
  commandIntake: command.record,
  runId: RUN_ID,
  now: RUN_TIMESTAMP
});

const plan = writePlanRecord({
  route: route.record,
  job: job.record,
  commandIntake: command.record,
  runId: RUN_ID,
  now: RUN_TIMESTAMP
});

const cost = writeCostLedgerRecord({
  job: job.record,
  plan: plan.record,
  runId: RUN_ID,
  now: RUN_TIMESTAMP,
  estimatedCostUsd: 0,
  actualCostUsd: 0
});

const connectorGates = writeConnectorDryRunGateRecords({
  plan: plan.record,
  runId: RUN_ID,
  now: RUN_TIMESTAMP
});

const audit = writeAuditEventRecord({
  runId: RUN_ID,
  summary: "Automated local dry run generated command intake, boot, job, route, plan, cost, connector gate, audit, and execution records for a construction website request.",
  scope: "automated_first_dry_run",
  riskLevel: "R1",
  relatedArtifacts: [
    artifact("other", command.record.commandIntakeId),
    artifact("other", boot.record.bootRunId),
    artifact("other", job.record.jobId),
    artifact("other", route.record.routeId),
    artifact("other", plan.record.planId),
    artifact("other", cost.record.costLedgerId),
    ...connectorGates.records.map((record) => artifact("other", record.connectorExecutionId))
  ],
  now: RUN_TIMESTAMP
});

const execution = writeExecutionDryRunRecords({
  job: job.record,
  plan: plan.record,
  runId: RUN_ID,
  now: RUN_TIMESTAMP,
  runValidation: true
});

const report = {
  commandInput: COMMAND,
  runId: RUN_ID,
  recordsCreated: [
    command.filePath,
    boot.filePath,
    job.filePath,
    route.filePath,
    plan.filePath,
    cost.filePath,
    ...connectorGates.written.map((item) => item.filePath),
    audit.filePath,
    execution.executionPath,
    execution.jobPath
  ],
  finalJobStatus: execution.job.status,
  validationPassed: execution.validationResult.passed,
  safety: {
    liveServiceCalls: false,
    credentialsUsed: false,
    deployments: false,
    domainChanges: false,
    paidUsage: false,
    productionData: false
  }
};

console.log(JSON.stringify(report, null, 2));

if (!execution.validationResult.passed) {
  process.exit(1);
}
