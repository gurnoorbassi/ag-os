import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildSafeMergeRuntimeRecord,
  summarizeSafeMergeRuntime,
  validateSafeMergeRuntimeRecord,
  writeSafeMergeRuntimeRecord
} from "../scripts/lib/runtime/safe-merge-runtime.mjs";

const fixedNow = new Date("2026-07-03T12:00:00.000Z");
const commitSha = "abcdef1234567890abcdef1234567890abcdef12";

test("builds a ready safe-merge runtime decision when every gate passes", () => {
  const record = buildSafeMergeRuntimeRecord({
    runId: "construction-website-repo",
    prNumber: 53,
    commitSha,
    riskLevel: "R1",
    approvalGateAllows: true,
    ciStatuses: [
      {
        checkName: "Foundation CI",
        status: "completed",
        conclusion: "success",
        commitSha
      }
    ],
    validationPassed: true,
    blockedFiles: [],
    actionFlags: {
      liveService: false,
      productionData: false,
      paidAction: false,
      domainChange: false,
      customerData: false
    },
    auditEventCreated: true,
    now: fixedNow
  });

  assert.equal(record.safeMergeRuntimeId, "safe-merge-runtime-construction-website-repo-pr-53");
  assert.equal(record.mode, "merge_gate_only");
  assert.equal(record.status, "ready");
  assert.equal(record.conditions.approvalGateAllows, true);
  assert.equal(record.conditions.ciPassed, true);
  assert.equal(record.conditions.validationPassed, true);
  assert.equal(record.conditions.riskTierAllowed, true);
  assert.equal(record.conditions.noBlockedFiles, true);
  assert.equal(record.conditions.noLiveProdPaidDomainCustomerDataAction, true);
  assert.equal(record.conditions.auditEventCreated, true);
  assert.deepEqual(record.blockingReasons, []);
  assert.equal(record.safety.executesMerge, false);
  assert.equal(record.safety.liveServiceTouched, false);
});

test("blocks safe merge when required gates are missing", () => {
  const record = buildSafeMergeRuntimeRecord({
    runId: "construction-website-repo",
    prNumber: 53,
    commitSha,
    riskLevel: "R3",
    approvalGateAllows: false,
    ciStatuses: [
      {
        checkName: "Foundation CI",
        status: "completed",
        conclusion: "failure",
        commitSha
      }
    ],
    validationPassed: false,
    blockedFiles: ["scripts/validate-foundation.mjs"],
    actionFlags: {
      liveService: false,
      productionData: false,
      paidAction: false,
      domainChange: false,
      customerData: false
    },
    auditEventCreated: false,
    now: fixedNow
  });

  assert.equal(record.status, "blocked");
  assert.equal(record.conditions.approvalGateAllows, false);
  assert.equal(record.conditions.ciPassed, false);
  assert.equal(record.conditions.validationPassed, false);
  assert.equal(record.conditions.riskTierAllowed, false);
  assert.equal(record.conditions.noBlockedFiles, false);
  assert.equal(record.conditions.auditEventCreated, false);
  assert.equal(record.blockingReasons.includes("approval gate does not allow merge"), true);
  assert.equal(record.blockingReasons.includes("CI has not passed for the exact commit SHA"), true);
  assert.equal(record.blockingReasons.includes("blocked files are present"), true);
});

test("validates safe-merge runtime records and forced no-execution safety", () => {
  const validRecord = buildSafeMergeRuntimeRecord({
    runId: "construction-website-repo",
    prNumber: 53,
    commitSha,
    riskLevel: "R1",
    approvalGateAllows: true,
    ciStatuses: [{ checkName: "Foundation CI", status: "completed", conclusion: "success", commitSha }],
    validationPassed: true,
    blockedFiles: [],
    actionFlags: {
      liveService: false,
      productionData: false,
      paidAction: false,
      domainChange: false,
      customerData: false
    },
    auditEventCreated: true,
    now: fixedNow
  });

  assert.deepEqual(validateSafeMergeRuntimeRecord(validRecord), { valid: true, errors: [] });

  const invalidRecord = {
    ...validRecord,
    commitSha: "not a sha",
    safety: {
      ...validRecord.safety,
      executesMerge: true
    }
  };
  const validation = validateSafeMergeRuntimeRecord(invalidRecord);
  assert.equal(validation.valid, false);
  assert.equal(validation.errors.includes("commitSha must be a Git commit SHA"), true);
  assert.equal(validation.errors.includes("safety flags must all be false for merge_gate_only"), true);
});

test("writes safe-merge runtime records to a local workspace only", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "ag-os-safe-merge-"));

  try {
    const record = buildSafeMergeRuntimeRecord({
      runId: "construction-website-repo",
      prNumber: 53,
      commitSha,
      riskLevel: "R1",
      approvalGateAllows: true,
      ciStatuses: [{ checkName: "Foundation CI", status: "completed", conclusion: "success", commitSha }],
      validationPassed: true,
      blockedFiles: [],
      actionFlags: {
        liveService: false,
        productionData: false,
        paidAction: false,
        domainChange: false,
        customerData: false
      },
      auditEventCreated: true,
      now: fixedNow
    });
    const result = writeSafeMergeRuntimeRecord({ record, root });

    assert.equal(result.filePath, ".codex/merges/safe-merge-runtime-construction-website-repo-pr-53.json");
    const writtenRecord = JSON.parse(readFileSync(path.join(root, result.filePath), "utf8"));
    assert.equal(writtenRecord.safety.executesMerge, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("safe-merge summary reports a clean no-candidate state without executing a merge", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "ag-os-safe-merge-summary-"));

  try {
    assert.deepEqual(summarizeSafeMergeRuntime({ root }), {
      status: "ready",
      candidateCount: 0,
      readyCount: 0,
      blockedCount: 0,
      invalidCount: 0,
      mergeExecuted: false,
      latestCandidate: null,
      candidates: []
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
