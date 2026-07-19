import path from "node:path";
import process from "node:process";
import { buildAuditEventRecord, writeAuditEventRecord } from "./audit-writer.mjs";
import { DEFAULT_OWNER_ID, isoTimestamp, listDirectJson, readJson, slugify, writeJson } from "./common.mjs";

const PROPOSAL_DIR = ".codex/proposals";
const MAX_ACTIVE_PROPOSALS = 8;

function records(relativeDir, root) {
  return listDirectJson(relativeDir, { root }).map((recordPath) => ({
    recordPath,
    record: readJson(recordPath, root)
  }));
}

function proposalKey(sourceType, sourceId) {
  return `${sourceType}:${sourceId}`;
}

function candidate({ sourceType, sourceId, projectId = "project-one-off", title, command, reason, priority, evidence = [] }) {
  return { sourceType, sourceId, projectId, title, command, reason, priority, evidence };
}

export function discoverProposalCandidates({ root = process.cwd(), now = new Date() } = {}) {
  const candidates = [];
  const jobs = records(".codex/jobs", root);
  const recoveredJobIds = new Set(jobs.map(({ record }) => record.recovery?.sourceJobId).filter(Boolean));
  for (const { recordPath, record: job } of jobs) {
    if (job.status === "failed") {
      if (recoveredJobIds.has(job.jobId)) continue;
      candidates.push(candidate({
        sourceType: "failed_job",
        sourceId: job.jobId,
        projectId: job.projectId,
        title: `Recover failed job ${job.jobId}`,
        command: `Replan and rebuild the outcome from failed job ${job.jobId}. Preserve the original evidence and use its exact failure as retry context.`,
        reason: job.blockedReason || "The job failed and has not produced an owner-usable outcome.",
        priority: "high",
        evidence: [recordPath]
      }));
    }
  }

  const activeLessonIds = new Set(records(".codex/memory/accepted", root).map(({ record }) => record.lessonId));
  for (const { recordPath, record: lesson } of records(".codex/memory/lessons/candidates", root)) {
    if (lesson.status !== "candidate" || activeLessonIds.has(lesson.lessonId)) continue;
    candidates.push(candidate({
      sourceType: "lesson_candidate",
      sourceId: lesson.lessonId,
      projectId: lesson.projectId || "project-one-off",
      title: `Review lesson: ${lesson.title}`,
      command: `Review lesson candidate ${lesson.lessonId} and decide whether its evidence should become advisory AG OS memory.`,
      reason: lesson.whyThisMatters || "A completed job produced a lesson candidate that still needs owner judgment.",
      priority: lesson.confidence === "high" ? "medium" : "low",
      evidence: [recordPath]
    }));
  }

  for (const { recordPath, record: approval } of records(".codex/approvals", root)) {
    if (approval.status !== "approved" || !approval.expiresAt) continue;
    const remainingMs = Date.parse(approval.expiresAt) - now.getTime();
    if (!Number.isFinite(remainingMs) || remainingMs <= 0 || remainingMs > 7 * 24 * 60 * 60 * 1000) continue;
    candidates.push(candidate({
      sourceType: "expiring_approval",
      sourceId: approval.approvalId,
      title: `Review expiring approval ${approval.approvalId}`,
      command: `Review ${approval.approvalId} before it expires. Revoke it, let it expire, or create a new separately scoped approval only if the capability is still needed.`,
      reason: `This approval expires at ${approval.expiresAt}.`,
      priority: remainingMs <= 24 * 60 * 60 * 1000 ? "high" : "medium",
      evidence: [recordPath]
    }));
  }

  return candidates
    .sort((left, right) => ({ high: 0, medium: 1, low: 2 }[left.priority] - ({ high: 0, medium: 1, low: 2 }[right.priority])))
    .slice(0, MAX_ACTIVE_PROPOSALS);
}

export function listProposals({ root = process.cwd() } = {}) {
  return records(PROPOSAL_DIR, root)
    .map(({ record }) => record)
    .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)));
}

