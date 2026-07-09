import path from "node:path";
import process from "node:process";
import { buildAuditEventRecord } from "./audit-writer.mjs";
import { listDirectJson, readJson, writeJson } from "./common.mjs";

const REQUIRED_GATES = [
  "dashboardPassed",
  "validationPassed",
  "bootPassed",
  "testsPassed",
  "secretScanPassed",
  "diffCheckPassed"
];
const EXCLUDED_PATH_PATTERNS = [
  /^\.github\//,
  /(^|\/)package(?:-lock)?\.json$/,
  /(^|\/)pnpm-lock\.yaml$/,
  /(^|\/)yarn\.lock$/,
  /^docs\/(?:ag-os-constitution|action-matrix|authority-order|approval-workflow|standing-approvals|safe-merge-policy)/,
  /^schemas\/(?:approval-lock|audit-event)\.schema\.json$/,
  /^scripts\/validate-foundation\.mjs$/,
  /^tests\/validate-foundation\.test\.mjs$/,
  /^\.codex\/(?:credentials|security|social|connectors|n8n|netlify)\//,
  /(?:^|\/)(?:netlify|vercel)\.toml$/,
  /^\.openai\//,
  /lead-generation-system/i,
  /ag-digitalz-ai-receptionist/i
];

function approvalUseCount(approvalId, root) {
  return listDirectJson(".codex/audit", { root })
    .map((recordPath) => readJson(recordPath, root))
    .filter((audit) => audit.eventType === "standing_approval_used")
    .filter((audit) => (audit.relatedArtifacts ?? []).some((artifact) => artifact.type === "approval" && artifact.reference === approvalId))
    .length;
}

function normalizedFiles(changedFiles = []) {
  return changedFiles.map((filePath) => String(filePath).replaceAll("\\", "/"));
}

export function evaluateStandingApprovalUse({
  approval,
  repository,
  branch,
  requestedActions,
  changedFiles,
  gates,
  root = process.cwd(),
  now = new Date()
}) {
  const reasons = [];
  const files = normalizedFiles(changedFiles);
  const actions = Array.isArray(requestedActions) ? requestedActions : [];
  const used = approval?.approvalId ? approvalUseCount(approval.approvalId, root) : 0;

  if (approval?.approvalKind !== "standing" || approval?.status !== "approved") {
    reasons.push("standing_approval_not_active");
  }
  if (!approval?.expiresAt || new Date(approval.expiresAt) < now) {
    reasons.push("standing_approval_expired");
  }
  if (used >= Number(approval?.maxUses ?? 0)) {
    reasons.push("standing_approval_usage_exhausted");
  }
  if (repository !== "gurnoorbassi/ag-os") {
    reasons.push("repository_out_of_scope");
  }
  if (typeof branch !== "string" || !branch.startsWith("codex/")) {
    reasons.push("branch_out_of_scope");
  }
  if (actions.length === 0 || actions.some((action) => !(approval?.approvedActions ?? []).includes(action))) {
    reasons.push("action_out_of_scope");
  }
  for (const gate of REQUIRED_GATES) {
    if (gates?.[gate] !== true) {
      reasons.push(`required_gate_failed:${gate}`);
    }
  }
  if (files.length === 0) {
    reasons.push("changed_files_required");
  }
  for (const filePath of files) {
    if (EXCLUDED_PATH_PATTERNS.some((pattern) => pattern.test(filePath))) {
      reasons.push(`excluded_file:${filePath}`);
    }
  }

  return {
    allowed: reasons.length === 0,
    reasons: [...new Set(reasons)],
    approvalId: approval?.approvalId ?? null,
    used,
    maxUses: approval?.maxUses ?? 0,
    remainingBeforeUse: Math.max(0, Number(approval?.maxUses ?? 0) - used),
    remainingAfterUse: Math.max(0, Number(approval?.maxUses ?? 0) - used - (reasons.length === 0 ? 1 : 0)),
    usageAuditRequired: true,
    liveActionsAuthorized: false,
    mergeAuthorized: false
  };
}

export function buildStandingApprovalUseAudit({
  approval,
  repository,
  branch,
  requestedActions,
  changedFiles,
  gates,
  result,
  root = process.cwd(),
  now = new Date()
}) {
  const evaluation = evaluateStandingApprovalUse({
    approval,
    repository,
    branch,
    requestedActions,
    changedFiles,
    gates,
    root,
    now
  });
  if (!evaluation.allowed) {
    throw new Error(`standing approval use blocked: ${evaluation.reasons.join(", ")}`);
  }
  if (result?.pushSucceeded !== true || typeof result?.draftPrUrl !== "string") {
    throw new Error("standing approval use audit requires successful push and draft PR evidence");
  }

  return buildAuditEventRecord({
    runId: `${approval.approvalId}-use-${evaluation.used + 1}`,
    actor: "agent-codex",
    eventType: "standing_approval_used",
    summary: `Standing approval ${approval.approvalId} used for codex branch push and draft PR creation.`,
    scope: `${repository}:${branch}`,
    source: "connector_metadata",
    relatedArtifacts: [
      { type: "approval", reference: approval.approvalId },
      { type: "pull_request", reference: result.draftPrUrl }
    ],
    riskLevel: approval.riskLevel,
    dataClassification: approval.dataClass,
    liveServiceTouched: true,
    notes: `Use ${evaluation.used + 1} of ${approval.maxUses}. Secret scan and all required local gates passed. Merge remains prohibited. Changed files: ${normalizedFiles(changedFiles).join(", ")}.`,
    now
  });
}

export function writeStandingApprovalUseAudit(options) {
  const record = buildStandingApprovalUseAudit(options);
  const filePath = `.codex/audit/${record.id}.json`;
  writeJson(filePath, record, options.root ?? process.cwd());
  return { filePath, record };
}
