import assert from "node:assert/strict";
import test from "node:test";
import {
  PLAN_DRAFT_SCHEMA,
  calculateAnthropicCostUsd,
  createAnthropicPlanDraft,
  toAnthropicStructuredOutputSchema
} from "../scripts/lib/runtime/anthropic-planner.mjs";

const commandIntake = {
  rawCommand: "Build an internal operations dashboard",
  normalizedCommand: "Build an internal operations dashboard",
  classification: { commandCategory: "build", requiresApproval: false },
  productContext: { productType: "dashboard" }
};
const job = { projectId: "project-ag-os" };
const route = { riskLevel: "R2", assignedAgent: "planner-foundation" };

test("Anthropic planner requests schema-constrained plans without exposing the key", async () => {
  let request;
  const fetchImpl = async (url, options) => {
    request = { url, options };
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          model: "claude-sonnet-5",
          usage: { input_tokens: 100, output_tokens: 200 },
          content: [{
            type: "text",
            text: JSON.stringify({
              summary: "Build the dashboard locally and validate it.",
              tools: ["local-filesystem"],
              tasks: [{ taskId: "work-dashboard", description: "Implement the dashboard.", owner: "builder", status: "planned" }],
              expectedOutput: "A validated local dashboard change.",
              estimatedCostUsd: 0.02,
              approvalGates: ["Separate approval before deployment."],
              stopConditions: ["Stop before credentials or live services."]
            })
          }]
        };
      }
    };
  };

  const result = await createAnthropicPlanDraft({
    commandIntake,
    job,
    route,
    apiKey: "test-key-never-logged",
    model: "claude-sonnet-5",
    baseUrl: "https://anthropic.test",
    fetchImpl
  });
  assert.equal(request.url, "https://anthropic.test/v1/messages");
  assert.equal(request.options.headers["x-api-key"], "test-key-never-logged");
  const requestBody = JSON.parse(request.options.body);
  assert.equal(requestBody.output_config.format.type, "json_schema");
  assert.equal(JSON.stringify(requestBody.output_config.format.schema).includes("minLength"), false);
  assert.equal(JSON.stringify(requestBody.output_config.format.schema).includes("minItems"), false);
  assert.equal(JSON.stringify(requestBody.output_config.format.schema).includes("minimum"), false);
  assert.equal(JSON.stringify(requestBody.output_config.format.schema).includes("maximum"), false);
  assert.equal(result.planDraft.tasks[0].status, "planned");
  assert.deepEqual(result.usage, { input_tokens: 100, output_tokens: 200 });
});

test("Anthropic schema adaptation preserves strict local constraints without mutating them", () => {
  const adapted = toAnthropicStructuredOutputSchema(PLAN_DRAFT_SCHEMA);
  assert.equal(PLAN_DRAFT_SCHEMA.properties.summary.minLength, 1);
  assert.equal(PLAN_DRAFT_SCHEMA.properties.tasks.minItems, 1);
  assert.equal(PLAN_DRAFT_SCHEMA.properties.estimatedCostUsd.maximum, 5);
  assert.equal(adapted.properties.summary.minLength, undefined);
  assert.equal(adapted.properties.tasks.minItems, undefined);
  assert.equal(adapted.properties.estimatedCostUsd.maximum, undefined);
  assert.equal(adapted.additionalProperties, false);
  assert.deepEqual(adapted.required, PLAN_DRAFT_SCHEMA.required);
});

test("Anthropic planner fails closed on missing credentials and HTTP failures", async () => {
  await assert.rejects(() => createAnthropicPlanDraft({ commandIntake, job, route, model: "claude-sonnet-5" }), /credential is not configured/);
  await assert.rejects(() => createAnthropicPlanDraft({
    commandIntake,
    job,
    route,
    apiKey: "present",
    model: "claude-sonnet-5",
    fetchImpl: async () => ({ ok: false, status: 429 })
  }), /HTTP 429/);
});

test("Anthropic token usage becomes a deterministic cost ledger value", () => {
  assert.equal(calculateAnthropicCostUsd({
    usage: { input_tokens: 1000, output_tokens: 500 },
    inputCostPerMillionUsd: 3,
    outputCostPerMillionUsd: 15
  }), 0.0105);
});
