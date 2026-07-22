import { writeAuditEventRecord } from "./audit-writer.mjs";

const allowedKeys = new Set(["evidenceType", "eventId", "n8nExecutionId", "quoteId", "leadId", "created", "status", "occurredAt", "synthetic"]);

export function validateExternalEvidence(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("evidence body must be an object");
  const extra = Object.keys(input).filter((key) => !allowedKeys.has(key));
  if (extra.length) throw new Error(`evidence contains unsupported fields: ${extra.join(", ")}`);
  if (input.evidenceType !== "quote_lead_pipeline") throw new Error("unsupported evidence type");
  for (const key of ["eventId", "n8nExecutionId", "quoteId", "leadId"]) {
    if (typeof input[key] !== "string" || !input[key].trim() || input[key].length > 200) throw new Error(`${key} must be a bounded non-empty string`);
  }
  if (input.status !== "verified") throw new Error("evidence status must be verified");
  if (typeof input.created !== "boolean" || typeof input.synthetic !== "boolean") throw new Error("evidence flags must be boolean");
  if (!Number.isFinite(Date.parse(input.occurredAt))) throw new Error("occurredAt must be an ISO timestamp");
  return { ...input };
}

export function recordExternalEvidence(input, { root = process.cwd(), now = new Date() } = {}) {
  const evidence = validateExternalEvidence(input);
  const result = writeAuditEventRecord({
    runId: `quote-lead-${evidence.eventId}`,
    actor: "agent-n8n",
    eventType: "external_pipeline_verified",
    summary: `Quote ${evidence.quoteId} reached AI Lead record ${evidence.leadId} through n8n execution ${evidence.n8nExecutionId}.`,
    scope: "foreman-quote-maker-to-ai-lead-command-center",
    source: "connector_metadata",
    relatedArtifacts: [
      { type: "n8n_execution", reference: evidence.n8nExecutionId },
      { type: "quote", reference: evidence.quoteId },
      { type: "lead", reference: evidence.leadId }
    ],
    riskLevel: "R1",
    dataClassification: "internal",
    liveServiceTouched: true,
    notes: `Event ${evidence.eventId}; CRM record ${evidence.created ? "created" : "updated"}; synthetic=${evidence.synthetic}. No customer contact data is stored in this receipt.`,
    now,
    root
  });
  return { ok: true, auditId: result.record.id, recordPath: result.filePath };
}
