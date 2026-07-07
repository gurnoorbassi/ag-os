import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildRuntimeProofRecords,
  validateRuntimeProofInput,
  writeRuntimeProofRecords
} from "../scripts/lib/runtime/runtime-proof-writer.mjs";

const fixedNow = new Date("2026-07-06T22:00:00.000Z");

function buildSafeInput(overrides = {}) {
  return {
    proofId: "runtime-proof-20260706-local-test",
    projectId: "project-social-media-management-system-v1",
    approval: {
      approvalId: "approval-20260706-local-proof-test",
      ownerId: "owner-gurnoor-bassi",
      requestedBy: "ag-os-runtime",
      approvedBy: "owner-gurnoor-bassi",
      commandCategory: "build",
      requestedAction: "Record one completed local proof test action.",
      target: "ag-os:runtime-proof-writer",
      scope: "Allow local source-of-truth proof record generation for one completed local test action only.",
      riskLevel: "R2",
      dataClass: "internal",
      approvalRequiredFor: ["record_proof"],
      approvedActions: ["record_proof"],
      prohibitedActions: [
        "use_credentials",
        "start_oauth",
        "connect_social_accounts",
        "post_content",
        "schedule_content",
        "use_analytics_api",
        "activate_n8n",
        "deploy_production",
        "change_domain",
        "change_dns",
        "use_paid_service",
        "access_customer_data",
        "access_production_data",
        "change_constitution"
      ],
      revocationPath: "Owner can revoke this local proof-record approval before writing records.",
      evidence: [
        {
          type: "owner_instruction",
          reference: "Owner approved local proof record generation only.",
          verified: true
        }
      ],
      approvalText: "Owner approval for local proof record generation.",
      approvedAt: "2026-07-06T22:00:00.000Z",
      expiresAt: "2026-07-07T22:00:00.000Z"
    },
    action: {
      connectorExecutionId: "connector-exec-20260706-local-proof-test",
      connectorId: "connector-github-mcp",
      requestedAction: "record_completed_local_proof",
      status: "done",
      result: {
        branchCreated: false,
        pullRequestOpened: false,
        liveActionExecuted: false
      },
      requiredPermissions: ["owner_approval", "active_approval_lock", "local_files_only"],
      evidenceRequired: ["validation_passed", "boot_ready"],
      prohibitedActionsConfirmedFalse: [
        "use_credentials",
        "start_oauth",
        "connect_social_accounts",
        "post_content",
        "schedule_content",
        "use_analytics_api",
        "activate_n8n",
        "deploy_production",
        "change_domain",
        "change_dns",
        "use_paid_service",
        "access_customer_data",
        "access_production_data",
        "change_constitution"
      ],
      notes: "Local proof writer test only."
    },
    cost: {
      costLedgerId: "cost-ledger-20260706-local-proof-test",
      jobId: "job-runtime-proof-20260706-local-test",
      estimatedUsd: 0,
      actualUsd: 0
    },
    references: {
      critiqueId: "critique-runtime-proof-20260706-local-test",
      critiquePath: ".codex/critiques/critique-runtime-proof-20260706-local-test.json",
      qualityScoreId: "quality-score-runtime-proof-20260706-local-test",
      qualityScorePath: ".codex/quality-scores/quality-score-runtime-proof-20260706-local-test.json"
    },
    summary: {
      title: "Local runtime proof writer test",
      outcome: "proof_records_generated_locally",
      notes: "Generated records are source-controlled proof metadata only."
    },
    safety: {
      usesCredentials: false,
      startsOauth: false,
      connectsSocialAccounts: false,
      postsContent: false,
      schedulesContent: false,
      usesAnalyticsApi: false,
      activatesN8n: false,
      triggersDeployment: false,
      deploysProduction: false,
      changesDomain: false,
      changesDns: false,
      usesPaidAction: false,
      accessesCustomerData: false,
      accessesProductionData: false,
      changesLeadGen: false,
      changesAiReceptionist: false,
      changesConstitution: false
    },
    ...overrides
  };
}

test("validates explicit runtime proof input and rejects missing approval scope", () => {
  assert.deepEqual(validateRuntimeProofInput(buildSafeInput()), { valid: true, errors: [] });

  const invalid = buildSafeInput({
    approval: {
      ...buildSafeInput().approval,
      scope: ""
    }
  });

  const result = validateRuntimeProofInput(invalid);
  assert.equal(result.valid, false);
  assert.equal(result.errors.includes("approval.scope is required"), true);
});

test("builds approval, audit, connector, cost, and dashboard summary records", () => {
  const result = buildRuntimeProofRecords({ input: buildSafeInput(), now: fixedNow });

  assert.equal(result.approval.approvalId, "approval-20260706-local-proof-test");
  assert.equal(result.approval.status, "approved");
  assert.equal(result.audit.id, "audit-runtime-proof-20260706-local-test-executed");
  assert.equal(result.audit.liveServiceTouched, false);
  assert.equal(result.connector.connectorExecutionId, "connector-exec-20260706-local-proof-test");
  assert.equal(result.connector.safety.usesCredentials, false);
  assert.equal(result.cost.costLedgerId, "cost-ledger-20260706-local-proof-test");
  assert.equal(result.cost.summary.actualTaskCostUsd, 0);
  assert.equal(result.dashboardSummary.proofId, "runtime-proof-20260706-local-test");
  assert.equal(result.dashboardSummary.sourceRecords.approval, ".codex/approvals/approval-20260706-local-proof-test.json");
  assert.equal(result.dashboardSummary.references.critiqueId, "critique-runtime-proof-20260706-local-test");
  assert.equal(result.dashboardSummary.safety.liveActionsBlocked, true);
});

test("refuses unsafe proof input before writing any records", () => {
  const unsafe = buildSafeInput({
    safety: {
      ...buildSafeInput().safety,
      startsOauth: true
    }
  });

  assert.throws(
    () => buildRuntimeProofRecords({ input: unsafe, now: fixedNow }),
    /unsafe runtime proof input/
  );
});

test("refuses paid or over-budget proof input", () => {
  const unsafe = buildSafeInput({
    cost: {
      ...buildSafeInput().cost,
      actualUsd: 6
    }
  });

  assert.throws(
    () => buildRuntimeProofRecords({ input: unsafe, now: fixedNow }),
    /actual cost exceeds per-task limit/
  );
});

test("writes runtime proof records to local workspace only", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "ag-os-runtime-proof-"));

  try {
    const result = writeRuntimeProofRecords({
      input: buildSafeInput(),
      now: fixedNow,
      root
    });

    assert.deepEqual(Object.keys(result.paths).sort(), [
      "approval",
      "audit",
      "connector",
      "cost",
      "dashboardSummary"
    ]);

    for (const filePath of Object.values(result.paths)) {
      assert.equal(existsSync(path.join(root, filePath)), true);
    }

    const summary = JSON.parse(readFileSync(path.join(root, result.paths.dashboardSummary), "utf8"));
    assert.equal(summary.proofId, "runtime-proof-20260706-local-test");
    assert.equal(summary.generatedBy, "runtime-proof-writer-v1");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
