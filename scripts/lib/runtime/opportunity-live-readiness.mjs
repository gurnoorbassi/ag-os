import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const SEARCH_ACTION = "public_opportunity_research";
const SEARCH_TARGET = "public-research:brave-search";
const SYNTHESIS_ACTION = "anthropic_opportunity_synthesis";
const ANTHROPIC_TARGET = "anthropic:messages-api";

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function approvalUses(root, approvalId) {
  const directory = path.join(root, ".codex", "audit");
  if (!existsSync(directory)) return 0;
  return readdirSync(directory).filter((name) => name.endsWith(".json")).map((name) => { try { return readJson(path.join(directory, name)); } catch { return null; } })
    .filter((record) => record?.eventType === "standing_approval_used" && record.relatedArtifacts?.some((item) => item.type === "approval" && item.reference === approvalId)).length;
}

export function evaluateOpportunityLiveReadiness({ root = process.cwd(), env = process.env, now = new Date() } = {}) {
  const enabled = env.AG_OS_OPPORTUNITY_DISCOVERY_ENABLED === "true";
  const endpointConfigured = Boolean(env.AG_OS_OPPORTUNITY_SEARCH_ENDPOINT);
  const credentialConfigured = Boolean(env.AG_OS_OPPORTUNITY_SEARCH_KEY);
  const costPerSearchUsd = Number(env.AG_OS_OPPORTUNITY_SEARCH_COST_USD || 0);
  const approvalId = env.AG_OS_OPPORTUNITY_RESEARCH_APPROVAL_ID || "";
  const blockers = [];
  if (!enabled) blockers.push("Opportunity live discovery is disabled");
  if (!endpointConfigured) blockers.push("Public research provider endpoint is not configured");
  if (!credentialConfigured) blockers.push("Public research provider credential is not configured");
  if (!Number.isFinite(costPerSearchUsd) || costPerSearchUsd < 0) blockers.push("Public research provider cost is invalid");
  let approval = null;
  let uses = 0;
  if (costPerSearchUsd > 0) {
    if (!approvalId) blockers.push("Paid public research requires an exact approval");
    else {
      const approvalPath = path.join(root, ".codex", "approvals", `${approvalId}.json`);
      if (!existsSync(approvalPath)) blockers.push("Paid public research approval record does not exist");
      else {
        approval = readJson(approvalPath);
        uses = approvalUses(root, approvalId);
        if (approval.status !== "approved" || Date.parse(approval.expiresAt) <= now.getTime()) blockers.push("Paid public research approval is not active");
        if (approval.target !== SEARCH_TARGET || !approval.approvedActions?.includes(SEARCH_ACTION)) blockers.push("Paid public research approval scope does not match");
        if (approval.approvalKind !== "standing" || !Number.isInteger(approval.maxUses) || uses >= approval.maxUses) blockers.push("Paid public research approval has no uses remaining");
        if (!approval.budget?.required || Number(approval.budget.maxUsd) <= 0 || Number(approval.budget.maxUsd) > 1.5) blockers.push("Paid public research approval budget must be positive and no more than USD $1.50");
      }
    }
  }
  const anthropicEnabled = env.AG_OS_OPPORTUNITY_ANTHROPIC_ENABLED === "true";
  const anthropicApprovalId = env.AG_OS_OPPORTUNITY_ANTHROPIC_APPROVAL_ID || "";
  const anthropicCredentialConfigured = Boolean(env.ANTHROPIC_API_KEY);
  const anthropicModel = env.ANTHROPIC_WORKER_MODEL || env.ANTHROPIC_MODEL || "claude-sonnet-5";
  const inputCostPerMillionUsd = Number(env.ANTHROPIC_INPUT_COST_PER_MILLION_USD);
  const outputCostPerMillionUsd = Number(env.ANTHROPIC_OUTPUT_COST_PER_MILLION_USD);
  const anthropicBlockers = [];
  let anthropicApproval = null;
  let anthropicUses = 0;
  if (anthropicEnabled) {
    if (!anthropicCredentialConfigured) anthropicBlockers.push("Anthropic credential is not configured");
    if (!Number.isFinite(inputCostPerMillionUsd) || inputCostPerMillionUsd < 0 || !Number.isFinite(outputCostPerMillionUsd) || outputCostPerMillionUsd < 0) anthropicBlockers.push("Anthropic pricing is not configured");
    if (!anthropicApprovalId) anthropicBlockers.push("Exact Opportunity synthesis approval is not configured");
    else {
      const approvalPath = path.join(root, ".codex", "approvals", `${anthropicApprovalId}.json`);
      if (!existsSync(approvalPath)) anthropicBlockers.push("Opportunity synthesis approval record does not exist");
      else {
        anthropicApproval = readJson(approvalPath);
        anthropicUses = approvalUses(root, anthropicApprovalId);
        if (anthropicApproval.status !== "approved" || Date.parse(anthropicApproval.expiresAt) <= now.getTime()) anthropicBlockers.push("Opportunity synthesis approval is not active");
        if (anthropicApproval.target !== ANTHROPIC_TARGET || !anthropicApproval.approvedActions?.includes(SYNTHESIS_ACTION) || !anthropicApproval.approvalRequiredFor?.includes("paid_actions")) anthropicBlockers.push("Opportunity synthesis approval scope does not match");
        const maxUses = anthropicApproval.approvalKind === "standing" ? anthropicApproval.maxUses : 1;
        if (!Number.isInteger(maxUses) || anthropicUses >= maxUses) anthropicBlockers.push("Opportunity synthesis approval has no uses remaining");
        if (!anthropicApproval.budget?.required || Number(anthropicApproval.budget.maxUsd) <= 0 || Number(anthropicApproval.budget.maxUsd) > 0.15) anthropicBlockers.push("Opportunity synthesis approval budget must be positive and no more than USD $0.15");
      }
    }
    blockers.push(...anthropicBlockers.map((item) => `Opportunity synthesis: ${item}`));
  }
  const anthropicReady = anthropicEnabled && anthropicBlockers.length === 0;
  return {
    ready: blockers.length === 0,
    enabled,
    provider: "brave_search",
    endpointConfigured,
    credentialConfigured,
    costPerSearchUsd: Number.isFinite(costPerSearchUsd) ? costPerSearchUsd : null,
    approvalId: approvalId || null,
    approvalBudgetMaxUsd: approval?.budget?.maxUsd ?? null,
    approvalUses: uses,
    anthropicEnabled,
    anthropicReady,
    anthropic: { ready: anthropicReady, credentialConfigured: anthropicCredentialConfigured, model: anthropicModel, approvalId: anthropicApprovalId || null, approvalBudgetMaxUsd: anthropicApproval?.budget?.maxUsd ?? null, approvalUses: anthropicUses, blockers: anthropicBlockers },
    blockers
  };
}

export const OPPORTUNITY_PUBLIC_RESEARCH_ACTION = SEARCH_ACTION;
export const OPPORTUNITY_PUBLIC_RESEARCH_TARGET = SEARCH_TARGET;
export const OPPORTUNITY_ANTHROPIC_SYNTHESIS_ACTION = SYNTHESIS_ACTION;