export function refreshProposals({ root = process.cwd(), now = new Date() } = {}) {
  const existing = listProposals({ root });
  const byKey = new Map(existing.map((proposal) => [proposalKey(proposal.source.type, proposal.source.id), proposal]));
  const timestamp = isoTimestamp(now);
  const active = [];
  const discovered = discoverProposalCandidates({ root, now });
  const discoveredKeys = new Set(discovered.map((item) => proposalKey(item.sourceType, item.sourceId)));
  for (const prior of existing) {
    if (prior.status === "proposed" && !discoveredKeys.has(proposalKey(prior.source.type, prior.source.id))) {
      writeJson(`${PROPOSAL_DIR}/${prior.proposalId}.json`, { ...prior, status: "stale", updatedAt: timestamp }, root);
    }
  }
  for (const item of discovered) {
    const key = proposalKey(item.sourceType, item.sourceId);
    const prior = byKey.get(key);
    if (prior && ["rejected", "accepted"].includes(prior.status)) continue;
    const proposalId = prior?.proposalId || `proposal-${slugify(`${item.sourceType}-${item.sourceId}`)}`;
    const record = {
      proposalId,
      status: "proposed",
      priority: item.priority,
      title: item.title,
      reason: item.reason,
      proposedCommand: item.command,
      projectId: item.projectId,
      source: { type: item.sourceType, id: item.sourceId, evidence: item.evidence },
      safety: {
        mayExecuteWithoutOwnerDecision: false,
        grantsPermission: false,
        downstreamApprovalsStillRequired: true
      },
      createdAt: prior?.createdAt || timestamp,
      updatedAt: timestamp
    };
    writeJson(`${PROPOSAL_DIR}/${proposalId}.json`, record, root);
    active.push(record);
  }
  return active;
}

export function markProposalStartFailed({ proposalId, error, root = process.cwd(), now = new Date() }) {
  const recordPath = `${PROPOSAL_DIR}/${proposalId}.json`;
  const proposal = readJson(recordPath, root);
  if (proposal.status !== "accepted") throw new Error(`accepted proposal not found: ${proposalId}`);
  const timestamp = isoTimestamp(now);
  const updated = { ...proposal, status: "proposed", lastStartError: String(error || "command creation failed").slice(0, 1000), updatedAt: timestamp };
  writeJson(recordPath, updated, root);
  writeAuditEventRecord({
    auditEvent: buildAuditEventRecord({ runId: `proposal-start-failed-${proposalId}-${timestamp}`, eventType: "validation_run", summary: `Accepted proposal ${proposalId} could not create its normal command package and returned to the queue.`, scope: proposalId, source: "ag_os_coordinator", relatedArtifacts: [{ type: "other", reference: recordPath }], riskLevel: "R1", liveServiceTouched: false, notes: updated.lastStartError, now }),
    root
  });
  return updated;
}

export function decideProposal({ proposalId, decision, confirmation, reason = "", root = process.cwd(), now = new Date() }) {
  if (!/^proposal-[a-z0-9-]+$/.test(proposalId || "")) throw new Error("a valid proposalId is required");
  if (!["accept", "reject"].includes(decision)) throw new Error("decision must be accept or reject");
  if (confirmation !== `${decision.toUpperCase()} ${proposalId}`) throw new Error(`confirmation must equal ${decision.toUpperCase()} ${proposalId}`);
  const recordPath = `${PROPOSAL_DIR}/${proposalId}.json`;
  const proposal = readJson(recordPath, root);
  if (proposal.status !== "proposed") throw new Error(`proposal is not pending: ${proposalId}`);
  const timestamp = isoTimestamp(now);
  const updated = {
    ...proposal,
    status: decision === "accept" ? "accepted" : "rejected",
    decision: {
      decidedBy: DEFAULT_OWNER_ID,
      decidedAt: timestamp,
      reason: String(reason || "").trim() || (decision === "accept" ? "Owner accepted this proposed command." : "Owner rejected this proposed command.")
    },
    updatedAt: timestamp
  };
  writeJson(recordPath, updated, root);
  const audit = buildAuditEventRecord({
    runId: `proposal-${decision}-${proposalId}-${timestamp}`,
    eventType: decision === "accept" ? "approval_granted" : "approval_rejected",
    summary: `Owner ${decision === "accept" ? "accepted" : "rejected"} proposal ${proposalId}.`,
    scope: proposalId,
    source: "owner_instruction",
    relatedArtifacts: [{ type: "other", reference: recordPath }],
    riskLevel: "R1",
    liveServiceTouched: false,
    notes: "This decision approves only creation of the normal AG OS command package. It does not approve any downstream live action.",
    now
  });
  const auditResult = writeAuditEventRecord({ auditEvent: audit, root });
  return {
    proposal: updated,
    auditPath: auditResult.filePath,
    acceptedCommand: decision === "accept" ? {
      command: proposal.proposedCommand,
      projectId: proposal.projectId,
      proposalId
    } : null
  };
}
