const BLOCKED_ACCOUNT_STATES = new Set(["revoked", "expired", "blocked"]);
const SINGLE_PUBLISH_STATES = new Set([
  "approved_for_single_publish",
  "approved_for_scheduling",
  "approved_for_live_posting"
]);

const SCHEDULING_STATES = new Set(["approved_for_scheduling", "approved_for_live_posting"]);
const LIVE_POSTING_STATES = new Set(["approved_for_live_posting"]);

const SECRET_MARKERS = [
  /\baccess[_-]?token\b/i,
  /\brefresh[_-]?token\b/i,
  /\bpassword\b/i,
  /\bapi[_-]?key\b/i,
  /\boauth[_-]?code\b/i,
  /\bsecret\s*[:=]\s*[^,\s"']{8,}/i,
  /\btoken\s*[:=]\s*[^,\s"']{8,}/i
];

function collectText(value) {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(collectText).join(" ");
  }
  if (typeof value === "object") {
    return Object.values(value).map(collectText).join(" ");
  }
  return String(value);
}

export function containsCredentialMaterial(record) {
  const text = collectText(record);
  return SECRET_MARKERS.some((pattern) => pattern.test(text));
}

function hasActiveApproval(approval, allowedAction) {
  return approval?.status === "approved" && approval?.allowedAction === allowedAction;
}

function hasPlatformScope({ account, post, approval }) {
  if (!approval) {
    return false;
  }
  if (approval.targetPlatform && approval.targetPlatform !== account?.platform) {
    return false;
  }
  if (approval.targetHandle && approval.targetHandle !== account?.handle) {
    return false;
  }
  if (post?.platform && post.platform !== account?.platform) {
    return false;
  }
  return true;
}

function baseSafetyReasons({ account, memorySignals = {}, skillSignals = {} }) {
  const reasons = [];

  if (!account) {
    reasons.push("account_missing");
    return reasons;
  }

  if (BLOCKED_ACCOUNT_STATES.has(account.accountState)) {
    reasons.push(`account_${account.accountState}`);
  }

  if (account.credentialsStoredInRepo !== false) {
    reasons.push("credentials_in_repo_not_allowed");
  }

  if (containsCredentialMaterial(account)) {
    reasons.push("credential_or_token_value_present");
  }

  if (memorySignals.memoryGrantsPermission === true || memorySignals.candidateLessonsLoadedAsTruth === true) {
    reasons.push("memory_cannot_grant_permission");
  }

  if (skillSignals.skillsGrantPermission === true) {
    reasons.push("skills_cannot_grant_permission");
  }

  return reasons;
}

export function evaluateSocialAccountOAuthReadiness({
  account,
  approval,
  credentialStoreAvailable = false,
  memorySignals = {},
  skillSignals = {}
} = {}) {
  const blockedReasons = baseSafetyReasons({ account, memorySignals, skillSignals });

  if (!["access_requested", "oauth_ready"].includes(account?.accountState)) {
    blockedReasons.push("account_not_ready_for_oauth");
  }

  if (!credentialStoreAvailable || !account?.credentialRefId || account?.credentialStorageStatus !== "approved_reference") {
    blockedReasons.push("secure_credential_store_missing");
  }

  if (!hasActiveApproval(approval, "execute_oauth") || !hasPlatformScope({ account, approval })) {
    blockedReasons.push("oauth_execution_approval_missing");
  }

  return {
    action: "execute_oauth",
    allowed: blockedReasons.length === 0,
    blockedReasons
  };
}

export function evaluateSocialPostingPermission({
  account,
  post,
  approval,
  memorySignals = {},
  skillSignals = {}
} = {}) {
  const blockedReasons = baseSafetyReasons({ account, memorySignals, skillSignals });

  if (!post) {
    blockedReasons.push("post_missing");
  }

  if (!SINGLE_PUBLISH_STATES.has(account?.accountState)) {
    blockedReasons.push("account_not_approved_for_single_publish");
  }

  if (!account?.credentialRefId) {
    blockedReasons.push("credential_reference_missing");
  }

  if (account?.postingBlocked === true || account?.livePostingBlocked === true) {
    blockedReasons.push("live_posting_blocked");
  }

  if (!["ready_for_live_publish_approval", "owner_approved_for_single_publish"].includes(post?.lifecycleState)) {
    blockedReasons.push("post_not_ready_for_live_publish_approval");
  }

  if (!hasActiveApproval(approval, "publish_single_post")) {
    blockedReasons.push("exact_single_post_publish_approval_missing");
  } else {
    if (approval.exactPostOnly !== true) {
      blockedReasons.push("single_post_approval_must_be_exact");
    }
    if (approval.postId !== post?.postId) {
      blockedReasons.push("approval_post_scope_mismatch");
    }
    if (!hasPlatformScope({ account, post, approval })) {
      blockedReasons.push("approval_platform_or_handle_scope_mismatch");
    }
  }

  return {
    action: "publish_single_post",
    allowed: blockedReasons.length === 0,
    blockedReasons
  };
}

export function evaluateSocialSchedulingPermission({ account, approval, memorySignals = {}, skillSignals = {} } = {}) {
  const blockedReasons = baseSafetyReasons({ account, memorySignals, skillSignals });

  if (!SCHEDULING_STATES.has(account?.accountState)) {
    blockedReasons.push("account_not_approved_for_scheduling");
  }

  if (account?.schedulingBlocked !== false) {
    blockedReasons.push("scheduling_blocked");
  }

  if (!hasActiveApproval(approval, "schedule_posts") || approval?.schedulingAllowed !== true) {
    blockedReasons.push("scheduling_approval_missing");
  }

  return {
    action: "schedule_posts",
    allowed: blockedReasons.length === 0,
    blockedReasons
  };
}

export function evaluateSocialAnalyticsPermission({ account, approval, memorySignals = {}, skillSignals = {} } = {}) {
  const blockedReasons = baseSafetyReasons({ account, memorySignals, skillSignals });

  if (!LIVE_POSTING_STATES.has(account?.accountState) && account?.accountState !== "connected_draft_only") {
    blockedReasons.push("account_not_connected_for_analytics");
  }

  if (account?.analyticsBlocked !== false) {
    blockedReasons.push("analytics_blocked");
  }

  if (!hasActiveApproval(approval, "analytics_readonly") || approval?.analyticsAllowed !== true) {
    blockedReasons.push("analytics_approval_missing");
  }

  return {
    action: "analytics_readonly",
    allowed: blockedReasons.length === 0,
    blockedReasons
  };
}
