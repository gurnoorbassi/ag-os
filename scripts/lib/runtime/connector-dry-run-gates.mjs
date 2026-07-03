import process from "node:process";
import { isoTimestamp, normalizeRunId, readJson, writeJson } from "./common.mjs";

const CONNECTOR_GATES = [
  {
    suffix: "github",
    connectorId: "connector-github-mcp",
    requestedAction: "future_repository_creation_or_pull_request_work",
    riskLevel: "R3",
    requiredPermissions: [
      "owner approval lock",
      "audit event",
      "safe merge checks before repository writes"
    ],
    evidenceRequired: [
      "owner approval for GitHub connector action",
      "target repository or repository creation scope",
      "validation result before merge"
    ]
  },
  {
    suffix: "netlify",
    connectorId: "connector-netlify-mcp",
    requestedAction: "future_preview_or_production_deploy",
    riskLevel: "R4",
    requiredPermissions: [
      "owner approval lock",
      "audit event",
      "deployment scope and rollback plan"
    ],
    evidenceRequired: [
      "owner approval for Netlify connector action",
      "deployment target",
      "rollback plan",
      "validation result before deploy"
    ]
  },
  {
    suffix: "n8n",
    connectorId: "connector-n8n-mcp",
    requestedAction: "future_workflow_creation_or_activation_if_needed",
    riskLevel: "R4",
    requiredPermissions: [
      "owner approval lock",
      "audit event",
      "workflow backup before changes"
    ],
    evidenceRequired: [
      "owner approval for n8n connector action",
      "workflow scope",
      "workflow backup plan",
      "activation approval if activation is requested"
    ]
  }
];

export function buildConnectorDryRunGateRecords({
  projectId,
  runId,
  now = new Date()
}) {
  if (!projectId) {
    throw new Error("projectId is required");
  }

  const normalizedRunId = normalizeRunId(runId || projectId);
  const timestamp = isoTimestamp(now);

  return CONNECTOR_GATES.map((gate) => ({
    connectorExecutionId: `connector-exec-${normalizedRunId}-${gate.suffix}`,
    status: "waiting_approval",
    connectorId: gate.connectorId,
    requestedAction: gate.requestedAction,
    riskLevel: gate.riskLevel,
    projectId,
    approvalRequired: true,
    requiredPermissions: gate.requiredPermissions,
    evidenceRequired: gate.evidenceRequired,
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
  }));
}

export function writeConnectorDryRunGateRecords({
  projectId,
  plan,
  planRecordPath,
  runId,
  now,
  root = process.cwd()
}) {
  const sourcePlan = plan ?? (planRecordPath ? readJson(planRecordPath, root) : undefined);
  const targetProjectId = projectId || sourcePlan?.projectId;
  const records = buildConnectorDryRunGateRecords({
    projectId: targetProjectId,
    runId,
    now
  });
  const written = records.map((record) => {
    const filePath = `.codex/connectors/${record.connectorExecutionId}.json`;
    writeJson(filePath, record, root);
    return { filePath, record };
  });

  return { records, written };
}
