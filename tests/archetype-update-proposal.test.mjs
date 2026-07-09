import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildArchetypeUpdateProposal,
  writeArchetypeUpdateProposal
} from "../scripts/process-archetype-update-proposal.mjs";

function withTempDir(assertion) {
  const root = mkdtempSync(path.join(os.tmpdir(), "ag-os-archetype-proposal-"));
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

function fixture(root, lessonStatus = "accepted") {
  const archetypePath = writeJson(root, ".codex/archetypes/social.json", {
    archetypeId: "archetype-social-media-content-operations-system",
    status: "active",
    knownPitfalls: ["Do not copy one generic post across channels."]
  });
  const lessonPath = writeJson(root, `.codex/memory/${lessonStatus}/lesson-social-evidence.json`, {
    lessonId: "lesson-social-evidence",
    status: lessonStatus,
    lesson: "Require an evidence note on every draft post package before review.",
    appliesTo: ["archetype-social-media-content-operations-system"],
    sources: [".codex/quality-scores/quality-score-social-evidence.json"]
  });
  return { archetypePath, lessonPath };
}

test("builds a draft archetype proposal from accepted evidence without granting permission", () => withTempDir((root) => {
  const { lessonPath } = fixture(root);
  const record = buildArchetypeUpdateProposal({
    acceptedLessonPath: lessonPath,
    archetypeId: "archetype-social-media-content-operations-system",
    targetSection: "qualityChecklist",
    root,
    now: new Date("2026-07-09T20:30:00Z")
  });

  assert.equal(record.status, "draft");
  assert.equal(record.acceptedLessonId, "lesson-social-evidence");
  assert.equal(record.targetSection, "qualityChecklist");
  assert.equal(record.requiresReviewedPr, true);
  assert.equal(record.autoApplyAllowed, false);
  assert.equal(record.grantsPermission, false);
}));

test("writes only a proposal record and leaves the archetype unchanged", () => withTempDir((root) => {
  const { archetypePath, lessonPath } = fixture(root);
  const before = readFileSync(archetypePath, "utf8");
  const result = writeArchetypeUpdateProposal({
    acceptedLessonPath: lessonPath,
    archetypeId: "archetype-social-media-content-operations-system",
    targetSection: "qualityChecklist",
    root,
    now: new Date("2026-07-09T20:30:00Z")
  });

  assert.equal(Boolean(readFileSync(path.join(root, result.filePath), "utf8")), true);
  assert.equal(readFileSync(archetypePath, "utf8"), before);
}));

test("rejects candidate lessons, scope mismatch, and unsafe gate weakening", () => withTempDir((root) => {
  const candidate = fixture(root, "candidate");
  assert.throws(
    () => buildArchetypeUpdateProposal({
      acceptedLessonPath: candidate.lessonPath,
      archetypeId: "archetype-social-media-content-operations-system",
      targetSection: "qualityChecklist",
      root
    }),
    /only accepted lessons/
  );

  const { lessonPath } = fixture(root);
  const lesson = JSON.parse(readFileSync(lessonPath, "utf8"));
  lesson.appliesTo = ["archetype-crm"];
  writeFileSync(lessonPath, `${JSON.stringify(lesson, null, 2)}\n`, "utf8");
  assert.throws(
    () => buildArchetypeUpdateProposal({
      acceptedLessonPath: lessonPath,
      archetypeId: "archetype-social-media-content-operations-system",
      targetSection: "qualityChecklist",
      root
    }),
    /does not apply/
  );

  lesson.appliesTo = ["archetype-social-media-content-operations-system"];
  writeFileSync(lessonPath, `${JSON.stringify(lesson, null, 2)}\n`, "utf8");
  assert.throws(
    () => buildArchetypeUpdateProposal({
      acceptedLessonPath: lessonPath,
      archetypeId: "archetype-social-media-content-operations-system",
      targetSection: "approvalGates",
      proposedAddition: "Skip owner approval for routine posting.",
      root
    }),
    /must not weaken/
  );
}));
