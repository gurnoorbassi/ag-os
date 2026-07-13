const data = window.AG_OS_DASHBOARD_DATA;
let runtimeAiPlanner = null;
let runtimeAiWorker = null;

function statusClass(value) {
  const normalized = String(value).toLowerCase();
  if (normalized === "live") return "status-active";
  if (normalized.includes("protected")) return "status-protected";
  if (normalized.includes("approval gated")) return "status-protected";
  if (normalized.includes("approval_gated")) return "status-protected";
  if (normalized.includes("owner action")) return "status-owner-action";
  if (normalized.includes("owner_action")) return "status-owner-action";
  if (normalized.includes("optional_input")) return "status-zero";
  if (normalized.includes("feature_setup")) return "status-zero";
  if (normalized.includes("reference")) return "status-zero";
  if (normalized.includes("setup needed")) return "status-blocked";
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

function collapsible(title, content, detail = "") {
  const disclosure = document.createElement("details");
  disclosure.className = "dashboard-disclosure";
  const summary = document.createElement("summary");
  summary.textContent = title;
  disclosure.append(summary);
  if (detail) {
    const description = document.createElement("p");
    description.textContent = detail;
    disclosure.append(description);
  }
  disclosure.append(content);
  return disclosure;
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
      status: "protected",
      metric: "Constitution protected",
      detail: "The dashboard can show protected actions without treating them as system failures.",
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

function renderActivationCenter(connected = false, productionStatus = "private runtime", aiPlanner = runtimeAiPlanner) {
  const root = clear("#activation-grid");
  const items = [
    {
      title: "Private coordinator",
      status: connected ? "live" : "running - connect to verify",
      detail: connected ? `Owner-authenticated and ${productionStatus}.` : "Running privately on the VPS; connect with the owner token to use it."
    },
    {
      title: "Command intake",
      status: "ready",
      detail: "Creates classified, routed, costed, approval-gated work packages."
    },
    {
      title: "Automatic local runner",
      status: connected ? "active" : "running - connect to verify",
      detail: "Safe owner-console jobs run automatically; each completion must produce quality and lesson evidence."
    },
    {
      title: "Anthropic planning worker",
      status: aiPlanner?.ready ? "ready" : "setup needed",
      detail: aiPlanner?.ready
        ? `${aiPlanner.model} is enabled with a scoped, usage-audited approval.`
        : "Needs the Anthropic key, token pricing, enable flag, and a scoped paid-planning approval."
    },
    {
      title: "Remote access",
      status: "private",
      detail: "Use the SSH tunnel. Public web access, Caddy, and DNS are intentionally unchanged."
    },
    {
      title: "External actions",
      status: "approval gated",
      detail: "Posting, messaging, spending, credentials, DNS, and production changes need separate approval."
    }
  ];
  items.forEach((item) => {
    const el = document.createElement("article");
    el.className = "activation-card";
    const heading = document.createElement("h3");
    heading.textContent = item.title;
    const detail = document.createElement("p");
    detail.textContent = item.detail;
    el.append(pill(item.status), heading, detail);
    root.append(el);
  });
}

const dashboardViews = {
  home: new Set(["command-center", "activation-center", "owner-attention", "projects"]),
  work: new Set(["action-queue", "client-management", "social-media", "production-social-posting", "approvals", "connector-proofs"]),
  intelligence: new Set(["quality-review", "unified-memory", "costs", "metrics", "skills"]),
  system: new Set(["overview", "registries", "capabilities", "operating-systems", "safe-merge"])
};

const dashboardViewMeta = {
  home: {
    kicker: "Home",
    title: "Command and priorities",
    description: "Start work, check readiness, and see what needs your attention."
  },
  work: {
    kicker: "Work",
    title: "Queues and approvals",
    description: "Review active work, client operations, connectors, and approval gates."
  },
  intelligence: {
    kicker: "Intelligence",
    title: "Quality and learning",
    description: "Track quality, lessons, cost, metrics, and reusable operating knowledge."
  },
  system: {
    kicker: "System",
    title: "Health and controls",
    description: "Inspect registries, capabilities, operating systems, and merge safeguards."
  }
};

function setDashboardView(view) {
  const activeView = dashboardViews[view] ? view : "home";
  document.querySelectorAll("[data-dashboard-view]").forEach((button) => {
    const active = button.dataset.dashboardView === activeView;
    button.setAttribute("aria-pressed", String(active));
    button.classList.toggle("is-current", active);
  });
  document.querySelectorAll("main .section-band").forEach((section) => {
    section.hidden = !dashboardViews[activeView].has(section.id);
  });
  const meta = dashboardViewMeta[activeView];
  document.querySelector("#view-kicker").textContent = meta.kicker;
  document.querySelector("#view-title").textContent = meta.title;
  document.querySelector("#view-description").textContent = meta.description;
  document.body.dataset.activeView = activeView;
}

function initializeNavigation() {
  const nav = document.querySelector("#section-nav");
  const toggle = document.querySelector("#nav-toggle");
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  document.querySelectorAll("[data-dashboard-view]").forEach((button) => {
    button.addEventListener("click", () => {
      setDashboardView(button.dataset.dashboardView);
      nav.querySelectorAll("a").forEach((item) => item.removeAttribute("aria-current"));
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
  nav.querySelectorAll("a[href^='#']").forEach((link) => {
    link.addEventListener("click", () => {
      setDashboardView(link.dataset.view || "home");
      nav.querySelectorAll("a").forEach((item) => item.removeAttribute("aria-current"));
      link.setAttribute("aria-current", "location");
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
  const initialLink = [...nav.querySelectorAll("a[href^='#']")]
    .find((link) => link.getAttribute("href") === window.location.hash);
  if (initialLink) initialLink.setAttribute("aria-current", "location");
  setDashboardView(initialLink?.dataset.view || "home");
}

function renderOwnerAttention() {
  const root = clear("#owner-attention-grid");
  data.ownerAttention.forEach((item) => {
    const presentationStatus = item.presentationStatus ?? item.status;
    root.append(card({
      title: item.title,
      status: presentationStatus,
      metric: presentationStatus,
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
      title: "Owner Choices",
      status: queue.status,
      metric: `${queue.blockingCoreDecisionCount} core blockers`,
      detail: `${queue.featureDecisionCount} feature-scoped choice(s) can wait until that feature is activated.`,
      meta: queue.ownerDecisionsNeeded.map((item) => `${item.decision}: ${item.status}`)
    }),
    card({
      title: "Constitution Protections",
      status: queue.protectedActionCount === 0 ? "ready" : "protected",
      metric: queue.protectedActionCount,
      detail: "These are deliberate approval gates, not broken system components.",
      meta: queue.protectedActions.map((item) => `${item.id}: ${item.reason}`)
    }),
    card({
      title: "Approval Packages",
      status: queue.approvalPackageCount === 0 ? "zero" : "reference",
      metric: `${queue.approvalPackageCount} ready`,
      detail: "Reference templates are kept out of the owner decision count and do not grant permission.",
      meta: queue.approvalPackagesReady.slice(0, 3).map((item) => `${item.approvalId}: ${item.commandCategory}`)
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
      ["Owner choice", "Status", "Scope", "Detail", "Source"],
      queue.ownerDecisionsNeeded.map((item) => [
        labelStack(item.decision, item.id),
        pill(item.status),
        item.scope,
        item.detail,
        item.sourceRecord
      ])
    ),
    collapsible(
      `Reference approval templates (${queue.approvalPackagesReady.length})`,
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
      "Collapsed by default because templates are reference material, not unfinished owner work."
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

function renderProjects(projects = data.projectRegistry.projects) {
  const tbody = document.querySelector("#projects-table");
  tbody.replaceChildren();
  projects.forEach((project) => {
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

function populateProjectSelect(projects = data.projectRegistry.projects) {
  const projectSelect = document.querySelector("#owner-command-project");
  projectSelect.querySelectorAll("option:not(:first-child)").forEach((option) => option.remove());
  projects
    .filter((project) => project.id !== "project-ag-os")
    .forEach((project) => {
      const option = document.createElement("option");
      option.value = project.id;
      option.textContent = project.name;
      projectSelect.append(option);
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
    }),
    card({
      title: "Production Safeguards",
      status: posting.productionReadiness.activationAllowed ? "ready" : "blocked",
      metric: `${posting.productionReadiness.passedCheckCount}/${posting.productionReadiness.requiredCheckCount}`,
      detail: posting.productionReadiness.activationAllowed
        ? "Every safeguard has evidence; exact action approval is still evaluated separately."
        : "Production activation fails closed until every required safeguard carries evidence.",
      meta: posting.productionReadiness.blockers
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

function renderMetrics() {
  const root = clear("#metrics-panel");
  const metrics = data.metrics;
  root.append(
    card({
      title: "Cost Variance",
      status: metrics.cost.varianceUsd <= 0 ? "ready" : "review",
      metric: `$${metrics.cost.varianceUsd.toFixed(2)}`,
      detail: `$${metrics.cost.actualUsd.toFixed(2)} actual vs $${metrics.cost.estimatedUsd.toFixed(2)} estimated across ${metrics.cost.ledgerCount} ledgers.`,
      meta: [`Variance: ${metrics.cost.variancePercent}%`]
    }),
    card({
      title: "Quality Trend",
      status: metrics.quality.trendDelta >= 0 ? "ready" : "review",
      metric: metrics.quality.averageScore.toFixed(1),
      detail: `${metrics.quality.passCount}/${metrics.quality.scoreCount} scores meet the bar.`,
      meta: [`Recent average: ${metrics.quality.recentAverage}`, `Trend delta: ${metrics.quality.trendDelta}`]
    }),
    card({
      title: "Rework Signals",
      status: metrics.rework.requiredFixCount === 0 ? "ready" : "review",
      metric: `${metrics.rework.reworkSignalRatePercent}%`,
      detail: `${metrics.rework.critiquesRequiringFixes}/${metrics.rework.critiqueCount} critiques required fixes.`,
      meta: [`Required fixes: ${metrics.rework.requiredFixCount}`, `Failed jobs: ${metrics.rework.failedJobCount}`]
    }),
    card({
      title: "Lesson Reuse",
      status: metrics.lessonReuse.acceptedLessonCount > 0 ? "active" : "zero",
      metric: `${metrics.lessonReuse.lessonReuseRatePercent}%`,
      detail: `${metrics.lessonReuse.plansUsingAcceptedLessons}/${metrics.lessonReuse.eligiblePlanCount} eligible plans use accepted lessons.`,
      meta: [
        `Quality-example reuse: ${metrics.lessonReuse.exampleReuseRatePercent}%`,
        `Plan skill reuse: ${metrics.lessonReuse.skillReuseRatePercent}%`,
        `Skill applications recorded: ${metrics.lessonReuse.skillApplicationsRecorded}`
      ]
    }),
    card({
      title: "Scaled operations",
      status: metrics.scaledOperations.concurrentPlanningProven ? "ready" : "review",
      metric: `${metrics.scaledOperations.projectsInConcurrentBatches.length} projects`,
      detail: `${metrics.scaledOperations.concurrentProjectPairCount} cross-project planning pair(s) recorded within five-minute operating batches.`,
      meta: ["Planning concurrency evidence only; external actions remain separately gated."]
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

function coordinatorBaseUrl() {
  const configured = document.querySelector("#coordinator-url").value.trim();
  return configured ? configured.replace(/\/$/, "") : window.location.origin;
}

function runtimeHeaders() {
  const token = document.querySelector("#owner-token").value;
  return {
    authorization: `Bearer ${token}`,
    "content-type": "application/json"
  };
}

function setRuntimeStatus(message, connected = false) {
  document.querySelector("#runtime-status").textContent = message;
  const mode = document.querySelector("#runtime-mode");
  const dot = document.createElement("span");
  dot.setAttribute("aria-hidden", "true");
  mode.replaceChildren(dot, document.createTextNode(connected ? "Owner connected" : "Offline evidence"));
  mode.className = `mode-lock ${connected ? "status-active" : ""}`;
  if (!connected) renderActivationCenter(false);
}

function renderRecentCommands(commands = []) {
  const root = clear("#recent-command-panel");
  if (commands.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No live-console commands recorded yet.";
    root.append(empty);
    return;
  }
  root.append(table(
    ["Command", "Risk", "State", "Created"],
    commands.map((command) => [
      command.rawCommand,
      pill(command.riskLevel),
      command.requiresApproval ? "Waiting approval" : "Planned",
      new Date(command.createdAt).toLocaleString()
    ])
  ));
}

function renderRuntimeJobs(jobs = []) {
  const root = clear("#runtime-job-panel");
  const heading = document.createElement("h3");
  heading.textContent = "Automatic runs";
  root.append(heading);
  if (jobs.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No automatic owner-console runs recorded yet.";
    root.append(empty);
    return;
  }
  root.append(table(
    ["Job", "Project", "Worker", "State", "Quality / learning", "Decision", "Updated"],
    jobs.map((job) => [
      labelStack(job.jobId, job.assignedAgent),
      job.projectId,
      labelStack(job.adapter?.name || "Unassigned", job.adapter?.adapterId || "No adapter"),
      pill(job.status),
      job.qualityScorePath
        ? `Scored; ${job.lessonCandidatePaths.length} lesson candidate(s)`
        : job.blockedReason || "In progress",
      runtimeJobDecisionControls(job),
      new Date(job.updatedAt).toLocaleString()
    ])
  ));
}

function runtimeJobDecisionControls(job) {
  const actions = document.createElement("div");
  actions.className = "job-actions";
  if (!job.availableDecisions?.length) {
    actions.textContent = job.status === "done" ? "Completed" : "No decision needed";
    return actions;
  }
  for (const decision of job.availableDecisions) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = decision === "approve" ? "job-approve" : "job-reject";
    button.textContent = decision === "approve" ? "Approve once" : (decision === "revoke" ? "Revoke" : "Reject");
    button.addEventListener("click", () => decideRuntimeJob(job, decision, button));
    actions.append(button);
  }
  return actions;
}

async function decideRuntimeJob(job, decision, button) {
  const label = decision === "approve"
    ? "approve exactly one execution"
    : (decision === "revoke" ? "revoke this approval before the adapter performs another step" : "reject and cancel this job");
  if (!window.confirm(`${label} for ${job.jobId}?`)) return;
  button.disabled = true;
  setRuntimeStatus(`${decision === "approve" ? "Approving" : (decision === "revoke" ? "Revoking" : "Rejecting")} ${job.jobId}...`, true);
  try {
    const response = await fetch(`${coordinatorBaseUrl()}/api/v1/jobs/${encodeURIComponent(job.jobId)}/decision`, {
      method: "POST",
      headers: runtimeHeaders(),
      body: JSON.stringify({
        decision,
        confirmation: `${decision.toUpperCase()} ${job.jobId}`
      })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.detail || result.error || "Decision failed");
    setRuntimeStatus(decision === "approve"
      ? `${job.jobId} approved once and re-queued. Its registered adapter must still pass every readiness gate.`
      : (decision === "revoke"
          ? `${job.jobId} approval revoked. The adapter must stop before its next mutation.`
          : `${job.jobId} rejected and cancelled without execution.`), true);
    await connectRuntime();
  } catch (error) {
    setRuntimeStatus(`Decision rejected: ${error.message}`, true);
    button.disabled = false;
  }
}

async function connectRuntime() {
  const token = document.querySelector("#owner-token").value;
  if (!token) {
    setRuntimeStatus("Enter the owner token to connect.");
    return;
  }
  sessionStorage.setItem("ag-os-owner-token", token);
  sessionStorage.setItem("ag-os-coordinator-url", document.querySelector("#coordinator-url").value.trim());
  setRuntimeStatus("Connecting...");
  try {
    const response = await fetch(`${coordinatorBaseUrl()}/api/v1/status`, { headers: runtimeHeaders() });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.detail || result.error || "Connection failed");
    }
    setRuntimeStatus(`Connected. Private runtime is ${result.runtimeDeployment?.status || "live"}; coordinator readiness is ${result.readiness?.coordinator?.passedCheckCount || 0}/${result.readiness?.coordinator?.requiredCheckCount || 0}; operational safeguards are ${result.safeguards?.status || "unknown"}. Gated actions remain approval-controlled.`, true);
    runtimeAiPlanner = result.aiPlanner;
    runtimeAiWorker = result.aiWorker;
    const plannerCheckbox = document.querySelector("#use-ai-planner");
    plannerCheckbox.disabled = !runtimeAiPlanner?.ready;
    document.querySelector("#ai-planner-help").textContent = runtimeAiPlanner?.ready
      ? `${runtimeAiPlanner.model} is ready. Each use is costed and audited.`
      : runtimeAiPlanner?.blockers?.join("; ") || "Anthropic planning worker is not ready.";
    const workerCheckbox = document.querySelector("#use-ai-worker");
    workerCheckbox.disabled = !runtimeAiWorker?.ready;
    document.querySelector("#ai-worker-help").textContent = runtimeAiWorker?.ready
      ? `${runtimeAiWorker.model} is ready to create bounded files. Each use is separately costed and audited.`
      : runtimeAiWorker?.blockers?.join("; ") || "Anthropic builder worker is not ready.";
    renderActivationCenter(true, result.production.status, runtimeAiPlanner);
    renderRecentCommands(result.recentCommands);
    renderRuntimeJobs(result.jobs);
    renderProjects(result.projects);
    populateProjectSelect(result.projects);
  } catch (error) {
    setRuntimeStatus(`Connection failed: ${error.message}`);
  }
}

async function createProject(event) {
  event.preventDefault();
  const button = event.currentTarget.querySelector("button[type='submit']");
  const status = document.querySelector("#project-create-status");
  button.disabled = true;
  status.textContent = "Creating the project record, registry entry, and audit evidence...";
  try {
    const response = await fetch(`${coordinatorBaseUrl()}/api/v1/projects`, {
      method: "POST",
      headers: runtimeHeaders(),
      body: JSON.stringify({
        name: document.querySelector("#project-name").value,
        goal: document.querySelector("#project-goal").value,
        scope: document.querySelector("#project-scope").value,
        stack: document.querySelector("#project-stack").value,
        projectType: document.querySelector("#project-type").value,
        trustLevel: Number(document.querySelector("#project-trust-level").value),
        managementMode: "active_build"
      })
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.detail || result.error || "Project creation failed");
    }
    event.currentTarget.reset();
    status.textContent = `Created ${result.project.name}. It is ready for an owner command; live actions remain approval-gated.`;
    await connectRuntime();
    document.querySelector("#owner-command-project").value = result.project.id;
  } catch (error) {
    status.textContent = `Project rejected: ${error.message}`;
  } finally {
    button.disabled = false;
  }
}

async function submitOwnerCommand(event) {
  event.preventDefault();
  const button = event.currentTarget.querySelector("button[type='submit']");
  button.disabled = true;
  setRuntimeStatus("Creating the gated work package...", true);
  try {
    const response = await fetch(`${coordinatorBaseUrl()}/api/v1/commands`, {
      method: "POST",
      headers: runtimeHeaders(),
      body: JSON.stringify({
        command: document.querySelector("#owner-command").value,
        projectId: document.querySelector("#owner-command-project").value || undefined,
        useAiPlanner: document.querySelector("#use-ai-planner").checked,
        useAiWorker: document.querySelector("#use-ai-worker").checked
      })
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.detail || result.error || "Command failed");
    }
    document.querySelector("#owner-command").value = "";
    setRuntimeStatus(result.aiWorker?.used
      ? `Completed ${result.jobId} with ${result.aiWorker.model}: ${result.aiWorker.workProductPaths.length} bounded work-product file(s), quality score, lesson candidates, and audit evidence. Builder cost: $${result.aiWorker.actualCostUsd}. No external business action was executed.`
      : result.aiPlanner?.used
      ? `Created ${result.planId} with ${result.aiPlanner.model}. Cost: $${result.aiPlanner.actualCostUsd}. No external business action was executed.`
      : `Created ${result.planId}. Status: ${result.status}. No live side effect was executed.`, true);
    await connectRuntime();
  } catch (error) {
    setRuntimeStatus(`Command rejected: ${error.message}`);
  } finally {
    button.disabled = false;
  }
}

function initializeCommandCenter() {
  populateProjectSelect();
  document.querySelector("#owner-token").value = sessionStorage.getItem("ag-os-owner-token") || "";
  document.querySelector("#coordinator-url").value = sessionStorage.getItem("ag-os-coordinator-url") || "";
  document.querySelector("#connect-runtime").addEventListener("click", connectRuntime);
  document.querySelector("#owner-command-form").addEventListener("submit", submitOwnerCommand);
  document.querySelector("#project-create-form").addEventListener("submit", createProject);
  renderRecentCommands();
  renderRuntimeJobs();
  if (document.querySelector("#owner-token").value) {
    connectRuntime();
  }
}

renderOverview();
renderActivationCenter();
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
renderMetrics();
renderSkills();
renderSafeMerge();
initializeCommandCenter();
initializeNavigation();
