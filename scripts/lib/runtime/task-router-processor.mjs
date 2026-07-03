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

export function buildTaskRouteRecord({ job, runId, now = new Date() }) {
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
    routingReason: "The queued owner command is routed to the offline planner foundation because it requests a plan-only website outcome and does not authorize live execution.",
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

export function writeTaskRouteRecord({ job, jobRecordPath, runId, now, root = process.cwd() }) {
  const sourceJob = job ?? readJson(jobRecordPath, root);
  const record = buildTaskRouteRecord({ job: sourceJob, runId, now });
  const filePath = `.codex/router/${record.routeId}.json`;
  writeJson(filePath, record, root);
  return { filePath, record };
}
