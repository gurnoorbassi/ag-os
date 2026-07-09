const data = window.AG_OS_DASHBOARD_DATA;

function statusClass(value) {
  const normalized = String(value).toLowerCase();
  if (normalized.includes("ready")) return "status-active";
  if (normalized.includes("pass")) return "status-active";
  if (normalized.includes("not_connected")) return "status-disabled";
  if (normalized.includes("not connected")) return "status-disabled";
  if (normalized.includes("inactive")) return "status-disabled";
  if (normalized.includes("zero")) return "status-zero";
  if (normalized.includes("active")) return "status-active";
  if (normalized.includes("complete")) return "status-complete";
  if (normalized.includes("proven")) return "status-complete";
  if (normalized.includes("connected")) return "status-connected";
  if (normalized.includes("allowed")) return "status-allowed";
  if (normalized.includes("within")) return "status-allowed";
  if (normalized.includes("draft")) return "status-foundation";
  if (normalized.includes("planned")) return "status-foundation";
  if (normalized.includes("foundation")) return "status-foundation";
  if (normalized.includes("conditional")) return "status-conditional";
  if (normalized.includes("observe_only")) return "status-observe_only";
  if (normalized.includes("read_only")) return "status-read_only";
  if (normalized.includes("blocked")) return "status-blocked";
  if (normalized.includes("disabled")) return "status-disabled";
  return "status-foundation";
}

function text(value) {
  return value === undefined || value === null || value === "" ? "Not recorded" : String(value);
}

function boolText(value, trueText = "Yes", falseText = "No") {
  return value ? trueText : falseText;
}

function pill(value) {
  const el = document.createElement("span");
  el.className = `status-pill ${statusClass(value)}`;
  el.textContent = text(value);
  return el;
}

function card({ title, status, metric, detail, meta = [] }) {
  const section = document.createElement("article");
  section.className = "status-card";

  const header = document.createElement("header");
  const heading = document.createElement("h3");
  heading.textContent = title;
  header.append(heading, pill(status));

  const metricEl = document.createElement("div");
  metricEl.className = "metric";
  metricEl.textContent = text(metric);

  const detailEl = document.createElement("p");
  detailEl.textContent = text(detail);

  const list = document.createElement("ul");
  list.className = "meta-list";
  meta.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    list.append(li);
  });

  section.append(header, metricEl, detailEl, list);
  return section;
}

function clear(selector) {
  const root = document.querySelector(selector);
  root.replaceChildren();
  return root;
}

function itemList(items, className = "meta-list") {
  const list = document.createElement("ul");
  list.className = className;
  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = text(item);
    list.append(li);
  });
  return list;
}

function table(headers, rows) {
  const wrap = document.createElement("div");
  wrap.className = "table-wrap";
  const tableEl = document.createElement("table");
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  headers.forEach((header) => {
    const th = document.createElement("th");
    th.textContent = header;
    headRow.append(th);
  });
  thead.append(headRow);

  const tbody = document.createElement("tbody");
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    row.forEach((cell) => {
      const td = document.createElement("td");
      if (cell instanceof Node) {
        td.append(cell);
      } else {
        td.textContent = text(cell);
      }
      tr.append(td);
    });
    tbody.append(tr);
  });
  tableEl.append(thead, tbody);
  wrap.append(tableEl);
  return wrap;
}

function labelStack(title, subtitle) {
  const wrap = document.createElement("div");
  const strong = document.createElement("strong");
  strong.textContent = text(title);
  const span = document.createElement("span");
  span.className = "project-id";
  span.textContent = text(subtitle);
  wrap.append(strong, span);
  return wrap;
}

