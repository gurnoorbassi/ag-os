import process from "node:process";
import { DEFAULT_OWNER_ID, isoTimestamp, normalizeRunId, readJson, writeJson } from "./common.mjs";

export function buildJobRecord({
  commandIntake,
  runId,
  now = new Date(),
  requestedBy = DEFAULT_OWNER_ID
}) {
  if (!commandIntake?.commandIntakeId) {
    throw new Error("commandIntake with commandIntakeId is required");
  }

  const normalizedRunId = normalizeRunId(runId || commandIntake.commandIntakeId.replace(/^command-intake-/, ""));
  const timestamp = isoTimestamp(now);
  const jobId = commandIntake.nextRecord?.jobId || `job-${normalizedRunId}`;
  const approvalRequired = commandIntake.classification?.requiresApproval === true;

  return {
    jobId,
    commandId: commandIntake.commandIntakeId,
    projectId: commandIntake.projectId || "project-unregistered-request",
    status: "queued",
    priority: "normal",
    riskLevel: commandIntake.riskLevel || "R1",
    commandType: commandIntake.commandCategory || "plan_only",
    requestedBy,
    assignedDomain: "command-os",
    assignedAgent: "agent-local-runtime",
    approvalRequired,
    expectedOutput: commandIntake.plannedOutput || "Plan-only local output.",
    queueTimestamps: {
      queuedAt: timestamp
    },
    safety: {
      credentialsAllowed: false,
      liveServicesAllowed: false,
      deploymentAllowed: false,
      domainChangeAllowed: false,
      productionDataAllowed: false,
      paidActionAllowed: false
    },
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

export function writeJobRecord({
  commandIntake,
  commandRecordPath,
  runId,
  now,
  root = process.cwd()
}) {
  const sourceCommandIntake = commandIntake ?? readJson(commandRecordPath, root);
  const record = buildJobRecord({ commandIntake: sourceCommandIntake, runId, now });
  const filePath = `.codex/jobs/${record.jobId}.json`;
  writeJson(filePath, record, root);
  return { filePath, record };
}
