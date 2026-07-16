import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { buildAuditEventRecord, writeAuditEventRecord } from "./audit-writer.mjs";
import { DEFAULT_OWNER_ID, isoTimestamp, slugify, writeJson } from "./common.mjs";

const APPROVAL_PATTERN = /^approval-[0-9]{8}-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LEGACY_AUDIT_PATTERN = /^audit-runtime-lesson-promote-/;

export function lessonPromotionApprovalId(lessonId, now = new Date()) {
  const approvalDate = isoTimestamp(now).slice(0, 10).replaceAll("-", "");
  return `approval-${approvalDate}-lesson-promotion-${slugify(lessonId)}`;
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function repairableRecords(root) {
  const acceptedDir = path.join(root, ".codex/memory/accepted");
  if (!existsSync(acceptedDir)) return [];
  return readdirSync(acceptedDir)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => {
      const relativePath = `.codex/memory/accepted/${name}`;
      const record = readJson(path.join(root, relativePath));
      const legacyId = record.promotion?.approvalId;
      if (!LEGACY_AUDIT_PATTERN.test(legacyId ?? "")) return null;
      const auditPath = `.codex/audit/${legacyId}.json`;
      if (!record.promotion.evidence?.includes(auditPath) || !existsSync(path.join(root, auditPath))) {
        throw new Error(`accepted lesson ${record.lessonId} is missing its promotion audit evidence`);
      }
      const audit = readJson(path.join(root, auditPath));
      if (audit.id !== legacyId || audit.eventType !== "approval_granted") {
        throw new Error(`accepted lesson ${record.lessonId} has invalid promotion audit evidence`);
      }
      const approvedAt = new Date(record.promotion.approvedAt);
      if (!Number.isFinite(approvedAt.getTime())) throw new Error(`accepted lesson ${record.lessonId} has an invalid approvedAt`);
      return {
        relativePath,
        record,
        legacyId,
        approvalId: lessonPromotionApprovalId(record.lessonId, approvedAt)
      };
    })
    .filter(Boolean);
}

export function repairLessonPromotionApprovalIds({
  root = process.cwd(),
  apply = false,
  remediationApprovalId,
  now = new Date()
} = {}) {
  const repairs = repairableRecords(root);
  if (!apply) return { status: "dry_run", repairCount: repairs.length, repairs: repairs.map(({ record, legacyId, approvalId }) => ({ lessonId: record.lessonId, legacyId, approvalId })) };
  if (!APPROVAL_PATTERN.test(remediationApprovalId ?? "")) throw new Error("a valid remediation approval ID is required");

  const originals = repairs.map(({ relativePath, record }) => ({ relativePath, record }));
  const written = [];
  try {
    for (const repair of repairs) {
      writeJson(repair.relativePath, {
        ...repair.record,
        promotion: { ...repair.record.promotion, approvalId: repair.approvalId },
        updatedAt: isoTimestamp(now)
      }, root);
      written.push(repair.relativePath);
    }
    const audit = buildAuditEventRecord({
      runId: `lesson-promotion-integrity-${isoTimestamp(now)}`,
      actor: DEFAULT_OWNER_ID,
      eventType: "validation_run",
      summary: `Repaired ${repairs.length} accepted lesson promotion approval references after owner-approved integrity remediation.`,
      scope: ".codex/memory/accepted",
      source: "owner_instruction",
      relatedArtifacts: [
        { type: "approval", reference: remediationApprovalId },
        { type: "other", reference: ".codex/memory/accepted" }
      ],
      riskLevel: "R4",
      liveServiceTouched: true,
      notes: "Only legacy audit-event IDs stored in promotion.approvalId were replaced. Original promotion timestamps, owner, candidate paths, and audit evidence were preserved.",
      now
    });
    const auditResult = writeAuditEventRecord({ auditEvent: audit, root });
    written.push(auditResult.filePath);
    return { status: "applied", repairCount: repairs.length, recordsUpdated: written, auditPath: auditResult.filePath };
  } catch (error) {
    originals.forEach(({ relativePath, record }) => writeJson(relativePath, record, root));
    throw error;
  }
}
