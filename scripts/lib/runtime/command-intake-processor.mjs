import { DEFAULT_PROJECT_ID, isoTimestamp, normalizeRunId, slugify, writeJson } from "./common.mjs";

function classifyCommand(command) {
  const lowerCommand = command.toLowerCase();
  const isWebsite = /\b(web\s*site|website|site)\b/.test(lowerCommand);
  const isConstruction = /\bconstruction\b/.test(lowerCommand);
  const mentionsDeployment = /\bdeploy|deployment|publish|go live\b/.test(lowerCommand);
  const mentionsDomain = /\bdomain|dns\b/.test(lowerCommand);
  const mentionsPaid = /\bpaid|buy|purchase|subscribe|billing\b/.test(lowerCommand);
  const mentionsCredentials = /\bcredential|secret|api key|password|token\b/.test(lowerCommand);

  const targetSlug = slugify([
    isConstruction ? "construction" : null,
    isWebsite ? "website" : "request"
  ].filter(Boolean).join(" "));

  const requiresApproval = mentionsDeployment || mentionsDomain || mentionsPaid || mentionsCredentials;

  return {
    targetSlug,
    projectId: isConstruction && isWebsite ? DEFAULT_PROJECT_ID : `project-unregistered-${targetSlug}`,
    normalizedCommand: isConstruction && isWebsite
      ? "Create a plan-only construction website build plan."
      : `Create a plan-only ${targetSlug} plan.`,
    plannedOutput: isConstruction && isWebsite
      ? "Plan-only command intake record for a construction website."
      : `Plan-only command intake record for ${targetSlug}.`,
    riskLevel: requiresApproval ? "R3" : "R1",
    classification: {
      requiresPlan: true,
      requiresApproval,
      requiresLiveService: false,
      requiresDeployment: mentionsDeployment,
      requiresDomainChange: mentionsDomain,
      requiresPaidAction: mentionsPaid,
      requiresProductionData: false
    }
  };
}

export function buildCommandIntakeRecord({ command, runId, now = new Date() }) {
  if (!command || typeof command !== "string" || command.trim().length === 0) {
    throw new Error("command is required");
  }

  const normalizedRunId = normalizeRunId(runId || command);
  const timestamp = isoTimestamp(now);
  const classification = classifyCommand(command.trim());

  return {
    commandIntakeId: `command-intake-${normalizedRunId}`,
    status: "classified",
    rawCommand: command.trim(),
    normalizedCommand: classification.normalizedCommand,
    commandCategory: "plan_only",
    projectId: classification.projectId,
    riskLevel: classification.riskLevel,
    classification: classification.classification,
    plannedOutput: classification.plannedOutput,
    nextRecord: {
      jobId: `job-${normalizedRunId}`,
      planId: `plan-${normalizedRunId}`
    },
    safety: {
      executesCommand: false,
      createsLiveSideEffect: false,
      usesCredentials: false,
      callsConnector: false
    },
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

export function writeCommandIntakeRecord({ command, runId, now, root = process.cwd() }) {
  const record = buildCommandIntakeRecord({ command, runId, now });
  const filePath = `.codex/commands/${record.commandIntakeId}.json`;
  writeJson(filePath, record, root);
  return { filePath, record };
}
