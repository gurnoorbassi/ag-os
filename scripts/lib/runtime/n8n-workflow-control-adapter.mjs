import { createHash } from "node:crypto";
import process from "node:process";
import { isoTimestamp, normalizeRunId, writeJson } from "./common.mjs";
import { assertApprovalStillActive, assertExactConnectorApproval, canonicalJson } from "./connector-approval-guard.mjs";

const OPERATIONS = new Map([
  ["activate_workflow", { active: true, endpoint: "activate" }],
  ["deactivate_workflow", { active: false, endpoint: "deactivate" }]
]);

function safeBaseUrl(value) {
  let url;
  try { url = new URL(String(value || "")); } catch { throw new Error("n8n baseUrl must be a valid HTTPS API URL"); }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    throw new Error("n8n baseUrl must be HTTPS and contain no credentials, query, or fragment");
  }
  const pathname = url.pathname.replace(/\/$/, "");
  if (!pathname.endsWith("/api/v1")) throw new Error("n8n baseUrl must end with /api/v1");
  return `${url.origin}${pathname}`;
}

function safeText(value, label, pattern, max = 160) {
  const text = String(value || "").trim();
  if (!text || text.length > max || !pattern.test(text)) throw new Error(`invalid n8n ${label}`);
  return text;
}

function workflowDigest(workflow) {
  const definition = {
    name: workflow.name,
    nodes: workflow.nodes,
    connections: workflow.connections,
    settings: workflow.settings || {}
  };
  return createHash("sha256").update(canonicalJson(definition)).digest("hex");
}

export function validateN8nWorkflowControlRequest({ request }) {
  if (request?.adapterId !== "n8n-workflow-control" || !OPERATIONS.has(request?.operation)) {
    throw new Error("executionRequest must select n8n-workflow-control with activate_workflow or deactivate_workflow");
  }
  return {
    baseUrl: safeBaseUrl(request.baseUrl),
    operation: request.operation,
    desired: OPERATIONS.get(request.operation),
    workflowId: safeText(request.workflowId, "workflowId", /^[A-Za-z0-9_-]+$/, 100),
    expectedWorkflowName: safeText(request.expectedWorkflowName, "expectedWorkflowName", /^[^\r\n]+$/, 120),
    expectedWorkflowDigest: safeText(request.expectedWorkflowDigest, "expectedWorkflowDigest", /^[a-f0-9]{64}$/i, 64).toLowerCase()
  };
}

export function n8nWorkflowControlApprovalCriteria(validated) {
  return [
    `n8n API base URL is exactly ${validated.baseUrl}.`,
    `n8n workflow ID is exactly ${validated.workflowId}.`,
    `n8n workflow name is exactly ${validated.expectedWorkflowName}.`,
    `n8n workflow definition digest is exactly sha256:${validated.expectedWorkflowDigest}.`,
    `n8n workflow operation is exactly ${validated.operation}.`
  ];
}

async function n8n(fetchImpl, credential, method, url) {
  const response = await fetchImpl(url, {
    method,
    headers: { accept: "application/json", [["X", "N8N", "API", "KEY"].join("-")]: credential }
  });
  if (!response.ok) throw new Error(`n8n ${method} failed with HTTP ${response.status}`);
  return response.json();
}

function assertExactWorkflow(workflow, validated) {
  if (String(workflow?.id) !== validated.workflowId) throw new Error("n8n returned a different workflow ID");
  if (workflow?.name !== validated.expectedWorkflowName) throw new Error("n8n workflow name changed after approval");
  const digest = workflowDigest(workflow);
  if (digest !== validated.expectedWorkflowDigest) throw new Error("n8n workflow definition changed after approval");
  for (const node of workflow.nodes || []) {
    if (/executeCommand|ssh/i.test(String(node.type || ""))) throw new Error(`n8n workflow contains a prohibited host-execution node: ${node.type}`);
  }
  return digest;
}

export async function executeN8nWorkflowControl({ request, job, adapter, approval, credential, fetchImpl = globalThis.fetch, root = process.cwd(), now = new Date() }) {
  if (!credential) throw new Error("n8n private runtime credential is not configured");
  if (typeof fetchImpl !== "function") throw new Error("n8n transport is unavailable");
  const validated = validateN8nWorkflowControlRequest({ request });
  assertExactConnectorApproval({ approval, job, adapter, criteria: n8nWorkflowControlApprovalCriteria(validated) });
  assertApprovalStillActive({ approvalId: approval.approvalId, connectorName: "n8n", root, now });
  const workflowUrl = `${validated.baseUrl}/workflows/${encodeURIComponent(validated.workflowId)}`;
  const before = await n8n(fetchImpl, credential, "GET", workflowUrl);
  const digest = assertExactWorkflow(before, validated);
  const changed = before.active !== validated.desired.active;
  if (changed) {
    assertApprovalStillActive({ approvalId: approval.approvalId, connectorName: "n8n", root, now });
    await n8n(fetchImpl, credential, "POST", `${workflowUrl}/${validated.desired.endpoint}`);
  }
  let verified;
  try {
    verified = await n8n(fetchImpl, credential, "GET", workflowUrl);
    assertExactWorkflow(verified, validated);
    if (verified.active !== validated.desired.active) throw new Error("n8n workflow state verification failed");
  } catch (error) {
    if (changed && validated.desired.active) {
      try { await n8n(fetchImpl, credential, "POST", `${workflowUrl}/deactivate`); } catch { /* rollback evidence is reported by the thrown failure */ }
    }
    throw error;
  }

  const timestamp = isoTimestamp(now);
  const runId = normalizeRunId(job.jobId.replace(/^job-/, ""));
  const record = {
    connectorExecutionId: `connector-exec-${runId}-n8n-workflow-control`,
    status: "done",
    connectorId: "connector-n8n-mcp",
    requestedAction: adapter.requestedAction,
    riskLevel: job.riskLevel,
    projectId: job.projectId,
    approvalRequired: true,
    approvalId: approval.approvalId,
    requiredPermissions: ["workflow:read", `workflow:${validated.desired.endpoint}`],
    evidenceRequired: ["exact workflow ID", "exact definition digest", "post-action state verification"],
    safety: { executesLiveAction: changed, usesCredentials: true, triggersDeployment: false, changesDomain: false, usesPaidAction: false, accessesProductionData: false },
    result: { workflowId: validated.workflowId, workflowName: validated.expectedWorkflowName, active: verified.active, operation: validated.operation, changed, workflowDigest: digest },
    prohibitedActionsConfirmedFalse: ["workflow_definition_change", "credential_change", "manual_execution", "message_send", "dns_change", "paid_action"],
    notes: "Applied only the exact approved n8n activation state. The adapter never stores workflow credentials or manually executes a workflow.",
    createdAt: timestamp,
    updatedAt: timestamp
  };
  const filePath = `.codex/connectors/${record.connectorExecutionId}.json`;
  writeJson(filePath, record, root);
  return {
    record,
    filePath,
    executionPath: filePath,
    workProductPath: filePath,
    deliverable: { kind: "connector_result", ownerUsable: true, previewAvailable: false, entryFile: "", files: [filePath] }
  };
}
