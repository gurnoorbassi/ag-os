import process from "node:process";
import { buildAuditEventRecord } from "./audit-writer.mjs";
import { isoTimestamp, normalizeRunId, writeJson } from "./common.mjs";

function connectorRecordFromAction({ githubPlan, action, normalizedRunId, now }) {
  const timestamp = isoTimestamp(now);

  return {
    connectorExecutionId: `connector-exec-${normalizedRunId}-${action.actionType.replaceAll("_", "-")}`,
    status: "waiting_approval",
    connectorId: "connector-github-mcp",
    requestedAction: action.actionType,
    riskLevel: githubPlan.riskLevel,
    projectId: githubPlan.projectId,
    approvalRequired: true,
    requiredPermissions: [
      action.approvalGate,
      "approval_lock_before_live_execution",
      "audit_event_before_live_execution"
    ],
    evidenceRequired: action.requiredEvidence,
    safety: {
      executesLiveAction: false,
      usesCredentials: false,
      triggersDeployment: false,
      changesDomain: false,
      usesPaidAction: false,
      accessesProductionData: false
    },
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

export function buildGitHubConnectorDryRun({ githubPlan, runId, now = new Date() }) {
  if (!githubPlan?.githubExecutionPlanId) {
    throw new Error("githubPlan with githubExecutionPlanId is required");
  }

  const normalizedRunId = normalizeRunId(runId || githubPlan.githubExecutionPlanId.replace(/^github-plan-/, ""));
  const connectorRecords = githubPlan.plannedActions.map((action) => connectorRecordFromAction({
    githubPlan,
    action,
    normalizedRunId,
    now
  }));
  const audit = buildAuditEventRecord({
    runId: `${normalizedRunId}-github-dry-run`,
    actor: "ag-os-runtime",
    eventType: "validation_run",
    summary: `GitHub connector dry run produced ${connectorRecords.length} planned connector action record(s) without live GitHub calls.`,
    scope: githubPlan.githubExecutionPlanId,
    source: "local_validation",
    relatedArtifacts: [
      {
        type: "other",
        reference: githubPlan.githubExecutionPlanId
      },
      ...connectorRecords.map((record) => ({
        type: "other",
        reference: record.connectorExecutionId
      }))
    ],
    riskLevel: githubPlan.riskLevel,
    dataClassification: "internal",
    liveServiceTouched: false,
    notes: "Dry-run only. No GitHub MCP call, repository creation, branch creation, file write, pull request, CI polling, or merge was executed.",
    now
  });

  return {
    connectorRecords,
    audit
  };
}

export function writeGitHubConnectorDryRun({
  githubPlan,
  runId,
  now,
  root = process.cwd()
}) {
  const result = buildGitHubConnectorDryRun({ githubPlan, runId, now });
  const connectorPaths = result.connectorRecords.map((record) => {
    const filePath = `.codex/connectors/${record.connectorExecutionId}.json`;
    writeJson(filePath, record, root);
    return filePath;
  });
  const auditPath = `.codex/audit/${result.audit.id}.json`;
  writeJson(auditPath, result.audit, root);

  return {
    connectorPaths,
    auditPath,
    ...result
  };
}
