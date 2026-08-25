import process from "node:process";
import { finalizeAnthropicBudgetReservation, reserveAnthropicBudget } from "./anthropic-budget-guard.mjs";
import { writeAnthropicApprovalUse } from "./anthropic-usage-audit.mjs";

const DEFAULT_BASE_URL = "https://api.anthropic.com/v1/messages";
const MAX_TOKENS = 3000;

const CANDIDATE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["candidates"],
  properties: {
    candidates: {
      type: "array",
      maxItems: 10,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type", "title", "organization", "summary", "problemHypothesis", "evidenceIds", "observedClaims", "assumptions", "scoreInputs", "confidence", "economicModel", "cheapestValidation", "validationActionClass", "estimatedValidationCost", "estimatedDaysToSignal", "stopConditions", "recommendedNextAction"],
        properties: {
          type: { type: "string", enum: ["revenue_client", "business_problem", "strategic_relationship", "partnership", "market", "product", "business_build", "distribution", "reputation_content", "technology_shift", "internal_ag_bottleneck"] },
          title: { type: "string" },
          organization: { type: "string" },
          summary: { type: "string" },
          problemHypothesis: { type: "string" },
          evidenceIds: { type: "array", items: { type: "string" } },
          observedClaims: { type: "array", items: { type: "string" } },
          assumptions: { type: "array", items: { type: "string" } },
          scoreInputs: { type: "object", additionalProperties: { type: "number" } },
          confidence: { type: "number", minimum: 0, maximum: 100 },
          economicModel: { type: "object", additionalProperties: true },
          cheapestValidation: { type: "string" },
          validationActionClass: { type: "string", enum: ["read_only_research", "outreach", "publish", "paid_ad", "contract", "account_creation", "external_change"] },
          estimatedValidationCost: { type: "number", minimum: 0 },
          estimatedDaysToSignal: { type: "number", minimum: 0 },
          stopConditions: { type: "array", items: { type: "string" } },
          recommendedNextAction: { type: "string" },
          people: { type: "array", maxItems: 5, items: { type: "object", additionalProperties: false, required: ["name", "organization", "publicRole", "whyRelevant", "sourceUrls", "evidenceIds"], properties: { name: { type: "string" }, organization: { type: "string" }, publicRole: { type: "string" }, whyRelevant: { type: "string" }, sourceUrls: { type: "array", items: { type: "string" } }, evidenceIds: { type: "array", items: { type: "string" } } } } }
        }
      }
    }
  }
};

function boundedProviderError(status, body) {
  return `Anthropic opportunity synthesis failed with HTTP ${status}: ${String(body || "").replace(/\s+/g, " ").slice(0, 500)}`;
}

export function createAnthropicOpportunitySynthesizer({ apiKey, model, approvalId, approvalMaxUsd, inputCostPerMillionUsd, outputCostPerMillionUsd, root = process.cwd(), env = process.env, baseUrl = DEFAULT_BASE_URL, fetchImpl = globalThis.fetch, timeoutMs = 180_000 } = {}) {
  if (!apiKey || !model || !approvalId) throw new Error("Anthropic opportunity synthesis requires configured credentials, model, and exact approval");
  if (typeof fetchImpl !== "function") throw new Error("Anthropic opportunity synthesis requires a fetch transport");
  return Object.freeze({
    name: "anthropic_opportunity_synthesis",
    live: true,
    costManagedByProvider: true,
    async synthesize({ objective, evidence, existingOpportunities = [], maxCandidates = 10, signal = null }) {
      const evidenceInput = evidence.slice(0, 12).map((item) => ({ evidenceId: item.evidenceId, sourceUrl: item.sourceUrl, publisher: item.publisher, observedClaims: item.relevantClaims.map((claim) => claim.statement) }));
      const requestBody = {
        model,
        max_tokens: MAX_TOKENS,
        system: "You are the bounded AG OS Opportunity Director synthesizer. Use only supplied observed evidence. Keep hypotheses and economic assumptions explicit. Never invent people, companies, revenue, relationships, or actions. Never execute or recommend bypassing approval gates. Return at most the requested candidate count.",
        messages: [{ role: "user", content: JSON.stringify({ objective, maxCandidates, evidence: evidenceInput, existingOpportunities: existingOpportunities.map((item) => ({ opportunityId: item.opportunityId, title: item.title, problemHypothesis: item.problemHypothesis, evidenceIds: item.evidenceIds })) }) }],
        output_config: { format: { type: "json_schema", name: "opportunity_candidates", schema: CANDIDATE_SCHEMA } }
      };
      const now = new Date();
      const job = { jobId: `opportunity-synthesis-${now.toISOString().replace(/[^0-9]/g, "").slice(0, 12)}`, projectId: "project-opportunity-director", riskLevel: "R1" };
      const reservation = reserveAnthropicBudget({ kind: "opportunity-synthesis", job, requestBody, maxTokens: MAX_TOKENS, inputCostPerMillionUsd, outputCostPerMillionUsd, approvalId, approvalMaxUsd, root, env, now });
      let accepted = false;
      let usageAudit = null;
      const controller = new AbortController();
      const onAbort = () => controller.abort(signal.reason);
      signal?.addEventListener("abort", onAbort, { once: true });
      const timer = setTimeout(() => controller.abort(new Error("Anthropic opportunity synthesis timed out")), timeoutMs);
      timer.unref?.();
      try {
        const response = await fetchImpl(baseUrl, { method: "POST", headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" }, body: JSON.stringify(requestBody), signal: controller.signal });
        accepted = true;
        if (!response.ok) throw new Error(boundedProviderError(response.status, await response.text()));
        const payload = await response.json();
        if (payload.stop_reason !== "end_turn") throw new Error(`Anthropic opportunity synthesis ended with ${payload.stop_reason || "unknown"}`);
        const text = payload.content?.find((item) => item.type === "text")?.text;
        if (!text) throw new Error("Anthropic opportunity synthesis returned no structured text");
        const parsed = JSON.parse(text);
        usageAudit = writeAnthropicApprovalUse({ kind: "opportunity", job, approvalId, model: payload.model || model, usage: payload.usage, inputCostPerMillionUsd, outputCostPerMillionUsd, reservation, relatedArtifacts: [{ type: "other", reference: "opportunity-director-synthesis" }], root, now });
        finalizeAnthropicBudgetReservation({ reservation, consumed: true, actualCostUsd: usageAudit.costUsd, root, now });
        return { candidates: parsed.candidates.slice(0, maxCandidates), model: payload.model || model, usage: payload.usage, costUsd: usageAudit.costUsd, usageAuditPath: usageAudit.auditPath };
      } catch (error) {
        if (accepted && !usageAudit) usageAudit = writeAnthropicApprovalUse({ kind: "opportunity", job, approvalId, model, usage: null, inputCostPerMillionUsd, outputCostPerMillionUsd, reservation, outcome: "failed_after_provider_acceptance", relatedArtifacts: [{ type: "other", reference: "opportunity-director-synthesis" }], root, now });
        finalizeAnthropicBudgetReservation({ reservation, consumed: accepted, actualCostUsd: usageAudit?.billingReconciled ? usageAudit.costUsd : undefined, root, now });
        throw error;
      } finally {
        clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
      }
    }
  });
}
