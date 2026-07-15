import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  decideLessons,
  getOperatingSystems,
  getProjectWorkspace,
  listLessonDecisions
} from "../scripts/lib/runtime/control-center-service.mjs";

function writeJson(root, relativePath, record) {
  const target = path.join(root, relativePath);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(record, null, 2)}\n`, "utf8");
}

function fixtureRoot() {
  const root = mkdtempSync(path.join(os.tmpdir(), "ag-os-control-center-"));
  mkdirSync(path.join(root, "scripts"), { recursive: true });
  writeFileSync(path.join(root, "scripts/build-dashboard.mjs"), "process.exit(0);\n", "utf8");
  return root;
}

function candidate(overrides = {}) {
  const now = "2026-07-15T12:00:00.000Z";
  return {
    lessonId: "lesson-runtime-owner-review-01",
    title: "Retain verified project evidence",
    lesson: "Use verified project evidence when planning similar work.",
    sources: [".codex/jobs/job-runtime-proof.json"],
    scope: "agent_shared",
    confidence: "high",
    status: "candidate",
    owner: "owner-gurnoor-bassi",
    projectId: "project-control-center",
    appliesTo: ["project-workspace"],
    sourceScoreId: "quality-score-runtime-proof",
    whyThisMatters: "It keeps future plans grounded in completed work.",
    whenToUse: "Use for a similar project.",
    whenNotToUse: "Do not use it to grant permission.",
    notes: "Candidate only.",
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

test("project workspace exposes real progress and approval sensitivity", () => {
  const root = fixtureRoot();
  try {
    writeJson(root, ".codex/projects/registry.json", {
      projects: [{ projectId: "project-control-center", recordPath: ".codex/projects/control-center.json", riskLevel: "high" }]
    });
    writeJson(root, ".codex/projects/control-center.json", {
      id: "project-control-center", name: "Control Center", status: "active", projectType: "ag_os_core",
      managementMode: "managed_staging", trustLevel: 1, goal: "Operate the owner control center.",
      scope: ["Run bounded jobs"], outOfScope: ["No unapproved deployment"], stack: ["Node.js"],
      risks: [], qualityGates: ["Tests pass"], approvalRequiredFor: ["deployment"]
    });
    writeJson(root, ".codex/jobs/job-runtime-proof.json", {
      jobId: "job-runtime-proof", projectId: "project-control-center", status: "done", assignedAgent: "agent-runtime",
      queueTimestamps: { completedAt: "2026-07-15T12:00:00.000Z" }, updatedAt: "2026-07-15T12:00:00.000Z",
      completionEvidence: { qualityScorePath: ".codex/quality-scores/quality-score-runtime-proof.json", lessonCandidatePaths: ["lesson.json"] }
    });
    const result = getProjectWorkspace({ projectId: "project-control-center", root });
    assert.equal(result.project.sensitivity.label, "Protected");
    assert.equal(result.progress.completedJobCount, 1);
    assert.equal(result.progress.qualityCoverage, 100);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("lesson queue excludes decided candidates and classifies recommendations", () => {
  const root = fixtureRoot();
  try {
    writeJson(root, ".codex/memory/lessons/candidates/lesson-runtime-owner-review-01.json", candidate());
    writeJson(root, ".codex/memory/lessons/candidates/lesson-runtime-owner-review-02.json", candidate({
      lessonId: "lesson-runtime-owner-review-02",
      title: "Require owner attention",
      confidence: "medium"
    }));
    const before = listLessonDecisions({ root });
    assert.equal(before.activeCandidateCount, 2);
    assert.equal(before.recommendedCount, 1);

    const decision = decideLessons({
      lessonIds: ["lesson-runtime-owner-review-01"],
      decision: "promote",
      root,
      now: new Date("2026-07-15T12:30:00.000Z")
    });
    assert.equal(decision.permissionGranted, false);
    assert.equal(decision.externalActionExecuted, false);
    assert.ok(existsSync(path.join(root, ".codex/memory/accepted/lesson-runtime-owner-review-01.json")));
    assert.equal(decision.queue.activeCandidateCount, 1);
    const accepted = JSON.parse(readFileSync(path.join(root, ".codex/memory/accepted/lesson-runtime-owner-review-01.json"), "utf8"));
    assert.equal(accepted.runtimeUse.grantsPermission, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("operating system status is evidence-derived and watchdog stays honest", () => {
  const root = fixtureRoot();
  try {
    writeJson(root, ".codex/security/policy.json", { status: "foundation" });
    const systems = getOperatingSystems({ root });
    assert.equal(systems.find((item) => item.id === "watchdog-os").status, "setup_needed");
    assert.equal(systems.find((item) => item.id === "security-os").status, "protected");
    assert.notEqual(systems.find((item) => item.id === "security-os").status, "foundation");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