function renderOverview() {
  const root = clear("#overview-grid");
  root.append(
    card({
      title: "Constitution",
      status: data.constitution.status,
      metric: data.constitution.version,
      detail: `Activated ${data.constitution.activationDate}`,
      meta: [data.constitution.source]
    }),
    card({
      title: "Project Registry",
      status: data.projectRegistry.status,
      metric: `${data.projectRegistry.count} registered`,
      detail: "Production-clean records only",
      meta: ["Lead Gen observe-only", "AI Receptionist product project"]
    }),
    card({
      title: "Safe Merge",
      status: data.safeMerge.status,
      metric: data.safeMerge.mode,
      detail: data.safeMerge.summary,
      meta: data.safeMerge.sources
    }),
    card({
      title: "Boot Status",
      status: data.systemStatus.bootStatus,
      metric: data.systemStatus.bootStatus,
      detail: data.systemStatus.validationStatus,
      meta: data.systemStatus.sourceRecords
    }),
    card({
      title: "Safety Posture",
      status: data.systemStatus.safetyPosture,
      metric: "Read-only",
      detail: "No live connector action is performed by this dashboard.",
      meta: data.systemStatus.blockedActions.slice(0, 6)
    }),
    card({
      title: "Warnings",
      status: data.systemStatus.activeWarnings.length === 0 ? "ready" : "review",
      metric: `${data.systemStatus.activeWarnings.length} active`,
      detail: data.systemStatus.activeWarnings.length === 0 ? "No active warnings recorded in the read model." : "Review required.",
      meta: data.systemStatus.activeWarnings
    })
  );
}

function renderOwnerAttention() {
  const root = clear("#owner-attention-grid");
  data.ownerAttention.forEach((item) => {
    root.append(card({
      title: item.title,
      status: item.status,
      metric: item.status,
      detail: item.action,
      meta: [item.detail, item.sourceRecord]
    }));
  });
}

function renderActionQueue() {
  const queue = data.dashboardActionQueue;
  const grid = clear("#action-queue-grid");
  grid.append(
    card({
      title: "Owner Decisions",
      status: queue.status,
      metric: queue.ownerDecisionCount,
      detail: "Decision queue from AG OS records. This dashboard cannot execute actions.",
      meta: queue.ownerDecisionsNeeded.map((item) => `${item.decision}: ${item.status}`)
    }),
    card({
      title: "Blocked Actions",
      status: queue.blockedActionCount === 0 ? "ready" : "blocked",
      metric: queue.blockedActionCount,
      detail: "Live social, credentials, production, and domain actions remain blocked.",
      meta: queue.blockedActions.map((item) => `${item.id}: ${item.reason}`)
    }),
    card({
      title: "Approval Packages",
      status: queue.approvalPackageCount === 0 ? "zero" : "draft",
      metric: `${queue.approvalPackageCount} ready`,
      detail: "Templates are readiness packages only; they do not grant execution permission.",
      meta: queue.approvalPackagesReady.slice(0, 6).map((item) => `${item.approvalId}: ${item.commandCategory}`)
    }),
    card({
      title: "Manual Posting",
      status: queue.manualPostingAvailable ? "ready" : "blocked",
      metric: boolText(queue.manualPostingAvailable, "available", "not available"),
      detail: queue.manualPostingDetail,
      meta: [queue.latestStagingUrl, "AG OS automated posting remains blocked."]
    })
  );

  const panel = clear("#action-queue-panel");
  panel.append(
    table(
      ["Decision", "Status", "Detail", "Source"],
      queue.ownerDecisionsNeeded.map((item) => [
        labelStack(item.decision, item.id),
        pill(item.status),
        item.detail,
        item.sourceRecord
      ])
    ),
    table(
      ["Approval package", "Category", "Target", "Risk", "Record"],
      queue.approvalPackagesReady.map((item) => [
        labelStack(item.approvalId, item.requestedAction),
        item.commandCategory,
        item.target,
        item.riskLevel,
        item.recordPath
      ])
    ),
    table(
      ["Safe next milestone", "Status", "Detail"],
      queue.safeNextMilestones.map((item) => [
        labelStack(item.id, "read-only roadmap"),
        pill(item.status),
        item.detail
      ])
    )
  );
}

