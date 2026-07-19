import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { recordJobOutcome } from "../scripts/lib/runtime/outcome-feedback-service.mjs";
import { loadWorkerEvidence } from "../scripts/lib/runtime/worker-evidence-loader.mjs";

function writeJson(root, relative, value) { const target = path.join(root, relative); mkdirSync(path.dirname(target), { recursive: true }); writeFileSync(target, JSON.stringify(value)); }

test("owner outcome is exact-confirmed, single-use, and retrieved only for the matching project", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "ag-os-outcome-"));
  const jobId = "job-runtime-test";
  writeJson(root, `.codex/jobs/${jobId}.json`, { jobId, projectId: "project-a", status: "done", completionEvidence: { qualityScorePath: ".codex/quality-scores/quality-score-test.json", deliverable: { ownerUsable: true, files: [".codex/workspaces/project-a/file.html"] } } });
  assert.throws(() => recordJobOutcome({ jobId, rating: 5, reason: "Strong result", confirmation: "RATE WRONG 5", root }), /confirmation/);
  const result = recordJobOutcome({ jobId, rating: 5, reason: "Strong result", confirmation: `RATE ${jobId} 5`, root, now: new Date("2026-07-19T00:00:00.000Z") });
  assert.equal(result.record.learningUse.grantsPermission, false);
  const matching = loadWorkerEvidence({ plan: { projectId: "project-a", basis: { relevantMemory: {} } }, root });
  const other = loadWorkerEvidence({ plan: { projectId: "project-b", basis: { relevantMemory: {} } }, root });
  assert.equal(matching.outcomes.length, 1);
  assert.equal(other.outcomes.length, 0);
  assert.throws(() => recordJobOutcome({ jobId, rating: 5, reason: "Again", confirmation: `RATE ${jobId} 5`, root }), /already recorded/);
});
