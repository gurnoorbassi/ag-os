const data = window.AG_OS_DASHBOARD_DATA;

function statusClass(value) {
  const normalized = String(value).toLowerCase();
  if (normalized.includes("ready")) return "status-active";
  if (normalized.includes("pass")) return "status-active";
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
      title: "Safety Defaults",
      status: "draft-only",
      metric: system.currentMode,
      detail: "Starter configs remain locked to draft/staging behavior.",
      meta: system.firstClientReadiness.safetyDefaults
    })
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
renderProjects();
renderRegistries();
renderOperatingSystems();
renderCapabilities();
renderClientManagement();
renderSocialMedia();
renderApprovals();
renderConnectors();
renderQualityReview();
renderCosts();
renderSkills();
renderSafeMerge();
