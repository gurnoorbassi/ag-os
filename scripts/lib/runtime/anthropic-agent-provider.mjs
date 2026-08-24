import process from "node:process";
import { calculateAnthropicCostUsd } from "./anthropic-planner.mjs";
import { finalizeAnthropicBudgetReservation, reserveAnthropicBudget } from "./anthropic-budget-guard.mjs";
import { writeAnthropicApprovalUse } from "./anthropic-usage-audit.mjs";
import { fetchWithTimeout } from "./fetch-with-timeout.mjs";

const DEFAULT_BASE_URL = "https://api.anthropic.com";
const VERSION = "2023-06-01";
const TOOLS = [
  ["list_files", "List files in the assigned workspace.", {}],
  ["read_file", "Read one text file.", { path: { type: "string" } }],
  ["search_files", "Search workspace text.", { query: { type: "string" } }],
  ["write_file", "Create or replace one text file.", { path: { type: "string" }, content: { type: "string" } }],
  ["edit_file", "Replace one exact, unique text fragment.", { path: { type: "string" }, search: { type: "string" }, replace: { type: "string" } }],
  ["apply_patch", "Apply one exact, unique search and replacement patch.", { path: { type: "string" }, search: { type: "string" }, replace: { type: "string" } }],
  ["git_diff", "Read the current Git diff and status.", {}],
  ["run_command", "Run an allowlisted local project command.", { command: { type: "string" } }],
  ["run_tests", "Run an allowlisted local test command.", { command: { type: "string" } }],
  ["run_build", "Run an allowlisted local build command.", { command: { type: "string" } }],
  ["run_typecheck", "Run an allowlisted local typecheck command.", { command: { type: "string" } }],
  ["complete", "Finish the task with a truthful outcome and concrete defects if it failed.", {
    outcome: { type: "string", enum: ["complete", "failed"] }, summary: { type: "string" },
    defects: { type: "array", items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, ownerRole: { type: "string" } }, required: ["title", "description"] } }
  }]
].map(([name, description, properties]) => ({ name, description, input_schema: { type: "object", additionalProperties: false, properties, required: Object.keys(properties).filter((key) => key !== "defects") } }));

function safeTranscript(transcript) {
  return transcript.slice(-20).map(({ action, result }) => ({ action, result: {
    ...result,
    ...(result?.content ? { content: String(result.content).slice(0, 40_000) } : {}),
    ...(result?.stdout ? { stdout: String(result.stdout).slice(-20_000) } : {}),
    ...(result?.stderr ? { stderr: String(result.stderr).slice(-20_000) } : {})
  } }));
}

