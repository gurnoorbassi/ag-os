import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const ACTION = "anthropic_work_product_generation";
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

export function evaluateAnthropicWorkerReadiness({ root = process.cwd(), env = process.env, now = new Date() } = {}) {
  const enabled = env.AG_OS_AI_WORKER_ENABLED === "true";
  const credentialConfigured = Boolean(env.ANTHROPIC_API_KEY);
  const model = env.ANTHROPIC_WORKER_MODEL || env.ANTHROPIC_MODEL || "claude-sonnet-5";
  const approvalId = env.AG_OS_AI_WORKER_APPROVAL_ID || "";
  const inputCostPerMillionUsd = Number(env.ANTHROPIC_INPUT_COST_PER_MILLION_USD);
  const outputCostPerMillionUsd = Number(env.ANTHROPIC_OUTPUT_COST_PER_MILLION_USD);
  const blockers = [];
  if (!enabled) blockers.push("AI builder worker is disabled");
  if (!credentialConfigured) blockers.push("Anthropic worker credential is not configured");
  if (!approvalId) blockers.push("Scoped AI builder approval is not configured");
  if (!Number.isFinite(inputCostPerMillionUsd) || inputCostPerMillionUsd < 0) blockers.push("Anthropic input token pricing is not configured");
  if (!Number.isFinite(outputCostPerMillionUsd) || outputCostPerMillionUsd < 0) blockers.push("Anthropic output token pricing is not configured");
  let approval = null;
  let uses = 0;
  if (approvalId) {
    const approvalPath = path.join(root, ".codex", "approvals", `${approvalId}.json`);
    if (!existsSync(approvalPath)) {
      blockers.push("Scoped AI builder approval record does not exist");
    } else {
      approval = readJson(approvalPath);
      uses = approvalUseCount(root, approvalId);
      if (approval.status !== "approved") blockers.push("Scoped AI builder approval is not active");
      if (Date.parse(approval.expiresAt) <= now.getTime()) blockers.push("Scoped AI builder approval has expired");
      if (approval.target !== TARGET) blockers.push("Scoped AI builder approval target does not match Anthropic Messages API");
      if (!approval.approvedActions?.includes(ACTION)) blockers.push("Scoped AI builder approval does not allow work-product generation");
      if (!approval.approvalRequiredFor?.includes("paid_actions")) blockers.push("Scoped AI builder approval does not cover paid actions");
      if (!approval.budget || approval.budget.required !== true || approval.budget.maxUsd <= 0 || approval.budget.maxUsd > 5) blockers.push("Scoped AI builder approval must include a positive per-use budget up to USD $5");
      const maxUses = approval.approvalKind === "standing" ? approval.maxUses : 1;
      if (!Number.isInteger(maxUses) || uses >= maxUses) blockers.push("Scoped AI builder approval has no uses remaining");
    }
  }
  return {
    ready: blockers.length === 0,
    enabled,
    credentialConfigured,
    model,
    approvalId: approvalId || null,
    approval,
    uses,
    inputCostPerMillionUsd,
    outputCostPerMillionUsd,
    blockers
  };
}
