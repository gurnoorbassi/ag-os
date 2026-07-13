import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { writeAuditEventRecord } from "./audit-writer.mjs";
import { isoTimestamp, readJson, slugify, writeJson } from "./common.mjs";
import { selectExecutionAdapter } from "./execution-adapter-registry.mjs";
import { validateGitHubDraftPrRequest } from "./github-draft-pr-adapter.mjs";

function jobPath(jobId) {
  return `.codex/jobs/${jobId}.json`;
}

function commandPath(job) {
  return `.codex/commands/${job.commandId}.json`;
}

function assertDecision(decision, jobId, confirmation) {
  if (!["approve", "reject", "revoke"].includes(decision)) throw new Error("decision must be approve, reject, or revoke");
  const expected = `${decision.toUpperCase()} ${jobId}`;
  if (confirmation !== expected) throw new Error(`confirmation must exactly equal ${expected}`);
}

function buildExactApproval({ job, command, adapter, now, expiresAt, root }) {
  const timestamp = isoTimestamp(now);
  const expiry = expiresAt ? new Date(expiresAt) : new Date(new Date(now).getTime() + 60 * 60 * 1000);
  if (!Number.isFinite(expiry.getTime()) || expiry <= new Date(now) || expiry.getTime() - new Date(now).getTime() > 24 * 60 * 60 * 1000) {
    throw new Error("job approval expiry must be within the next 24 hours");
  }
  const approvalId = `approval-${timestamp.slice(0, 10).replaceAll("-", "")}-${slugify(job.jobId.replace(/^job-/, ""))}`;
  const adapterCriteria = adapter.adapterId === "github-draft-pr"
    ? (() => {
        const validated = validateGitHubDraftPrRequest({ request: command.executionRequest, root });
        return [
          `Repository is exactly ${validated.repository}.`,
          `Branch is exactly ${validated.branch}.`,
          `Base commit is exactly ${validated.expectedBaseCommit}.`,
          `Source digest is exactly sha256:${validated.sourceDigest}.`
        ];
      })()
    : [];
  return {
    approvalId,
    status: "approved",
    approvalKind: "single_action",
    actionClass: adapter.requestedAction,
    inclusionCriteria: [
      `Job is exactly ${job.jobId}.`,
      `Project is exactly ${job.projectId}.`,
      `Execution adapter is exactly ${adapter.adapterId}.`,
      ...adapterCriteria,
      "The adapter must stop if its credential, target, validation, secret scan, or approval evidence changes."
    ],
    maxUses: 1,
    usageAuditRequired: true,
    revocableImmediately: true,
    ownerId: "owner-gurnoor-bassi",
    requestedBy: "ag-os-coordinator",
    approvedBy: "owner-gurnoor-bassi",
    projectId: job.projectId,
    commandCategory: job.commandType,
    requestedAction: command.rawCommand,
    target: `${job.projectId}:${job.jobId}:${adapter.adapterId}`,
    scope: `One execution of ${adapter.requestedAction} for ${job.jobId} only.`,
    riskLevel: job.riskLevel,
    dataClass: "internal",
    budget: { required: false, maxUsd: 0 },
    approvalRequiredFor: [adapter.requestedAction],
    approvedActions: [adapter.requestedAction],
    prohibitedActions: [
      "merge_pull_request",
      "production_deployment",
      "credential_change",
      "customer_data_access",
      "message_send",
      "social_posting",
      "paid_action",
      "dns_change"
    ].filter((action) => action !== adapter.requestedAction),
    revocationPath: `Owner may reject or revoke ${approvalId}; AG OS must stop ${job.jobId} before the adapter performs another step.`,
    evidence: [{
      type: "owner_instruction",
      reference: `Authenticated owner console confirmation APPROVE ${job.jobId}`,
      verified: true
    }],
    approvalText: `Approve exactly one ${adapter.requestedAction} execution for ${job.jobId} through ${adapter.adapterId}. All unrelated live actions remain prohibited.`,
    approvedAt: timestamp,
    expiresAt: isoTimestamp(expiry),
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

export function decideJob({ jobId, decision, confirmation, expiresAt, root = process.cwd(), env = process.env, now = new Date() }) {
  assertDecision(decision, jobId, confirmation);
  const sourcePath = jobPath(jobId);
  if (!existsSync(path.join(root, sourcePath))) throw new Error(`job does not exist: ${jobId}`);
  const job = readJson(sourcePath, root);
  if (decision === "revoke") {
    if (!job.approvalId) throw new Error("job has no approval to revoke");
    const approvalPath = `.codex/approvals/${job.approvalId}.json`;
    if (!existsSync(path.join(root, approvalPath))) throw new Error("job approval record does not exist");
    const approval = readJson(approvalPath, root);
    if (approval.status !== "approved") throw new Error(`job approval is already ${approval.status}`);
    const timestamp = isoTimestamp(now);
    const revokedApproval = {
      ...approval,
      status: "revoked",
      revocationPath: `Owner revoked ${approval.approvalId} from the authenticated control center before the adapter could perform another step.`,
      updatedAt: timestamp
    };
    writeJson(approvalPath, revokedApproval, root);
    const revokedJob = {
      ...job,
      status: "waiting_approval",
      approvalRequired: true,
      blockedReason: `Owner revoked ${approval.approvalId}; a new exact approval is required.`,
      updatedAt: timestamp
    };
    writeJson(sourcePath, revokedJob, root);
    const audit = writeAuditEventRecord({
      runId: `${jobId}-owner-revoked`,
      eventType: "approval_rejected",
      summary: `Owner revoked exact job approval ${approval.approvalId}.`,
      scope: jobId,
      source: "owner_instruction",
      relatedArtifacts: [
        { type: "approval", reference: approval.approvalId },
        { type: "other", reference: sourcePath }
      ],
      riskLevel: job.riskLevel,
      liveServiceTouched: false,
      notes: "The approval was invalidated before any subsequent adapter step. No credential or connector call was made by this revocation action.",
      now,
      root
    });
    return { decision, job: revokedJob, approval: revokedApproval, approvalPath, auditPath: audit.filePath };
  }
  if (job.status !== "waiting_approval") throw new Error(`job is not waiting for approval: ${job.status}`);
  const command = readJson(commandPath(job), root);
  const adapter = selectExecutionAdapter({ command, env });
  const timestamp = isoTimestamp(now);

  if (decision === "reject") {
    const rejected = {
      ...job,
      status: "cancelled",
      blockedReason: "Owner rejected this exact job execution from the authenticated control center.",
      queueTimestamps: { ...job.queueTimestamps, cancelledAt: timestamp },
      updatedAt: timestamp
    };
    writeJson(sourcePath, rejected, root);
    const audit = writeAuditEventRecord({
      runId: `${jobId}-owner-rejected`,
      eventType: "approval_rejected",
      summary: `Owner rejected autonomous job ${jobId}.`,
      scope: jobId,
      source: "owner_instruction",
      relatedArtifacts: [{ type: "other", reference: sourcePath }],
      riskLevel: job.riskLevel,
      liveServiceTouched: false,
      notes: "No adapter ran and no external state changed.",
      now,
      root
    });
    return { decision, job: rejected, adapter, auditPath: audit.filePath };
  }

  const approval = buildExactApproval({ job, command, adapter, now, expiresAt, root });
  const approvalPath = `.codex/approvals/${approval.approvalId}.json`;
  writeJson(approvalPath, approval, root);
  const resumed = {
    ...job,
    status: "queued",
    approvalRequired: false,
    approvalId: approval.approvalId,
    blockedReason: undefined,
    updatedAt: timestamp
  };
  writeJson(sourcePath, resumed, root);
  const audit = writeAuditEventRecord({
    runId: `${jobId}-owner-approved`,
    eventType: "approval_granted",
    summary: `Owner granted exact one-job approval ${approval.approvalId} and re-queued ${jobId}.`,
    scope: jobId,
    source: "owner_instruction",
    relatedArtifacts: [
      { type: "approval", reference: approval.approvalId },
      { type: "other", reference: sourcePath }
    ],
    riskLevel: job.riskLevel,
    liveServiceTouched: false,
    notes: `Approval is limited to ${adapter.requestedAction}; the adapter still must pass its readiness and stop conditions.`,
    now,
    root
  });
  return { decision, job: resumed, adapter, approval, approvalPath, auditPath: audit.filePath };
}

export function activeJobApproval({ job, adapter, root = process.cwd(), now = new Date() }) {
  if (!job?.approvalId) return { valid: false, reasons: ["job approval is missing"] };
  const approvalPath = `.codex/approvals/${job.approvalId}.json`;
  if (!existsSync(path.join(root, approvalPath))) return { valid: false, reasons: ["job approval record does not exist"] };
  const approval = readJson(approvalPath, root);
  const reasons = [];
  if (approval.status !== "approved") reasons.push("job approval is not active");
  if (Date.parse(approval.expiresAt) <= new Date(now).getTime()) reasons.push("job approval has expired");
  if (approval.projectId !== job.projectId) reasons.push("job approval project does not match");
  if (!approval.approvedActions?.includes(adapter.requestedAction)) reasons.push("job approval does not cover the selected adapter action");
  if (!approval.inclusionCriteria?.includes(`Job is exactly ${job.jobId}.`)) reasons.push("job approval does not name the exact job");
  return { valid: reasons.length === 0, reasons, approval, approvalPath };
}
