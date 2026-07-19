import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const ACTION = "anthropic_deliverable_critique";
const TARGET = "anthropic:messages-api";

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function approvalUseCount(root, approvalId) {
  const auditDir = path.join(root, ".codex", "audit");
  if (!existsSync(auditDir)) return 0;
  return readdirSync(auditDir)
    .filter((name) => name.endsWith(".json") && !name.includes("template"))
    .map((name) => { try { return readJson(path.join(auditDir, name)); } catch { return null; } })
    .filter((record) => record?.eventType === "standing_approval_used")
    .filter((record) => record.relatedArtifacts?.some((item) => item.type === "approval" && item.reference === approvalId))
    .length;
}

export function evaluateAnthropicCriticReadiness({ root = process.cwd(), env = process.env, now = new Date() } = {}) {
  const enabled = env.AG_OS_AI_CRITIC_ENABLED === "true";
  const required = env.AG_OS_AI_CRITIC_REQUIRED === "true";
  const credentialConfigured = Boolean(env.ANTHROPIC_API_KEY);
  const model = env.ANTHROPIC_CRITIC_MODEL || env.ANTHROPIC_MODEL || "claude-haiku-4-5";
  const approvalId = env.AG_OS_AI_CRITIC_APPROVAL_ID || "";
  const inputCostPerMillionUsd = Number(env.ANTHROPIC_CRITIC_INPUT_COST_PER_MILLION_USD ?? env.ANTHROPIC_INPUT_COST_PER_MILLION_USD);
  const outputCostPerMillionUsd = Number(env.ANTHROPIC_CRITIC_OUTPUT_COST_PER_MILLION_USD ?? env.ANTHROPIC_OUTPUT_COST_PER_MILLION_USD);
  const blockers = [];
  if (!enabled) blockers.push("independent AI critic is disabled");
  if (!credentialConfigured) blockers.push("Anthropic critic credential is not configured");
  if (!approvalId) blockers.push("Scoped critic approval is not configured");
  if (!Number.isFinite(inputCostPerMillionUsd) || inputCostPerMillionUsd < 0) blockers.push("critic input pricing is not configured");
  if (!Number.isFinite(outputCostPerMillionUsd) || outputCostPerMillionUsd < 0) blockers.push("critic output pricing is not configured");
  let approval = null;
  let uses = 0;
  if (approvalId) {
    const approvalPath = path.join(root, ".codex", "approvals", `${approvalId}.json`);
    if (!existsSync(approvalPath)) blockers.push("Scoped critic approval record does not exist");
    else {
      approval = readJson(approvalPath);
      uses = approvalUseCount(root, approvalId);
      if (approval.status !== "approved") blockers.push("Scoped critic approval is not active");
      if (Date.parse(approval.expiresAt) <= now.getTime()) blockers.push("Scoped critic approval has expired");
      if (approval.target !== TARGET) blockers.push("Scoped critic target does not match Anthropic Messages API");
      if (!approval.approvedActions?.includes(ACTION)) blockers.push("Scoped critic approval does not allow deliverable critique");
      if (!approval.approvalRequiredFor?.includes("paid_actions")) blockers.push("Scoped critic approval does not cover paid actions");
      if (!approval.budget || approval.budget.required !== true || approval.budget.maxUsd <= 0 || approval.budget.maxUsd > 1) blockers.push("Scoped critic approval must include a positive per-use budget up to USD $1");
      const maxUses = approval.approvalKind === "standing" ? approval.maxUses : 1;
      if (!Number.isInteger(maxUses) || uses >= maxUses) blockers.push("Scoped critic approval has no uses remaining");
    }
  }
  return { ready: blockers.length === 0, enabled, required, credentialConfigured, model, approvalId: approvalId || null, approval, uses, inputCostPerMillionUsd, outputCostPerMillionUsd, blockers };
}
