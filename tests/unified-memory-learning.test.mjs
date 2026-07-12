import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  detectLessonConflicts,
  promoteLessonCandidate,
  rejectLessonCandidate
} from "../scripts/process-lesson-promotion.mjs";
import {
  buildAcceptedLessonRuntimeBriefing,
  loadAcceptedLessons,
  retrieveRelevantMemory
} from "../scripts/load-accepted-lessons.mjs";

function withTempDir(assertion) {
  const root = mkdtempSync(path.join(os.tmpdir(), "ag-os-unified-memory-"));
  try {
    return assertion(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function writeJson(root, relativePath, value) {
  const filePath = path.join(root, relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return filePath;
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function baseLesson(overrides = {}) {
  return {
    "$schema": "../../../../schemas/lesson.schema.json",
    lessonId: "lesson-20260706-safe-static-review",
    title: "Review static staging output before production",
    lesson: "Review static staging output and recorded safety gates before any production-adjacent action.",
    sources: [".codex/quality-scores/quality-score-safe-static-review.json"],
    scope: "agent_shared",
    confidence: "high",
    status: "candidate",
    owner: "owner-gurnoor-bassi",
    appliesTo: ["planner", "critic", "builder"],
    sourceScoreId: "quality-score-safe-static-review",
    generatedBy: "scripts/process-quality-score.mjs",
    whyThisMatters: "It keeps builder output tied to quality evidence.",
    whenToUse: "Use before promoting reviewed target PR patterns into future planning.",
    whenNotToUse: "Do not use as approval for deployment, credentials, social posting, scheduling, analytics, n8n activation, or domain changes.",
    createdAt: "2026-07-06T18:00:00Z",
    updatedAt: "2026-07-06T18:00:00Z",
    ...overrides
  };
}

test("accepted lesson loader excludes candidates and rejected lessons from runtime truth", () => withTempDir((root) => {
  writeJson(root, ".codex/memory/lessons/lesson-accepted.json", baseLesson({
    lessonId: "lesson-accepted",
    status: "accepted",
    scope: "company",
    promotion: {
      approvedBy: "owner-gurnoor-bassi",
      approvedAt: "2026-07-06T19:00:00Z",
      evidence: [".codex/audit/audit-lesson-promotion.json"]
    }
  }));
  writeJson(root, ".codex/memory/lessons/candidates/lesson-candidate.json", baseLesson({
    lessonId: "lesson-candidate",
    status: "candidate"
  }));
  writeJson(root, ".codex/memory/rejected/lesson-rejected.json", baseLesson({
    lessonId: "lesson-rejected",
    status: "rejected"
  }));

  const result = loadAcceptedLessons({ root });

  assert.deepEqual(result.lessons.map((lesson) => lesson.lessonId), ["lesson-accepted"]);
  assert.equal(result.candidatesLoadedAsTruth, false);
  assert.equal(result.rejectedLoadedAsTruth, false);
  assert.equal(result.lessons[0].runtimeUse.allowedForPlanning, true);
  assert.equal(result.lessons[0].runtimeUse.grantsPermission, false);
}));

test("lesson promotion requires owner approval and preserves candidate source evidence", () => withTempDir((root) => {
  const candidatePath = writeJson(root, ".codex/memory/lessons/candidates/lesson-safe-candidate.json", baseLesson({
    lessonId: "lesson-safe-candidate",
    scope: "client",
    appliesTo: ["project-social-media-management-system-v1", "worker:fable"]
  }));

  assert.throws(
    () => promoteLessonCandidate({ candidatePath, root }),
    /owner approval is required/
  );

  const result = promoteLessonCandidate({
    candidatePath,
    root,
    approvalId: "approval-20260706-promote-safe-candidate",
    approvedBy: "owner-gurnoor-bassi",
    evidence: [".codex/audit/audit-lesson-promotion-owner-approved.json"],
    now: new Date("2026-07-06T19:30:00Z")
  });

  assert.equal(result.record.status, "accepted");
  assert.equal(result.record.scope, "client");
  assert.equal(result.record.promotion.approvalId, "approval-20260706-promote-safe-candidate");
  assert.equal(result.record.promotion.approvedBy, "owner-gurnoor-bassi");
  assert.equal(result.record.promotion.sourceCandidatePath, ".codex/memory/lessons/candidates/lesson-safe-candidate.json");
  assert.equal(result.record.runtimeUse.grantsPermission, false);
  assert.equal(result.filePath, ".codex/memory/accepted/lesson-safe-candidate.json");
}));

test("conflicting accepted lessons block promotion and produce conflict evidence", () => withTempDir((root) => {
  writeJson(root, ".codex/memory/accepted/lesson-static-output-review.json", baseLesson({
    lessonId: "lesson-static-output-review",
    title: "Review static staging output before production",
    lesson: "Use static staging review evidence before any production-adjacent action.",
    status: "accepted",
    scope: "company",
    promotion: {
      approvedBy: "owner-gurnoor-bassi",
      approvedAt: "2026-07-06T19:00:00Z",
      evidence: [".codex/audit/audit-existing-promotion.json"]
    }
  }));
  const candidatePath = writeJson(root, ".codex/memory/lessons/candidates/lesson-conflicting-review.json", baseLesson({
    lessonId: "lesson-conflicting-review",
    title: "Review static staging output before production",
    lesson: "Skip staging review when the worker says the build looks good.",
    scope: "company"
  }));

  const conflicts = detectLessonConflicts({
    candidatePath,
    root,
    now: new Date("2026-07-06T19:40:00Z")
  });

  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].candidateLessonId, "lesson-conflicting-review");
  assert.equal(conflicts[0].existingLessonId, "lesson-static-output-review");

  assert.throws(
    () => promoteLessonCandidate({
      candidatePath,
      root,
      approvalId: "approval-20260706-promote-conflicting-review",
      approvedBy: "owner-gurnoor-bassi",
      evidence: [".codex/audit/audit-lesson-promotion-owner-approved.json"]
    }),
    /conflicting accepted lesson/
  );
}));

test("lesson rejection keeps the record out of accepted runtime memory", () => withTempDir((root) => {
  const candidatePath = writeJson(root, ".codex/memory/lessons/candidates/lesson-reject-me.json", baseLesson({
    lessonId: "lesson-reject-me"
  }));

  const rejection = rejectLessonCandidate({
    candidatePath,
    root,
    rejectedBy: "owner-gurnoor-bassi",
    reason: "Too narrow for accepted memory.",
    now: new Date("2026-07-06T20:00:00Z")
  });
  const accepted = loadAcceptedLessons({ root });

  assert.equal(rejection.record.status, "rejected");
  assert.equal(rejection.filePath, ".codex/memory/rejected/lesson-reject-me.json");
  assert.deepEqual(accepted.lessons, []);
  assert.equal(accepted.rejectedLoadedAsTruth, false);
}));

test("accepted lesson runtime briefing is safe for planner critic builder and never grants live permissions", () => withTempDir((root) => {
  writeJson(root, ".codex/memory/accepted/lesson-company-rule.json", baseLesson({
    lessonId: "lesson-company-rule",
    status: "accepted",
    scope: "company",
    promotion: {
      approvedBy: "owner-gurnoor-bassi",
      approvedAt: "2026-07-06T19:00:00Z",
      evidence: [".codex/audit/audit-lesson-promotion.json"]
    }
  }));

  const briefing = buildAcceptedLessonRuntimeBriefing({ root, workerType: "planner" });

  assert.equal(briefing.workerType, "planner");
  assert.equal(briefing.acceptedLessonCount, 1);
  assert.equal(briefing.candidatesLoadedAsTruth, false);
  assert.equal(briefing.memoryGrantsPermission, false);
  assert.equal(briefing.lessons[0].runtimeUse.allowedForPlanning, true);
  assert.equal(briefing.lessons[0].runtimeUse.allowedForCritic, true);
  assert.equal(briefing.lessons[0].runtimeUse.allowedForBuilder, true);
}));

test("relevance retrieval selects accepted lessons and high-quality examples from similar projects", () => withTempDir((root) => {
  writeJson(root, ".codex/memory/accepted/lesson-social-staging.json", baseLesson({
    lessonId: "lesson-social-staging",
    status: "accepted",
    scope: "project",
    projectId: "project-social-media-management-system-v1",
    appliesTo: ["archetype-social-media-content-operations-system", "social_media_system", "planner"],
    promotion: {
      approvalId: "approval-20260709-promote-social-staging",
      approvedBy: "owner-gurnoor-bassi",
      approvedAt: "2026-07-09T19:00:00Z",
      evidence: [".codex/audit/audit-social-staging-promotion.json"],
      sourceCandidatePath: ".codex/memory/lessons/candidates/lesson-social-staging.json"
    }
  }));
  writeJson(root, ".codex/memory/accepted/lesson-unrelated-crm.json", baseLesson({
    lessonId: "lesson-unrelated-crm",
    status: "accepted",
    scope: "project",
    projectId: "project-crm",
    appliesTo: ["archetype-crm"],
    promotion: {
      approvalId: "approval-20260709-promote-crm",
      approvedBy: "owner-gurnoor-bassi",
      approvedAt: "2026-07-09T19:00:00Z",
      evidence: [".codex/audit/audit-crm-promotion.json"],
      sourceCandidatePath: ".codex/memory/lessons/candidates/lesson-unrelated-crm.json"
    }
  }));
  writeJson(root, ".codex/memory/lessons/candidates/lesson-social-candidate.json", baseLesson({
    lessonId: "lesson-social-candidate",
    appliesTo: ["archetype-social-media-content-operations-system"]
  }));
  writeJson(root, ".codex/quality-scores/quality-score-social-example.json", {
    scoreId: "quality-score-social-example",
    status: "candidate",
    projectId: "project-social-media-management-system-v1",
    archetypeId: "archetype-social-media-content-operations-system",
    outputType: "social_media_system",
    sourcePlanPath: ".codex/plans/plan-social-example.json",
    overallScore: 9.2,
    meetsBar: true,
    reviewStatus: "pass",
    updatedAt: "2026-07-09T18:00:00Z"
  });
  writeJson(root, ".codex/quality-scores/quality-score-crm-example.json", {
    scoreId: "quality-score-crm-example",
    status: "candidate",
    projectId: "project-crm",
    archetypeId: "archetype-crm",
    outputType: "crm",
    sourcePlanPath: ".codex/plans/plan-crm-example.json",
    overallScore: 9.5,
    meetsBar: true,
    reviewStatus: "pass",
    updatedAt: "2026-07-09T18:00:00Z"
  });

  const result = retrieveRelevantMemory({
    root,
    projectId: "project-social-media-management-system-v1",
    archetypeId: "archetype-social-media-content-operations-system",
    outputType: "social_media_system",
    workerType: "planner"
  });

  assert.deepEqual(result.lessons.map((lesson) => lesson.lessonId), ["lesson-social-staging"]);
  assert.deepEqual(result.examples.map((example) => example.scoreId), ["quality-score-social-example"]);
  assert.equal(result.candidatesLoadedAsTruth, false);
  assert.equal(result.examplesGrantPermission, false);
  assert.equal(result.memoryGrantsPermission, false);

  const briefing = buildAcceptedLessonRuntimeBriefing({
    root,
    workerType: "planner",
    projectId: "project-social-media-management-system-v1",
    archetypeId: "archetype-social-media-content-operations-system",
    outputType: "social_media_system"
  });
  assert.equal(briefing.retrievalStrategy, "project_archetype_output_similarity_v1");
  assert.deepEqual(briefing.lessons.map((lesson) => lesson.lessonId), ["lesson-social-staging"]);
  assert.deepEqual(briefing.relevantExamples.map((example) => example.scoreId), ["quality-score-social-example"]);
}));
