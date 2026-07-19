import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { buildAuditEventRecord, writeAuditEventRecord } from "./audit-writer.mjs";
import { DEFAULT_OWNER_ID, isoTimestamp, listDirectJson, readJson, slugify, writeJson } from "./common.mjs";

export function recordJobOutcome({ jobId, rating, reason, confirmation, root = process.cwd(), now = new Date() }) {
  if (!/^job-[a-z0-9-]+$/.test(jobId || "")) throw new Error("a valid jobId is required");
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error("rating must be an integer from 1 to 5");
  if (confirmation !== `RATE ${jobId} ${rating}`) throw new Error(`confirmation must equal RATE ${jobId} ${rating}`);
  if (typeof reason !== "string" || reason.trim().length < 3 || reason.length > 1000) throw new Error("outcome reason must be between 3 and 1000 characters");
  const jobPath = `.codex/jobs/${jobId}.json`;
  const job = readJson(jobPath, root);
  if (job.status !== "done" || job.completionEvidence?.deliverable?.ownerUsable !== true) throw new Error("only an owner-usable completed job can receive outcome feedback");
  const outcomeId = `outcome-${slugify(jobId)}`;
  const recordPath = `.codex/outcomes/${outcomeId}.json`;
  if (existsSync(path.join(root, recordPath))) throw new Error(`outcome already recorded for ${jobId}`);
  const timestamp = isoTimestamp(now);
  const record = {
    "$schema": "../../schemas/outcome.schema.json",
    outcomeId,
    jobId,
    projectId: job.projectId,
    rating,
    reason: reason.trim(),
    acceptedBy: DEFAULT_OWNER_ID,
    evidence: [jobPath, job.completionEvidence.qualityScorePath, ...(job.completionEvidence.deliverable.files || [])],
    learningUse: { eligible: true, grantsPermission: false },
    createdAt: timestamp,
    updatedAt: timestamp
  };
  writeJson(recordPath, record, root);
  const audit = buildAuditEventRecord({ runId: `outcome-${jobId}-${timestamp}`, eventType: "validation_run", summary: `Owner recorded a ${rating}/5 outcome for ${jobId}.`, scope: jobId, source: "owner_instruction", relatedArtifacts: [{ type: "other", reference: recordPath }, { type: "other", reference: jobPath }], riskLevel: "R1", liveServiceTouched: false, notes: "Outcome feedback is learning evidence only and grants no permission.", now });
  const auditResult = writeAuditEventRecord({ auditEvent: audit, root });
  return { record, recordPath, auditPath: auditResult.filePath };
}

export function listOutcomes({ root = process.cwd(), projectId } = {}) {
  return listDirectJson(".codex/outcomes", { root }).map((recordPath) => ({ ...readJson(recordPath, root), recordPath })).filter((record) => !projectId || record.projectId === projectId).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}
