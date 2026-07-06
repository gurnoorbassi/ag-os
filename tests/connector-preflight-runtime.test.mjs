import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildConnectorPreflightRecord,
  validateConnectorPreflightInput
} from "../scripts/lib/runtime/connector-preflight-runtime.mjs";

const fixedNow = new Date("2026-07-06T23:30:00.000Z");

function writeJson(root, relativePath, record) {
  const targetPath = path.join(root, relativePath);
  mkdirSync(path.dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, `${JSON.stringify(record, null, 2)}\n`);
}

function withWorkspace(fn) {
  const root = mkdtempSync(path.join(os.tmpdir(), "ag-os-preflight-"));
  try {
    writeJson(root, ".codex/connectors/registry.json", {
      connectors: [
        {
          id: "connector-github-mcp",
          name: "GitHub MCP",
          connectionStatus: "connected",
          allowedCapabilities: ["pull_request_create", "repository_metadata_read"],
          approvalRequiredFor: ["repository_create", "pull_request_merge"],
          prohibitedActions: ["credential_extraction"]
        }
      ],
      rules: {
        credentialsAllowed: false,
        liveCallsAllowedByDefault: false,
        deploymentsAllowedByDefault: false,
        workflowActivationAllowedByDefault: false,
        domainChangesAllowedByDefault: false,
        paidActionsAllowedByDefault: false,
        productionDataAllowedByDefault: false
      }
    });
    writeJson(root, ".codex/approvals/approval-20260706-github-pr-create.json", {
      approvalId: "approval-20260706-github-pr-create",
      status: "approved",
      target: "gurnoorbassi/example-repo",
      scope: "Allow one pull request creation for gurnoorbassi/example-repo only.",
      approvedActions: ["pull_request_create"],
      approvalRequiredFor: ["pull_request_create"],
      expiresAt: "2026-07-07T23:30:00.000Z",
      riskLevel: "R3",
      dataClass: "internal"
    });
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function safeInput(overrides = {}) {
  return {
    preflightId: "connector-preflight-20260706-github-pr-create",
    connectorId: "connector-github-mcp",
    requestedAction: "pull_request_create",
    target: "gurnoorbassi/example-repo",
    projectId: "project-social-media-management-system-v1",
    approvalId: "approval-20260706-github-pr-create",
    estimatedCostUsd: 0,
    rollbackPlan: "Close the unmerged pull request and delete the branch if owner requests rollback.",
    stopConditions: [
      "missing approval",
      "expired approval",
      "scope mismatch",
      "credential required",
      "cost over limit"
    ],
    credentialStoreRequired: false,
    credentialStoreApproved: false,
    ...overrides
  };
}

test("validates required connector preflight input", () => {
  assert.deepEqual(validateConnectorPreflightInput(safeInput()), { valid: true, errors: [] });
  const invalid = validateConnectorPreflightInput(safeInput({ target: "" }));
  assert.equal(invalid.valid, false);
  assert.equal(invalid.errors.includes("target is required"), true);
});

test("marks a scoped approved connector action ready without live calls", () => withWorkspace((root) => {
  const record = buildConnectorPreflightRecord({ input: safeInput(), root, now: fixedNow });

  assert.equal(record.status, "ready");
  assert.equal(record.connector.visible, true);
  assert.equal(record.approval.active, true);
  assert.equal(record.approval.scopeMatches, true);
  assert.equal(record.cost.withinLimit, true);
  assert.equal(record.rollback.ready, true);
  assert.equal(record.safety.liveConnectorCalled, false);
}));

test("blocks unknown connector before any action can run", () => withWorkspace((root) => {
  const record = buildConnectorPreflightRecord({
    input: safeInput({ connectorId: "connector-missing" }),
    root,
    now: fixedNow
  });

  assert.equal(record.status, "blocked");
  assert.equal(record.blockingReasons.includes("connector connector-missing is not registered"), true);
  assert.equal(record.safety.liveConnectorCalled, false);
}));

test("blocks expired approval locks", () => withWorkspace((root) => {
  writeJson(root, ".codex/approvals/approval-20260706-github-pr-create.json", {
    approvalId: "approval-20260706-github-pr-create",
    status: "approved",
    target: "gurnoorbassi/example-repo",
    scope: "Allow one pull request creation for gurnoorbassi/example-repo only.",
    approvedActions: ["pull_request_create"],
    approvalRequiredFor: ["pull_request_create"],
    expiresAt: "2026-07-05T23:30:00.000Z",
    riskLevel: "R3",
    dataClass: "internal"
  });

  const record = buildConnectorPreflightRecord({ input: safeInput(), root, now: fixedNow });
  assert.equal(record.status, "blocked");
  assert.equal(record.approval.active, false);
  assert.equal(record.blockingReasons.includes("approval approval-20260706-github-pr-create is expired"), true);
}));

test("blocks approval target or action mismatch", () => withWorkspace((root) => {
  const record = buildConnectorPreflightRecord({
    input: safeInput({
      requestedAction: "pull_request_merge",
      target: "gurnoorbassi/other-repo"
    }),
    root,
    now: fixedNow
  });

  assert.equal(record.status, "blocked");
  assert.equal(record.approval.scopeMatches, false);
  assert.equal(record.blockingReasons.some((reason) => reason.includes("does not approve action")), true);
  assert.equal(record.blockingReasons.some((reason) => reason.includes("does not match target")), true);
}));

test("blocks missing credential store or over-budget requests", () => withWorkspace((root) => {
  const record = buildConnectorPreflightRecord({
    input: safeInput({
      credentialStoreRequired: true,
      credentialStoreApproved: false,
      estimatedCostUsd: 6
    }),
    root,
    now: fixedNow
  });

  assert.equal(record.status, "blocked");
  assert.equal(record.credentialStore.ready, false);
  assert.equal(record.cost.withinLimit, false);
  assert.equal(record.blockingReasons.includes("secure credential store is required but not approved"), true);
  assert.equal(record.blockingReasons.includes("estimated cost exceeds per-task limit"), true);
}));
