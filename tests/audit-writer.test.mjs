import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildCommandIntakeRecord } from "../scripts/lib/runtime/command-intake-processor.mjs";
import { buildJobRecord } from "../scripts/lib/runtime/job-queue-processor.mjs";
import {
  applyApprovalGateToJob,
  buildAuditEventRecord,
  writeAuditEventRecord,
  writeApprovalGateJobUpdate
} from "../scripts/lib/runtime/audit-writer.mjs";

const fixedNow = new Date("2026-07-03T12:00:00.000Z");

function buildJob() {
  const commandIntake = buildCommandIntakeRecord({
    command: "make me a construction website",
    runId: "construction-website-dry-run",
    now: fixedNow
  });

  return buildJobRecord({ commandIntake, now: fixedNow });
}

test("builds an internal audit event for local processor actions", () => {
  const record = buildAuditEventRecord({
    runId: "construction-website-dry-run",
    summary: "Command intake, boot, job, route, and plan records were generated locally.",
    relatedArtifacts: [
      {
        type: "other",
        reference: "job-runtime-construction-website-dry-run"
      }
    ],
    now: fixedNow
  });

  assert.equal(record.id, "audit-runtime-construction-website-dry-run");
  assert.equal(record.eventType, "validation_run");
  assert.equal(record.source, "local_validation");
  assert.equal(record.riskLevel, "low");
  assert.equal(record.dataClassification, "internal");
  assert.equal(record.liveServiceTouched, false);
  assert.equal(record.relatedArtifacts.length, 1);
  assert.equal(JSON.stringify(record).includes("REQUIRED_"), false);
});

test("marks a job waiting_approval only when a gated action is requested", () => {
  const job = buildJob();
  const unchanged = applyApprovalGateToJob({
    job,
    gatedActionRequested: false,
    now: fixedNow
  });
  assert.equal(unchanged.status, "queued");

  const gated = applyApprovalGateToJob({
    job,
    gatedActionRequested: true,
    reason: "Repository creation requires owner approval.",
    now: fixedNow
  });
  assert.equal(gated.status, "waiting_approval");
  assert.equal(gated.approvalRequired, true);
  assert.equal(gated.blockedReason, "Repository creation requires owner approval.");
});

test("writes audit records and gated job updates to a local workspace only", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "ag-os-audit-writer-"));

  try {
    const auditResult = writeAuditEventRecord({
      runId: "construction-website-dry-run",
      summary: "Local processor action completed.",
      now: fixedNow,
      root
    });
    assert.equal(auditResult.filePath, ".codex/audit/audit-runtime-construction-website-dry-run.json");
    const audit = JSON.parse(readFileSync(path.join(root, auditResult.filePath), "utf8"));
    assert.equal(audit.liveServiceTouched, false);

    const jobResult = writeApprovalGateJobUpdate({
      job: buildJob(),
      gatedActionRequested: true,
      reason: "Deployment requires owner approval.",
      now: fixedNow,
      root
    });
    assert.equal(jobResult.filePath, ".codex/jobs/job-runtime-construction-website-dry-run.json");
    const job = JSON.parse(readFileSync(path.join(root, jobResult.filePath), "utf8"));
    assert.equal(job.status, "waiting_approval");
    assert.equal(job.safety.deploymentAllowed, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
