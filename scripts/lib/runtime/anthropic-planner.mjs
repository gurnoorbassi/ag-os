import { assertPlanDraftShape } from "./planner-processor.mjs";

const DEFAULT_BASE_URL = "https://api.anthropic.com";
const ANTHROPIC_VERSION = "2023-06-01";
const UNSUPPORTED_STRUCTURED_OUTPUT_CONSTRAINTS = new Set([
  "maximum",
  "minimum",
  "minItems",
  "minLength"
]);

export const PLAN_DRAFT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "tools", "tasks", "expectedOutput", "estimatedCostUsd", "approvalGates", "stopConditions"],
  properties: {
    summary: { type: "string", minLength: 1 },
    tools: { type: "array", minItems: 1, items: { type: "string", minLength: 1 } },
    tasks: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["taskId", "description", "owner", "status"],
        properties: {
          taskId: { type: "string", minLength: 1 },
          description: { type: "string", minLength: 1 },
          owner: { type: "string", minLength: 1 },
          status: { type: "string", enum: ["planned"] }
        }
      }
    },
    expectedOutput: { type: "string", minLength: 1 },
    estimatedCostUsd: { type: "number", minimum: 0, maximum: 5 },
    approvalGates: { type: "array", items: { type: "string", minLength: 1 } },
    stopConditions: { type: "array", items: { type: "string", minLength: 1 } }
  }
};

// Anthropic's raw Messages API rejects validation-only JSON Schema
// constraints that its SDKs normally remove before sending. Keep the full
// schema above for local validation, but send only the supported grammar.
export function toAnthropicStructuredOutputSchema(value) {
  if (Array.isArray(value)) {
    return value.map((item) => toAnthropicStructuredOutputSchema(item));
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !UNSUPPORTED_STRUCTURED_OUTPUT_CONSTRAINTS.has(key))
    .map(([key, item]) => [key, toAnthropicStructuredOutputSchema(item)]));
}

function plannerInput({ commandIntake, job, route }) {
  return {
    command: commandIntake.rawCommand,
    normalizedCommand: commandIntake.normalizedCommand,
    classification: commandIntake.classification,
    productContext: commandIntake.productContext,
    projectId: job.projectId,
    riskLevel: route.riskLevel,
    assignedAgent: route.assignedAgent,
    safetyBoundary: {
      executionAuthorized: false,
      liveServicesAllowed: false,
      credentialsAllowed: false,
      deploymentAllowed: false,
      productionDataAllowed: false,
      paidActionsBeyondThisPlanningCallAllowed: false
    }
  };
}

export function calculateAnthropicCostUsd({ usage, inputCostPerMillionUsd, outputCostPerMillionUsd }) {
  for (const value of [inputCostPerMillionUsd, outputCostPerMillionUsd]) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error("Anthropic token pricing must be configured as non-negative numbers");
    }
  }
  const inputTokens = Number(usage?.input_tokens || 0) + Number(usage?.cache_creation_input_tokens || 0);
  const cachedInputTokens = Number(usage?.cache_read_input_tokens || 0);
  const outputTokens = Number(usage?.output_tokens || 0);
  return Number((((inputTokens + cachedInputTokens) * inputCostPerMillionUsd + outputTokens * outputCostPerMillionUsd) / 1_000_000).toFixed(6));
}

export async function createAnthropicPlanDraft({
  commandIntake,
  job,
  route,
  apiKey,
  model,
  baseUrl = DEFAULT_BASE_URL,
  fetchImpl = globalThis.fetch
}) {
  if (!apiKey) throw new Error("Anthropic planner credential is not configured");
  if (!model) throw new Error("Anthropic planner model is not configured");
  if (typeof fetchImpl !== "function") throw new Error("Anthropic planner fetch implementation is unavailable");

  const response = await fetchImpl(`${baseUrl.replace(/\/$/, "")}/v1/messages`, {
    method: "POST",
    headers: {
      "anthropic-version": ANTHROPIC_VERSION,
      "content-type": "application/json",
      "x-api-key": apiKey
    },
    body: JSON.stringify({
      model,
      max_tokens: 2500,
      system: "You are the AG OS planner worker. Produce a professional, implementation-ready plan only. Never claim permission to use credentials, deploy, publish, message, spend, change DNS, or touch production/customer data. Put every such action behind an explicit approval gate and stop condition.",
      messages: [{ role: "user", content: JSON.stringify(plannerInput({ commandIntake, job, route })) }],
      output_config: {
        format: {
          type: "json_schema",
          schema: toAnthropicStructuredOutputSchema(PLAN_DRAFT_SCHEMA)
        }
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Anthropic planner request failed with HTTP ${response.status}`);
  }
  const payload = await response.json();
  const text = payload.content?.find((block) => block.type === "text")?.text;
  if (!text) throw new Error("Anthropic planner returned no structured plan");
  const planDraft = JSON.parse(text);
  assertPlanDraftShape(planDraft);
  return {
    planDraft,
    model: payload.model || model,
    usage: payload.usage || {}
  };
}