export function createAnthropicAgentProvider({ apiKey, model, approvalId, approvalMaxUsd, approvalUsesRemaining = Infinity, root = process.cwd(), env = process.env, baseUrl = DEFAULT_BASE_URL, inputCostPerMillionUsd, outputCostPerMillionUsd, timeoutMs = process.env.AG_OS_AI_WORKER_TIMEOUT_MS || 180_000, fetchImpl = globalThis.fetch }) {
  if (!apiKey || !model || !approvalId) throw new Error("Anthropic agent provider requires configured credentials, model, and approval");
  let approvalUses = 0;
  return {
    name: "anthropic-tool-loop",
    paidService: true,
    async nextAction({ agent, task, workspace, transcript, budgetRemainingUsd, step, signal = null }) {
      if (approvalUses >= approvalUsesRemaining) {
        const error = new Error("Scoped Anthropic worker approval has no uses remaining");
        error.code = "approval_exhausted";
        throw error;
      }
      approvalUses += 1;
      const advertisedTools = TOOLS.filter((tool) => tool.name === "complete" || agent.allowedTools.includes(tool.name));
      const requestBody = {
        model,
        max_tokens: 4000,
        system: "You are a bounded AG OS coding agent. Work only through the supplied tools in your assigned isolated workspace. Inspect before editing. Make the smallest complete change for your task. Run relevant validation. Never request secrets, credentials, network calls, deployments, publishing, DNS, destructive commands, or customer/production data. Use complete only when the assigned acceptance criteria are actually satisfied; report concrete defects on failure.",
        messages: [{ role: "user", content: JSON.stringify({ missionId: task.missionId, agent: { id: agent.agentRunId, role: agent.role }, task: { id: task.taskId, title: task.title, description: task.description, acceptanceCriteria: task.acceptanceCriteria, attempt: task.attempt }, workspace: { id: workspace.workspaceId, branch: workspace.branch }, priorToolResults: safeTranscript(transcript), budgetRemainingUsd, step }) }],
        tools: advertisedTools,
        tool_choice: { type: "any" }
      };
      const job = { jobId: task.missionId, projectId: task.projectId || "project-unregistered-request" };
      const configuredApprovalMaxUsd = Number(approvalMaxUsd);
      const effectiveApprovalMaxUsd = Number.isFinite(configuredApprovalMaxUsd)
        ? Math.min(configuredApprovalMaxUsd, Number(budgetRemainingUsd))
        : Number(budgetRemainingUsd);
      let reservation;
      try {
        reservation = reserveAnthropicBudget({ kind: "worker", job, requestBody, maxTokens: requestBody.max_tokens, inputCostPerMillionUsd, outputCostPerMillionUsd, approvalId, approvalMaxUsd: effectiveApprovalMaxUsd, root, env });
      } catch (error) {
        approvalUses -= 1;
        throw error;
      }
      let accepted = false;
      let providerModel = model;
      let providerUsage = null;
      try {
        const response = await fetchWithTimeout(fetchImpl, `${baseUrl.replace(/\/$/, "")}/v1/messages`, { method: "POST", headers: { "anthropic-version": VERSION, "content-type": "application/json", "x-api-key": apiKey }, body: JSON.stringify(requestBody), signal }, timeoutMs);
        if (!response.ok) throw new Error(`Anthropic agent request failed with HTTP ${response.status}`);
        accepted = true;
        const payload = await response.json();
        providerModel = payload.model || model;
        providerUsage = payload.usage || {};
        if (["max_tokens", "model_context_window_exceeded"].includes(payload.stop_reason)) throw new Error(`Anthropic agent response was truncated (${payload.stop_reason})`);
        const toolUse = payload.content?.find((block) => block.type === "tool_use");
        if (!toolUse || !advertisedTools.some((tool) => tool.name === toolUse.name)) throw new Error("Anthropic agent returned no permitted tool action");
        const usage = providerUsage;
        const costUsd = calculateAnthropicCostUsd({ usage, inputCostPerMillionUsd, outputCostPerMillionUsd });
        writeAnthropicApprovalUse({ kind: "worker", job, approvalId, model: providerModel, usage, inputCostPerMillionUsd, outputCostPerMillionUsd, reservation, root });
        finalizeAnthropicBudgetReservation({ reservation, consumed: true, actualCostUsd: costUsd, root });
        return {
          action: { tool: toolUse.name, input: toolUse.input || {} },
          usage: { input: Number(usage.input_tokens || 0) + Number(usage.cache_creation_input_tokens || 0) + Number(usage.cache_read_input_tokens || 0), output: Number(usage.output_tokens || 0) },
          costUsd,
          model: providerModel
        };
      } catch (error) {
        let usageAudit = null;
        if (accepted) {
          usageAudit = writeAnthropicApprovalUse({ kind: "worker", job, approvalId, model: providerModel, usage: providerUsage, inputCostPerMillionUsd, outputCostPerMillionUsd, reservation, outcome: "failed_after_provider_acceptance", root });
        } else {
          approvalUses -= 1;
        }
        finalizeAnthropicBudgetReservation({ reservation, consumed: accepted, actualCostUsd: usageAudit?.billingReconciled ? usageAudit.costUsd : undefined, root });
        throw error;
      }
    }
  };
}
