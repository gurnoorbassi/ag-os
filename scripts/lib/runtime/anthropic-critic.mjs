import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { reserveAnthropicBudget, finalizeAnthropicBudgetReservation } from "./anthropic-budget-guard.mjs";
import { fetchWithTimeout } from "./fetch-with-timeout.mjs";
import { toAnthropicStructuredOutputSchema } from "./anthropic-planner.mjs";
import { isoTimestamp, slugify, writeJson } from "./common.mjs";
import { writeAnthropicApprovalUse } from "./anthropic-usage-audit.mjs";

const BASE_URL = "https://api.anthropic.com";
const VERSION = "2023-06-01";
export const CRITIC_MAX_TOKENS = 16_000;
export const CRITIC_TIMEOUT_MS = 180_000;
const MAX_REVIEW_BYTES = 500_000;

export const DELIVERABLE_CRITIQUE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["verdict", "score", "summary", "requirementChecks", "defects", "requiredFixes", "safetyFindings"],
  properties: {
    verdict: { type: "string", enum: ["pass", "needs_revision"] },
    score: { type: "integer", minimum: 0, maximum: 10 },
    summary: { type: "string", minLength: 1 },
    requirementChecks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["requirement", "met", "evidence"],
        properties: { requirement: { type: "string" }, met: { type: "boolean" }, evidence: { type: "string" } }
      }
    },
    defects: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["severity", "message", "evidence"],
        properties: { severity: { type: "string", enum: ["low", "medium", "high", "critical"] }, message: { type: "string" }, evidence: { type: "string" } }
      }
    },
    requiredFixes: { type: "array", items: { type: "string" } },
    safetyFindings: { type: "array", items: { type: "string" } }
  }
};

function artifactBundle({ execution, root }) {
  const entries = [];
  let total = 0;
  const workspaceRoot = path.resolve(root, ".codex/workspaces");
  for (const recordPath of execution.workProductPaths || []) {
    const absolute = path.resolve(root, recordPath);
    if (absolute !== workspaceRoot && !absolute.startsWith(`${workspaceRoot}${path.sep}`)) throw new Error("critic artifact escaped the workspace");
    const content = readFileSync(absolute, "utf8");
    total += Buffer.byteLength(content);
    if (total > MAX_REVIEW_BYTES) throw new Error(`critic input exceeds ${MAX_REVIEW_BYTES} bytes`);
    entries.push({ path: recordPath, content });
  }
  return entries;
}

export function assertDeliverableCritique(value) {
  if (!value || !["pass", "needs_revision"].includes(value.verdict)) throw new Error("critic verdict is invalid");
  if (!Number.isInteger(value.score) || value.score < 0 || value.score > 10) throw new Error("critic score must be an integer from 0 to 10");
  if (typeof value.summary !== "string" || !value.summary.trim()) throw new Error("critic summary is required");
  for (const key of ["requirementChecks", "defects", "requiredFixes", "safetyFindings"]) if (!Array.isArray(value[key])) throw new Error(`critic ${key} must be an array`);
  if (value.verdict === "pass" && (value.score < 8 || value.requiredFixes.length > 0)) throw new Error("critic cannot pass below 8/10 or with required fixes");
  if (value.verdict === "needs_revision" && value.requiredFixes.length === 0) throw new Error("needs_revision requires at least one fix");
  return value;
}

