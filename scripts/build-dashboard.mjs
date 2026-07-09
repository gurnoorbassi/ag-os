import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listDirectJson, readJson } from "./lib/runtime/common.mjs";

const root = process.cwd();

function readJsonIfExists(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!existsSync(absolutePath)) {
    return null;
  }
  return readJson(relativePath);
}

function readText(relativePath) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function listTemplateJson(relativeDir) {
  const absoluteDir = path.join(root, relativeDir);
  if (!existsSync(absoluteDir)) {
    return [];
  }

  return readdirSync(absoluteDir)
    .filter((name) => name.endsWith(".template.json"))
    .map((name) => path.join(relativeDir, name).replaceAll("\\", "/"));
}

function lineValue(content, label) {
  const match = content.match(new RegExp(`^${label}:\\s*(.+)$`, "m"));
  return match?.[1]?.trim() ?? "Not recorded";
}

function money(value, currency) {
  return `${currency} $${value}`;
}

function projectBoundary(project) {
  if (project.id === "project-lead-generation-system") {
    return "No source, VPS, Postgres, n8n, domain, DNS, deployment, credential, production data, or customer data changes.";
  }
  if (project.id === "project-ag-digitalz-ai-receptionist") {
    return "Separate product project; no live service status inferred beyond repository records.";
  }
  return project.outOfScope?.[0] ?? "Boundary not recorded.";
}

function projectRecord(entry) {
  const project = readJson(entry.recordPath);
  return {
    id: project.id,
    name: project.name,
    status: project.status,
    managementMode: project.managementMode,
    projectType: project.projectType,
    riskLevel: entry.riskLevel ?? "not_recorded",
    owner: project.owner,
    recordPath: entry.recordPath,
    boundary: projectBoundary(project)
  };
}

function capabilityTypeLabel(type) {
  if (type === "connector_execution") {
    return `${type}: approval-gated capability type`;
  }
  return `${type}: local-safe capability type`;
}

function latestBy(records, field) {
  return [...records].sort((left, right) => String(right[field] ?? "").localeCompare(String(left[field] ?? "")));
}

function connectorRecordTimestamp(record) {
  return record.result?.verifiedAt ??
    record.result?.mergedAt ??
    record.updatedAt ??
    record.createdAt ??
    "";
}

