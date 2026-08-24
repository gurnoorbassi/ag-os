import process from "node:process";
import { finalizeAnthropicBudgetReservation, reserveAnthropicBudget } from "./anthropic-budget-guard.mjs";
import { calculateAnthropicCostUsd, toAnthropicStructuredOutputSchema } from "./anthropic-planner.mjs";
import { writeAnthropicApprovalUse } from "./anthropic-usage-audit.mjs";
import { fetchWithTimeout } from "./fetch-with-timeout.mjs";
import { MISSION_NATIVE_PLAN_SCHEMA, validateMissionPlanDraft } from "./mission-plan.mjs";
import { assertAllowedAgentCommand } from "./agent-runner.mjs";

const DEFAULT_BASE_URL = "https://api.anthropic.com";
const VERSION = "2023-06-01";
const MAX_TOKENS = 3500;

export async function createAnthropicMissionPlan({
  ownerOutcome,
  projectId,
  validationCommands,
  apiKey,
  model,
  approvalId,
  approvalMaxUsd,
  inputCostPerMillionUsd,
  outputCostPerMillionUsd,
  root = process.cwd(),
  env = process.env,
  baseUrl = DEFAULT_BASE_URL,
  fetchImpl = globalThis.fetch,
  timeoutMs = process.env.AG_OS_PROVIDER_TIMEOUT_MS,
  now = new Date(),
  signal = null
}) {
  if (!apiKey || !model || !approvalId) throw new Error("Anthropic mission planner requires configured credentials, model, and approval");
  const job = { jobId: `mission-planning-${now.getTime()}`, projectId, riskLevel: "R1" };
  const requestBody = {
    model,
    max_tokens: MAX_TOKENS,
    system: "You are the AG OS Mission Control planner. Return a complete mission-native software execution graph. Commander, QA Engineer, Code Reviewer, and Integration Agent are mandatory roles; assign explicit QA, review, and integration tasks to the corresponding quality roles. Assign only supported roles. Make dependencies express real collaboration: UI design feeds dependent frontend work, database design feeds dependent backend work, and genuinely independent work remains parallel. Include deterministic target validation. Never authorize deployment, publishing, credentials, production data, paid actions beyond this call, or any other protected external action; list those as approval requirements.",
    messages: [{ role: "user", content: JSON.stringify({ ownerOutcome, projectId, availableValidationCommands: validationCommands, externalActionsAuthorized: false }) }],
    output_config: { format: { type: "json_schema", schema: toAnthropicStructuredOutputSchema(MISSION_NATIVE_PLAN_SCHEMA) } }
  };
  const reservation = reserveAnthropicBudget({ kind: "planner", job, requestBody, maxTokens: MAX_TOKENS, inputCostPerMillionUsd, outputCostPerMillionUsd, approvalId, approvalMaxUsd, root, env, now });
  let accepted = false;
  let providerUsage = null;
  let providerModel = model;
  try {
    const response = await fetchWithTimeout(fetchImpl, `${baseUrl.replace(/\/$/, "")}/v1/messages`, { method: "POST", headers: { "anthropic-version": VERSION, "content-type": "application/json", "x-api-key": apiKey }, body: JSON.stringify(requestBody), signal }, timeoutMs);
    if (!response.ok) throw new Error(`Anthropic mission planner request failed with HTTP ${response.status}`);
    accepted = true;
    const payload = await response.json();
    providerUsage = payload.usage || {};
    providerModel = payload.model || model;
    if (["max_tokens", "model_context_window_exceeded"].includes(payload.stop_reason)) throw new Error(`Anthropic mission planner returned a truncated response (${payload.stop_reason})`);
    const text = payload.content?.find((block) => block.type === "text")?.text;
    if (!text) throw new Error("Anthropic mission planner returned no structured plan");
    const planDraft = JSON.parse(text);
    validateMissionPlanDraft(planDraft, { assertValidationCommand: assertAllowedAgentCommand });
    const usageAudit = writeAnthropicApprovalUse({ kind: "planner", job, approvalId, model: providerModel, usage: providerUsage, inputCostPerMillionUsd, outputCostPerMillionUsd, reservation, relatedArtifacts: [{ type: "other", reference: "mission-native-plan" }], root, now });
    return { planDraft, model: providerModel, usage: providerUsage, costUsd: calculateAnthropicCostUsd({ usage: providerUsage, inputCostPerMillionUsd, outputCostPerMillionUsd }), budgetReservation: reservation, usageAuditPath: usageAudit.filePath };
  } catch (error) {
    const usageAudit = accepted ? writeAnthropicApprovalUse({ kind: "planner", job, approvalId, model: providerModel, usage: providerUsage, inputCostPerMillionUsd, outputCostPerMillionUsd, reservation, outcome: "failed_after_provider_acceptance", root, now }) : null;
    finalizeAnthropicBudgetReservation({ reservation, consumed: accepted, actualCostUsd: usageAudit?.billingReconciled ? usageAudit.costUsd : undefined, root, now });
    throw error;
  }
}
