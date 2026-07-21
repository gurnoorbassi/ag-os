import { existsSync, unlinkSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { buildAuditEventRecord, writeAuditEventRecord } from "./audit-writer.mjs";
import { buildApprovalLockRecord, writeApprovalLockWithAudit } from "./approval-lock-runtime.mjs";
import { DEFAULT_OWNER_ID, isoTimestamp, listDirectJson, readJson, slugify, writeJson } from "./common.mjs";
import { lessonPromotionApprovalId } from "./lesson-promotion-approval.mjs";
import { detectLessonConflicts, promoteLessonCandidate, rejectLessonCandidate } from "../../process-lesson-promotion.mjs";
import { jobDeliverableSummary } from "./deliverable-service.mjs";

const JOB_COMPLETION_POLICY_ACTIVATED_AT = "2026-07-09T20:06:25.029Z";

function records(relativeDir, root) {
  return listDirectJson(relativeDir, { root }).map((recordPath) => ({
    recordPath,
    record: readJson(recordPath, root)
  }));
}

function newest(items, timestamp = "updatedAt", limit = 12) {
  return [...items]
    .sort((left, right) => String(right[timestamp] ?? right.createdAt ?? "").localeCompare(String(left[timestamp] ?? left.createdAt ?? "")))
    .slice(0, limit);
}

export function listRecentAuditEvents({ root = process.cwd(), limit = 10 } = {}) {
  return newest(records(".codex/audit", root)
    .map(({ record }) => record)
    .filter((record) => record.eventType && !record.template)
    .map((record) => ({
      id: record.id,
      eventType: record.eventType,
      summary: record.summary,
      occurredAt: record.occurredAt ?? record.createdAt,
      riskLevel: record.riskLevel,
      liveServiceTouched: record.liveServiceTouched === true
    })), "occurredAt", Math.max(1, Math.min(Number(limit) || 10, 25)));
}

function approvalSensitivity(riskLevel) {
  if (riskLevel === "high") return { level: "protected", label: "Protected", explanation: "Low starting trust keeps external and production actions behind exact owner approval." };
  if (riskLevel === "medium") return { level: "controlled", label: "Controlled", explanation: "Local work can run, while external or production effects remain approval-gated." };
  return { level: "routine", label: "Routine", explanation: "The project has more proven trust, but permanent live-action gates still apply." };
}

function safeJob(job, root) {
  return {
    jobId: job.jobId,
    status: job.status,
    commandType: job.commandType,
    assignedAgent: job.assignedAgent,
    expectedOutput: job.expectedOutput,
    approvalRequired: job.approvalRequired === true,
    blockedReason: job.blockedReason,
    completedAt: job.queueTimestamps?.completedAt,
    updatedAt: job.updatedAt,
    hasQualityScore: Boolean(job.completionEvidence?.qualityScorePath),
    lessonCandidateCount: job.completionEvidence?.lessonCandidatePaths?.length ?? 0,
    recovery: job.recovery ?? null,
    availableRecoveryActions: ["failed", "blocked", "cancelled", "needs_revision", "plan_ready"].includes(job.status)
      ? ["retry", "replan"]
      : [],
    deliverable: jobDeliverableSummary({ job, root }),
    outcomeRecorded: existsSync(path.join(root, `.codex/outcomes/outcome-${slugify(job.jobId)}.json`))
  };
}

export function getProjectWorkspace({ projectId, root = process.cwd() }) {
  const registry = readJson(".codex/projects/registry.json", root);
  const entry = registry.projects.find((item) => item.projectId === projectId);
  if (!entry) throw new Error(`project not found: ${projectId}`);
  const project = readJson(entry.recordPath, root);
  const matching = (relativeDir) => records(relativeDir, root)
    .filter(({ record }) => record.projectId === projectId || record.scope?.projectId === projectId || record.task?.projectId === projectId);
  const jobs = matching(".codex/jobs").map(({ record }) => safeJob(record, root));
  const quality = matching(".codex/quality-scores").map(({ record }) => ({
    scoreId: record.scoreId,
    status: record.status,
    overallScore: record.overallScore,
    scoreType: record.scoreType,
    updatedAt: record.updatedAt
  }));
  const costs = matching(".codex/costs").map(({ record }) => ({
    costLedgerId: record.costLedgerId,
    status: record.status,
    actualTaskCostUsd: record.summary?.actualTaskCostUsd ?? record.totals?.actualTaskCostUsd ?? record.actualTaskCostUsd ?? 0,
    budgetStatus: record.summary?.budgetStatus ?? record.budgetStatus,
    updatedAt: record.updatedAt
  })).filter((record) =>
    !record.costLedgerId?.startsWith("cost-ledger-anthropic-call-") &&
    !record.costLedgerId?.startsWith("cost-ledger-anthropic-budget-blocked-")
  );
  const commands = matching(".codex/commands").map(({ record }) => ({
    commandId: record.commandId ?? record.id,
    status: record.status,
    command: record.command ?? record.originalCommand ?? record.ownerCommand,
    updatedAt: record.updatedAt
  }));
  const candidates = matching(".codex/memory/lessons/candidates").map(({ record }) => ({
    lessonId: record.lessonId,
    title: record.title,
    confidence: record.confidence,
    status: record.status,
    updatedAt: record.updatedAt
  }));
  const completed = jobs.filter((job) => job.status === "done" || job.status === "complete");
  const scored = completed.filter((job) => job.hasQualityScore);

  return {
    project: {
      id: project.id,
      name: project.name,
      status: project.status,
      goal: project.goal,
      projectType: project.projectType,
      managementMode: project.managementMode,
      trustLevel: project.trustLevel,
      scope: project.scope ?? [],
      outOfScope: project.outOfScope ?? [],
      stack: project.stack ?? [],
      risks: project.risks ?? [],
      qualityGates: project.qualityGates ?? [],
      approvalRequiredFor: project.approvalRequiredFor ?? [],
      ownerWorkspace: project.ownerWorkspace ?? null,
      sensitivity: approvalSensitivity(entry.riskLevel)
    },
    progress: {
      jobCount: jobs.length,
      completedJobCount: completed.length,
      waitingApprovalCount: jobs.filter((job) => job.status === "waiting_approval").length,
      qualityCoverage: completed.length === 0 ? 0 : Math.round((scored.length / completed.length) * 100),
      lessonCandidateCount: candidates.length,
      recordedCostUsd: Number(costs.reduce((sum, item) => sum + Number(item.actualTaskCostUsd || 0), 0).toFixed(6))
    },
    jobs: newest(jobs),
    qualityScores: newest(quality),
    lessonCandidates: newest(candidates),
    costs: newest(costs),
    commands: newest(commands)
  };
}

function lessonKey(lesson) {
  return `${String(lesson.title ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()}|${[...(lesson.appliesTo ?? [])].sort().join("|")}`;
}

export function listLessonDecisions({ root = process.cwd() } = {}) {
  const acceptedIds = new Set(records(".codex/memory/accepted", root).map(({ record }) => record.lessonId));
  const rejectedIds = new Set(records(".codex/memory/rejected", root).map(({ record }) => record.lessonId));
  const candidates = records(".codex/memory/lessons/candidates", root)
    .filter(({ record }) => record.status === "candidate" && !acceptedIds.has(record.lessonId) && !rejectedIds.has(record.lessonId));
  const seen = new Set();
  const decisions = newest(candidates.map(({ recordPath, record }) => {
    const key = lessonKey(record);
    const duplicate = seen.has(key);
    seen.add(key);
    const conflicts = detectLessonConflicts({ candidatePath: recordPath, candidate: record, root });
    const recommendation = conflicts.length > 0
      ? "blocked_conflict"
      : duplicate
        ? "possible_duplicate"
        : record.confidence === "high"
          ? "recommended"
          : "owner_review";
    return {
      lessonId: record.lessonId,
      title: record.title,
      lesson: record.lesson,
      whyThisMatters: record.whyThisMatters,
      whenToUse: record.whenToUse,
      whenNotToUse: record.whenNotToUse,
      projectId: record.projectId,
      scope: record.scope,
      confidence: record.confidence,
      appliesTo: record.appliesTo ?? [],
      recommendation,
      canPromote: conflicts.length === 0,
      recordPath,
      updatedAt: record.updatedAt
    };
  }), "updatedAt", 100);
  return {
    acceptedCount: acceptedIds.size,
    rejectedCount: rejectedIds.size,
    activeCandidateCount: decisions.length,
    recommendedCount: decisions.filter((item) => item.recommendation === "recommended").length,
    duplicateCount: decisions.filter((item) => item.recommendation === "possible_duplicate").length,
    decisions
  };
}

function refreshDashboard(root) {
  const result = spawnSync(process.execPath, ["scripts/build-dashboard.mjs"], { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`dashboard refresh failed: ${result.stderr || result.stdout}`);
}

function removeOutput(relativePath, root) {
  const absolute = path.join(root, relativePath);
  if (existsSync(absolute)) unlinkSync(absolute);
}

function buildLessonDecisionApproval({ item, now }) {
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
  return {
    ...buildApprovalLockRecord({
    slug: `lesson-promotion-${item.lessonId}-${isoTimestamp(now)}`,
    requestedBy: "ag-os-control-center",
    approvedBy: DEFAULT_OWNER_ID,
    commandCategory: "build",
    requestedAction: `Promote the exact named lesson ${item.lessonId} into accepted AG OS runtime memory.`,
    target: item.recordPath,
    scope: `Only ${item.lessonId} may be promoted from ${item.recordPath}.`,
    riskLevel: "R1",
    approvalRequiredFor: ["lesson_promotion"],
    approvedActions: ["promote_named_lesson"],
    prohibitedActions: ["live_action", "approval_bypass", "credential_handling", "deployment", "paid_action"],
    revocationPath: "The owner may revoke this single-use lesson approval before promotion completes.",
    evidence: [{
      type: "owner_instruction",
      reference: `Authenticated owner decision for ${item.lessonId} in the AG OS control center.`,
      verified: true
    }],
    approvalText: `Authenticated owner approval to promote only ${item.lessonId} as advisory memory. No live-action permission is granted.`,
    expiresAt,
      now
    }),
    approvalId: lessonPromotionApprovalId(item.lessonId, now)
  };
}

function archiveConsumedLessonApproval({ approval, root, now }) {
  const archivePath = `.codex/approvals/archive/${approval.approvalId}.json`;
  writeJson(archivePath, {
    ...approval,
    status: "expired",
    revocationPath: `Consumed by the exact lesson promotion at ${isoTimestamp(now)}. Historical approval evidence is preserved; reuse is prohibited.`,
    updatedAt: isoTimestamp(now)
  }, root);
  removeOutput(`.codex/approvals/${approval.approvalId}.json`, root);
  return archivePath;
}

export function decideLessons({ lessonIds, decision, reason, root = process.cwd(), now = new Date() }) {
  const ids = [...new Set((Array.isArray(lessonIds) ? lessonIds : [lessonIds]).filter(Boolean))];
  if (!ids.length || ids.length > 50) throw new Error("choose between 1 and 50 lessons");
  if (!["promote", "reject"].includes(decision)) throw new Error("decision must be promote or reject");
  if (decision === "reject" && (!reason || String(reason).trim().length < 3)) throw new Error("a rejection reason is required");
  const queue = listLessonDecisions({ root });
  const selected = ids.map((id) => queue.decisions.find((item) => item.lessonId === id));
  if (selected.some((item) => !item)) throw new Error("one or more lesson candidates are no longer pending");
  if (decision === "promote" && selected.some((item) => !item.canPromote)) throw new Error("a conflicting lesson cannot be promoted");

  const outputs = [];
  try {
    for (const item of selected) {
      const actionSlug = slugify(`${decision}-${item.lessonId}-${now.toISOString()}`);
      if (decision === "promote") {
        const approval = buildLessonDecisionApproval({ item, now });
        const approvalResult = writeApprovalLockWithAudit({ approval, runId: actionSlug, now, root });
        outputs.push(approvalResult.approvalPath, approvalResult.auditPath);
        const result = promoteLessonCandidate({
          candidatePath: item.recordPath,
          root,
          approvalId: approval.approvalId,
          approvedBy: DEFAULT_OWNER_ID,
          evidence: [item.recordPath, approvalResult.auditPath],
          now
        });
        outputs.push(result.filePath);
        const archivePath = archiveConsumedLessonApproval({ approval, root, now });
        outputs.splice(outputs.indexOf(approvalResult.approvalPath), 1, archivePath);
        continue;
      }
      const audit = buildAuditEventRecord({
        runId: `lesson-${actionSlug}`,
        eventType: "approval_rejected",
        summary: `Owner rejected lesson ${item.lessonId} in the authenticated control center.`,
        scope: item.recordPath,
        source: "owner_instruction",
        relatedArtifacts: [{ type: "other", reference: item.recordPath }],
        riskLevel: "R1",
        liveServiceTouched: false,
        notes: `Rejection reason: ${String(reason).trim()}`,
        now
      });
      const auditResult = writeAuditEventRecord({ auditEvent: audit, root });
      outputs.push(auditResult.filePath);
      const result = rejectLessonCandidate({
        candidatePath: item.recordPath,
        root,
        rejectedBy: DEFAULT_OWNER_ID,
        reason: String(reason).trim(),
        now
      });
      outputs.push(result.filePath);
    }
    refreshDashboard(root);
  } catch (error) {
    outputs.reverse().forEach((filePath) => removeOutput(filePath, root));
    try { refreshDashboard(root); } catch { /* records are already restored */ }
    throw error;
  }
  return {
    status: "recorded",
    decision,
    lessonIds: ids,
    recordsCreated: outputs,
    externalActionExecuted: false,
    permissionGranted: false,
    queue: listLessonDecisions({ root })
  };
}

export function getOperatingSystems({ root = process.cwd(), now = new Date() } = {}) {
  const jobs = records(".codex/jobs", root).map(({ record }) => record);
  const completed = jobs.filter((job) => ["done", "complete"].includes(job.status) && (
    typeof job.queueTimestamps?.completedAt !== "string" || job.queueTimestamps.completedAt >= JOB_COMPLETION_POLICY_ACTIVATED_AT
  ));
  const completeEvidence = completed.filter((job) => job.completionEvidence?.qualityScorePath && job.completionEvidence?.lessonCandidatePaths?.length > 0);
  const costs = records(".codex/costs", root).filter(({ recordPath }) => path.basename(recordPath).startsWith("cost-ledger-"));
  const lessons = listLessonDecisions({ root });
  const securityPolicyPresent = existsSync(path.join(root, ".codex/security/policy.json"));
  const watchdog = records(".codex/watchdog", root)
    .map(({ record }) => record)
    .find((record) => record.watchdogCheckId === "watchdog-runtime-internal-state");
  const watchdogFresh = watchdog && Number.isFinite(Date.parse(watchdog.updatedAt)) && now.getTime() - Date.parse(watchdog.updatedAt) <= 180_000;
  return [
    {
      id: "cost-os", name: "Cost OS", status: "operational", metric: `${costs.length} ledgers`,
      summary: "Budgets and per-run cost evidence are enforced before paid model work.",
      working: ["Monthly, daily, and per-task limits recorded", "Anthropic usage records tokens and actual cost", "Paid actions remain separately approved"],
      remaining: []
    },
    {
      id: "watchdog-os", name: "Watchdog OS", status: watchdogFresh ? (watchdog.status === "pass" ? "operational" : "operational_attention") : "setup_needed", metric: watchdogFresh ? "Every 60 seconds" : "Manual checks",
      summary: watchdogFresh
        ? "The coordinator checks internal jobs, connector results, and revocable approvals every 60 seconds without external calls."
        : "Health, boot, validator, and security checks exist, but the recurring internal monitor is not active.",
      working: watchdogFresh
        ? ["Recurring internal-state checks", "Health endpoint", "Dashboard-visible findings", "No credentials, connectors, alerts, or deployments"]
        : ["Health endpoint", "Boot and validator checks", "Dashboard-visible failures"],
      remaining: watchdogFresh ? [] : ["Activate the built-in internal watchdog with the next private coordinator deployment"]
    },
    {
      id: "memory-os", name: "Memory OS", status: lessons.activeCandidateCount > 0 ? "operational_attention" : "operational", metric: `${lessons.acceptedCount} accepted`,
      summary: "Accepted lessons are retrievable; pending candidates wait for an owner decision.",
      working: ["Candidate isolation", "Accepted lesson retrieval", "Conflict protection", "Authenticated promote and reject decisions"],
      remaining: lessons.activeCandidateCount > 0 ? [`Decide ${lessons.activeCandidateCount} pending candidate lessons`] : []
    },
    {
      id: "quality-os", name: "Quality OS", status: completed.length === completeEvidence.length ? "operational" : "operational_attention", metric: `${completeEvidence.length}/${completed.length} covered`,
      summary: "Completed policy-era jobs must record a quality score and lesson candidates.",
      working: ["Quality scoring", "Lesson candidate generation", "Completion-proof enforcement"],
      remaining: completed.length === completeEvidence.length ? [] : [`Backfill ${completed.length - completeEvidence.length} legacy completed job(s)`]
    },
    {
      id: "security-os", name: "Security OS", status: securityPolicyPresent ? "protected" : "setup_needed", metric: "Fail closed",
      summary: "Credentials, production data, external actions, and deployments remain independently approval-gated.",
      working: ["Owner authentication", "Secret scanning", "Scoped approvals", "No permission inheritance from capability or memory"],
      remaining: []
    }
  ];
}
