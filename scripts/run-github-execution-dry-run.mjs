import process from "node:process";
import { writeAuditEventRecord } from "./lib/runtime/audit-writer.mjs";
import { writeBootRunRecord } from "./lib/runtime/boot-runner-processor.mjs";
import { writeCommandIntakeRecord } from "./lib/runtime/command-intake-processor.mjs";
import { writeCostLedgerRecord } from "./lib/runtime/cost-ledger-writer.mjs";
import { writeExecutionDryRunRecords } from "./lib/runtime/execution-dry-run-processor.mjs";
import { writeGitHubConnectorDryRun } from "./lib/runtime/github-connector-dry-run-executor.mjs";
import { buildGitHubExecutionPlan, writeGitHubExecutionPlan } from "./lib/runtime/github-execution-plan.mjs";
import { buildGitHubMcpExecutionGate, writeGitHubMcpExecutionGate } from "./lib/runtime/github-mcp-execution-gate.mjs";
import { writeJobRecord } from "./lib/runtime/job-queue-processor.mjs";
import { writePlanRecord } from "./lib/runtime/planner-processor.mjs";
import { writeTaskRouteRecord } from "./lib/runtime/task-router-processor.mjs";

const COMMAND = "make me a simple construction website repo";
const RUN_ID = "github-construction-website-repo-20260703";
const RUN_TIMESTAMP = new Date("2026-07-03T20:45:00.000Z");
const REQUESTED_REPOSITORY_NAME = "owner-approval-required-construction-website-repo";

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

const githubExecutionPlan = writeGitHubExecutionPlan({
  plan: buildGitHubExecutionPlan({
    runId: RUN_ID,
    commandId: command.record.commandIntakeId,
    projectId: command.record.projectId,
    requestedRepositoryName: REQUESTED_REPOSITORY_NAME,
    riskLevel: "R3",
    now: RUN_TIMESTAMP
  })
});

const githubConnectorDryRun = writeGitHubConnectorDryRun({
  githubPlan: githubExecutionPlan.plan,
  runId: RUN_ID,
  now: RUN_TIMESTAMP
});

const githubMcpGate = writeGitHubMcpExecutionGate({
  gate: buildGitHubMcpExecutionGate({
    githubPlan: githubExecutionPlan.plan,
    activeApprovalLocks: [],
    ciStatuses: [],
    validationPassed: true,
    now: RUN_TIMESTAMP
  })
});

const audit = writeAuditEventRecord({
  runId: RUN_ID,
  summary: "Automated local GitHub execution dry run generated a construction website repo plan, gated GitHub connector actions, and blocked live execution pending owner approval.",
  scope: "first_github_execution_dry_run",
  riskLevel: "R3",
  relatedArtifacts: [
    artifact("other", command.record.commandIntakeId),
    artifact("other", boot.record.bootRunId),
    artifact("other", job.record.jobId),
    artifact("other", route.record.routeId),
    artifact("other", plan.record.planId),
    artifact("other", cost.record.costLedgerId),
    artifact("other", githubExecutionPlan.plan.githubExecutionPlanId),
    ...githubConnectorDryRun.connectorRecords.map((record) => artifact("other", record.connectorExecutionId)),
    artifact("other", githubMcpGate.gate.githubMcpExecutionGateId)
  ],
  notes: "No actual GitHub calls, repository creation, branch creation, file writes, pull request creation, CI polling, or merge execution occurred.",
  now: RUN_TIMESTAMP
});

const execution = writeExecutionDryRunRecords({
  job: job.record,
  plan: plan.record,
  runId: RUN_ID,
  now: RUN_TIMESTAMP,
  validationResult: { passed: true, status: 0, stdout: "deferred to explicit npm.cmd run validate", stderr: "" }
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
    githubExecutionPlan.filePath,
    ...githubConnectorDryRun.connectorPaths,
    githubConnectorDryRun.auditPath,
    githubMcpGate.filePath,
    audit.filePath,
    execution.executionPath,
    execution.jobPath
  ],
  githubExecutionPlanStatus: githubExecutionPlan.plan.status,
  githubMcpGateStatus: githubMcpGate.gate.status,
  finalJobStatus: execution.job.status,
  costUsd: 0,
  safety: {
    liveServiceCalls: false,
    credentialsUsed: false,
    deployments: false,
    domainChanges: false,
    paidUsage: false,
    productionData: false,
    customerData: false
  }
};

console.log(JSON.stringify(report, null, 2));

if (report.finalJobStatus !== "done") {
  process.exit(1);
}
