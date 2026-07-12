import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { writeAuditEventRecord } from "./audit-writer.mjs";
import { writeBootRunRecord } from "./boot-runner-processor.mjs";
import { writeCommandIntakeRecord } from "./command-intake-processor.mjs";
import { writeConnectorDryRunGateRecords } from "./connector-dry-run-gates.mjs";
import { writeCostLedgerRecord } from "./cost-ledger-writer.mjs";
import { writeJobRecord } from "./job-queue-processor.mjs";
import { writePlanRecord } from "./planner-processor.mjs";
import { writeTaskRouteRecord } from "./task-router-processor.mjs";

const MAX_COMMAND_LENGTH = 10_000;

function artifact(type, reference) {
  return { type, reference };
}

function runDashboardBuild(root) {
  const result = spawnSync(process.execPath, ["scripts/build-dashboard.mjs"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  if (result.status !== 0) {
    throw new Error(`dashboard refresh failed: ${result.stderr || result.stdout}`);
  }
}

export function assertOwnerCommand(command) {
  if (typeof command !== "string" || command.trim().length === 0) {
    throw new Error("command is required");
  }
  if (command.length > MAX_COMMAND_LENGTH) {
    throw new Error(`command must be ${MAX_COMMAND_LENGTH} characters or fewer`);
  }
}

export function createOperatorRunId(now = new Date()) {
  return `operator-${now.toISOString().replace(/[^0-9]/g, "").slice(0, 14)}-${randomUUID().slice(0, 8)}`;
}

export function listRecentOwnerCommands({ root = process.cwd(), limit = 10 } = {}) {
  const commandDir = path.join(root, ".codex/commands");
  return readdirSync(commandDir)
    .filter((name) => name.startsWith("command-intake-runtime-operator-") && name.endsWith(".json"))
    .map((name) => {
      const record = JSON.parse(readFileSync(path.join(commandDir, name), "utf8"));
      return {
        commandIntakeId: record.commandIntakeId,
        rawCommand: record.rawCommand,
        riskLevel: record.riskLevel,
        projectId: record.projectId,
        createdAt: record.createdAt,
        requiresApproval: record.classification?.requiresApproval === true,
        planId: record.nextRecord?.planId
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, Math.max(1, Math.min(limit, 50)));
}

export function submitOwnerCommand({ command, understanding, root = process.cwd(), now = new Date() }) {
  assertOwnerCommand(command);
  const runId = createOperatorRunId(now);
  const boot = writeBootRunRecord({ runId, now, root });

  if (boot.record.status !== "ready") {
    throw new Error(`AG OS boot is blocked: ${boot.record.summary.blockedReasons.join("; ")}`);
  }

  const intake = writeCommandIntakeRecord({ command: command.trim(), understanding, runId, now, root });
  const job = writeJobRecord({ commandIntake: intake.record, runId, now, root });
  const route = writeTaskRouteRecord({ job: job.record, commandIntake: intake.record, runId, now, root });
  const plan = writePlanRecord({
    route: route.record,
    job: job.record,
    commandIntake: intake.record,
    runId,
    now,
    root
  });
  const cost = writeCostLedgerRecord({
    job: job.record,
    plan: plan.record,
    runId,
    now,
    estimatedCostUsd: plan.record.estimatedCostUsd,
    actualCostUsd: 0,
    root
  });
  const connectorGates = writeConnectorDryRunGateRecords({ plan: plan.record, runId, now, root });
  const relatedArtifacts = [
    artifact("other", intake.record.commandIntakeId),
    artifact("other", boot.record.bootRunId),
    artifact("other", job.record.jobId),
    artifact("other", route.record.routeId),
    artifact("other", plan.record.planId),
    artifact("other", cost.record.costLedgerId),
    ...connectorGates.records.map((record) => artifact("other", record.connectorExecutionId))
  ];
  const audit = writeAuditEventRecord({
    runId,
    eventType: "owner_command_received",
    summary: "Authenticated owner command received and converted into an approval-gated AG OS work package.",
    scope: "live_owner_command_console",
    source: "ag_os_coordinator",
    relatedArtifacts,
    riskLevel: intake.record.riskLevel,
    liveServiceTouched: false,
    notes: "The coordinator created planning and gate records only. It did not execute connectors or live side effects.",
    now,
    root
  });

  runDashboardBuild(root);

  return {
    runId,
    status: job.record.approvalRequired ? "waiting_approval" : "planned",
    commandIntakeId: intake.record.commandIntakeId,
    jobId: job.record.jobId,
    planId: plan.record.planId,
    auditId: audit.record.id,
    approvalRequired: job.record.approvalRequired,
    recordsCreated: [
      boot.filePath,
      intake.filePath,
      job.filePath,
      route.filePath,
      plan.filePath,
      cost.filePath,
      ...connectorGates.written.map((item) => item.filePath),
      audit.filePath
    ],
    safety: {
      liveActionExecuted: false,
      credentialsUsed: false,
      deploymentTriggered: false,
      productionDataAccessed: false,
      paidActionTriggered: false
    }
  };
}