function renderProjects() {
  const tbody = document.querySelector("#projects-table");
  tbody.replaceChildren();
  data.projectRegistry.projects.forEach((project) => {
    const row = document.createElement("tr");

    const nameCell = document.createElement("td");
    const name = document.createElement("strong");
    name.textContent = project.name;
    const id = document.createElement("span");
    id.className = "project-id";
    id.textContent = project.id;
    nameCell.append(name, id);

    const statusCell = document.createElement("td");
    statusCell.append(pill(project.status));

    const modeCell = document.createElement("td");
    modeCell.append(pill(project.managementMode));

    const riskCell = document.createElement("td");
    riskCell.textContent = project.riskLevel;

    const boundaryCell = document.createElement("td");
    boundaryCell.textContent = project.boundary;

    row.append(nameCell, statusCell, modeCell, riskCell, boundaryCell);
    tbody.append(row);
  });
}

function renderRegistries() {
  const root = clear("#registry-grid");
  root.append(
    card({
      title: "Connector Registry",
      status: data.connectorRegistry.status,
      metric: `${data.connectorRegistry.connectedCount} connected`,
      detail: "Source-controlled connector metadata",
      meta: data.connectorRegistry.connectors
    }),
    card({
      title: "Command Registry",
      status: data.commandRegistry.status,
      metric: `${data.commandRegistry.categoryCount} categories`,
      detail: "Execution categories and approval posture",
      meta: data.commandRegistry.gatedCategories
    }),
    card({
      title: "Capability Registry",
      status: data.capabilityRegistry.status,
      metric: `${data.capabilityRegistry.count} registered`,
      detail: `${data.capabilityRegistry.provenCount} proven, ${data.capabilityRegistry.blockedCount} blocked areas tracked`,
      meta: data.capabilityRegistry.allowedTypes
    })
  );
}

function renderOperatingSystems() {
  const root = clear("#os-grid");
  root.append(
    card({
      title: "Cost OS",
      status: data.costOs.status,
      metric: data.costOs.monthlyMax,
      detail: "Monthly maximum budget",
      meta: [data.costOs.dailyMax, data.costOs.perTaskMax, data.costOs.paidTools]
    }),
    card({
      title: "Watchdog OS",
      status: data.watchdog.status,
      metric: data.watchdog.monitoring,
      detail: "Dashboard-first alerts; live monitoring disabled",
      meta: data.watchdog.plannedChecks
    }),
    card({
      title: "Memory OS",
      status: data.memoryOs.status,
      metric: `${data.memoryOs.shortTermDays} days`,
      detail: "Short-term memory window",
      meta: data.memoryOs.rules
    }),
    card({
      title: "Quality OS",
      status: data.qualityOs.status,
      metric: `${data.qualityReview.qualityScoreCount} scores`,
      detail: "Critiques, scores, and lesson candidates stay advisory unless accepted.",
      meta: data.qualityOs.rules
    }),
    card({
      title: "Security OS",
      status: data.securityOs.status,
      metric: "Blocked by default",
      detail: "Credentials, production data, and live-service changes remain gated.",
      meta: data.securityOs.rules
    })
  );
}

function renderCapabilities() {
  const root = clear("#capabilities-panel");
  const proven = table(
    ["Capability", "Status", "Risk", "Last proven", "Proof records"],
    data.capabilityRegistry.proven.map((capability) => [
      labelStack(capability.name, capability.id),
      pill(capability.status),
      capability.riskTier,
      capability.lastProvenDate,
      `${capability.proofRecords.length} record(s)`
    ])
  );
  const blocked = card({
    title: "Blocked Capabilities",
    status: "blocked",
    metric: `${data.capabilityRegistry.blockedCount} tracked`,
    detail: "These remain unproven or owner-gated.",
    meta: data.capabilityRegistry.blocked.slice(0, 12)
  });
  const draftOnly = card({
    title: "Draft/Advisory Outputs",
    status: "draft-only",
    metric: `${data.capabilityRegistry.draftOnlyCount} capabilities`,
    detail: "Draft, candidate, or advisory outputs do not grant permission.",
    meta: data.capabilityRegistry.draftOnly.map((capability) => capability.name)
  });
  root.append(proven, blocked, draftOnly);
}

