import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateSocialAccountOAuthReadiness,
  evaluateSocialPostingPermission,
  evaluateSocialSchedulingPermission,
  evaluateSocialAnalyticsPermission
} from "../scripts/lib/runtime/social-posting-gates.mjs";

const baseAccount = {
  accountId: "social-account-ag-digitalz-instagram",
  platform: "Instagram",
  handle: "@agdigitalz",
  accountState: "not_connected",
  credentialRefId: null,
  credentialStorageStatus: "none",
  credentialsStoredInRepo: false,
  postingBlocked: true,
  schedulingBlocked: true,
  analyticsBlocked: true,
  dmCommentsBlocked: true,
  n8nActivationBlocked: true
};

const approvedDraftPost = {
  postId: "social-post-ag-digitalz-instagram-001",
  platform: "Instagram",
  lifecycleState: "owner_approved_draft",
  ownerDraftApprovalStatus: "owner_approved_draft"
};

function approval(overrides = {}) {
  return {
    approvalId: "approval-20260708-instagram-single-post-test",
    status: "approved",
    targetPlatform: "Instagram",
    targetHandle: "@agdigitalz",
    allowedAction: "publish_single_post",
    postId: "social-post-ag-digitalz-instagram-001",
    exactPostOnly: true,
    schedulingAllowed: false,
    analyticsAllowed: false,
    dmCommentsAllowed: false,
    n8nActivationAllowed: false,
    ...overrides
  };
}

test("OAuth approval does not allow posting", () => {
  const result = evaluateSocialPostingPermission({
    account: { ...baseAccount, accountState: "oauth_ready" },
    post: approvedDraftPost,
    approval: approval({ allowedAction: "execute_oauth", postId: null })
  });

  assert.equal(result.allowed, false);
  assert.ok(result.blockedReasons.includes("exact_single_post_publish_approval_missing"));
});

test("connected_draft_only does not allow posting without exact single-post approval", () => {
  const result = evaluateSocialPostingPermission({
    account: { ...baseAccount, accountState: "connected_draft_only", credentialRefId: "credential-ref-instagram-agdigitalz" },
    post: approvedDraftPost,
    approval: null
  });

  assert.equal(result.allowed, false);
  assert.ok(result.blockedReasons.includes("exact_single_post_publish_approval_missing"));
});

test("draft approval alone does not allow posting", () => {
  const result = evaluateSocialPostingPermission({
    account: { ...baseAccount, accountState: "not_connected" },
    post: approvedDraftPost,
    approval: null
  });

  assert.equal(result.allowed, false);
  assert.ok(result.blockedReasons.includes("account_not_approved_for_single_publish"));
  assert.ok(result.blockedReasons.includes("exact_single_post_publish_approval_missing"));
});

test("single-post approval allows only one exact post when account is approved", () => {
  const account = {
    ...baseAccount,
    accountState: "approved_for_single_publish",
    credentialRefId: "credential-ref-instagram-agdigitalz",
    postingBlocked: false
  };

  const allowed = evaluateSocialPostingPermission({
    account,
    post: { ...approvedDraftPost, lifecycleState: "ready_for_live_publish_approval" },
    approval: approval()
  });
  assert.equal(allowed.allowed, true);
  assert.deepEqual(allowed.blockedReasons, []);

  const wrongPost = evaluateSocialPostingPermission({
    account,
    post: { ...approvedDraftPost, postId: "social-post-ag-digitalz-instagram-002", lifecycleState: "ready_for_live_publish_approval" },
    approval: approval()
  });
  assert.equal(wrongPost.allowed, false);
  assert.ok(wrongPost.blockedReasons.includes("approval_post_scope_mismatch"));
});

test("scheduling and analytics require separate approvals", () => {
  const account = {
    ...baseAccount,
    accountState: "approved_for_single_publish",
    credentialRefId: "credential-ref-instagram-agdigitalz"
  };

  const schedule = evaluateSocialSchedulingPermission({ account, approval: approval() });
  assert.equal(schedule.allowed, false);
  assert.ok(schedule.blockedReasons.includes("scheduling_approval_missing"));

  const analytics = evaluateSocialAnalyticsPermission({ account, approval: approval() });
  assert.equal(analytics.allowed, false);
  assert.ok(analytics.blockedReasons.includes("analytics_approval_missing"));
});

test("missing secure credential store blocks OAuth readiness", () => {
  const result = evaluateSocialAccountOAuthReadiness({
    account: { ...baseAccount, accountState: "access_requested" },
    credentialStoreAvailable: false,
    approval: approval({ allowedAction: "execute_oauth", postId: null })
  });

  assert.equal(result.allowed, false);
  assert.ok(result.blockedReasons.includes("secure_credential_store_missing"));
});

test("expired or revoked accounts block posting", () => {
  for (const accountState of ["expired", "revoked", "blocked"]) {
    const result = evaluateSocialPostingPermission({
      account: { ...baseAccount, accountState, credentialRefId: "credential-ref-instagram-agdigitalz" },
      post: approvedDraftPost,
      approval: approval()
    });
    assert.equal(result.allowed, false);
    assert.ok(result.blockedReasons.includes(`account_${accountState}`));
  }
});

test("memory and skills cannot approve posting", () => {
  const result = evaluateSocialPostingPermission({
    account: {
      ...baseAccount,
      accountState: "approved_for_single_publish",
      credentialRefId: "credential-ref-instagram-agdigitalz",
      postingBlocked: false
    },
    post: { ...approvedDraftPost, lifecycleState: "ready_for_live_publish_approval" },
    approval: approval(),
    memorySignals: {
      acceptedLessonsLoaded: true,
      candidateLessonsLoadedAsTruth: false,
      memoryGrantsPermission: true
    },
    skillSignals: {
      skillsGrantPermission: true
    }
  });

  assert.equal(result.allowed, false);
  assert.ok(result.blockedReasons.includes("memory_cannot_grant_permission"));
  assert.ok(result.blockedReasons.includes("skills_cannot_grant_permission"));
});

test("credential and token values are rejected from social records", () => {
  const result = evaluateSocialAccountOAuthReadiness({
    account: {
      ...baseAccount,
      accountState: "access_requested",
      credentialRefId: "credential-ref-instagram-agdigitalz",
      credentialStorageStatus: "approved_reference",
      notes: ["token=secret-token-value"]
    },
    credentialStoreAvailable: true,
    approval: approval({ allowedAction: "execute_oauth", postId: null })
  });

  assert.equal(result.allowed, false);
  assert.ok(result.blockedReasons.includes("credential_or_token_value_present"));
});
