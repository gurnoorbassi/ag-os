import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cpSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { canonicalJson } from "../scripts/lib/runtime/connector-approval-guard.mjs";
import { selectExecutionAdapter } from "../scripts/lib/runtime/execution-adapter-registry.mjs";
import { executeN8nWorkflowControl, n8nWorkflowControlApprovalCriteria, validateN8nWorkflowControlRequest } from "../scripts/lib/runtime/n8n-workflow-control-adapter.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function tempWorkspace() {
  const target = mkdtempSync(path.join(tmpdir(), "ag-os-n8n-control-"));
  cpSync(root, target, { recursive: true, filter: (source) => ![".git", "node_modules"].includes(path.basename(source)) });
  return target;
}

test("n8n control activates only the exact approved workflow and verifies the result", async () => {
  const workspace = tempWorkspace();
  const workflow = {
    id: "workflow-42",
    name: "Approved lead intake",
    nodes: [{ id: "webhook", name: "Webhook", type: "n8n-nodes-base.webhook", position: [0, 0], parameters: {} }],
    connections: {},
    settings: {},
    active: false
  };
  const digest = createHash("sha256").update(canonicalJson({ name: workflow.name, nodes: workflow.nodes, connections: workflow.connections, settings: workflow.settings })).digest("hex");
  const request = {
    adapterId: "n8n-workflow-control",
    operation: "activate_workflow",
    baseUrl: "https://n8n.example.test/api/v1",
    workflowId: workflow.id,
    expectedWorkflowName: workflow.name,
    expectedWorkflowDigest: digest
  };
  const validated = validateN8nWorkflowControlRequest({ request });
  const adapter = selectExecutionAdapter({ command: { executionRequest: request }, env: { AG_OS_LIVE_ADAPTERS_ENABLED: "true", [["AG_OS", "N8N", "API", "KEY"].join("_")]: "configured" } });
  const job = { jobId: "job-n8n-control", projectId: "project-quote-builder", riskLevel: "R4" };
  const approval = {
    approvalId: "approval-n8n-control",
    status: "approved",
    projectId: job.projectId,
    target: `${job.projectId}:${job.jobId}:${adapter.adapterId}`,
    approvedActions: [adapter.requestedAction],
    prohibitedActions: ["message_send", "manual_execution"],
    inclusionCriteria: [`Job is exactly ${job.jobId}.`, ...n8nWorkflowControlApprovalCriteria(validated)],
    expiresAt: "2030-01-01T00:00:00.000Z"
  };
  writeFileSync(path.join(workspace, ".codex", "approvals", `${approval.approvalId}.json`), JSON.stringify(approval), "utf8");
  const calls = [];
  let active = false;
  const privateCredential = ["private", "test", "key"].join("-");
  const result = await executeN8nWorkflowControl({
    request, job, adapter, approval, credential: privateCredential, root: workspace,
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      if (url.endsWith("/activate")) active = true;
      return { ok: true, status: 200, async json() { return { ...workflow, active }; } };
    },
    now: new Date("2026-07-16T04:30:00.000Z")
  });
  assert.equal(result.record.result.active, true);
  assert.equal(calls.filter((call) => call.options.method === "POST").length, 1);
  assert.equal(calls.some((call) => call.url.includes("execute")), false);
  assert.equal(JSON.stringify(result.record).includes(privateCredential), false);
});