function latestConnectorRecord(records, predicate) {
  return latestBy(
    records
      .filter(predicate)
      .map((record) => ({ ...record, sortTimestamp: connectorRecordTimestamp(record) })),
    "sortTimestamp"
  )[0] ?? null;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function countRecords(relativeDir) {
  return listDirectJson(relativeDir).length;
}

function summarizeCapability(capability) {
  return {
    id: capability.id,
    name: capability.name,
    status: capability.status,
    riskTier: capability.riskTier,
    approvalRequired: capability.approvalRequired,
    lastProvenDate: capability.lastProvenDate,
    proofRecords: capability.proofRecords ?? [],
    blockedCapabilities: capability.blockedCapabilities ?? [],
    boundaries: capability.boundaries ?? []
  };
}

function isDraftOnlyCapability(capability) {
  const text = [
    capability.name,
    capability.notes,
    ...(capability.boundaries ?? []),
    ...(capability.blockedCapabilities ?? [])
  ].join(" ").toLowerCase();
  return text.includes("draft") || text.includes("candidate") || text.includes("advisory");
}

function summarizeApproval(approvalPath, archive = false) {
  const approval = readJson(approvalPath);
  return {
    approvalId: approval.approvalId,
    status: approval.status,
    riskLevel: approval.riskLevel ?? approval.riskTier ?? "not_recorded",
    expiresAt: approval.expiresAt ?? null,
    approvedBy: approval.approvedBy ?? "not_recorded",
    approvalKind: approval.approvalKind ?? "single_action",
    actionClass: approval.actionClass ?? null,
    maxUses: approval.maxUses ?? null,
    target: approval.target ?? "not_recorded",
    approvedActions: approval.approvedActions ?? [],
    revocableImmediately: approval.revocableImmediately === true,
    recordPath: approvalPath,
    archived: archive
  };
}

function collectApprovals({ now = new Date() } = {}) {
  const rawActive = listDirectJson(".codex/approvals")
    .map((approvalPath) => summarizeApproval(approvalPath, false));
  const useCounts = new Map();
  for (const auditPath of listDirectJson(".codex/audit")) {
    const audit = readJson(auditPath);
    if (audit.eventType !== "standing_approval_used") {
      continue;
    }
    for (const artifact of audit.relatedArtifacts ?? []) {
      if (artifact.type === "approval") {
        useCounts.set(artifact.reference, (useCounts.get(artifact.reference) ?? 0) + 1);
      }
    }
  }
  const active = rawActive.map((approval) => {
    const usesRecorded = useCounts.get(approval.approvalId) ?? 0;
    return {
      ...approval,
      usesRecorded,
      remainingUses: approval.maxUses === null ? null : Math.max(0, approval.maxUses - usesRecorded)
    };
  });
  const archived = listDirectJson(".codex/approvals/archive")
    .map((approvalPath) => summarizeApproval(approvalPath, true));
  const all = [...active, ...archived];
  const expired = all.filter((approval) => ["expired", "revoked", "cancelled", "closed", "archived"].includes(approval.status));
  const blocked = all.filter((approval) => ["blocked", "failed"].includes(approval.status));
  const stale = active.filter((approval) => {
    if (approval.status !== "approved" || !approval.expiresAt) {
      return false;
    }

    return new Date(approval.expiresAt) < now;
  });
  return {
    activeCount: active.filter((approval) => approval.status === "approved").length,
    expiredCount: expired.length,
    blockedCount: blocked.length,
    staleWarningCount: blocked.length + stale.length,
    activeApprovals: latestBy(active, "expiresAt"),
    expiredApprovals: latestBy(expired, "expiresAt"),
    blockedApprovals: latestBy(blocked, "expiresAt"),
    staleApprovals: latestBy(stale, "expiresAt"),
    recentApprovedActions: latestBy(active.filter((approval) => approval.status === "approved"), "expiresAt").slice(0, 6),
    standingCount: active.filter((approval) => approval.status === "approved" && approval.approvalKind === "standing").length,
    standingApprovals: latestBy(active.filter((approval) => approval.status === "approved" && approval.approvalKind === "standing"), "expiresAt")
  };
}

function collectApprovalPackageTemplates() {
  return listTemplateJson(".codex/approvals")
    .map((recordPath) => {
      const approval = readJson(recordPath);
      return {
        approvalId: approval.approvalId ?? path.basename(recordPath, ".template.json"),
        status: "template_ready",
        commandCategory: approval.commandCategory ?? "not_recorded",
        requestedAction: approval.requestedAction ?? "not_recorded",
        target: approval.target ?? "not_recorded",
        riskLevel: approval.riskLevel ?? "not_recorded",
        recordPath
      };
    })
    .sort((left, right) => left.approvalId.localeCompare(right.approvalId));
}

function collectConnectorExecutions() {
  return listDirectJson(".codex/connectors")
    .filter((recordPath) => path.basename(recordPath).startsWith("connector-exec-"))
    .map((recordPath) => {
      const record = readJson(recordPath);
      return { ...record, recordPath };
    });
}

function collectConnectorAuth() {
  const records = listDirectJson(".codex/connectors")
    .filter((recordPath) => path.basename(recordPath).startsWith("connector-auth-"))
    .map((recordPath) => {
      const record = readJson(recordPath);
      return {
        connectorId: record.connectorId,
        authStatus: record.authStatus,
        lastObservedAt: record.lastObservedAt,
        observationSource: record.observationSource,
        recordPath
      };
    })
    .sort((left, right) => left.connectorId.localeCompare(right.connectorId));
  return {
    records,
    notAuthenticatedCount: records.filter((record) => record.authStatus !== "authenticated").length,
    authStatusGrantsPermission: false
  };
}

function summarizeNetlify(record) {
  return {
    id: record.connectorExecutionId,
    status: record.status,
    siteName: record.result?.siteName ?? "Not recorded",
    siteUrl: record.result?.siteUrl ?? "Not recorded",
    deployStatus: record.result?.deployStatus ?? "Not recorded",
    deployId: record.result?.deployId ?? "Not recorded",
    deployContext: record.result?.deployContext ?? record.result?.netlifyDeployContext ?? "Not recorded",
    stagingInterpretation: record.result?.stagingInterpretation ?? "Not recorded",
    httpStatus: record.result?.httpStatus ?? "Not recorded",
    verifiedAt: record.result?.verifiedAt ?? record.updatedAt ?? record.createdAt ?? "",
    sourceRepo: record.result?.repositoryFullName ?? "Not recorded",
    sourceSha: record.result?.sourceSha ?? record.result?.sourceCommitSha ?? "Not recorded",
    stagingOnly: record.result?.customDomainConfigured === false && record.result?.dnsChanged === false,
    recordPath: record.recordPath
  };
}

function summarizeN8n(record) {
  return {
    id: record.connectorExecutionId,
    status: record.status,
    workflowName: record.result?.workflowName ?? "Not recorded",
    workflowId: record.result?.workflowId ?? "Not recorded",
    workflowActive: record.result?.workflowActive ?? false,
    credentialConnected: record.result?.credentialConnected ?? false,
    workflowExportPath: record.result?.workflowExportPath ?? "Not recorded",
    recordPath: record.recordPath
  };
}

function summarizeGithub(record) {
  return {
    id: record.connectorExecutionId,
    status: record.status,
    action: record.requestedAction,
    projectId: record.projectId,
    approvalId: record.approvalId ?? "not_required",
    result: record.result ?? {},
    recordPath: record.recordPath
  };
}

function collectCosts(costBudget) {
  const costRecords = listDirectJson(".codex/costs", { exclude: ["budget.json"] })
    .filter((recordPath) => path.basename(recordPath).startsWith("cost-ledger-"))
    .map((recordPath) => {
      const record = readJson(recordPath);
      const actual = record.summary?.actualTaskCostUsd ??
        (record.entries ?? [])
          .filter((entry) => entry.costType === "actual")
          .reduce((sum, entry) => sum + Number(entry.amountUsd ?? 0), 0);
      return {
        costLedgerId: record.costLedgerId,
        status: record.status,
        actualTaskCostUsd: actual,
        budgetStatus: record.summary?.budgetStatus ?? "not_recorded",
        updatedAt: record.updatedAt ?? record.createdAt ?? "",
        recordPath
      };
    });
  const totalActualUsd = costRecords.reduce((sum, record) => sum + Number(record.actualTaskCostUsd ?? 0), 0);
  return {
    ledgerCount: costRecords.length,
    latestCosts: latestBy(costRecords, "updatedAt").slice(0, 6),
    totalRecordedActualUsd: totalActualUsd,
    budgetStatus: totalActualUsd <= Number(costBudget.limits.monthlyMaxUsd) ? "within_limit" : "over_limit",
    limits: {
      monthlyMaxUsd: costBudget.limits.monthlyMaxUsd,
      dailyMaxUsd: costBudget.limits.dailyMaxUsd,
      perTaskMaxUsd: costBudget.limits.perTaskMaxUsd
    }
  };
}

function collectClientManagement() {
  const clientRecords = listDirectJson(".codex/client-management/clients")
    .map((recordPath) => {
      const client = readJson(recordPath);
      return {
        clientId: client.clientId,
        clientName: client.clientName,
        status: client.status,
        brandNames: client.brandNames ?? [],
        systemsPurchased: client.systemsPurchased ?? [],
        privacyLevel: client.privacyLevel,
        recordPath
      };
    });
  const engagementRecords = listDirectJson(".codex/client-management/engagements")
    .map((recordPath) => {
      const engagement = readJson(recordPath);
      return {
        engagementId: engagement.engagementId,
        clientId: engagement.clientId,
        projectId: engagement.projectId,
        systemType: engagement.systemType,
        currentPhase: engagement.currentPhase,
        paymentStatus: engagement.paymentStatus,
        recordPath
      };
    });
  const deliverableRecords = listDirectJson(".codex/client-management/deliverables")
    .map((recordPath) => {
      const deliverable = readJson(recordPath);
      return {
        deliverableId: deliverable.deliverableId,
        engagementId: deliverable.engagementId,
        deliverableType: deliverable.deliverableType,
        status: deliverable.status,
        reviewStatus: deliverable.reviewStatus,
        recordPath
      };
    });
  const accessRequestRecords = listDirectJson(".codex/client-management/access-requests")
    .map((recordPath) => {
      const accessRequest = readJson(recordPath);
      return {
        accessRequestId: accessRequest.accessRequestId,
        clientId: accessRequest.clientId,
        platform: accessRequest.platform,
        accessType: accessRequest.accessType,
        status: accessRequest.status,
        recordPath
      };
    });
  const clientApprovalRecords = listDirectJson(".codex/client-management/approvals")
    .map((approvalPath) => {
      const approval = readJson(approvalPath);
      return {
        approvalId: approval.approvalId,
        clientId: approval.clientId,
        itemType: approval.itemType,
        status: approval.status,
        blockerLevel: approval.blockerLevel,
        recordPath: approvalPath
      };
    });
  const contentSprintRecords = listDirectJson(".codex/client-management/content-sprints")
    .map((recordPath) => {
      const sprint = readJson(recordPath);
      return {
        sprintId: sprint.sprintId,
        status: sprint.status,
        mode: sprint.mode,
        targetRepo: sprint.targetRepo,
        targetBranch: sprint.targetBranch,
        targetPullRequestUrl: sprint.targetPullRequestUrl,
        targetPullRequestNumber: sprint.targetPullRequestNumber,
        targetHeadSha: sprint.targetHeadSha,
        calendarDays: sprint.calendarDays,
        draftPostPackageCount: sprint.draftPostPackageCount,
        weeklyReportDraftCount: sprint.weeklyReportDraftCount,
        postsReviewedCount: sprint.postsReviewedCount ?? 0,
        postsRevisedCount: sprint.postsRevisedCount ?? 0,
        approvedDraftCount: sprint.approvedDraftCount ?? 0,
        ownerApprovedDraftCount: sprint.ownerApprovedDraftCount ?? 0,
        weeklyReportApprovalStatus: sprint.weeklyReportApprovalStatus ?? "not_recorded",
        needsRevisionCount: sprint.needsRevisionCount ?? 0,
        blockedByMissingProofCount: sprint.blockedByMissingProofCount ?? 0,
        blockedByMissingHandleCount: sprint.blockedByMissingHandleCount ?? 0,
        pendingDraftApprovalCount: sprint.pendingDraftApprovalCount,
        ownerDraftApproval: sprint.ownerDraftApproval ?? null,
        platforms: sprint.platforms ?? [],
        safety: sprint.safety ?? {},
        updatedAt: sprint.updatedAt,
        recordPath
      };
    });
  const hasClients = clientRecords.length > 0;
  return {
    directoryExists: existsSync(path.join(root, ".codex/client-management")),
    clientCount: clientRecords.length,
    engagementCount: engagementRecords.length,
    deliverableCount: deliverableRecords.length,
    contentSprintCount: contentSprintRecords.length,
    accessRequestCount: accessRequestRecords.length,
    pendingApprovalCount: clientApprovalRecords.filter((approval) => approval.status === "pending").length,
    clients: clientRecords,
    engagements: engagementRecords,
    deliverables: deliverableRecords,
    contentSprints: latestBy(contentSprintRecords, "updatedAt"),
    accessRequests: accessRequestRecords,
    pendingApprovals: clientApprovalRecords.filter((approval) => approval.status === "pending"),
    zeroState: hasClients ? "Owner-approved client records are registered." : "No real clients are registered yet."
  };
}

function collectFirstClientReadiness(clientManagement) {
  const sourceRecord = "docs/first-client-intake-needed.md";
  const content = existsSync(path.join(root, sourceRecord)) ? readText(sourceRecord) : "";
  const missingRequiredFields = [...content.matchAll(/- `([^`]+)`: `REQUIRED_[^`]+`/g)]
    .map((match) => match[1]);
  const activeRecordCount = clientManagement.clientCount +
    clientManagement.engagementCount +
    clientManagement.deliverableCount +
    clientManagement.accessRequestCount +
    clientManagement.pendingApprovalCount;

  if (activeRecordCount > 0) {
    const firstClient = clientManagement.clients[0];
    return {
      status: "active_draft_configured",
      sourceRecord: firstClient?.recordPath ?? ".codex/client-management/clients",
      activeClientRecordsCreated: true,
      activeRecordCount,
      missingRequiredFieldCount: 0,
      missingRequiredFields: [],
      canCreateActiveRecords: true,
      currentMode: "draft/staging only",
      nextOwnerDecision: "Provide official platform handles or approve a separate Social OAuth readiness package. OAuth, posting, scheduling, analytics, and n8n activation remain blocked.",
      safetyDefaults: [
        "platform accounts remain not_connected",
        "posting mode remains draft_only",
        "approval_required remains true",
        "live_posting_blocked remains true",
        "no credentials or social OAuth",
        "no posting, scheduling, analytics API, or n8n activation"
      ]
    };
  }

  return {
    status: missingRequiredFields.length > 0 ? "intake_needed" : "ready_for_owner_review",
    sourceRecord,
    activeClientRecordsCreated: activeRecordCount > 0,
    activeRecordCount,
    missingRequiredFieldCount: missingRequiredFields.length,
    missingRequiredFields,
    canCreateActiveRecords: missingRequiredFields.length === 0,
    currentMode: "draft/staging only",
    nextOwnerDecision: missingRequiredFields.length > 0
      ? "Provide owner-approved real values for every required first-client field before AG OS creates active client records."
      : "Review the completed first-client values before AG OS creates active client records.",
    safetyDefaults: [
      "platform accounts remain not_connected",
      "posting mode remains draft_only",
      "approval_required remains true",
      "live_posting_blocked remains true",
      "no credentials or social OAuth",
      "no posting, scheduling, analytics API, or n8n activation"
    ]
  };
}

