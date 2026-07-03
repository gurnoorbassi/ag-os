import process from "node:process";
import { isoTimestamp, normalizeRunId, readJson, writeJson } from "./common.mjs";

function approvalGatesForJob(job) {
  const gates = [
    "future_build_requires_owner_confirmation",
    "future_deployment_requires_owner_approval",
    "future_domain_change_requires_owner_approval",
    "future_paid_tool_use_requires_owner_approval"
  ];

  if (job.approvalRequired === true) {
    gates.unshift("owner_approval_required_before_execution");
  }

  return gates;
}

// Routing reasons must be product-aware or generic, never hardcoded to a
// product category. The product label comes from the intake record when
// available; otherwise the reason stays generic.
function describeRoutedOutcome(job, commandIntake) {
  const productType = commandIntake?.productContext?.productType;
  if (productType && productType !== "unclassified product") {
    return `plan-only ${productType} outcome`;
  }

  const archetypeRef = commandIntake?.understanding?.productArchetype;
  if (typeof archetypeRef === "string" && archetypeRef.length > 0) {
    const archetypeLabel = archetypeRef
      .replace(/^missing_registered_archetype:/, "")
      .replace(/^archetype-/, "")
      .replace(/-/g, " ");
    if (archetypeLabel !== "none" && archetypeLabel.length > 0) {
      return `plan-only ${archetypeLabel} outcome`;
    }
  }

  return job?.commandType === "plan_only" ? "plan-only outcome" : "product build outcome";
}

export function buildTaskRouteRecord({ job, commandIntake, runId, now = new Date() }) {
  if (!job?.jobId) {
    throw new Error("job with jobId is required");
  }

  const normalizedRunId = normalizeRunId(runId || job.jobId.replace(/^job-/, ""));
  const timestamp = isoTimestamp(now);

  return {
    routeId: `route-${normalizedRunId}`,
    jobId: job.jobId,
    commandType: job.commandType,
    projectId: job.projectId,
    riskLevel: job.riskLevel,
    connectorNeeds: [],
    targetDomain: job.commandType === "plan_only" ? "planner" : "command-os",
    targetAgent: job.commandType === "plan_only" ? "planner-foundation" : "agent-local-runtime",
    approvalGates: approvalGatesForJob(job),
    routingReason: `The queued owner command is routed to the offline planner foundation because it requests a ${describeRoutedOutcome(job, commandIntake)} and does not authorize live execution.`,
    blockedBy: [],
    safety: {
      executionAuthorized: false,
      liveConnectorUseAllowed: false,
      deploymentAllowed: false,
      productionDataAllowed: false,
      paidActionAllowed: false
    },
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

export function writeTaskRouteRecord({ job, commandIntake, jobRecordPath, commandRecordPath, runId, now, root = process.cwd() }) {
  const sourceJob = job ?? readJson(jobRecordPath, root);
  const sourceCommandIntake = commandIntake ?? (commandRecordPath ? readJson(commandRecordPath, root) : undefined);
  const record = buildTaskRouteRecord({ job: sourceJob, commandIntake: sourceCommandIntake, runId, now });
  const filePath = `.codex/router/${record.routeId}.json`;
  writeJson(filePath, record, root);
  return { filePath, record };
}
