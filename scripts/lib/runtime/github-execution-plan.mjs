import process from "node:process";
import { isoTimestamp, normalizeRunId, writeJson } from "./common.mjs";

const ACTIONS = [
  {
    actionType: "create_repo",
    approvalGate: "approval-github-repo-create",
    requiredEvidence: ["owner_approval_lock", "repository_scope", "audit_event"],
    rollbackRequired: true
  },
  {
    actionType: "create_branch",
    approvalGate: "approval-github-branch-create",
    requiredEvidence: ["owner_approval_lock", "target_repository", "branch_name"],
    rollbackRequired: true
  },
  {
    actionType: "create_files",
    approvalGate: "approval-github-file-create",
    requiredEvidence: ["owner_approval_lock", "file_manifest", "validation_plan"],
    rollbackRequired: true
  },
  {
    actionType: "update_files",
    approvalGate: "approval-github-file-update",
    requiredEvidence: ["owner_approval_lock", "file_manifest", "diff_review"],
    rollbackRequired: true
  },
  {
    actionType: "open_pr",
    approvalGate: "approval-github-open-pr",
    requiredEvidence: ["owner_approval_lock", "branch_ref", "pr_body"],
    rollbackRequired: false
  },
  {
    actionType: "poll_ci",
    approvalGate: "approval-github-ci-read",
    requiredEvidence: ["pull_request_number", "commit_sha", "ci_check_names"],
    rollbackRequired: false
  },
  {
    actionType: "merge_pr",
    approvalGate: "approval-github-safe-merge",
    requiredEvidence: ["owner_approval_lock", "ci_passed", "validation_passed", "safe_merge_rules_passed"],
    rollbackRequired: true
  }
];

const PLANNING_ONLY_SAFETY = {
  executesGitHubAction: false,
  createsRepository: false,
  writesRepositoryContent: false,
  opensPullRequest: false,
  pollsCi: false,
  mergesPullRequest: false,
  usesCredentials: false,
  touchesProductionData: false,
  usesPaidAction: false
};

export function buildGitHubExecutionPlan({
  runId,
  commandId,
  projectId,
  requestedRepositoryName,
  riskLevel = "R3",
  now = new Date()
}) {
  const normalizedRunId = normalizeRunId(runId || projectId);
  const timestamp = isoTimestamp(now);

  return {
    githubExecutionPlanId: `github-plan-${normalizedRunId}`,
    status: "planned",
    mode: "planning_only",
    connectorId: "connector-github-mcp",
    commandId,
    projectId,
    requestedRepositoryName,
    riskLevel,
    plannedActions: ACTIONS.map((action) => ({
      actionId: `github-action-${normalizedRunId}-${action.actionType.replaceAll("_", "-")}`,
      actionType: action.actionType,
      status: "blocked",
      approvalRequired: true,
      approvalGate: action.approvalGate,
      requiredEvidence: action.requiredEvidence,
      rollbackRequired: action.rollbackRequired
    })),
    approvalGates: ACTIONS.map((action) => action.approvalGate),
    safety: PLANNING_ONLY_SAFETY,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

export function validateGitHubExecutionPlan(plan) {
  const errors = [];

  if (!plan?.githubExecutionPlanId || !/^github-plan-[a-z0-9-]+$/.test(plan.githubExecutionPlanId)) {
    errors.push("githubExecutionPlanId is required");
  }

  if (plan?.mode !== "planning_only") {
    errors.push("mode must be planning_only");
  }

  if (plan?.connectorId !== "connector-github-mcp") {
    errors.push("connectorId must be connector-github-mcp");
  }

  if (!Array.isArray(plan?.plannedActions) || plan.plannedActions.length === 0) {
    errors.push("plannedActions must not be empty");
  }

  if (!Array.isArray(plan?.approvalGates) || plan.approvalGates.length === 0) {
    errors.push("approvalGates must not be empty");
  }

  if (!plan?.safety || Object.values(plan.safety).some((value) => value !== false)) {
    errors.push("safety flags must all be false for planning_only");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function writeGitHubExecutionPlan({ plan, root = process.cwd() }) {
  const validation = validateGitHubExecutionPlan(plan);
  if (!validation.valid) {
    throw new Error(`GitHub execution plan invalid: ${validation.errors.join("; ")}`);
  }

  const filePath = `.codex/github/${plan.githubExecutionPlanId}.json`;
  writeJson(filePath, plan, root);
  return { filePath, plan };
}