function collectQualityReview() {
  const critiques = latestBy(listDirectJson(".codex/critiques")
    .filter((recordPath) => path.basename(recordPath).startsWith("critique-"))
    .map((recordPath) => {
      const record = readJson(recordPath);
      return {
        critiqueId: record.critiqueId,
        sourcePlanId: record.sourcePlanId,
        archetypeId: record.archetypeId,
        reviewStatus: record.reviewStatus,
        blocksBuildMode: record.blocksBuildMode,
        findingCount: record.findings?.length ?? 0,
        requiredFixCount: record.requiredFixes?.length ?? 0,
        createdAt: record.createdAt,
        recordPath
      };
    }), "createdAt");
  const qualityScores = latestBy(listDirectJson(".codex/quality-scores")
    .filter((recordPath) => path.basename(recordPath).startsWith("quality-score-"))
    .map((recordPath) => {
      const record = readJson(recordPath);
      return {
        scoreId: record.scoreId,
        scoreType: record.scoreType,
        status: record.status,
        projectId: record.projectId,
        archetypeId: record.archetypeId,
        overallScore: record.overallScore,
        reviewStatus: record.reviewStatus,
        updatedAt: record.updatedAt,
        recordPath
      };
    }), "updatedAt");
  const candidateLessons = latestBy(listDirectJson(".codex/memory/lessons/candidates")
    .filter((recordPath) => path.basename(recordPath).startsWith("lesson-"))
    .map((recordPath) => {
      const record = readJson(recordPath);
      return {
        lessonId: record.lessonId,
        title: record.title,
        status: record.status,
        updatedAt: record.updatedAt,
        recordPath
      };
    }), "updatedAt");
  const acceptedLessons = [
    ...listDirectJson(".codex/memory/accepted"),
    ...listDirectJson(".codex/memory/lessons")
  ]
    .filter((recordPath) => path.basename(recordPath).startsWith("lesson-"));
  return {
    critiquesCount: critiques.length,
    latestCritiques: critiques.slice(0, 5),
    reviewRequiredCount: critiques.filter((critique) => critique.blocksBuildMode || critique.reviewStatus === "review").length,
    failedCount: critiques.filter((critique) => critique.reviewStatus === "fail").length,
    qualityScoreCount: qualityScores.length,
    latestQualityScores: qualityScores.slice(0, 5),
    candidateLessonCount: candidateLessons.length,
    acceptedLessonCount: acceptedLessons.length,
    candidatesLoadedAsTruth: false
  };
}

function lessonSummary(recordPath) {
  const record = readJson(recordPath);
  return {
    lessonId: record.lessonId,
    title: record.title,
    scope: record.scope,
    status: record.status,
    confidence: record.confidence,
    updatedAt: record.updatedAt,
    recordPath
  };
}

function collectUnifiedMemory() {
  const registry = readJsonIfExists(".codex/memory/registry.json");
  const acceptedLessons = latestBy([
    ...listDirectJson(".codex/memory/accepted"),
    ...listDirectJson(".codex/memory/lessons")
  ]
    .filter((recordPath) => path.basename(recordPath).startsWith("lesson-"))
    .map(lessonSummary)
    .filter((lesson) => lesson.status === "accepted"), "updatedAt");
  const candidateLessons = latestBy(listDirectJson(".codex/memory/lessons/candidates")
    .filter((recordPath) => path.basename(recordPath).startsWith("lesson-"))
    .map(lessonSummary)
    .filter((lesson) => lesson.status === "candidate"), "updatedAt");
  const rejectedLessons = latestBy(listDirectJson(".codex/memory/rejected")
    .filter((recordPath) => path.basename(recordPath).startsWith("lesson-"))
    .map(lessonSummary), "updatedAt");
  const conflicts = latestBy(listDirectJson(".codex/memory/conflicts")
    .filter((recordPath) => path.basename(recordPath).startsWith("lesson-"))
    .map((recordPath) => {
      const record = readJson(recordPath);
      return {
        promotionId: record.promotionId,
        candidateLessonId: record.candidateLessonId,
        existingLessonId: record.existingLessonId ?? "not_recorded",
        status: record.status,
        updatedAt: record.updatedAt,
        recordPath
      };
    }), "updatedAt");
  const staleLessons = candidateLessons.filter((lesson) => lesson.status === "stale_needs_review");
  const decisionQueue = [
    ...candidateLessons.map((lesson) => ({
      id: `review-${lesson.lessonId}`,
      decisionType: "candidate_lesson_review",
      status: "review_needed",
      lessonId: lesson.lessonId,
      detail: "Owner can promote, reject, or leave candidate advisory.",
      recordPath: lesson.recordPath
    })),
    ...conflicts.map((conflict) => ({
      id: `resolve-${conflict.promotionId}`,
      decisionType: "lesson_conflict_resolution",
      status: "blocked",
      lessonId: conflict.candidateLessonId,
      detail: `Conflict with ${conflict.existingLessonId}; resolve before promotion.`,
      recordPath: conflict.recordPath
    })),
    ...staleLessons.map((lesson) => ({
      id: `stale-${lesson.lessonId}`,
      decisionType: "stale_lesson_review",
      status: "review_needed",
      lessonId: lesson.lessonId,
      detail: "Candidate has aged past the review window and should be refreshed, rejected, or kept advisory.",
      recordPath: lesson.recordPath
    }))
  ];

  return {
    status: registry?.status ?? "missing",
    registryPath: ".codex/memory/registry.json",
    acceptedCount: acceptedLessons.length,
    candidateCount: candidateLessons.length,
    rejectedCount: rejectedLessons.length,
    conflictCount: conflicts.length,
    staleCount: staleLessons.length,
    decisionQueueCount: decisionQueue.length,
    candidatesLoadedAsTruth: false,
    rejectedLoadedAsTruth: false,
    acceptedLessonsLoadedByRuntime: registry?.runtimeLoading?.acceptedLessonsLoadedByRuntime === true,
    memoryGrantsPermission: false,
    skillsGrantPermission: false,
    latestAcceptedLessons: acceptedLessons.slice(0, 5),
    latestCandidateLessons: candidateLessons.slice(0, 5),
    latestRejectedLessons: rejectedLessons.slice(0, 5),
    conflicts: conflicts.slice(0, 5),
    decisionQueue: decisionQueue.slice(0, 10),
    scopes: Object.keys(registry?.scopeDefinitions ?? {}),
    sourceRecords: [
      ".codex/memory/registry.json",
      ".codex/memory/accepted",
      ".codex/memory/lessons/candidates",
      ".codex/memory/rejected",
      ".codex/memory/conflicts",
      "scripts/load-accepted-lessons.mjs",
      "scripts/process-lesson-promotion.mjs"
    ]
  };
}

