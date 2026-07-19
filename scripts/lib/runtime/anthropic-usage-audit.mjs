import path from "node:path";
import process from "node:process";
import { writeAuditEventRecord } from "./audit-writer.mjs";

const KIND_DETAILS = {
  planner: { action: "plan generation", scope: "anthropic_plan_generation" },
  worker: { action: "work-product generation", scope: "anthropic_work_product_generation" },
  critic: { action: "deliverable critique", scope: "anthropic_deliverable_critique" }
};

function calculateCost({ usage, inputCostPerMillionUsd, outputCostPerMillionUsd, reservation }) {
  const inputPrice = Number(inputCostPerMillionUsd);
  const outputPrice = Number(outputCostPerMillionUsd);
  const hasUsage = usage && [usage.input_tokens, usage.output_tokens, usage.cache_creation_input_tokens, usage.cache_read_input_tokens]
    .some((value) => Number.isFinite(Number(value)));
  if (!hasUsage || !Number.isFinite(inputPrice) || !Number.isFinite(outputPrice)) {
    return { costUsd: Number(reservation?.estimatedCostUsd || 0), billingReconciled: false };
  }
  const inputTokens = Number(usage.input_tokens || 0) + Number(usage.cache_creation_input_tokens || 0) + Number(usage.cache_read_input_tokens || 0);
  const outputTokens = Number(usage.output_tokens || 0);
  return {
    costUsd: Number(((inputTokens * inputPrice + outputTokens * outputPrice) / 1_000_000).toFixed(6)),
    billingReconciled: true
  };
}

export function writeAnthropicApprovalUse({
  kind,
  job,
  approvalId,
  model,
  usage,
  inputCostPerMillionUsd,
  outputCostPerMillionUsd,
  reservation,
  outcome = "completed",
  root = process.cwd(),
  now = new Date(),
  relatedArtifacts = []
}) {
  const details = KIND_DETAILS[kind];
  if (!details) throw new Error(`unsupported Anthropic usage kind: ${kind}`);
  if (!job?.jobId || !approvalId) throw new Error("Anthropic usage audit requires jobId and approvalId");
  const { costUsd, billingReconciled } = calculateCost({ usage, inputCostPerMillionUsd, outputCostPerMillionUsd, reservation });
  const reservationId = reservation?.recordPath ? path.basename(reservation.recordPath, ".json") : `${job.jobId}-${kind}`;
  const inputTokens = Number.isFinite(Number(usage?.input_tokens)) ? Number(usage.input_tokens) : "unknown";
  const outputTokens = Number.isFinite(Number(usage?.output_tokens)) ? Number(usage.output_tokens) : "unknown";
  const audit = writeAuditEventRecord({
    runId: `${reservationId}-anthropic-${kind}-use`,
    eventType: "standing_approval_used",
    summary: `Scoped approval ${approvalId} used for one Anthropic ${details.action} call.`,
    scope: details.scope,
    source: "connector_metadata",
    relatedArtifacts: [
      { type: "approval", reference: approvalId },
      { type: "other", reference: job.jobId },
      ...(reservation?.recordPath ? [{ type: "other", reference: reservation.recordPath }] : []),
      ...relatedArtifacts
    ],
    riskLevel: job.riskLevel || "R1",
    liveServiceTouched: true,
    notes: `Outcome ${outcome}; model ${model || "unknown"}; input tokens ${inputTokens}; output tokens ${outputTokens}; recorded cost USD ${costUsd}; billing reconciled ${billingReconciled}.`,
    now,
    root
  });
  return { ...audit, costUsd, billingReconciled };
}
