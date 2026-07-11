import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { computeOperationalMetrics } from "../scripts/lib/runtime/metrics-processor.mjs";

function writeJson(root, relativePath, value) {
  const filePath = path.join(root, relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

test("computes cost, quality, rework, and lesson reuse only from source records", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "ag-os-metrics-"));
  try {
    writeJson(root, ".codex/costs/cost-ledger-one.json", { summary: { estimatedTaskCostUsd: 2, actualTaskCostUsd: 1 } });
    writeJson(root, ".codex/quality-scores/quality-score-one.json", { overallScore: 8, meetsBar: true, reviewStatus: "pass", updatedAt: "2026-07-01T00:00:00Z" });
    writeJson(root, ".codex/quality-scores/quality-score-two.json", { overallScore: 9, meetsBar: true, reviewStatus: "pass", updatedAt: "2026-07-02T00:00:00Z" });
    writeJson(root, ".codex/critiques/critique-one.json", { requiredFixes: ["Fix one"] });
    writeJson(root, ".codex/jobs/job-one.json", { status: "failed" });
    writeJson(root, ".codex/plans/plan-one.json", {
      basis: {
        productArchetype: "archetype-website",
        appliedLessons: ["lesson-one"],
        relevantMemory: { exampleScorePaths: [".codex/quality-scores/quality-score-one.json"] }
      }
    });
    writeJson(root, ".codex/memory/accepted/lesson-one.json", { lessonId: "lesson-one", status: "accepted" });
    writeJson(root, ".codex/skills/skill-one.json", { evidence: { timesApplied: 3 } });

    const metrics = computeOperationalMetrics({ root });
    assert.deepEqual(metrics.cost, {
      ledgerCount: 1,
      estimatedUsd: 2,
      actualUsd: 1,
      varianceUsd: -1,
      variancePercent: -50
    });
    assert.equal(metrics.quality.averageScore, 8.5);
    assert.equal(metrics.quality.passCount, 2);
    assert.equal(metrics.rework.critiquesRequiringFixes, 1);
    assert.equal(metrics.rework.failedJobCount, 1);
    assert.equal(metrics.lessonReuse.lessonReuseRatePercent, 100);
    assert.equal(metrics.lessonReuse.exampleReuseRatePercent, 100);
    assert.equal(metrics.lessonReuse.skillApplicationsRecorded, 3);
    assert.equal(metrics.generatedFromLiveSystems, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