function renderClientManagement() {
  const root = clear("#client-management-grid");
  const client = data.clientManagement;
  root.append(
    card({
      title: "Clients",
      status: client.clientCount === 0 ? "zero" : "active",
      metric: client.clientCount,
      detail: client.zeroState,
      meta: [".codex/client-management/clients"]
    }),
    card({
      title: "Engagements",
      status: client.engagementCount === 0 ? "zero" : "active",
      metric: client.engagementCount,
      detail: "No active client engagements are registered.",
      meta: [".codex/client-management/engagements"]
    }),
    card({
      title: "Deliverables",
      status: client.deliverableCount === 0 ? "zero" : "active",
      metric: client.deliverableCount,
      detail: "No client deliverables are registered.",
      meta: [".codex/client-management/deliverables"]
    }),
    card({
      title: "Access Requests",
      status: client.accessRequestCount === 0 ? "zero" : "review",
      metric: client.accessRequestCount,
      detail: "No client access requests are open.",
      meta: [".codex/client-management/access-requests"]
    }),
    card({
      title: "Client Approvals",
      status: client.pendingApprovalCount === 0 ? "zero" : "review",
      metric: `${client.pendingApprovalCount} pending`,
      detail: "No client approvals are pending.",
      meta: [".codex/client-management/approvals"]
    })
  );
}

function renderSocialMedia() {
  const root = clear("#social-media-grid");
  const system = data.socialMediaSystem;
  root.append(
    card({
      title: "Social Media System",
      status: system.status,
      metric: system.currentVersion,
      detail: `${system.lifecycleStatus}; ${system.currentMode}`,
      meta: [
        system.targetRepo,
        `Target PR: ${system.targetPullRequestUrl}`,
        `Target merge SHA: ${system.targetMergeSha}`
      ]
    }),
    card({
      title: "Latest Staging Deploy",
      status: system.stagingStatus,
      metric: system.latestDeployId,
      detail: system.stagingUrl,
      meta: [
        `status: ${system.stagingStatus}`,
        `source: ${system.latestDeploySourceSha}`,
        `HTTP: ${system.latestDeployHttpStatus}`,
        `verified: ${system.latestDeployVerifiedAt}`,
        system.stagingInterpretation
      ]
    }),
    card({
      title: "First Client Readiness",
      status: system.firstClientReadiness.status,
      metric: `${system.firstClientReadiness.missingRequiredFieldCount} fields needed`,
      detail: system.firstClientReadiness.nextOwnerDecision,
      meta: [
        `activeClientRecordsCreated: ${boolText(system.firstClientReadiness.activeClientRecordsCreated, "true", "false")}`,
        `canCreateActiveRecords: ${boolText(system.firstClientReadiness.canCreateActiveRecords, "true", "false")}`,
        system.firstClientReadiness.sourceRecord
      ]
    }),
    card({
      title: "Live Actions",
      status: "blocked",
      metric: "Blocked",
      detail: "Posting, scheduling, analytics, OAuth, and n8n activation remain blocked.",
      meta: [
        `livePostingBlocked: ${boolText(system.safetyBlocks.livePostingBlocked, "true", "false")}`,
        `socialOauthConnected: ${boolText(system.safetyBlocks.socialOauthConnected, "true", "false")}`,
        `schedulingBlocked: ${boolText(system.safetyBlocks.schedulingBlocked, "true", "false")}`,
        `analyticsBlocked: ${boolText(system.safetyBlocks.analyticsBlocked, "true", "false")}`,
        `n8nLiveActivationBlocked: ${boolText(system.safetyBlocks.n8nLiveActivationBlocked, "true", "false")}`,
        `clientConfigAdded: ${boolText(system.safetyBlocks.clientConfigAdded, "true", "false")}`
      ]
    }),
    card({
      title: "First Content Sprint",
      status: system.contentSprint.status,
      metric: `${system.contentSprint.draftPostPackageCount} drafts`,
      detail: `${system.contentSprint.calendarDays} days; ${system.contentSprint.ownerApprovedDraftCount ?? 0} draft posts owner-approved; weekly report ${system.contentSprint.weeklyReportApprovalStatus ?? "not_recorded"}; ${system.contentSprint.pendingDraftApprovalCount} pending approvals`,
      meta: [
        system.contentSprint.targetPullRequestUrl,
        `handles: ${(system.contentSprint.platforms ?? []).map((platform) => `${platform.platform}=${platform.handleStatus}`).join(", ")}`,
        `mode: ${system.contentSprint.mode}`,
        `livePostingBlocked: ${boolText(system.contentSprint.livePostingBlocked, "true", "false")}`,
        `schedulingBlocked: ${boolText(system.contentSprint.schedulingBlocked, "true", "false")}`,
        `socialOauthConnected: ${boolText(system.contentSprint.socialOauthConnected, "true", "false")}`,
        `credentialsStored: ${boolText(system.contentSprint.credentialsStored, "true", "false")}`,
        `analyticsApiUsed: ${boolText(system.contentSprint.analyticsApiUsed, "true", "false")}`,
        `n8nActivated: ${boolText(system.contentSprint.n8nActivated, "true", "false")}`
      ]
    }),
    card({
      title: "Safety Defaults",
      status: "draft-only",
      metric: system.currentMode,
      detail: "Starter configs remain locked to draft/staging behavior.",
      meta: system.firstClientReadiness.safetyDefaults
    })
  );
}

