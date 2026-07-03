import process from "node:process";
import { isoTimestamp, normalizeRunId, writeJson } from "./common.mjs";

const ACTION_RULES = {
  create_repo: {
    requiresCiPassed: false,
    requiresValidationPassed: true,
    allowedAfterApproval: true,
    permittedWhen: [
      "active owner approval lock explicitly scopes repository creation",
      "repository name and visibility are approved",
      "no credentials, production data, paid action, deployment, or domain change is included"
    ],
    blockedWhen: [
      "approval lock is missing, expired, revoked, or out of scope",
      "repository scope is unclear",
      "action would add credentials, production data, paid service, deployment, or domain change"
    ]
  },
  create_branch: {
    requiresCiPassed: false,
    requiresValidationPassed: true,
    allowedAfterApproval: true,
    permittedWhen: [
      "active owner approval lock scopes the target repository and branch",
      "branch name is recorded before execution",
      "source branch is current with the approved target"
    ],
    blockedWhen: [
      "approval lock is missing, expired, revoked, or out of scope",
      "target repository or branch name is unclear",
      "branch action would touch production data or deployment settings"
    ]
  },
  create_files: {
    requiresCiPassed: false,
    requiresValidationPassed: true,
    allowedAfterApproval: true,
    permittedWhen: [
      "active owner approval lock scopes file creation",
      "file manifest and validation plan are recorded",
      "created files avoid credentials, production data, live connector actions, and paid paths"
    ],
    blockedWhen: [
      "approval lock is missing, expired, revoked, or out of scope",
      "file manifest is missing",
      "planned content contains credentials, production data, customer data, deployment, or paid action"
    ]
  },
  update_files: {
    requiresCiPassed: false,
    requiresValidationPassed: true,
    allowedAfterApproval: true,
    permittedWhen: [
      "active owner approval lock scopes file updates",
      "diff review and rollback path are recorded",
      "updates avoid credentials, production data, live connector actions, and paid paths"
    ],
    blockedWhen: [
      "approval lock is missing, expired, revoked, or out of scope",
      "diff review or rollback path is missing",
      "planned update changes credentials, production data, customer data, deployment, or domain settings"
    ]
  },
  open_pr: {
    requiresCiPassed: false,
    requiresValidationPassed: true,
    allowedAfterApproval: true,
    permittedWhen: [
      "active owner approval lock scopes opening a pull request",
      "branch reference and pull request body are recorded",
      "pull request does not request deployment, domain, paid, or production-data action"
    ],
    blockedWhen: [
      "approval lock is missing, expired, revoked, or out of scope",
      "branch reference or pull request body is missing",
      "pull request would trigger an unapproved live, paid, domain, or production-data path"
    ]
  },
  poll_ci: {
    requiresCiPassed: false,
    requiresValidationPassed: true,
    allowedAfterApproval: true,
    permittedWhen: [
      "active owner approval lock scopes CI status reads",
      "pull request number and commit SHA are recorded",
      "CI polling reads status only and does not rerun jobs"
    ],
    blockedWhen: [
      "approval lock is missing, expired, revoked, or out of scope",
      "pull request number or commit SHA is missing",
      "CI action would rerun jobs, change workflow settings, deploy, or access secrets"
    ]
  },
  merge_pr: {
    requiresCiPassed: true,
    requiresValidationPassed: true,
    allowedAfterApproval: true,
    permittedWhen: [
      "active owner approval lock scopes the merge",
      "GitHub CI has passed for the exact head SHA",
      "local validation passed and safe-merge rules have no blockers",
      "audit event is written before merge execution"
    ],
    blockedWhen: [
      "approval lock is missing, expired, revoked, or out of scope",
      "CI is missing, pending, failed, or for a different commit SHA",
      "validation failed or safe-merge rules are blocked",
      "merge includes credentials, production data, paid action, deployment, domain change, or customer data"
    ]
  }
};