export async function createAnthropicDeliverableCritique({ command, job, plan, execution, apiKey, model, baseUrl = BASE_URL, fetchImpl = globalThis.fetch, root = process.cwd(), inputCostPerMillionUsd, outputCostPerMillionUsd, approvalId, approvalMaxUsd, env, now, timeoutMs = process.env.AG_OS_AI_CRITIC_TIMEOUT_MS || CRITIC_TIMEOUT_MS }) {
  if (!apiKey || !model || !approvalId) throw new Error("critic credential, model, and approval are required");
  const requestBody = {
    model,
    max_tokens: CRITIC_MAX_TOKENS,
    system: "You are the independent AG OS adversarial critic. You did not build this work. Inspect the actual files against the owner's outcome and plan. Find broken behavior, missing requirements, unsafe content, placeholder claims, inaccessible results, and self-reported evidence that is not proven. This review is the pre-adapter quality gate: no connector or external action is allowed to run until you pass the files. When the owner outcome includes a downstream action such as a draft preview, branch, or deployment, judge whether the files are professionally ready for that later approved action. Do not fail the files merely because the later action, receipt, or URL does not exist yet. Still fail any missing or unsafe artifact actually required for the downstream action. Pass only professional, owner-usable work scoring at least 8/10. Never perform an external action.",
    messages: [{ role: "user", content: JSON.stringify({
      ownerOutcome: command.rawCommand,
      expectedOutput: plan.expectedOutput,
      tasks: plan.tasks,
      qualityBar: plan.basis?.qualityBar || [],
      reviewStage: {
        name: "pre_adapter_quality_gate",
        downstreamAction: job.commandType || "none",
        externalActionExecuted: false,
        adapterRunsOnlyAfterPass: true
      },
      files: artifactBundle({ execution, root })
    }) }],
    output_config: { format: { type: "json_schema", schema: toAnthropicStructuredOutputSchema(DELIVERABLE_CRITIQUE_SCHEMA) } }
  };
  const reservation = reserveAnthropicBudget({ kind: "critic", job, requestBody, maxTokens: CRITIC_MAX_TOKENS, inputCostPerMillionUsd, outputCostPerMillionUsd, approvalId, approvalMaxUsd, root, env, now });
  let providerAcceptedRequest = false;
  let providerModel = model;
  let providerUsage = null;
  try {
    const response = await fetchWithTimeout(fetchImpl, `${baseUrl.replace(/\/$/, "")}/v1/messages`, { method: "POST", headers: { "anthropic-version": VERSION, "content-type": "application/json", "x-api-key": apiKey }, body: JSON.stringify(requestBody) }, timeoutMs);
    if (!response.ok) throw new Error(`Anthropic critic request failed with HTTP ${response.status}`);
    providerAcceptedRequest = true;
    const payload = await response.json();
    providerModel = payload.model || model;
    providerUsage = payload.usage || {};
    if (["max_tokens", "model_context_window_exceeded"].includes(payload.stop_reason)) throw new Error(`Anthropic critic returned a truncated response (${payload.stop_reason})`);
    const text = payload.content?.find((block) => block.type === "text")?.text;
    if (!text) throw new Error("Anthropic critic returned no structured critique");
    const critique = assertDeliverableCritique(JSON.parse(text));
    const usageAudit = writeAnthropicApprovalUse({ kind: "critic", job, approvalId, model: providerModel, usage: providerUsage, inputCostPerMillionUsd, outputCostPerMillionUsd, reservation, root, now });
    return { critique, model: providerModel, usage: providerUsage, budgetReservation: reservation, usageAuditPath: usageAudit.filePath };
  } catch (error) {
    const usageAudit = providerAcceptedRequest
      ? writeAnthropicApprovalUse({ kind: "critic", job, approvalId, model: providerModel, usage: providerUsage, inputCostPerMillionUsd, outputCostPerMillionUsd, reservation, outcome: "failed_after_provider_acceptance", root, now })
      : null;
    finalizeAnthropicBudgetReservation({ reservation, consumed: providerAcceptedRequest, actualCostUsd: usageAudit?.billingReconciled ? usageAudit.costUsd : undefined, root, now });
    throw error;
  }
}

export function writeDeliverableCritique({ job, plan, execution, result, approvalId, root = process.cwd(), now = new Date() }) {
  const critique = assertDeliverableCritique(result.critique);
  const timestamp = isoTimestamp(now);
  const record = {
    "$schema": "../../schemas/deliverable-critique.schema.json",
    critiqueId: `deliverable-critique-${slugify(job.jobId)}`,
    jobId: job.jobId,
    projectId: job.projectId,
    planId: plan.planId,
    executionPath: execution.executionPath,
    reviewer: { type: "independent_anthropic_critic", model: result.model, approvalId },
    ...critique,
    authority: "quality_gate_only",
    grantsPermission: false,
    createdAt: timestamp,
    updatedAt: timestamp
  };
  const recordPath = `.codex/deliverable-critiques/${record.critiqueId}.json`;
  writeJson(recordPath, record, root);
  return { record, recordPath };
}