function renderProductionSocialPosting() {
  const root = clear("#production-social-posting-grid");
  const posting = data.socialPosting;
  root.append(
    card({
      title: "Instagram Account",
      status: posting.accountState,
      metric: posting.targetHandle,
      detail: `${posting.targetPlatform} is ${posting.accountState}; OAuth status is ${posting.oauthStatus}.`,
      meta: [
        `accountId: ${posting.accountId}`,
        `connectionMode: ${posting.connectionMode}`,
        `postingMode: ${posting.postingMode}`,
        `credentialStorageStatus: ${posting.credentialStorageStatus}`,
        `credentialsStoredInRepo: ${boolText(posting.credentialsStoredInRepo, "true", "false")}`
      ]
    }),
    card({
      title: "Credential Store",
      status: posting.credentialStoreReadiness,
      metric: posting.credentialRefId,
      detail: "Reference-only credential path is ready; no token value is stored in AG OS.",
      meta: [
        `referenceStatus: ${posting.credentialReferenceStatus}`,
        `storageBackend: ${posting.credentialStorageBackend}`,
        `repoSafe: ${boolText(posting.credentialReferenceRepoSafe, "true", "false")}`,
        `secretStoredInRepo: ${boolText(posting.credentialReferenceSecretStoredInRepo, "true", "false")}`
      ]
    }),
    card({
      title: "OAuth Preflight",
      status: posting.oauthPreflightStatus,
      metric: posting.oauthConnectorPathAvailable ? "connector path recorded" : "connector path missing",
      detail: posting.oauthExecutionReady
        ? "OAuth execution is ready for final owner approval."
        : "OAuth still needs final owner approval and a recorded connector execution path.",
      meta: posting.oauthPreflightBlockedReasons
    }),
    card({
      title: "Draft Content",
      status: posting.approvedDraftPostsCount > 0 ? "ready" : "zero",
      metric: `${posting.approvedDraftPostsCount} approved drafts`,
      detail: `Weekly report is ${posting.weeklyReportApprovalStatus}. Draft approval does not authorize AG OS posting.`,
      meta: [
        `postsReadyForPublishApproval: ${posting.postsReadyForPublishApproval}`,
        `exactSinglePostApprovalCount: ${posting.exactSinglePostApprovalCount}`,
        "Owner manual posting remains separate from AG OS automation."
      ]
    }),
    card({
      title: "Live Posting Gate",
      status: "blocked",
      metric: "No publish permission",
      detail: posting.nextRequiredOwnerApproval,
      meta: [
        `livePostingBlocked: ${boolText(posting.livePostingBlocked, "true", "false")}`,
        `schedulingBlocked: ${boolText(posting.schedulingBlocked, "true", "false")}`,
        `analyticsBlocked: ${boolText(posting.analyticsBlocked, "true", "false")}`,
        `dmCommentsBlocked: ${boolText(posting.dmCommentsBlocked, "true", "false")}`,
        `n8nActivationBlocked: ${boolText(posting.n8nActivationBlocked, "true", "false")}`
      ]
    }),
    card({
      title: "Permission Model",
      status: "blocked",
      metric: "Approval gated",
      detail: "OAuth, draft approval, memory, and skills cannot grant posting permission.",
      meta: [
        `oauthDoesNotAuthorizePosting: ${boolText(posting.permissionModel.oauthDoesNotAuthorizePosting, "true", "false")}`,
        `connectedDraftOnlyDoesNotAuthorizePosting: ${boolText(posting.permissionModel.connectedDraftOnlyDoesNotAuthorizePosting, "true", "false")}`,
        `draftApprovalDoesNotAuthorizePosting: ${boolText(posting.permissionModel.draftApprovalDoesNotAuthorizePosting, "true", "false")}`,
        `memoryCanGrantPermission: ${boolText(posting.permissionModel.memoryCanGrantPermission, "true", "false")}`,
        `skillsCanGrantPermission: ${boolText(posting.permissionModel.skillsCanGrantPermission, "true", "false")}`,
        `candidateLessonsCanGrantPermission: ${boolText(posting.permissionModel.candidateLessonsCanGrantPermission, "true", "false")}`
      ]
    })
  );

  const panel = clear("#production-social-posting-panel");
  panel.append(
    table(
      ["Blocked reason", "Status"],
      posting.blockedPublishReasons.map((reason) => [
        reason,
        pill("blocked")
      ])
    ),
    table(
      ["Permission set", "Requested", "Excluded"],
      [[
        labelStack(posting.targetPlatform, posting.targetHandle),
        posting.requestedPermissions.join(", ") || "none",
        posting.excludedPermissions.join(", ") || "none"
      ]]
    ),
    table(
      ["Source record", "Type"],
      posting.sourceRecords.map((recordPath) => [
        recordPath,
        recordPath.includes("docs/") ? "documentation" : "source record"
      ])
    )
  );
}