function collectSkills() {
  const skills = listDirectJson(".codex/skills")
    .map((recordPath) => {
      const record = readJson(recordPath);
      return {
        id: record.id,
        name: record.name,
        status: record.status,
        category: record.category,
        recordPath
      };
    });
  return {
    draftCount: skills.filter((skill) => skill.status === "draft").length,
    activeCount: skills.filter((skill) => skill.status === "active").length,
    skillsGrantPermission: false,
    skills
  };
}

function collectSocialPosting({ firstContentSprint }) {
  const accounts = listDirectJson(".codex/social/accounts")
    .map((recordPath) => ({ ...readJson(recordPath), recordPath }));
  const posts = listDirectJson(".codex/social/posts")
    .map((recordPath) => ({ ...readJson(recordPath), recordPath }));
  const publishApprovals = listDirectJson(".codex/social/publish-approvals")
    .map((recordPath) => ({ ...readJson(recordPath), recordPath }));
  const preflightRecords = listDirectJson(".codex/social/preflight")
    .map((recordPath) => ({ ...readJson(recordPath), recordPath }));
  const policy = readJsonIfExists(".codex/social/policies/production-posting-policy.json");
  const instagram = accounts.find((account) => account.platform === "Instagram") ?? null;
  const sprintInstagram = firstContentSprint?.platforms?.find((platform) => platform.platform === "Instagram") ?? null;
  const credentialReference = instagram?.credentialRefId
    ? readJsonIfExists(`.codex/credentials/${instagram.credentialRefId}.json`)
    : null;
  const instagramOauthPreflight = preflightRecords.find((record) =>
    record.targetPlatform === "Instagram" &&
    record.targetHandle === "@agdigitalz" &&
    record.requestedAction === "execute_oauth"
  ) ?? null;
  const readyForPublishApproval = posts.filter((post) =>
    ["ready_for_live_publish_approval", "owner_approved_for_single_publish"].includes(post.lifecycleState ?? post.status)
  );
  const exactPublishApprovals = publishApprovals.filter((approval) =>
    ["approved", "active"].includes(approval.status) &&
    approval.approvalType === "single_post_publish"
  );
  const approvedDraftPostsCount = firstContentSprint?.ownerApprovedDraftCount ?? firstContentSprint?.approvedDraftCount ?? 0;
  const weeklyReportApprovalStatus = firstContentSprint?.weeklyReportApprovalStatus ?? "not_recorded";
  const blockedPublishReasons = unique([
    instagram?.accountState !== "connected_draft_only" ? "account_not_connected" : null,
    credentialReference?.status !== "approved_reference" ? "secure_credential_reference_missing" : null,
    instagram?.oauthStatus !== "connected" ? "oauth_not_executed" : null,
    instagramOauthPreflight?.blockedReasons?.includes("final_owner_approval_missing") ? "final_owner_approval_missing" : null,
    instagramOauthPreflight?.blockedReasons?.includes("social_oauth_connector_missing") ? "social_oauth_connector_missing" : null,
    exactPublishApprovals.length === 0 ? "exact_single_post_publish_approval_missing" : null,
    instagram?.livePostingBlocked !== false ? "live_posting_blocked" : null,
    instagram?.schedulingBlocked !== false ? "scheduling_blocked" : null,
    instagram?.analyticsBlocked !== false ? "analytics_blocked" : null,
    instagram?.n8nActivationBlocked !== false ? "n8n_activation_blocked" : null
  ]);

  return {
    status: "foundation_active",
    mode: "source_controlled_read_model",
    targetPlatform: "Instagram",
    targetHandle: instagram?.handle ?? sprintInstagram?.handle ?? "not_recorded",
    handleStatus: instagram?.handleStatus ?? sprintInstagram?.handleStatus ?? "not_recorded",
    accountId: instagram?.accountId ?? "not_recorded",
    accountState: instagram?.accountState ?? "not_recorded",
    connectionMode: instagram?.connectionMode ?? "not_recorded",
    oauthStatus: instagram?.oauthStatus ?? "not_recorded",
    credentialRefId: instagram?.credentialRefId ?? null,
    credentialStorageStatus: instagram?.credentialStorageStatus ?? "not_recorded",
    credentialReferenceStatus: credentialReference?.status ?? "not_recorded",
    credentialReferenceProvider: credentialReference?.provider ?? "not_recorded",
    credentialStorageBackend: credentialReference?.storageBackend ?? "not_recorded",
    credentialReferenceRepoSafe: credentialReference?.repoSafe ?? false,
    credentialReferenceSecretStoredInRepo: credentialReference?.secretValueStoredInRepo ?? false,
    credentialStoreReadiness: credentialReference?.status === "approved_reference" &&
      credentialReference?.secretValueStoredInRepo === false &&
      credentialReference?.repoSafe === true
      ? "reference_ready"
      : "blocked",
    oauthPreflightStatus: instagramOauthPreflight?.status ?? "not_recorded",
    oauthPreflightBlockedReasons: instagramOauthPreflight?.blockedReasons ?? [],
    oauthConnectorPathAvailable: !instagramOauthPreflight?.blockedReasons?.includes("social_oauth_connector_missing"),
    oauthExecutionReady: instagramOauthPreflight?.status === "ready_after_approval" &&
      !instagramOauthPreflight?.blockedReasons?.includes("social_oauth_connector_missing"),
    credentialsStoredInRepo: instagram?.credentialsStoredInRepo ?? false,
    postingMode: instagram?.postingMode ?? "draft_only",
    ownerApprovalRequired: instagram?.ownerApprovalRequired ?? true,
    livePostingBlocked: instagram?.livePostingBlocked ?? true,
    schedulingBlocked: instagram?.schedulingBlocked ?? true,
    analyticsBlocked: instagram?.analyticsBlocked ?? true,
    dmCommentsBlocked: instagram?.dmCommentsBlocked ?? true,
    n8nActivationBlocked: instagram?.n8nActivationBlocked ?? true,
    paidToolsAllowed: instagram?.paidToolsAllowed ?? false,
    approvedDraftPostsCount,
    weeklyReportApprovalStatus,
    postsReadyForPublishApproval: readyForPublishApproval.length,
    exactSinglePostApprovalCount: exactPublishApprovals.length,
    connectorPreflightCount: preflightRecords.length,
    blockedPublishReasons,
    nextRequiredOwnerApproval: instagram?.nextRequiredApproval ??
      "Approve Instagram OAuth execution first; separate exact single-post approval is still required before AG OS can post.",
    permissionModel: {
      oauthDoesNotAuthorizePosting: policy?.rules?.oauthImpliesPostingApproval === false,
      connectedDraftOnlyDoesNotAuthorizePosting: policy?.rules?.connectedDraftOnlyImpliesPostingApproval === false,
      draftApprovalDoesNotAuthorizePosting: policy?.rules?.draftApprovalImpliesPostingApproval === false,
      singlePostRequiresExactOwnerApproval: policy?.rules?.singlePostRequiresExactOwnerApproval === true,
      schedulingRequiresSeparateOwnerApproval: policy?.rules?.schedulingRequiresSeparateOwnerApproval === true,
      analyticsRequiresSeparateOwnerApproval: policy?.rules?.analyticsRequiresSeparateOwnerApproval === true,
      memoryCanGrantPermission: policy?.rules?.memoryCanGrantPermission === true,
      skillsCanGrantPermission: policy?.rules?.skillsCanGrantPermission === true,
      candidateLessonsCanGrantPermission: policy?.rules?.candidateLessonsCanGrantPermission === true
    },
    requestedPermissions: instagram?.permissions?.requested ?? [],
    excludedPermissions: instagram?.permissions?.excluded ?? [],
    blockedActions: instagram?.blockedActions ?? [],
    sourceRecords: [
      instagram?.recordPath,
      ".codex/social/policies/production-posting-policy.json",
      firstContentSprint?.recordPath,
      credentialReference ? `.codex/credentials/${credentialReference.credentialRefId}.json` : null,
      instagramOauthPreflight?.recordPath,
      "docs/social-posting-os.md",
      "docs/social-posting-production-policy.md",
      "docs/instagram-oauth-execution-preflight.md",
      "docs/social-permission-matrix.md"
    ].filter(Boolean)
  };
}

