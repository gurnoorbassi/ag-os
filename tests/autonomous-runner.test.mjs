import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { processAutonomousJob } from "../scripts/lib/runtime/autonomous-runner.mjs";
import { submitOwnerCommand } from "../scripts/lib/runtime/live-command-service.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function tempWorkspace() {
  const target = mkdtempSync(path.join(tmpdir(), "ag-os-auto-"));
  cpSync(root, target, {
    recursive: true,
    filter: (source) => ![".git", "node_modules"].includes(path.basename(source))
  });
  return target;
}

test("autonomous runner completes safe owner-console work with quality and lesson evidence", async () => {
  const workspace = tempWorkspace();
  const command = await submitOwnerCommand({
    command: "Create a professional dashboard for internal operations",
    projectId: "project-ag-os-coordinator-runtime",
    root: workspace,
    now: new Date("2026-07-13T13:00:00.000Z")
  });
  const result = processAutonomousJob({
    jobId: command.jobId,
    root: workspace,
    now: new Date("2026-07-13T13:01:00.000Z"),
    runValidation: false
  });

  assert.equal(result.status, "done");
  assert.ok(result.job.completionEvidence.qualityScorePath);
  assert.ok(result.job.completionEvidence.lessonCandidatePaths.length > 0);
  for (const recordPath of [
    result.job.completionEvidence.qualityScorePath,
    ...result.job.completionEvidence.lessonCandidatePaths
  ]) {
    assert.doesNotThrow(() => readFileSync(path.join(workspace, recordPath), "utf8"));
  }
});

test("autonomous runner pauses gated work without executing it", async () => {
  const workspace = tempWorkspace();
  const command = await submitOwnerCommand({
    command: "Deploy the dashboard to production",
    projectId: "project-ag-os-coordinator-runtime",
    root: workspace,
    now: new Date("2026-07-13T14:00:00.000Z")
  });
  const result = processAutonomousJob({ jobId: command.jobId, root: workspace, runValidation: false });

  assert.equal(result.status, "waiting_approval");
  assert.equal(result.job.approvalRequired, true);
  assert.match(result.job.blockedReason, /permanent live-action gate/);
  assert.equal(result.executionPath, undefined);
});