function renderApprovals() {
  const root = clear("#approvals-panel");
  root.append(
    card({
      title: "Active Approvals",
      status: data.approvals.activeCount > 0 ? "active" : "zero",
      metric: data.approvals.activeCount,
      detail: "Approved locks still require exact scoped action matching.",
      meta: data.approvals.activeApprovals.slice(0, 6).map((approval) => `${approval.approvalId}: ${approval.expiresAt}`)
    }),
    card({
      title: "Expired/Archived",
      status: data.approvals.expiredCount === 0 ? "zero" : "disabled",
      metric: data.approvals.expiredCount,
      detail: "Historical locks remain source-of-truth evidence only.",
      meta: data.approvals.expiredApprovals.slice(0, 6).map((approval) => `${approval.approvalId}: ${approval.status}`)
    }),
    card({
      title: "Blocked Approvals",
      status: data.approvals.blockedCount === 0 ? "ready" : "blocked",
      metric: data.approvals.blockedCount,
      detail: "Blocked approval records require owner attention.",
      meta: data.approvals.blockedApprovals.map((approval) => `${approval.approvalId}: ${approval.status}`)
    }),
    card({
      title: "Standing Approvals",
      status: data.approvals.standingCount > 0 ? "active" : "zero",
      metric: data.approvals.standingCount,
      detail: "Reusable locks remain exact-scope, expiring, usage-limited, audited, and immediately revocable.",
      meta: data.approvals.standingApprovals.map((approval) => `${approval.approvalId}: ${approval.remainingUses}/${approval.maxUses} uses remain; expires ${approval.expiresAt}`)
    }),
    card({
      title: "Batched Approval Review",
      status: "read_only",
      metric: `${data.dashboardActionQueue.approvalBatch.ownerDecisions.length} decisions`,
      detail: `${data.dashboardActionQueue.approvalBatch.approvalPackages.length} approval package(s) ready. This surface cannot approve or execute actions.`,
      meta: [
        ...data.dashboardActionQueue.approvalBatch.ownerDecisions.slice(0, 4).map((item) => `${item.decision}: ${item.status}`),
        ...data.dashboardActionQueue.approvalBatch.approvalPackages.slice(0, 4).map((item) => `${item.approvalId}: ${item.requestedAction}`)
      ]
    })
  );
}