function collectOwnerAttention({ firstClientReadiness, approvals, qualityReview, connectorAuth, socialPosting }) {
  const attention = [];

  for (const record of connectorAuth?.records ?? []) {
    if (record.authStatus !== "authenticated") {
      attention.push({
        id: `connector-auth-${record.connectorId}`,
        status: "review",
        title: `Connector auth: ${record.connectorId}`,
        detail: `Last known auth status is ${record.authStatus} (observed ${record.lastObservedAt} via ${record.observationSource}).`,
        action: "Re-authenticate or verify this connector before gated execution work.",
        sourceRecord: record.recordPath
      });
    }
  }

  if (firstClientReadiness.status === "intake_needed") {
    attention.push({
      id: "first-client-intake-needed",
      status: "blocked",
      title: "First client intake",
      detail: `${firstClientReadiness.missingRequiredFieldCount} required field(s) still use REQUIRED_ placeholders.`,
      action: firstClientReadiness.nextOwnerDecision,
      sourceRecord: firstClientReadiness.sourceRecord
    });
  }

  if (approvals.blockedCount > 0 || approvals.staleWarningCount > 0) {
    attention.push({
      id: "approval-lock-review",
      status: "review",
      title: "Approval locks",
      detail: `${approvals.blockedCount} blocked approval(s), ${approvals.staleWarningCount} stale warning(s).`,
      action: "Review blocked or stale approval locks before executing gated work.",
      sourceRecord: ".codex/approvals/"
    });
  }

  if (qualityReview.reviewRequiredCount > 0 || qualityReview.failedCount > 0) {
    attention.push({
      id: "quality-review-needed",
      status: "review",
      title: "Quality review",
      detail: `${qualityReview.reviewRequiredCount} critique(s) require review; ${qualityReview.failedCount} failed.`,
      action: "Revise plans or obtain explicit owner override before build-mode promotion.",
      sourceRecord: ".codex/critiques/"
    });
  }

  attention.push({
    id: "live-social-integrations-blocked",
    status: "blocked",
    title: "Live social integrations",
    detail: "OAuth, credentials, posting, scheduling, analytics API, and n8n activation remain blocked.",
    action: "Use future approval packages before any live integration work.",
    sourceRecord: "docs/social-media-management-system-v1-future-connectors.md"
  });

  if (socialPosting?.targetHandle === "@agdigitalz" && socialPosting?.oauthStatus !== "connected") {
    attention.push({
      id: "instagram-oauth-execution-needed",
      status: "blocked",
      title: "Instagram OAuth execution",
      detail: `${socialPosting.targetHandle} remains ${socialPosting.accountState}; automated posting cannot start.`,
      action: socialPosting.nextRequiredOwnerApproval,
      sourceRecord: ".codex/social/accounts/ag-digitalz-instagram.json"
    });
  }

  attention.push({
    id: "manual-posting-available",
    status: "ready",
    title: "Manual posting available",
    detail: "AG Digitalz approved drafts can be copied/exported for owner manual use while AG OS automation posting remains blocked.",
    action: "Use the staged Social Media Manual Posting Pack manually, or approve a future OAuth package separately.",
    sourceRecord: ".codex/connectors/connector-exec-20260705-ag-digitalz-manual-posting-pack-v1-netlify-staging-live-result.json"
  });

  return attention;
}

function collectDashboardActionQueue({
  approvals,
  firstClientReadiness,
  firstContentSprint,
  qualityReview,
  latestSocialMediaStaging
}) {
  const approvalPackagesReady = collectApprovalPackageTemplates();
  const missingHandles = (firstContentSprint?.platforms ?? [])
    .filter((platform) => platform.handleStatus === "pending_owner_input")
    .map((platform) => platform.platform);
  const ownerDecisionsNeeded = [];

  if (firstClientReadiness.status === "intake_needed") {
    ownerDecisionsNeeded.push({
      id: "first-client-intake",
      status: "blocked",
      decision: "Provide required first-client fields",
      detail: `${firstClientReadiness.missingRequiredFieldCount} required field(s) remain unresolved.`,
      sourceRecord: firstClientReadiness.sourceRecord
    });
  }

  if (missingHandles.length > 0) {
    ownerDecisionsNeeded.push({
      id: "missing-social-handles",
      status: "waiting_owner",
      decision: "Provide remaining public platform handles",
      detail: `${missingHandles.join(", ")} remain not_provided / pending_owner_input.`,
      sourceRecord: firstContentSprint.recordPath
    });
  }

  if (approvals.staleWarningCount > 0) {
    ownerDecisionsNeeded.push({
      id: "stale-approval-review",
      status: "review",
      decision: "Review stale or blocked approvals",
      detail: `${approvals.staleWarningCount} stale/blocking approval warning(s) are present.`,
      sourceRecord: ".codex/approvals/"
    });
  }

  if (qualityReview.reviewRequiredCount > 0 || qualityReview.failedCount > 0) {
    ownerDecisionsNeeded.push({
      id: "quality-review",
      status: "review",
      decision: "Resolve review-required critiques",
      detail: `${qualityReview.reviewRequiredCount} critique(s) require review; ${qualityReview.failedCount} failed.`,
      sourceRecord: ".codex/critiques/"
    });
  }

  ownerDecisionsNeeded.push({
    id: "credential-store-decision",
    status: "blocked",
    decision: "Choose secure credential store before OAuth",
    detail: "Instagram OAuth remains blocked until a secure credential store and connector path are approved.",
    sourceRecord: "docs/instagram-oauth-readiness-package.md"
  });

  const blockedActions = [
    {
      id: "social-oauth",
      status: "blocked",
      reason: "No approved secure credential store or OAuth execution connector.",
      sourceRecord: "docs/instagram-oauth-readiness-package.md"
    },
    {
      id: "automated-posting",
      status: "blocked",
      reason: "Posting and scheduling are outside current approval scope.",
      sourceRecord: firstContentSprint?.recordPath ?? ".codex/client-management/content-sprints/"
    },
    {
      id: "analytics-api",
      status: "blocked",
      reason: "Analytics API use needs separate connector, credential, and owner approval gates.",
      sourceRecord: "docs/social-oauth-readiness-package.md"
    },
    {
      id: "n8n-live-activation",
      status: "blocked",
      reason: "n8n proof is inactive draft only; activation requires separate approval.",
      sourceRecord: "docs/n8n-draft-workflow-approval-package.md"
    },
    {
      id: "production-domain",
      status: "blocked",
      reason: "Production deployment, custom domain, and DNS changes require separate owner approval.",
      sourceRecord: "docs/action-matrix.md"
    }
  ];

  const manualPostingAvailable = Boolean(
    firstContentSprint?.ownerApprovedDraftCount > 0 &&
    firstContentSprint?.safety?.postingTriggered === false
  );

  return {
    status: ownerDecisionsNeeded.some((item) => item.status === "blocked") ? "blocked" : "ready",
    mode: "read_only",
    ownerDecisionCount: ownerDecisionsNeeded.length,
    blockedActionCount: blockedActions.length,
    approvalPackageCount: approvalPackagesReady.length,
    staleApprovalCount: approvals.staleApprovals.length,
    manualPostingAvailable,
    manualPostingDetail: manualPostingAvailable
      ? `${firstContentSprint.ownerApprovedDraftCount} owner-approved draft post package(s) can be used manually while automation remains blocked.`
      : "Manual posting pack is not available from current records.",
    oauthBlockedReason: "OAuth is blocked until secure credential storage and an approved connector path exist.",
    credentialStoreMissingReason: "No approved credential store record is active; tokens remain forbidden in repo, chat, and source-controlled files.",
    nextSafeCommand: "Run Connector Preflight Runtime v1 locally after source PRs merge and GitHub connector auth is restored.",
    latestStagingUrl: latestSocialMediaStaging?.siteUrl ?? "Not recorded",
    ownerDecisionsNeeded,
    blockedActions,
    approvalPackagesReady,
    approvalBatch: {
      mode: "read_only",
      standingApprovals: approvals.standingApprovals,
      ownerDecisions: ownerDecisionsNeeded,
      approvalPackages: approvalPackagesReady,
      writeActionsAllowed: false,
      batchApprovalGrantsPermission: false
    },
    staleApprovals: approvals.staleApprovals,
    safeNextMilestones: [
      {
        id: "connector-preflight-runtime-v1",
        status: "safe_local_next",
        detail: "Add read-only preflight checks for connector availability, exact approval scope, cost, rollback, and stop conditions."
      },
      {
        id: "business-loop-v1",
        status: "safe_source_next",
        detail: "Formalize the AG Digitalz content loop from idea through manual posting pack and weekly report without live social actions."
      },
      {
        id: "secure-credential-store-readiness",
        status: "planning_only",
        detail: "Prepare credential-store policy before OAuth or token handling."
      }
    ],
    sourceRecords: [
      ".codex/approvals/",
      firstContentSprint?.recordPath,
      latestSocialMediaStaging?.recordPath,
      "docs/dashboard-action-queue.md"
    ].filter(Boolean)
  };
}

