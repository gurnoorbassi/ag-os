import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  lessonPromotionApprovalId,
  repairLessonPromotionApprovalIds
} from "../scripts/lib/runtime/lesson-promotion-approval.mjs";

function writeJson(root, relativePath, value) {
  const target = path.join(root, relativePath);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

test("owner lesson decisions use a schema-valid approval identity", () => {
  assert.equal(
    lessonPromotionApprovalId("lesson-runtime-proof-01", new Date("2026-07-16T08:00:00.000Z")),
    "approval-20260716-lesson-promotion-lesson-runtime-proof-01"
  );
});

test("legacy promotion audit IDs are repaired only with their original audit evidence", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "ag-os-lesson-integrity-"));
  const legacyId = "audit-runtime-lesson-promote-lesson-runtime-proof-01-2026-07-16t08-00-00-000z";
  const lessonPath = ".codex/memory/accepted/lesson-runtime-proof-01.json";
  const auditPath = `.codex/audit/${legacyId}.json`;
  try {
    writeJson(root, lessonPath, {
      lessonId: "lesson-runtime-proof-01",
      status: "accepted",
      promotion: {
        approvalId: legacyId,
        approvedBy: "owner-gurnoor-bassi",
        approvedAt: "2026-07-16T08:00:00.000Z",
        evidence: [".codex/memory/lessons/candidates/lesson-runtime-proof-01.json", auditPath],
        sourceCandidatePath: ".codex/memory/lessons/candidates/lesson-runtime-proof-01.json"
      },
      updatedAt: "2026-07-16T08:00:00.000Z"
    });
    writeJson(root, auditPath, { id: legacyId, eventType: "approval_granted" });

    const dryRun = repairLessonPromotionApprovalIds({ root });
    assert.equal(dryRun.repairCount, 1);
    assert.equal(JSON.parse(readFileSync(path.join(root, lessonPath), "utf8")).promotion.approvalId, legacyId);

    const applied = repairLessonPromotionApprovalIds({
      root,
      apply: true,
      remediationApprovalId: "approval-20260716-lesson-promotion-integrity",
      now: new Date("2026-07-16T09:00:00.000Z")
    });
    assert.equal(applied.repairCount, 1);
    assert.equal(
      JSON.parse(readFileSync(path.join(root, lessonPath), "utf8")).promotion.approvalId,
      "approval-20260716-lesson-promotion-lesson-runtime-proof-01"
    );
    assert.equal(existsSync(path.join(root, applied.auditPath)), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