function renderConnectors() {
  const root = clear("#connector-proof-panel");
  root.append(
    table(
      ["GitHub proof", "Status", "Action", "Approval", "Record"],
      data.connectorProofs.github.slice(0, 8).map((record) => [
        labelStack(record.id, record.projectId),
        pill(record.status),
        record.action,
        record.approvalId,
        record.recordPath
      ])
    ),
    table(
      ["Netlify staging", "Status", "URL", "Deploy", "Record"],
      data.connectorProofs.netlify.map((record) => [
        labelStack(record.siteName, record.sourceRepo),
        pill(record.deployStatus),
        record.siteUrl,
        record.deployId,
        record.recordPath
      ])
    ),
    table(
      ["n8n draft workflows", "Status", "Active", "Export", "Record"],
      data.connectorProofs.n8n.map((record) => [
        labelStack(record.workflowName, record.workflowId),
        pill(record.status),
        boolText(record.workflowActive, "true", "false"),
        record.workflowExportPath,
        record.recordPath
      ])
    )
  );
}

function renderQualityReview() {
  const root = clear("#quality-review-panel");
  root.append(
    card({
      title: "Critiques",
      status: data.qualityReview.failedCount > 0 ? "blocked" : "ready",
      metric: data.qualityReview.critiquesCount,
      detail: `${data.qualityReview.reviewRequiredCount} review-required, ${data.qualityReview.failedCount} failed`,
      meta: data.qualityReview.latestCritiques.map((critique) => `${critique.critiqueId}: ${critique.reviewStatus}`)
    }),
    card({
      title: "Quality Scores",
      status: "active",
      metric: data.qualityReview.qualityScoreCount,
      detail: "Latest candidate and product scores from source records.",
      meta: data.qualityReview.latestQualityScores.map((score) => `${score.scoreId}: ${score.overallScore}/10`)
    }),
    card({
      title: "Lessons",
      status: data.qualityReview.candidatesLoadedAsTruth ? "blocked" : "ready",
      metric: `${data.qualityReview.candidateLessonCount} candidates`,
      detail: `${data.qualityReview.acceptedLessonCount} accepted; candidatesLoadedAsTruth is ${data.qualityReview.candidatesLoadedAsTruth}`,
      meta: ["Candidate lessons are not accepted truth."]
    })
  );
}

