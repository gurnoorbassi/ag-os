import { createHash } from "node:crypto";
import process from "node:process";
import { isoTimestamp, normalizeRunId, writeJson } from "./common.mjs";
import { assertApprovalStillActive, assertExactConnectorApproval, canonicalJson } from "./connector-approval-guard.mjs";
import { fetchWithTimeout } from "./fetch-with-timeout.mjs";

const MAX_WORKFLOW_BYTES = 500_000;
const MAX_NODES = 100;

function safeBaseUrl(value) {
  let url;
  try {
    url = new URL(String(value || ""));
  } catch {
    throw new Error("n8n baseUrl must be a valid HTTPS API URL");
  }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    throw new Error("n8n baseUrl must be HTTPS and contain no credentials, query, or fragment");
  }
  const pathname = url.pathname.replace(/\/$/, "");
  if (!pathname.endsWith("/api/v1")) throw new Error("n8n baseUrl must end with /api/v1");
  return `${url.origin}${pathname}`;
}

function validateWorkflow(workflow) {
  if (!workflow || typeof workflow !== "object" || Array.isArray(workflow)) throw new Error("n8n workflow is required");
  const name = String(workflow.name || "").trim();
  if (!name || name.length > 120) throw new Error("n8n workflow name must be between 1 and 120 characters");
  if (!Array.isArray(workflow.nodes) || workflow.nodes.length === 0 || workflow.nodes.length > MAX_NODES) {
    throw new Error(`n8n workflow must contain between 1 and ${MAX_NODES} nodes`);
  }
  for (const node of workflow.nodes) {
    if (!node || typeof node !== "object" || !node.name || !node.type || !Array.isArray(node.position)) {
      throw new Error("every n8n node must include name, type, and position");
    }
    if (Object.hasOwn(node, "credentials")) throw new Error("n8n draft workflows may not include credential references");
    if (/executeCommand|ssh/i.test(String(node.type))) throw new Error(`n8n draft workflow contains a prohibited node type: ${node.type}`);
  }
  if (!workflow.connections || typeof workflow.connections !== "object" || Array.isArray(workflow.connections)) {
    throw new Error("n8n workflow connections must be an object");
  }
  if (workflow.active === true) throw new Error("n8n adapter may create disabled workflows only");
  const payload = {
    name,
    nodes: workflow.nodes,
    connections: workflow.connections,
    settings: workflow.settings && typeof workflow.settings === "object" ? workflow.settings : {}
  };
  const sizeBytes = Buffer.byteLength(canonicalJson(payload));
  if (sizeBytes > MAX_WORKFLOW_BYTES) throw new Error(`n8n workflow exceeds ${MAX_WORKFLOW_BYTES} bytes`);
  return { payload, sizeBytes };
}

export function validateN8nDisabledWorkflowRequest({ request }) {
  if (request?.adapterId !== "n8n-disabled-workflow" || request?.operation !== "create_disabled_workflow") {
    throw new Error("executionRequest must select the n8n disabled-workflow adapter and create_disabled_workflow operation");
  }
  const baseUrl = safeBaseUrl(request.baseUrl);
  const workflow = validateWorkflow(request.workflow);
  const workflowDigest = createHash("sha256").update(canonicalJson(workflow.payload)).digest("hex");
  return { baseUrl, ...workflow, workflowDigest };
}

export function n8nApprovalCriteria(validated) {
  return [
    `n8n API base URL is exactly ${validated.baseUrl}.`,
    `n8n workflow name is exactly ${validated.payload.name}.`,
    `n8n workflow digest is exactly sha256:${validated.workflowDigest}.`,
    "n8n workflow must remain disabled and contain no credential references."
  ];
}

async function n8n(fetchImpl, credential, method, url, body, timeoutMs) {
  const response = await fetchWithTimeout(fetchImpl, url, {
    method,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      [["X", "N8N", "API", "KEY"].join("-")]: credential
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  }, timeoutMs);
  if (!response.ok) throw new Error(`n8n ${method} failed with HTTP ${response.status}`);
  return response.json();
}

export async function executeN8nDisabledWorkflow({ request, job, adapter, approval, credential, fetchImpl = globalThis.fetch, root = process.cwd(), now = new Date(), timeoutMs = process.env.AG_OS_PROVIDER_TIMEOUT_MS }) {
  if (!credential) throw new Error("n8n private runtime credential is not configured");
  if (typeof fetchImpl !== "function") throw new Error("n8n transport is unavailable");
  const validated = validateN8nDisabledWorkflowRequest({ request });
  assertExactConnectorApproval({ approval, job, adapter, criteria: n8nApprovalCriteria(validated) });
  assertApprovalStillActive({ approvalId: approval.approvalId, connectorName: "n8n", root, now });
  const created = await n8n(fetchImpl, credential, "POST", `${validated.baseUrl}/workflows`, validated.payload, timeoutMs);
  if (!created?.id) throw new Error("n8n did not return a workflow ID");
  if (created.active !== false) throw new Error("n8n returned a workflow that is not explicitly disabled");
  const verified = await n8n(fetchImpl, credential, "GET", `${validated.baseUrl}/workflows/${encodeURIComponent(created.id)}`, undefined, timeoutMs);
  if (verified.id !== created.id || verified.active !== false) throw new Error("n8n disabled-workflow verification failed");

  const timestamp = isoTimestamp(now);
  const runId = normalizeRunId(job.jobId.replace(/^job-/, ""));
  const exportPath = `.codex/n8n/exports/n8n-export-${runId}.json`;
  writeJson(exportPath, { ...validated.payload, id: created.id, active: false }, root);
  const record = {
    connectorExecutionId: `connector-exec-${runId}-n8n-disabled-workflow`,
    status: "done",
    connectorId: "connector-n8n-mcp",
    requestedAction: adapter.requestedAction,
    riskLevel: job.riskLevel,
    projectId: job.projectId,
    approvalRequired: true,
    approvalId: approval.approvalId,
    requiredPermissions: ["workflow:create", "workflow:read"],
    evidenceRequired: ["exact workflow digest", "disabled state verification", "workflow export"],
    safety: { executesLiveAction: true, usesCredentials: true, triggersDeployment: false, changesDomain: false, usesPaidAction: false, accessesProductionData: false },
    result: { workflowId: created.id, workflowName: validated.payload.name, active: false, workflowDigest: validated.workflowDigest, exportPath },
    prohibitedActionsConfirmedFalse: ["workflow_activation", "credential_connection", "workflow_execution", "message_send", "production_change"],
    notes: "Created and verified one disabled n8n workflow only. Activation, credentials, and execution remain separately gated.",
    createdAt: timestamp,
    updatedAt: timestamp
  };
  const filePath = `.codex/connectors/${record.connectorExecutionId}.json`;
  writeJson(filePath, record, root);
  return { record, filePath, executionPath: filePath, workProductPath: exportPath };
}