const GATE_ONLY_SAFETY = {
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

const MERGE_GUARD = {
  requiresApprovalGate: true,
  requiresCiPassed: true,
  requiresValidationPassed: true,
  requiresSafeMergeRulesPassed: true,
  requiresNoBlockedFiles: true,
  requiresNoLiveProductionPaidDomainOrCustomerDataAction: true,
  requiresAuditEvent: true
};

function approvalLockIsActive(lock, action, githubPlan, now) {
  if (lock?.status !== "active") {
    return false;
  }

  if (lock.expiresAt && new Date(lock.expiresAt).getTime() <= new Date(now).getTime()) {
    return false;
  }

  const approvedActions = Array.isArray(lock.approvedActions) ? lock.approvedActions : [];
  if (!approvedActions.includes(action.actionType) && !approvedActions.includes(action.approvalGate)) {
    return false;
  }

  const scope = lock.scope || {};
  if (scope.projectId && scope.projectId !== githubPlan.projectId) {
    return false;
  }

  if (scope.connectorId && scope.connectorId !== "connector-github-mcp") {
    return false;
  }

  return true;
}

function ciHasPassed(ciStatuses) {
  return ciStatuses.some((status) => status?.status === "completed" && status?.conclusion === "success");
}

function buildActionGate({ action, githubPlan, activeApprovalLocks, ciStatuses, validationPassed, now }) {
  const rule = ACTION_RULES[action.actionType];
  const approvalLock = activeApprovalLocks.find((lock) => approvalLockIsActive(lock, action, githubPlan, now));
  const ciReady = !rule.requiresCiPassed || ciHasPassed(ciStatuses);
  const validationReady = !rule.requiresValidationPassed || validationPassed === true;
  const executionState = approvalLock && ciReady && validationReady ? "ready_after_approval" : "blocked";

  return {
    actionType: action.actionType,
    approvalGate: action.approvalGate,
    ...(approvalLock?.approvalId ? { approvalId: approvalLock.approvalId } : {}),
    executionState,
    ownerApprovalRequired: true,
    requiresApprovalLock: true,
    requiresAuditEvent: true,
    requiresCiPassed: rule.requiresCiPassed,
    requiresValidationPassed: rule.requiresValidationPassed,
    allowedAfterApproval: rule.allowedAfterApproval,
    permittedWhen: rule.permittedWhen,
    blockedWhen: rule.blockedWhen
  };
}

export function buildGitHubMcpExecutionGate({
  githubPlan,
  activeApprovalLocks = [],
  ciStatuses = [],
  validationPassed = false,
  now = new Date()
}) {
  if (!githubPlan?.githubExecutionPlanId) {
    throw new Error("githubPlan with githubExecutionPlanId is required");
  }

  const timestamp = isoTimestamp(now);
  const normalizedRunId = normalizeRunId(githubPlan.githubExecutionPlanId.replace(/^github-plan-/, ""));
  const actions = githubPlan.plannedActions.map((action) => buildActionGate({
    action,
    githubPlan,
    activeApprovalLocks,
    ciStatuses,
    validationPassed,
    now
  }));

  return {
    githubMcpExecutionGateId: `github-mcp-gate-${normalizedRunId}`,
    status: actions.every((action) => action.executionState === "ready_after_approval") ? "ready" : "blocked",
    mode: "execution_gate_only",
    connectorId: "connector-github-mcp",
    githubExecutionPlanId: githubPlan.githubExecutionPlanId,
    projectId: githubPlan.projectId,
    riskLevel: githubPlan.riskLevel,
    validationPassed,
    actions,
    mergeGuard: MERGE_GUARD,
    safety: GATE_ONLY_SAFETY,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

export function validateGitHubMcpExecutionGate(gate) {
  const errors = [];

  if (!gate?.githubMcpExecutionGateId || !/^github-mcp-gate-[a-z0-9-]+$/.test(gate.githubMcpExecutionGateId)) {
    errors.push("githubMcpExecutionGateId is required");
  }

  if (gate?.mode !== "execution_gate_only") {
    errors.push("mode must be execution_gate_only");
  }

  if (gate?.connectorId !== "connector-github-mcp") {
    errors.push("connectorId must be connector-github-mcp");
  }

  if (!Array.isArray(gate?.actions) || gate.actions.length === 0) {
    errors.push("actions must not be empty");
  }

  if (gate?.actions?.some((action) => action.ownerApprovalRequired !== true || action.requiresApprovalLock !== true || action.requiresAuditEvent !== true)) {
    errors.push("all actions must require owner approval lock and audit event");
  }

  if (!gate?.mergeGuard || Object.values(gate.mergeGuard).some((value) => value !== true)) {
    errors.push("mergeGuard requirements must all be true");
  }

  if (!gate?.safety || Object.values(gate.safety).some((value) => value !== false)) {
    errors.push("safety flags must all be false for execution_gate_only");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function writeGitHubMcpExecutionGate({ gate, root = process.cwd() }) {
  const validation = validateGitHubMcpExecutionGate(gate);
  if (!validation.valid) {
    throw new Error(`GitHub MCP execution gate invalid: ${validation.errors.join("; ")}`);
  }

  const filePath = `.codex/github/${gate.githubMcpExecutionGateId}.json`;
  writeJson(filePath, gate, root);
  return { filePath, gate };
}