function renderUnifiedMemory() {
  const memory = data.unifiedMemory;
  const root = clear("#unified-memory-grid");
  root.append(
    card({
      title: "Accepted Lessons",
      status: memory.acceptedLessonsLoadedByRuntime ? "ready" : "blocked",
      metric: memory.acceptedCount,
      detail: "Accepted lessons may be loaded as advisory runtime guidance.",
      meta: memory.latestAcceptedLessons.length > 0
        ? memory.latestAcceptedLessons.map((lesson) => `${lesson.lessonId}: ${lesson.scope}`)
        : ["No accepted lessons recorded yet."]
    }),
    card({
      title: "Candidate Lessons",
      status: memory.candidatesLoadedAsTruth ? "blocked" : "review",
      metric: memory.candidateCount,
      detail: `candidatesLoadedAsTruth is ${memory.candidatesLoadedAsTruth}`,
      meta: memory.latestCandidateLessons.map((lesson) => `${lesson.lessonId}: ${lesson.status}`)
    }),
    card({
      title: "Rejected Lessons",
      status: memory.rejectedLoadedAsTruth ? "blocked" : "ready",
      metric: memory.rejectedCount,
      detail: `rejectedLoadedAsTruth is ${memory.rejectedLoadedAsTruth}`,
      meta: memory.latestRejectedLessons.map((lesson) => `${lesson.lessonId}: ${lesson.status}`)
    }),
    card({
      title: "Conflicts",
      status: memory.conflictCount > 0 ? "blocked" : "ready",
      metric: memory.conflictCount,
      detail: "Conflicts block promotion until resolved.",
      meta: memory.conflicts.map((conflict) => `${conflict.candidateLessonId} vs ${conflict.existingLessonId}`)
    }),
    card({
      title: "Permission Boundary",
      status: memory.memoryGrantsPermission || memory.skillsGrantPermission ? "blocked" : "ready",
      metric: "No permission grant",
      detail: `memoryGrantsPermission=${memory.memoryGrantsPermission}; skillsGrantPermission=${memory.skillsGrantPermission}`,
      meta: ["Memory never approves live actions.", "Skills remain procedural guidance only."]
    }),
    card({
      title: "Decision Queue",
      status: memory.decisionQueueCount > 0 ? "review" : "ready",
      metric: memory.decisionQueueCount,
      detail: "Read-only queue for promote, reject, stale review, and conflict decisions.",
      meta: memory.decisionQueue.slice(0, 5).map((item) => `${item.decisionType}: ${item.status}`)
    })
  );

  const panel = clear("#unified-memory-panel");
  panel.append(
    table(
      ["Lesson decision", "Status", "Lesson", "Detail", "Record"],
      memory.decisionQueue.map((item) => [
        labelStack(item.decisionType, item.id),
        pill(item.status),
        item.lessonId,
        item.detail,
        item.recordPath
      ])
    ),
    table(
      ["Scope", "Registry", "Runtime loading", "Sources"],
      memory.scopes.map((scope) => [
        scope,
        memory.status,
        memory.acceptedLessonsLoadedByRuntime ? "accepted lessons loaded" : "accepted lesson loading blocked",
        memory.sourceRecords.join("; ")
      ])
    )
  );
}

function renderCosts() {
  const root = clear("#costs-panel");
  root.append(
    card({
      title: "Cost Ledgers",
      status: data.costs.budgetStatus,
      metric: `${data.costs.ledgerCount} ledgers`,
      detail: `Total recorded actual: USD $${data.costs.totalRecordedActualUsd}`,
      meta: [
        `Monthly max: USD $${data.costs.limits.monthlyMaxUsd}`,
        `Daily max: USD $${data.costs.limits.dailyMaxUsd}`,
        `Per-task max: USD $${data.costs.limits.perTaskMaxUsd}`
      ]
    }),
    table(
      ["Latest cost", "Status", "Actual USD", "Budget", "Record"],
      data.costs.latestCosts.map((cost) => [
        cost.costLedgerId,
        pill(cost.status),
        cost.actualTaskCostUsd,
        cost.budgetStatus,
        cost.recordPath
      ])
    )
  );
}

function renderSkills() {
  const root = clear("#skills-panel");
  root.append(
    card({
      title: "Skills Library",
      status: data.skills.skillsGrantPermission ? "blocked" : "draft",
      metric: `${data.skills.draftCount} draft`,
      detail: `${data.skills.activeCount} active; skillsGrantPermission is ${data.skills.skillsGrantPermission}`,
      meta: data.skills.skills.map((skill) => `${skill.name}: ${skill.status}`)
    })
  );
}

function renderSafeMerge() {
  const root = clear("#safe-merge-panel");
  const heading = document.createElement("h3");
  heading.textContent = `${data.safeMerge.mode}: ${data.safeMerge.status}`;
  const summary = document.createElement("p");
  summary.textContent = data.safeMerge.summary;
  const checks = document.createElement("ul");
  checks.className = "policy-checks";
  data.safeMerge.requiredChecks.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    checks.append(li);
  });
  root.append(heading, summary, checks);
}

renderOverview();
renderOwnerAttention();
renderActionQueue();
renderProjects();
renderRegistries();
renderOperatingSystems();
renderCapabilities();
renderClientManagement();
renderSocialMedia();
renderProductionSocialPosting();
renderApprovals();
renderConnectors();
renderQualityReview();
renderUnifiedMemory();
renderCosts();
renderSkills();
renderSafeMerge();
