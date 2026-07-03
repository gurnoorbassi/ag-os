import process from "node:process";
import { isoTimestamp, normalizeRunId, slugify, writeJson } from "./common.mjs";

const STATUSES = new Set(["queued", "in_progress", "completed", "missing", "blocked"]);
const CONCLUSIONS = new Set([
  "none",
  "success",
  "failure",
  "cancelled",
  "skipped",
  "timed_out",
  "action_required",
  "neutral"
]);

export function buildCiStatusRecord({
  runId,
  checkName,
  status,
  conclusion,
  commitSha,
  prNumber,
  checkedAt = new Date(),
  blockingReason,
  source = "offline_record"
}) {
  const checkedAtIso = isoTimestamp(checkedAt);
  const normalizedRunId = normalizeRunId(runId);
  const checkSlug = slugify(checkName);

  return {
    ciStatusId: `ci-status-${normalizedRunId}-${checkSlug}`,
    checkName,
    status,
    conclusion,
    commitSha,
    prNumber,
    checkedAt: checkedAtIso,
    blockingReason,
    source,
    liveServiceTouched: false,
    createdAt: checkedAtIso,
    updatedAt: checkedAtIso
  };
}

export function validateCiStatusRecord(record) {
  const errors = [];

  if (!record?.ciStatusId || !/^ci-status-[a-z0-9-]+$/.test(record.ciStatusId)) {
    errors.push("ciStatusId is required");
  }

  if (!record?.checkName) {
    errors.push("checkName is required");
  }

  if (!STATUSES.has(record?.status)) {
    errors.push("status is invalid");
  }

  if (!CONCLUSIONS.has(record?.conclusion)) {
    errors.push("conclusion is invalid");
  }

  if (!/^[a-fA-F0-9]{7,40}$/.test(record?.commitSha || "")) {
    errors.push("commitSha must be a Git commit SHA");
  }

  if (!Number.isInteger(record?.prNumber) || record.prNumber < 1) {
    errors.push("prNumber must be a positive integer");
  }

  if (!record?.checkedAt) {
    errors.push("checkedAt is required");
  }

  if (!record?.blockingReason) {
    errors.push("blockingReason is required");
  }

  if (record?.liveServiceTouched !== false) {
    errors.push("liveServiceTouched must be false for offline CI status records");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function writeCiStatusRecord({ record, root = process.cwd() }) {
  const validation = validateCiStatusRecord(record);
  if (!validation.valid) {
    throw new Error(`CI status record invalid: ${validation.errors.join("; ")}`);
  }

  const filePath = `.codex/ci/${record.ciStatusId}.json`;
  writeJson(filePath, record, root);
  return { filePath, record };
}
