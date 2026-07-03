import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildCiStatusRecord,
  validateCiStatusRecord,
  writeCiStatusRecord
} from "../scripts/lib/runtime/ci-status-runtime.mjs";

const fixedNow = new Date("2026-07-03T12:00:00.000Z");

test("builds an offline CI status record for a passing check", () => {
  const record = buildCiStatusRecord({
    runId: "construction-website-repo",
    checkName: "Foundation CI",
    status: "completed",
    conclusion: "success",
    commitSha: "abcdef1234567890abcdef1234567890abcdef12",
    prNumber: 52,
    checkedAt: fixedNow,
    blockingReason: "none"
  });

  assert.equal(record.ciStatusId, "ci-status-runtime-construction-website-repo-foundation-ci");
  assert.equal(record.checkName, "Foundation CI");
  assert.equal(record.status, "completed");
  assert.equal(record.conclusion, "success");
  assert.equal(record.commitSha, "abcdef1234567890abcdef1234567890abcdef12");
  assert.equal(record.prNumber, 52);
  assert.equal(record.checkedAt, "2026-07-03T12:00:00.000Z");
  assert.equal(record.blockingReason, "none");
  assert.equal(record.liveServiceTouched, false);
});

test("builds a blocking offline CI status record when CI is missing or failed", () => {
  const record = buildCiStatusRecord({
    runId: "construction-website-repo",
    checkName: "Foundation CI",
    status: "missing",
    conclusion: "none",
    commitSha: "abcdef1",
    prNumber: 52,
    checkedAt: fixedNow,
    blockingReason: "CI status has not been recorded for the PR head SHA"
  });

  assert.equal(record.status, "missing");
  assert.equal(record.conclusion, "none");
  assert.equal(record.blockingReason, "CI status has not been recorded for the PR head SHA");
});

test("validates required CI status runtime fields", () => {
  const validRecord = buildCiStatusRecord({
    runId: "construction-website-repo",
    checkName: "Foundation CI",
    status: "completed",
    conclusion: "success",
    commitSha: "abcdef1234567890abcdef1234567890abcdef12",
    prNumber: 52,
    checkedAt: fixedNow,
    blockingReason: "none"
  });

  assert.deepEqual(validateCiStatusRecord(validRecord), { valid: true, errors: [] });

  const invalidRecord = {
    ...validRecord,
    commitSha: "not a sha",
    liveServiceTouched: true
  };
  const validation = validateCiStatusRecord(invalidRecord);
  assert.equal(validation.valid, false);
  assert.equal(validation.errors.includes("commitSha must be a Git commit SHA"), true);
  assert.equal(validation.errors.includes("liveServiceTouched must be false for offline CI status records"), true);
});

test("writes CI status records to a local workspace only", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "ag-os-ci-status-"));

  try {
    const record = buildCiStatusRecord({
      runId: "construction-website-repo",
      checkName: "Foundation CI",
      status: "completed",
      conclusion: "success",
      commitSha: "abcdef1234567890abcdef1234567890abcdef12",
      prNumber: 52,
      checkedAt: fixedNow,
      blockingReason: "none"
    });
    const result = writeCiStatusRecord({ record, root });

    assert.equal(result.filePath, ".codex/ci/ci-status-runtime-construction-website-repo-foundation-ci.json");
    const writtenRecord = JSON.parse(readFileSync(path.join(root, result.filePath), "utf8"));
    assert.equal(writtenRecord.liveServiceTouched, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
