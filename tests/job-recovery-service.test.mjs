import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { prepareJobRecovery } from "../scripts/lib/runtime/job-recovery-service.mjs";
import { submitOwnerCommand } from "../scripts/lib/runtime/live-command-service.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function tempWorkspace() {
  const target = mkdtempSync(path.join(tmpdir(), "ag-os-recovery-"));
  cpSync(root, target, {
    recursive: true,
    filter: (source) => ![".git", "node_modules"].includes(path.basename(source))
  });
  return target;
}

test("failed jobs can be retried with exact confirmation and traceable lineage", async () => {
  const workspace = tempWorkspace();
  const first = await submitOwnerCommand({
    command: "Create a vendor scheduling hub",
    projectId: "project-quote-builder",
    root: workspace,
    now: new Date("2026-07-16T20:00:00.000Z")
  });
  const jobPath = path.join(workspace, `.codex/jobs/${first.jobId}.json`);
  const job = JSON.parse(readFileSync(jobPath, "utf8"));
  writeFileSync(jobPath, `${JSON.stringify({ ...job, status: "failed" }, null, 2)}\n`);

  const prepared = prepareJobRecovery({
    jobId: first.jobId,
    action: "retry",
    confirmation: `RETRY ${first.jobId}`,
    root: workspace,
    now: new Date("2026-07-16T20:05:00.000Z")
  });
  assert.equal(prepared.command, "Create a vendor scheduling hub");
  assert.equal(prepared.projectId, "project-quote-builder");

  const refresh = spawnSync(process.execPath, ["scripts/build-dashboard.mjs"], { cwd: workspace, encoding: "utf8" });
  assert.equal(refresh.status, 0, refresh.stderr || refresh.stdout);

  const second = await submitOwnerCommand({
    command: prepared.command,
    projectId: prepared.projectId,
    recovery: prepared.recovery,
    root: workspace,
    now: new Date("2026-07-16T20:06:00.000Z")
  });
  const recovered = JSON.parse(readFileSync(path.join(workspace, `.codex/jobs/${second.jobId}.json`), "utf8"));
  assert.deepEqual(recovered.recovery, prepared.recovery);
  assert.equal(recovered.recovery.sourceJobId, first.jobId);
});

test("job recovery fails closed on weak confirmation or a completed job", async () => {
  const workspace = tempWorkspace();
  const first = await submitOwnerCommand({
    command: "Plan an internal review",
    projectId: "project-quote-builder",
    root: workspace,
    now: new Date("2026-07-16T21:00:00.000Z")
  });
  assert.throws(() => prepareJobRecovery({
    jobId: first.jobId,
    action: "retry",
    confirmation: "yes",
    root: workspace
  }), /exact confirmation/);

  const jobPath = path.join(workspace, `.codex/jobs/${first.jobId}.json`);
  const job = JSON.parse(readFileSync(jobPath, "utf8"));
  writeFileSync(jobPath, `${JSON.stringify({ ...job, status: "done" }, null, 2)}\n`);
  assert.throws(() => prepareJobRecovery({
    jobId: first.jobId,
    action: "replan",
    confirmation: `REPLAN ${first.jobId}`,
    root: workspace
  }), /cannot be recovered/);
});