export function collectDashboardData() {
  const constitution = readText("docs/ag-os-constitution-v1.md");
  const projectRegistry = readJson(".codex/projects/registry.json");
  const connectorRegistry = readJson(".codex/connectors/registry.json");
  const commandRegistry = readJson(".codex/commands/registry.json");
  const costBudget = readJson(".codex/costs/budget.json");
  const capabilityRegistry = readJson(".codex/capabilities/registry.json");
  const watchdogPolicy = readJson(".codex/watchdog/policy.json");
  const memoryPolicy = readJson(".codex/memory/policy.json");
  const qualityPolicy = readJson(".codex/quality/policy.json");
  const securityPolicy = readJson(".codex/security/policy.json");

  const projects = projectRegistry.projects.map(projectRecord);
  const leadGen = projects.find((project) => project.id === "project-lead-generation-system");
  const aiReceptionist = projects.find((project) => project.id === "project-ag-digitalz-ai-receptionist");
  const socialMedia = projects.find((project) => project.id === "project-social-media-management-system-v1");

  if (!leadGen) {
    throw new Error("Dashboard data missing Lead Generation System project record.");
  }
  if (!aiReceptionist) {
    throw new Error("Dashboard data missing AG Digitalz AI Receptionist project record.");
  }
  if (!socialMedia) {
    throw new Error("Dashboard data missing Social Media Management System v1 project record.");
  }

  const connectorExecutions = collectConnectorExecutions();
  const netlifyRecords = connectorExecutions
    .filter((record) => record.connectorId === "connector-netlify-mcp")
    .map(summarizeNetlify);
  const n8nRecords = connectorExecutions
    .filter((record) => record.connectorId === "connector-n8n-mcp")
    .map(summarizeN8n);
  const githubRecords = connectorExecutions
    .filter((record) => record.connectorId === "connector-github-mcp")
    .map(summarizeGithub);
  const capabilities = capabilityRegistry.capabilities.map(summarizeCapability);
  const approvals = collectApprovals();
  const qualityReview = collectQualityReview();
  const connectorAuth = collectConnectorAuth();
  const unifiedMemory = collectUnifiedMemory();
  const costReadModel = collectCosts(costBudget);
  const skills = collectSkills();
  const clientManagement = collectClientManagement();
  const firstClientReadiness = collectFirstClientReadiness(clientManagement);
  const socialMediaBuildRecord = latestConnectorRecord(
    githubRecords,
    (record) => record.projectId === "project-social-media-management-system-v1" &&
      record.action === "create_branch_update_files_open_pr"
  );
  const socialMediaMergeRecord = latestConnectorRecord(
    githubRecords,
    (record) => record.projectId === "project-social-media-management-system-v1" &&
      record.action === "merge_pr" &&
      record.result?.pullRequestMerged === true
  );
  const socialMediaStagingRecords = latestBy(
    netlifyRecords.filter((record) => record.siteName === "ag-social-media-management-system-staging"),
    "verifiedAt"
  );
  const latestSocialMediaStaging = socialMediaStagingRecords[0] ?? null;
  const socialMediaContentSprintBuildRecord = latestConnectorRecord(
    githubRecords,
    (record) => record.id === "connector-exec-20260704-ag-digitalz-first-content-sprint-build-live-result"
  );
  const socialMediaContentSprintMergeRecord = latestConnectorRecord(
    githubRecords,
    (record) => record.id === "connector-exec-20260704-target-pr-merge-ag-digitalz-first-content-sprint-v1-live-result"
  );
  const socialMediaContentSprintStagingRecord = latestConnectorRecord(
    netlifyRecords,
    (record) => record.id === "connector-exec-20260704-ag-digitalz-first-content-sprint-netlify-staging-live-result"
  );
  const socialMediaContentReviewBuildRecord = latestConnectorRecord(
    githubRecords,
    (record) => record.id === "connector-exec-20260704-ag-digitalz-content-review-build-live-result"
  );
  const socialMediaContentReviewMergeRecord = latestConnectorRecord(
    githubRecords,
    (record) => record.id === "connector-exec-20260704-target-pr-merge-ag-digitalz-content-review-v1-live-result"
  );
  const socialMediaContentReviewStagingRecord = latestConnectorRecord(
    netlifyRecords,
    (record) => record.id === "connector-exec-20260704-ag-digitalz-content-review-netlify-staging-live-result"
  );
  const socialMediaInteractiveUiBuildRecord = latestConnectorRecord(
    githubRecords,
    (record) => record.id === "connector-exec-20260705-social-media-interactive-draft-ui-build-live-result"
  );
  const socialMediaInteractiveUiStagingRecord = latestConnectorRecord(
    netlifyRecords,
    (record) => record.id === "connector-exec-20260705-social-media-interactive-draft-ui-netlify-staging-live-result"
  );
  const socialMediaInstagramHandleBuildRecord = latestConnectorRecord(
    githubRecords,
    (record) => record.id === "connector-exec-20260705-ag-digitalz-instagram-handle-build-live-result"
  );
  const socialMediaInstagramHandleStagingRecord = latestConnectorRecord(
    netlifyRecords,
    (record) => record.id === "connector-exec-20260705-ag-digitalz-instagram-handle-netlify-staging-live-result"
  );
  const socialMediaManualPostingBuildRecord = latestConnectorRecord(
    githubRecords,
    (record) => record.id === "connector-exec-20260705-ag-digitalz-manual-posting-pack-v1-build-live-result"
  );
  const socialMediaManualPostingStagingRecord = latestConnectorRecord(
    netlifyRecords,
    (record) => record.id === "connector-exec-20260705-ag-digitalz-manual-posting-pack-v1-netlify-staging-live-result"
  );
  const firstContentSprint = clientManagement.contentSprints[0] ?? null;
  const socialPosting = collectSocialPosting({ firstContentSprint });
  const systemBlockers = [
    ...approvals.blockedApprovals.map((approval) => `Blocked approval: ${approval.approvalId}`)
  ];
  const activeWarnings = [
    ...(approvals.staleWarningCount > 0 ? [`${approvals.staleWarningCount} stale or blocked approval warning(s)`] : []),
    ...(qualityReview.reviewRequiredCount > 0 ? [`${qualityReview.reviewRequiredCount} critique(s) require review`] : []),
    ...(qualityReview.candidatesLoadedAsTruth ? ["Candidate lessons are incorrectly loaded as truth"] : [])
  ];

  return {
    meta: {
      title: "AG OS Control Center",
      version: 1,
      mode: "read_only",
      dataSource: "source-controlled AG OS repository records",
      generatedBy: "scripts/build-dashboard.mjs"
    },
    constitution: {
      status: lineValue(constitution, "Status"),
      version: "v1.0",
      activationDate: lineValue(constitution, "Activation date").replace(".", ""),
      source: "docs/ag-os-constitution-v1.md"
    },
    systemStatus: {
      bootStatus: systemBlockers.length === 0 ? "ready" : "blocked",
      validationStatus: "available via npm.cmd run validate",
      safetyPosture: "read_only_no_live_actions",
      blockedActions: [
        "Production deployment",
        "Domain or DNS changes",
        "Custom domains",
        "Paid services",
        "Credentials or secrets in records",
        "Production/customer/client data",
        "Social posting or scheduling",
        "Social OAuth/account connection",
        "n8n workflow activation",
        "Lead Gen production changes",
        "AI Receptionist repo changes",
        "Constitution changes"
      ],
      activeWarnings,
      sourceRecords: [
        "scripts/boot-check.mjs",
        "scripts/validate-foundation.mjs",
        "docs/ag-os-constitution-v1.md"
      ]
    },
    projectRegistry: {
      status: projectRegistry.status,
      count: projectRegistry.projects.length,
      source: ".codex/projects/registry.json",
      projects: [
        {
          id: "project-ag-os",
          name: "AG OS",
          status: "active",
          managementMode: "core_operating_system",
          projectType: "operating_system",
          riskLevel: "medium",
          owner: "owner-gurnoor-bassi",
          recordPath: "README.md",
          boundary: "Canonical AG OS source-of-truth repository and dashboard/control-plane records."
        },
        ...projects
      ]
    },
    leadGenerationSystem: leadGen,
    aiReceptionist,
    socialMediaSystem: {
      ...socialMedia,
      currentVersion: socialMediaManualPostingBuildRecord
        ? "v1.8 manual posting pack"
        : socialMediaInstagramHandleBuildRecord
        ? "v1.7 Instagram handle"
        : socialMediaInteractiveUiBuildRecord
        ? "v1.6 interactive draft UI"
        : socialMediaContentReviewBuildRecord
        ? (socialMediaContentReviewMergeRecord ? (firstContentSprint?.status === "owner_approved_draft_content_staged_oauth_readiness_prepared" ? "v1.5 owner-approved drafts" : "v1.4") : firstContentSprint?.status === "content_review_target_pr_reviewed_pending_merge" ? "v1.4 reviewed PR" : "v1.4 draft PR")
        : socialMediaContentSprintMergeRecord ? "v1.3"
        : socialMediaContentSprintBuildRecord ? "v1.3 draft PR"
        : socialMediaMergeRecord?.id === "connector-exec-20260704-target-pr-merge-ag-digitalz-draft-config-live-result"
        ? "v1.2"
        : socialMediaMergeRecord ? "v1.1" : "v1",
      lifecycleStatus: socialMediaManualPostingBuildRecord
        ? (socialMediaManualPostingStagingRecord ? "Manual posting pack merged and staged; OAuth and AG OS automated posting remain blocked" : "Manual posting pack merged; staging redeploy pending")
        : socialMediaInstagramHandleBuildRecord
        ? (socialMediaInstagramHandleStagingRecord ? "Instagram public handle recorded and staged; live social actions remain blocked" : "Instagram public handle merged; staging redeploy pending")
        : socialMediaInteractiveUiBuildRecord
        ? (socialMediaInteractiveUiStagingRecord ? "Interactive draft UI merged and staged; live social actions remain blocked" : "Interactive draft UI merged; staging redeploy pending")
        : socialMediaContentReviewBuildRecord
        ? (socialMediaContentReviewStagingRecord ? (firstContentSprint?.status === "owner_approved_draft_content_staged_oauth_readiness_prepared" ? "AG Digitalz draft content approved and staged; handles pending and OAuth readiness package prepared" : "AG Digitalz content review merged and staged; owner content approval pending") : socialMediaContentReviewMergeRecord ? "AG Digitalz content review merged; staging redeploy pending" : firstContentSprint?.status === "content_review_target_pr_reviewed_pending_merge" ? "AG Digitalz content review target PR reviewed; merge pending" : "AG Digitalz content review target PR open; review required")
        : socialMediaContentSprintStagingRecord ? "AG Digitalz first content sprint merged and staged"
        : socialMediaContentSprintMergeRecord ? "AG Digitalz first content sprint merged; staging redeploy pending"
        : socialMediaContentSprintBuildRecord ? "AG Digitalz first content sprint target PR open; review required"
        : socialMediaMergeRecord?.id === "connector-exec-20260704-target-pr-merge-ag-digitalz-draft-config-live-result"
        ? "AG Digitalz draft config merged and staged"
        : socialMediaMergeRecord ? "v1.1 merged and staged" : "starter staged",
      targetRepo: "gurnoorbassi/ag-social-media-management-system",
      targetPullRequestUrl: socialMediaManualPostingBuildRecord?.result?.pullRequestUrl ?? socialMediaInstagramHandleBuildRecord?.result?.pullRequestUrl ?? socialMediaInteractiveUiBuildRecord?.result?.pullRequestUrl ?? socialMediaContentReviewBuildRecord?.result?.pullRequestUrl ?? socialMediaContentSprintBuildRecord?.result?.pullRequestUrl ?? socialMediaBuildRecord?.result?.pullRequestUrl ?? "Not recorded",
      targetPullRequestMerged: socialMediaManualPostingBuildRecord?.result?.pullRequestMerged ?? socialMediaInstagramHandleBuildRecord?.result?.pullRequestMerged ?? socialMediaInteractiveUiBuildRecord?.result?.pullRequestMerged ?? socialMediaContentReviewMergeRecord?.result?.pullRequestMerged ?? (socialMediaContentReviewBuildRecord ? false : socialMediaContentSprintMergeRecord?.result?.pullRequestMerged ?? socialMediaMergeRecord?.result?.pullRequestMerged ?? false),
      targetMergeSha: socialMediaManualPostingBuildRecord?.result?.mergeCommitSha ?? socialMediaInstagramHandleBuildRecord?.result?.mergeCommitSha ?? socialMediaInteractiveUiBuildRecord?.result?.mergeCommitSha ?? socialMediaContentReviewMergeRecord?.result?.mergeCommitSha ?? socialMediaContentSprintMergeRecord?.result?.mergeCommitSha ?? socialMediaMergeRecord?.result?.mergeCommitSha ?? "Not recorded",
      reviewedHeadSha: socialMediaManualPostingBuildRecord?.result?.headSha ?? socialMediaInstagramHandleBuildRecord?.result?.headSha ?? socialMediaInteractiveUiBuildRecord?.result?.headSha ?? socialMediaContentReviewMergeRecord?.result?.headSha ?? socialMediaContentSprintMergeRecord?.result?.headSha ?? socialMediaMergeRecord?.result?.headSha ?? "Not recorded",
      stagingUrl: latestSocialMediaStaging?.siteUrl ?? "Not recorded",
      stagingStatus: latestSocialMediaStaging?.deployStatus ?? "Not recorded",
      latestDeployId: latestSocialMediaStaging?.deployId ?? "Not recorded",
      latestDeploySourceSha: latestSocialMediaStaging?.sourceSha ?? "Not recorded",
      latestDeployVerifiedAt: latestSocialMediaStaging?.verifiedAt ?? "Not recorded",
      latestDeployHttpStatus: latestSocialMediaStaging?.httpStatus ?? "Not recorded",
      netlifyDeployContext: latestSocialMediaStaging?.deployContext ?? "Not recorded",
      stagingInterpretation: latestSocialMediaStaging?.stagingInterpretation ?? "Not recorded",
      currentMode: "draft/staging only",
      firstClientReadiness,
      safetyBlocks: {
        livePostingBlocked: true,
        socialOauthConnected: false,
        schedulingBlocked: true,
        analyticsBlocked: true,
        n8nLiveActivationBlocked: true,
        clientConfigAdded: clientManagement.clientCount > 0
      },
      contentSprint: firstContentSprint ? {
        ...firstContentSprint,
        livePostingBlocked: firstContentSprint.safety?.postingTriggered === false,
        schedulingBlocked: firstContentSprint.safety?.schedulingTriggered === false,
        socialOauthConnected: firstContentSprint.safety?.socialOauthConnected ?? false,
        credentialsStored: firstContentSprint.safety?.credentialsStored ?? false,
        analyticsApiUsed: firstContentSprint.safety?.analyticsApiUsed ?? false,
        n8nActivated: firstContentSprint.safety?.n8nActivated ?? false
      } : {
        sprintId: "not_recorded",
        status: "not_recorded",
        mode: "draft_only",
        targetPullRequestUrl: "Not recorded",
        calendarDays: 0,
        draftPostPackageCount: 0,
        weeklyReportDraftCount: 0,
        ownerApprovedDraftCount: 0,
        weeklyReportApprovalStatus: "not_recorded",
        pendingDraftApprovalCount: 0,
        ownerDraftApproval: null,
        platforms: [],
        livePostingBlocked: true,
        schedulingBlocked: true,
        socialOauthConnected: false,
        credentialsStored: false,
        analyticsApiUsed: false,
        n8nActivated: false
      },
      firstClient: clientManagement.clients[0] ?? null,
      sourceRecords: [
        ".codex/projects/social-media-management-system-v1.json",
        socialMediaBuildRecord?.recordPath,
        socialMediaContentSprintBuildRecord?.recordPath,
        socialMediaContentSprintMergeRecord?.recordPath,
        socialMediaContentSprintStagingRecord?.recordPath,
        socialMediaContentReviewBuildRecord?.recordPath,
        socialMediaContentReviewMergeRecord?.recordPath,
        socialMediaContentReviewStagingRecord?.recordPath,
        socialMediaInteractiveUiBuildRecord?.recordPath,
        socialMediaInteractiveUiStagingRecord?.recordPath,
        socialMediaInstagramHandleBuildRecord?.recordPath,
        socialMediaInstagramHandleStagingRecord?.recordPath,
        socialMediaManualPostingBuildRecord?.recordPath,
        socialMediaManualPostingStagingRecord?.recordPath,
        socialMediaMergeRecord?.recordPath,
        latestSocialMediaStaging?.recordPath,
        firstContentSprint?.recordPath
      ].filter(Boolean)
    },
    connectorRegistry: {
      status: connectorRegistry.status,
      connectedCount: connectorRegistry.connectors.filter((connector) => connector.connectionStatus === "connected").length,
      connectors: connectorRegistry.connectors.map((connector) => `${connector.name}: ${connector.connectionStatus}`)
    },
    commandRegistry: {
      status: commandRegistry.status,
      categoryCount: commandRegistry.categories.length,
      gatedCategories: commandRegistry.categories
        .filter((category) => category.requiresOwnerApproval)
        .map((category) => `${category.id}: approval-gated`)
    },
    costOs: {
      status: costBudget.status,
      monthlyMax: money(costBudget.limits.monthlyMaxUsd, costBudget.currency),
      dailyMax: `Daily max: ${money(costBudget.limits.dailyMaxUsd, costBudget.currency)}`,
      perTaskMax: `Per-task max: ${money(costBudget.limits.perTaskMaxUsd, costBudget.currency)}`,
      paidTools: costBudget.approvalRules.paidToolsRequireOwnerApproval
        ? "Paid tools require owner approval"
        : "Paid tool approval not recorded"
    },
    capabilityRegistry: {
      status: capabilityRegistry.status,
      count: capabilityRegistry.capabilities.length,
      allowedTypes: capabilityRegistry.allowedCapabilityTypes.map(capabilityTypeLabel),
      proven: capabilities.filter((capability) => capability.status === "proven"),
      provenCount: capabilities.filter((capability) => capability.status === "proven").length,
      draftOnly: capabilities.filter(isDraftOnlyCapability),
      draftOnlyCount: capabilities.filter(isDraftOnlyCapability).length,
      blocked: unique(capabilities.flatMap((capability) => capability.blockedCapabilities)),
      blockedCount: unique(capabilities.flatMap((capability) => capability.blockedCapabilities)).length
    },
    watchdog: {
      status: watchdogPolicy.status,
      monitoring: watchdogPolicy.defaults.monitoringEnabled ? "Enabled" : "Disabled",
      plannedChecks: watchdogPolicy.plannedCheckTypes.map((type) => `${type}: planned`)
    },
    memoryOs: {
      status: memoryPolicy.status,
      shortTermDays: memoryPolicy.windows.shortTermDays,
      rules: [
        memoryPolicy.rules.secretsAllowed ? "Secrets allowed" : "Secrets blocked",
        memoryPolicy.rules.customerDataAllowed ? "Customer data allowed" : "Customer data blocked",
        memoryPolicy.rules.productionDataAllowed ? "Production data allowed" : "Production data blocked"
      ]
    },
    qualityOs: {
      status: qualityPolicy.status,
      rules: [
        qualityPolicy.rules?.qualityOverQuantity ? "Quality over quantity" : "Quality rule not recorded",
        qualityPolicy.rules?.ownerReviewRequiredBeforeProduction ? "Owner review before production" : "Owner production review not recorded",
        qualityPolicy.rules?.validationRequiredBeforeMerge ? "Validation required before merge" : "Validation merge rule not recorded"
      ]
    },
    securityOs: {
      status: securityPolicy.status,
      rules: [
        securityPolicy.rules?.secretsFindingBlocksMerge ? "Secrets block merge" : "Secrets merge block not recorded",
        securityPolicy.rules?.leastPrivilegeRequired ? "Least privilege required" : "Least privilege not recorded",
        securityPolicy.rules?.productionDataBlockedByDefault ? "Production data blocked by default" : "Production data block not recorded"
      ]
    },
    clientManagement,
    firstClientReadiness,
    socialPosting,
    ownerAttention: collectOwnerAttention({ firstClientReadiness, approvals, qualityReview, connectorAuth, socialPosting }),
    connectorAuth,
    dashboardActionQueue: collectDashboardActionQueue({
      approvals,
      firstClientReadiness,
      firstContentSprint,
      qualityReview,
      latestSocialMediaStaging
    }),
    approvals,
    connectorProofs: {
      github: githubRecords,
      netlify: netlifyRecords,
      n8n: n8nRecords,
      n8nActiveWorkflowCount: n8nRecords.filter((workflow) => workflow.workflowActive).length,
      n8nActiveWorkflowSource: n8nRecords.length > 0 ? "source-controlled export/connector records only" : "not recorded; no live n8n call"
    },
    qualityReview,
    unifiedMemory,
    costs: costReadModel,
    skills,
    safeMerge: {
      status: "conditional",
      mode: "Policy-gated",
      summary: "Allowed only after CI, local validation, safety review, clear scope, and no blocked risk conditions.",
      sources: ["docs/safe-merge-policy.md", "docs/action-matrix.md"],
      requiredChecks: [
        "GitHub CI succeeds",
        "npm.cmd run validate passes",
        "No credentials or secrets",
        "No live service connection",
        "No deployment",
        "No domain or DNS change",
        "No production or customer data",
        "No paid action",
        "No risky files",
        "No merge conflict"
      ]
    }
  };
}

export function renderDashboardDataModule(data) {
  return `window.AG_OS_DASHBOARD_DATA = ${JSON.stringify(data, null, 2)};\n`;
}

export function writeDashboardData() {
  const outputPath = path.join(root, "dashboard", "dashboard-data.js");
  const data = collectDashboardData();
  writeFileSync(outputPath, renderDashboardDataModule(data));
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  if (!existsSync(path.join(root, "dashboard"))) {
    throw new Error("dashboard directory is missing.");
  }
  writeDashboardData();
  console.log("Dashboard data generated: dashboard/dashboard-data.js");
}
