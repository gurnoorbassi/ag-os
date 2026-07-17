const data = window.AG_OS_DASHBOARD_DATA;
let runtimeAiPlanner = null;
let runtimeAiWorker = null;
let runtimeAutomation = null;
let runtimeConnected = false;
let runtimeOperatingSystems = null;
let runtimeLessonDecisions = null;
let runtimeSafeguards = null;

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
  if (normalized.includes("setup_needed")) return "status-blocked";
  if (normalized.includes("operational attention")) return "status-owner-action";
  if (normalized.includes("operational_attention")) return "status-owner-action";
  if (normalized.includes("operational")) return "status-active";
  if (normalized.includes("configured")) return "status-active";
  if (normalized.includes("recommended")) return "status-active";
  if (normalized.includes("possible duplicate")) return "status-owner-action";
  if (normalized.includes("possible_duplicate")) return "status-owner-action";
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

function card({ title, status, metric, detail, meta = [], onActivate = null, actionLabel = "Open details" }) {
  const section = document.createElement("article");
  section.className = "status-card";
  if (onActivate) section.classList.add("interactive-card");

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
  if (onActivate) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "card-action";
    button.textContent = actionLabel;
    button.addEventListener("click", onActivate);
    section.append(button);
  }
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

function renderActivationCenter(connected = false, productionStatus = "private runtime", aiPlanner = runtimeAiPlanner, aiWorker = runtimeAiWorker) {
  const root = clear("#activation-grid");
  const n8nAdapter = runtimeAutomation?.adapters?.find((adapter) => adapter.adapterId === "n8n-disabled-workflow");
  const netlifyAdapter = runtimeAutomation?.adapters?.find((adapter) => adapter.adapterId === "netlify-staging");
  const deploymentAdapter = runtimeAutomation?.adapters?.find((adapter) => adapter.adapterId === "production-deployment");
  const socialAdapter = runtimeAutomation?.adapters?.find((adapter) => adapter.adapterId === "social-publishing");
  const dnsAdapter = runtimeAutomation?.adapters?.find((adapter) => adapter.adapterId === "dns-change");
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
      title: "Professional AI builder",
      status: aiWorker?.ready ? "ready" : "approval needed",
      detail: aiWorker?.ready
        ? `${aiWorker.model} can create bounded owner-usable files with cost, quality, and lesson evidence.`
        : aiWorker?.blockers?.join("; ") || "Needs a separate scoped Anthropic builder approval before paid file generation."
    },
    {
      title: "n8n workflow drafts",
      status: n8nAdapter?.executionReady ? "ready when approved" : "setup needed",
      detail: n8nAdapter?.executionReady
        ? "Can create and verify an exact disabled, credential-free workflow after one-job approval."
        : n8nAdapter?.blockers?.join("; ") || "Connect first to verify the disabled-workflow adapter."
    },
    {
      title: "Netlify previews",
      status: netlifyAdapter?.executionReady ? "ready when approved" : "setup needed",
      detail: netlifyAdapter?.executionReady
        ? "Can create secret-scanned draft previews without publishing to production."
        : netlifyAdapter?.blockers?.join("; ") || "Connect first to verify the draft-preview adapter."
    },
    {
      title: "Production deployment runner",
      status: deploymentAdapter?.executionReady ? "ready when approved" : "private setup needed",
      detail: deploymentAdapter?.executionReady
        ? "Can back up, deploy one exact allowlisted commit, verify health, and roll back after one-job approval."
        : deploymentAdapter?.blockers?.join("; ") || "Connect first to verify the private deployment runner."
    },
    {
      title: "Social publishing",
      status: socialAdapter?.executionReady ? "ready when approved" : "credential needed",
      detail: socialAdapter?.executionReady
        ? "Can publish one exact digest-locked Instagram image after account verification and one-job approval."
        : socialAdapter?.blockers?.join("; ") || "A least-privilege social API credential is not configured."
    },
    {
      title: "DNS changes",
      status: dnsAdapter?.executionReady ? "ready when approved" : "credential needed",
      detail: dnsAdapter?.executionReady
        ? "Can snapshot, change, verify, and roll back one exact Cloudflare DNS record after one-job approval."
        : dnsAdapter?.blockers?.join("; ") || "A zone-scoped DNS API credential is not configured."
    },
    {
      title: "Secure access anywhere",
      status: productionStatus === "live_private" ? "private tunnel" : productionStatus,
      detail: "The coordinator stays loopback-only. Tailscale or authenticated HTTPS still requires an exact hostname/access-mode activation."
    },
    {
      title: "Safety boundary",
      status: "approval gated",
      detail: "Activation, production publishing, posting, messaging, spending, credentials, DNS, and production changes remain separate decisions."
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
  home: new Set(["command-center"]),
  projects: new Set(["projects"]),
  work: new Set(["action-queue", "approvals", "connector-proofs"]),
  intelligence: new Set(["quality-review", "unified-memory", "costs", "metrics", "skills"]),
  system: new Set(["activation-center", "overview", "registries", "capabilities", "operating-systems", "safe-merge"])
};

const dashboardViewMeta = {
  home: {
    kicker: "Command",
    title: "Tell AG OS what to do",
    description: "Give one clear outcome. AG OS will organize the work and stop only when your approval is required."
  },
  projects: {
    kicker: "Projects",
    title: "Your two live systems",
    description: "Open a product, control it through AG OS, or launch its secure full application."
  },
  work: {
    kicker: "Activity",
    title: "Runs and approvals",
    description: "Review active work, client operations, connectors, and approval gates."
  },
  intelligence: {
    kicker: "Memory",
    title: "Quality, lessons, and cost",
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

function openWorkspaceDialog({ eyebrow, title, content }) {
  const dialog = document.querySelector("#workspace-dialog");
  document.querySelector("#workspace-dialog-eyebrow").textContent = eyebrow;
  document.querySelector("#workspace-dialog-title").textContent = title;
  document.querySelector("#workspace-dialog-content").replaceChildren(content);
  if (!dialog.open) dialog.showModal();
}

function sectionBlock(title, content) {
  const section = document.createElement("section");
  section.className = "workspace-block";
  const heading = document.createElement("h3");
  heading.textContent = title;
  section.append(heading, content);
  return section;
}

async function openProjectWorkspace(project) {
  if (!runtimeConnected) {
    document.querySelector(".connection-panel").open = true;
    setRuntimeStatus("Sign in to open live project workspaces.");
    return;
  }
  const loading = document.createElement("p");
  loading.textContent = "Loading live project evidence...";
  openWorkspaceDialog({ eyebrow: "Workspace", title: project.name, content: loading });
  try {
    const { response, result } = await runtimeRequest(`/api/v1/projects/${encodeURIComponent(project.id)}`);
    if (!response.ok) throw new Error(result.detail || result.error || "Project workspace failed to load");
    const shell = document.createElement("div");
    shell.className = "workspace-stack";
    const intro = document.createElement("div");
    intro.className = "workspace-summary";
    const ownerWorkspace = result.project.ownerWorkspace;
    const goal = document.createElement("p");
    goal.textContent = ownerWorkspace?.summary || result.project.goal;
    const actions = document.createElement("div");
    actions.className = "workspace-primary-actions";
    const workHere = document.createElement("button");
    workHere.type = "button";
    workHere.className = "button-primary";
    workHere.textContent = "Work on this project";
    workHere.addEventListener("click", () => {
      selectOwnerProject(result.project.id);
      document.querySelector("#workspace-dialog").close();
      setDashboardView("home");
      document.querySelector("#owner-command").focus();
      setRuntimeStatus(`${result.project.name} selected. Tell AG OS what outcome you want.`, runtimeConnected);
    });
    actions.append(workHere);
    if (ownerWorkspace?.liveUrl) {
      const openLive = document.createElement("a");
      openLive.className = "button-secondary live-app-link";
      openLive.href = ownerWorkspace.liveUrl;
      openLive.target = "_blank";
      openLive.rel = "noopener noreferrer";
      openLive.textContent = `${ownerWorkspace.liveLabel} ↗`;
      actions.append(openLive);
    }
    if (ownerWorkspace?.repositoryUrl) {
      const openRepository = document.createElement("a");
      openRepository.className = "button-secondary live-app-link";
      openRepository.href = ownerWorkspace.repositoryUrl;
      openRepository.target = "_blank";
      openRepository.rel = "noopener noreferrer";
      openRepository.textContent = "Open repository ↗";
      actions.append(openRepository);
    }
    const accessNote = document.createElement("p");
    accessNote.className = "workspace-access-note";
    accessNote.textContent = ownerWorkspace?.previewReason || "The full application opens securely in a separate tab while AG OS stays open.";
    intro.append(goal, actions, accessNote);
    const metrics = document.createElement("div");
    metrics.className = "workspace-metrics";
    [
      ["Jobs", result.progress.jobCount],
      ["Completed", result.progress.completedJobCount],
      ["Waiting approval", result.progress.waitingApprovalCount],
      ["Quality coverage", `${result.progress.qualityCoverage}%`],
      ["Lesson candidates", result.progress.lessonCandidateCount],
      ["Recorded cost", `$${result.progress.recordedCostUsd}`]
    ].forEach(([label, value]) => {
      const item = document.createElement("div");
      const strong = document.createElement("strong");
      strong.textContent = value;
      const span = document.createElement("span");
      span.textContent = label;
      item.append(strong, span);
      metrics.append(item);
    });
    const jobs = result.jobs.length
      ? table(["Job", "State", "Worker", "Result", "Updated"], result.jobs.map((job) => [
          job.jobId,
          pill(job.status === "plan_ready" || (job.status === "done" && job.deliverable?.kind === "plan_evidence") ? "plan ready" : job.status),
          job.assignedAgent,
          job.deliverable?.ownerUsable || job.deliverable?.kind === "plan_evidence"
            ? deliverableControls(job)
            : (job.blockedReason || (job.hasQualityScore ? `Scored; ${job.lessonCandidateCount} candidate(s)` : "Evidence pending")),
          job.updatedAt ? new Date(job.updatedAt).toLocaleString() : "Not recorded"
        ]))
      : itemList(["No jobs recorded for this project yet."]);
    const evidence = document.createElement("div");
    evidence.className = "workspace-evidence-grid";
    evidence.append(
      sectionBlock("What you can do", itemList(ownerWorkspace?.operations || result.project.scope)),
      sectionBlock("Source control", itemList([
        ownerWorkspace?.sourceControlStatus === "connected" ? "Connected" : ownerWorkspace?.sourceControlStatus === "approval_required" ? "Approval required" : "Setup needed",
        ownerWorkspace?.repositoryFullName || "Repository not bound yet",
        ownerWorkspace?.sourceControlDetail || "Not recorded"
      ])),
      sectionBlock("Operational adapters", itemList((ownerWorkspace?.adapters || []).map((adapter) => `${adapter.adapterId}: ${adapter.status} — ${adapter.detail}`))),
      sectionBlock("Tools", itemList(result.project.stack)),
      sectionBlock("Protected actions", itemList(result.project.approvalRequiredFor))
    );
    shell.append(intro, metrics, sectionBlock("Recent jobs", jobs), evidence);
    openWorkspaceDialog({ eyebrow: "Workspace", title: result.project.name, content: shell });
  } catch (error) {
    const failure = document.createElement("p");
    failure.textContent = `Could not open project: ${error.message}`;
    openWorkspaceDialog({ eyebrow: "Workspace", title: project.name, content: failure });
  }
}

function formField(labelText, control) {
  const label = document.createElement("label");
  const labelNode = document.createElement("span");
  labelNode.textContent = labelText;
  label.append(labelNode, control);
  return label;
}

function openNewProjectDialog() {
  if (!runtimeConnected) {
    document.querySelector(".connection-panel").open = true;
    setRuntimeStatus("Sign in before starting a project.");
    return;
  }
  const form = document.createElement("form");
  form.className = "workspace-form";
  const intro = document.createElement("p");
  intro.textContent = "Give AG OS the project name and outcome. AG OS chooses the scope, tools, and private repository name, then queues the exact approval it needs.";
  const name = document.createElement("input");
  name.required = true;
  name.minLength = 3;
  name.placeholder = "Project name";
  const goal = document.createElement("textarea");
  goal.required = true;
  goal.placeholder = "What successful completion looks like";
  const submit = document.createElement("button");
  submit.type = "submit";
  submit.className = "button-primary";
  submit.textContent = "Create project + queue private repo";
  form.append(intro, formField("Project name", name), formField("What should this project accomplish?", goal), submit);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    submit.disabled = true;
    try {
      const { response, result } = await runtimeRequest("/api/v1/projects", {
        method: "POST",
        body: JSON.stringify({
          name: name.value,
          goal: goal.value,
          projectType: "product_project",
          managementMode: "active_build",
          trustLevel: 1
        })
      });
      if (!response.ok) throw new Error(result.detail || result.error || "Project creation failed");
      document.querySelector("#workspace-dialog").close();
      setRuntimeStatus(`Created ${result.project.name}. Approve ${result.repositoryProvisioning.jobId} once to create and bind the private repository.`, true);
      await connectRuntime();
      setDashboardView("work");
    } catch (error) {
      setRuntimeStatus(`Project rejected: ${error.message}`);
    } finally {
      submit.disabled = false;
    }
  });
  openWorkspaceDialog({ eyebrow: "New project", title: "Start a real project", content: form });
}

function renderProjects(projects = data.projectRegistry.projects) {
  const root = clear("#projects-grid");
  projects.forEach((project) => {
    const card = document.createElement("article");
    card.className = "project-card interactive-card";
    card.dataset.projectId = project.id;
    const header = document.createElement("header");
    const identity = document.createElement("div");
    const name = document.createElement("strong");
    name.className = "project-card-name";
    name.textContent = project.name;
    const id = document.createElement("span");
    id.className = "project-id";
    id.textContent = project.id;
    identity.append(name, id);
    header.append(identity, pill(project.status === "active" ? "live" : project.status));
    const boundary = document.createElement("p");
    boundary.textContent = project.ownerWorkspace?.summary || project.boundary || "This project keeps its work, evidence, decisions, and lessons together.";
    const footer = document.createElement("footer");
    const liveStatus = document.createElement("span");
    liveStatus.textContent = "Live app connected";
    const sourceStatus = document.createElement("span");
    sourceStatus.textContent = project.ownerWorkspace?.sourceControlStatus === "connected" ? "Source connected" : "Source setup needed";
    const open = document.createElement("button");
    open.type = "button";
    open.className = "card-action";
    open.textContent = "Open workspace";
    open.addEventListener("click", () => openProjectWorkspace(project));
    footer.append(liveStatus, sourceStatus);
    card.append(header, boundary, footer, open);
    root.append(card);
  });
}

function populateProjectSelect(projects = data.projectRegistry.projects) {
  const root = clear("#owner-command-projects");
  const current = document.querySelector("#owner-command-project").value;
  const oneOff = document.createElement("button");
  oneOff.type = "button";
  oneOff.className = "project-choice";
  oneOff.dataset.projectId = "project-one-off";
  oneOff.setAttribute("aria-pressed", "false");
  const oneOffName = document.createElement("strong");
  oneOffName.textContent = "One-off work";
  const oneOffDetail = document.createElement("span");
  oneOffDetail.textContent = "Do this once without adding it to a project";
  oneOff.append(oneOffName, oneOffDetail);
  oneOff.addEventListener("click", () => selectOwnerProject("project-one-off"));
  root.append(oneOff);
  projects.forEach((project) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "project-choice";
    button.dataset.projectId = project.id;
    button.setAttribute("aria-pressed", "false");
    const name = document.createElement("strong");
    name.textContent = project.name;
    const detail = document.createElement("span");
    detail.textContent = project.ownerWorkspace?.summary || "Open project workspace";
    button.append(name, detail);
    button.addEventListener("click", () => selectOwnerProject(project.id));
    root.append(button);
  });
  selectOwnerProject(current === "project-one-off" || projects.some((project) => project.id === current) ? current : "project-one-off");
}

function selectOwnerProject(projectId) {
  const input = document.querySelector("#owner-command-project");
  input.value = projectId || "";
  document.querySelectorAll("#owner-command-projects .project-choice").forEach((button) => {
    const selected = button.dataset.projectId === input.value;
    button.setAttribute("aria-pressed", String(selected));
    button.classList.toggle("is-selected", selected);
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
      detail: `${data.commandRegistry.localCategories.length} local-safe routes; ${data.commandRegistry.gatedCategories.length} exact-approval routes`,
      meta: [...data.commandRegistry.localCategories, ...data.commandRegistry.gatedCategories].slice(0, 8)
    }),
    card({
      title: "Capability Registry",
      status: data.capabilityRegistry.status,
      metric: `${data.capabilityRegistry.count} registered`,
      detail: `${data.capabilityRegistry.availableNowCount} available now; ${data.capabilityRegistry.approvalGatedCount} available with approval`,
      meta: data.capabilityRegistry.allowedTypes
    })
  );
}

function watchdogFindingControl(finding) {
  const article = document.createElement("article");
  article.className = "watchdog-finding";
  const heading = document.createElement("h4");
  heading.textContent = finding.findingType === "failed_job" ? "Failed job" : "Blocked connector attempt";
  const identifier = document.createElement("code");
  identifier.textContent = finding.findingId;
  const detail = document.createElement("p");
  detail.textContent = finding.detail;
  const reason = document.createElement("input");
  reason.type = "text";
  reason.placeholder = "Why is this historical alert resolved?";
  reason.setAttribute("aria-label", `Resolution reason for ${finding.findingId}`);
  const button = document.createElement("button");
  button.type = "button";
  button.className = "button-secondary";
  button.textContent = "Acknowledge as resolved";
  button.addEventListener("click", async () => {
    const resolutionReason = reason.value.trim();
    if (resolutionReason.length < 8) {
      setRuntimeStatus("Add a short reason before resolving this Watchdog alert.", true);
      reason.focus();
      return;
    }
    if (!window.confirm(`Acknowledge ${finding.findingId} as resolved? The original failure stays in history and nothing will be retried.`)) return;
    button.disabled = true;
    try {
      assertOwnerSession();
      const { response, result } = await runtimeRequest(`/api/v1/watchdog/findings/${encodeURIComponent(finding.findingId)}/resolve`, {
        method: "POST",
        body: JSON.stringify({
          reason: resolutionReason,
          confirmation: `RESOLVE ${finding.findingId}`
        })
      });
      if (!response.ok) throw new Error(result.detail || result.error || "Watchdog resolution failed");
      runtimeSafeguards = result.safeguards;
      runtimeOperatingSystems = result.operatingSystems;
      renderOperatingSystems(runtimeOperatingSystems);
      setRuntimeStatus(`${finding.findingId} acknowledged. Its original evidence remains preserved and no action was retried.`, true);
      const updated = runtimeOperatingSystems.find((item) => item.id === "watchdog-os");
      openOperatingSystem(updated);
    } catch (error) {
      setRuntimeStatus(`Watchdog resolution rejected: ${error.message}`, true);
      button.disabled = false;
    }
  });
  article.append(heading, identifier, detail, reason, button);
  return article;
}

function openOperatingSystem(system) {
  const shell = document.createElement("div");
  shell.className = "workspace-stack";
  const summary = document.createElement("p");
  summary.textContent = system.summary;
  shell.append(
    summary,
    sectionBlock("Working now", itemList(system.working.length ? system.working : ["No capability evidence recorded."])),
    sectionBlock("Still required", itemList(system.remaining.length ? system.remaining : ["No incomplete internal setup recorded."]))
  );
  if (system.id === "watchdog-os") {
    const findings = runtimeSafeguards?.internalActionMonitoring?.findings ?? [];
    const findingList = document.createElement("div");
    findingList.className = "watchdog-finding-list";
    if (findings.length === 0) {
      const empty = document.createElement("p");
      empty.textContent = "No unresolved historical job or connector alerts.";
      findingList.append(empty);
    } else {
      findings.forEach((finding) => findingList.append(watchdogFindingControl(finding)));
    }
    shell.append(sectionBlock("Owner-resolvable alerts", findingList));
  }
  openWorkspaceDialog({ eyebrow: "Operating system", title: system.name, content: shell });
}

function renderOperatingSystems(systems = runtimeOperatingSystems) {
  const root = clear("#os-grid");
  const fallback = [
    { id: "cost-os", name: "Cost OS", status: "offline evidence", metric: data.costOs.monthlyMax, summary: "Sign in for live runtime status.", working: [data.costOs.dailyMax, data.costOs.perTaskMax, data.costOs.paidTools], remaining: [] },
    { id: "watchdog-os", name: "Watchdog OS", status: data.watchdog.status, metric: data.watchdog.monitoring, summary: "Built-in private runtime monitoring is configured; sign in for the current heartbeat.", working: data.watchdog.plannedChecks, remaining: [] },
    { id: "memory-os", name: "Memory OS", status: "offline evidence", metric: `${data.memoryOs.shortTermDays} days`, summary: "Sign in for the active lesson queue.", working: data.memoryOs.rules, remaining: [] },
    { id: "quality-os", name: "Quality OS", status: "offline evidence", metric: `${data.qualityReview.qualityScoreCount} scores`, summary: "Sign in for completion-proof coverage.", working: data.qualityOs.rules, remaining: [] },
    { id: "security-os", name: "Security OS", status: "protected", metric: "Fail closed", summary: "Credentials and external actions remain approval-gated.", working: data.securityOs.rules, remaining: [] }
  ];
  (systems || fallback).forEach((system) => {
    const systemCard = card({
      title: system.name,
      status: system.status.replaceAll("_", " "),
      metric: system.metric,
      detail: system.summary,
      meta: [...system.working.slice(0, 3), ...system.remaining.slice(0, 1)],
      onActivate: () => openOperatingSystem(system)
    });
    systemCard.dataset.systemId = system.id;
    root.append(systemCard);
  });
}

function renderCapabilities() {
  const root = clear("#capabilities-panel");
  const availableNow = table(
    ["Available now", "Status", "Risk", "Last proven", "Proof records"],
    data.capabilityRegistry.availableNow.map((capability) => [
      labelStack(capability.name, capability.id),
      pill("available now"),
      capability.riskTier,
      capability.lastProvenDate,
      `${capability.proofRecords.length} record(s)`
    ])
  );
  const approvalGated = table(
    ["Available with approval", "Status", "Risk", "Last proven", "Proof records"],
    data.capabilityRegistry.approvalGated.map((capability) => [
      labelStack(capability.name, capability.id),
      pill("approval gated"),
      capability.riskTier,
      capability.lastProvenDate,
      `${capability.proofRecords.length} record(s)`
    ])
  );
  const protectedBoundaries = card({
    title: "Protected Boundaries",
    status: "protected",
    metric: `${data.capabilityRegistry.blockedCount} tracked`,
    detail: "These are intentional Constitution gates, not broken features.",
    meta: data.capabilityRegistry.blocked.slice(0, 12)
  });
  const draftOnly = card({
    title: "Draft/Advisory Outputs",
    status: "draft-only",
    metric: `${data.capabilityRegistry.draftOnlyCount} capabilities`,
    detail: "Draft, candidate, or advisory outputs do not grant permission.",
    meta: data.capabilityRegistry.draftOnly.map((capability) => capability.name)
  });
  root.append(availableNow, approvalGated, protectedBoundaries, draftOnly);
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

async function decideLessonCandidates(lessonIds, decision) {
  assertOwnerSession();
  const action = decision === "promote" ? "accept as advisory runtime memory" : "reject";
  if (!window.confirm(`${action} ${lessonIds.length} selected lesson${lessonIds.length === 1 ? "" : "s"}? This records an owner decision and audit evidence.`)) return;
  let reason = "Owner reviewed this candidate and chose not to retain it.";
  if (decision === "reject") {
    const supplied = window.prompt("Why should these lessons be rejected?", reason);
    if (supplied === null) return;
    reason = supplied.trim();
  }
  setRuntimeStatus(`Recording ${decision} decision for ${lessonIds.length} lesson(s)...`, true);
  try {
    const { response, result } = await runtimeRequest("/api/v1/memory/lessons/decision", {
      method: "POST",
      body: JSON.stringify({ lessonIds, decision, reason })
    });
    if (!response.ok) throw new Error(result.detail || result.error || "Lesson decision failed");
    runtimeLessonDecisions = result.queue;
    renderUnifiedMemory(runtimeLessonDecisions);
    setRuntimeStatus(`${lessonIds.length} lesson decision(s) recorded. Accepted memory remains advisory and grants no permission.`, true);
  } catch (error) {
    setRuntimeStatus(`Lesson decision rejected: ${error.message}`, true);
  }
}

function lessonDecisionPanel(queue) {
  const wrapper = document.createElement("div");
  wrapper.className = "lesson-queue";
  if (!runtimeConnected) {
    const note = document.createElement("p");
    note.textContent = "Sign in to review and decide lesson candidates.";
    wrapper.append(note);
    return wrapper;
  }
  if (!queue.decisions.length) {
    const empty = document.createElement("p");
    empty.textContent = "No lesson candidates need an owner decision.";
    wrapper.append(empty);
    return wrapper;
  }
  const toolbar = document.createElement("div");
  toolbar.className = "lesson-toolbar";
  const selectedCount = document.createElement("span");
  selectedCount.textContent = "0 selected";
  const accept = document.createElement("button");
  accept.type = "button";
  accept.textContent = "Accept selected";
  const reject = document.createElement("button");
  reject.type = "button";
  reject.className = "secondary-action";
  reject.textContent = "Reject selected";
  toolbar.append(selectedCount, accept, reject);
  const list = document.createElement("div");
  list.className = "lesson-list";
  queue.decisions.forEach((item) => {
    const row = document.createElement("article");
    row.className = "lesson-row";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = item.lessonId;
    checkbox.disabled = !item.canPromote && item.recommendation === "blocked_conflict";
    checkbox.setAttribute("aria-label", `Select ${item.title}`);
    const body = document.createElement("div");
    const heading = document.createElement("div");
    heading.className = "lesson-row-heading";
    const title = document.createElement("strong");
    title.textContent = item.title;
    heading.append(title, pill(item.recommendation.replaceAll("_", " ")));
    const lesson = document.createElement("p");
    lesson.textContent = item.lesson;
    const meta = document.createElement("p");
    meta.className = "lesson-meta";
    meta.textContent = `${item.confidence} confidence · ${item.projectId || item.scope} · ${item.appliesTo.join(", ")}`;
    body.append(heading, lesson, meta);
    const actions = document.createElement("div");
    actions.className = "job-actions";
    const oneAccept = document.createElement("button");
    oneAccept.type = "button";
    oneAccept.textContent = "Accept";
    oneAccept.disabled = !item.canPromote;
    oneAccept.addEventListener("click", () => decideLessonCandidates([item.lessonId], "promote"));
    const oneReject = document.createElement("button");
    oneReject.type = "button";
    oneReject.className = "job-reject";
    oneReject.textContent = "Reject";
    oneReject.addEventListener("click", () => decideLessonCandidates([item.lessonId], "reject"));
    actions.append(oneAccept, oneReject);
    row.append(checkbox, body, actions);
    list.append(row);
  });
  const selected = () => [...list.querySelectorAll("input:checked")].map((input) => input.value);
  list.addEventListener("change", () => { selectedCount.textContent = `${selected().length} selected`; });
  accept.addEventListener("click", () => selected().length && decideLessonCandidates(selected(), "promote"));
  reject.addEventListener("click", () => selected().length && decideLessonCandidates(selected(), "reject"));
  wrapper.append(toolbar, list);
  return wrapper;
}

function renderUnifiedMemory(runtimeQueue = runtimeLessonDecisions) {
  const memory = data.unifiedMemory;
  const queue = runtimeQueue || {
    acceptedCount: memory.acceptedCount,
    rejectedCount: memory.rejectedCount,
    activeCandidateCount: memory.candidateCount,
    recommendedCount: 0,
    duplicateCount: 0,
    decisions: []
  };
  const root = clear("#unified-memory-grid");
  root.append(
    card({
      title: "Accepted Lessons",
      status: memory.acceptedLessonsLoadedByRuntime ? "ready" : "blocked",
      metric: queue.acceptedCount,
      detail: "Accepted lessons may be loaded as advisory runtime guidance.",
      meta: memory.latestAcceptedLessons.length > 0
        ? memory.latestAcceptedLessons.map((lesson) => `${lesson.lessonId}: ${lesson.scope}`)
        : ["No accepted lessons recorded yet."]
    }),
    card({
      title: "Candidate Lessons",
      status: memory.candidatesLoadedAsTruth ? "blocked" : "review",
      metric: queue.activeCandidateCount,
      detail: "Candidates remain advisory until you accept or reject them.",
      meta: [`${queue.recommendedCount} recommended`, `${queue.duplicateCount} possible duplicates`]
    }),
    card({
      title: "Rejected Lessons",
      status: memory.rejectedLoadedAsTruth ? "blocked" : "ready",
      metric: queue.rejectedCount,
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
      status: queue.activeCandidateCount > 0 ? "owner action" : "ready",
      metric: queue.activeCandidateCount,
      detail: runtimeConnected ? "Accept or reject candidates here; every decision is audited." : "Sign in to make owner decisions.",
      meta: ["Accepted lessons guide future work but never grant permission."]
    })
  );

  const panel = clear("#unified-memory-panel");
  panel.append(
    lessonDecisionPanel(queue),
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

function openSkill(skill) {
  const shell = document.createElement("div");
  shell.className = "workspace-stack";
  const summary = document.createElement("p");
  summary.textContent = `${skill.category} procedure applied ${skill.timesApplied} time(s); last applied ${skill.lastAppliedDate || "not recorded"}.`;
  shell.append(
    summary,
    sectionBlock("Procedure", itemList(skill.procedure)),
    sectionBlock("Quality checklist", itemList(skill.qualityChecklist)),
    sectionBlock("Common failures", itemList(skill.commonFailures)),
    sectionBlock("Permission boundary", itemList([skill.riskNotes, "Skills guide execution but never grant permission."])),
    sectionBlock("Source record", itemList([skill.recordPath]))
  );
  openWorkspaceDialog({ eyebrow: "Active skill", title: skill.name, content: shell });
}

function renderSkills() {
  const root = clear("#skills-panel");
  root.append(
    card({
      title: "Skills Library",
      status: data.skills.activeCount > 0 ? "active" : "zero",
      metric: `${data.skills.activeCount} active`,
      detail: `${data.skills.draftCount} draft; procedural guidance never grants permission`,
      meta: ["Open a skill to see its procedure, checklist, proof, and safety boundary."]
    })
  );
  data.skills.skills.forEach((skill) => {
    root.append(card({
      title: skill.name,
      status: skill.status,
      metric: `${skill.timesApplied} applications`,
      detail: `${skill.proofRecordCount} proof record(s); ${skill.category}`,
      meta: [skill.riskNotes],
      onActivate: () => openSkill(skill),
      actionLabel: "Open skill"
    }));
  });
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
  const checks = document.createElement("ul");
  checks.className = "policy-checks";
  data.safeMerge.requiredChecks.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    checks.append(li);
  });
  root.append(
    card({
      title: "Safe Merge gate checker",
      status: data.safeMerge.status,
      metric: `${data.safeMerge.candidateCount} candidates`,
      detail: data.safeMerge.summary,
      meta: [
        `${data.safeMerge.readyCount} ready`,
        `${data.safeMerge.blockedCount} blocked`,
        `${data.safeMerge.invalidCount} invalid`,
        `Merge executed: ${data.safeMerge.mergeExecuted}`
      ]
    }),
    sectionBlock("Required checks", checks),
    table(
      ["Candidate", "Status", "PR", "Commit", "Reason"],
      data.safeMerge.candidates.map((candidate) => [
        candidate.safeMergeRuntimeId,
        pill(candidate.status),
        candidate.prNumber,
        candidate.commitSha,
        candidate.blockingReasons.join("; ") || "All gates passed"
      ])
    )
  );
}

function coordinatorBaseUrl() {
  const configured = document.querySelector("#coordinator-url").value.trim();
  return configured ? configured.replace(/\/$/, "") : window.location.origin;
}

function runtimeHeaders() {
  const token = document.querySelector("#owner-token").value;
  return token
    ? { authorization: `Bearer ${token}`, "content-type": "application/json" }
    : { "content-type": "application/json" };
}

function clearRuntimeSession() {
  sessionStorage.removeItem("ag-os-owner-token");
  document.querySelector("#owner-token").value = "";
  document.querySelector("#owner-password").value = "";
  runtimeConnected = false;
  document.querySelector("#logout-runtime").hidden = true;
}

async function runtimeRequest(pathname, options = {}) {
  const response = await fetch(`${coordinatorBaseUrl()}${pathname}`, {
    ...options,
    credentials: "include",
    headers: { ...runtimeHeaders(), ...(options.headers || {}) }
  });
  let result;
  try {
    result = await response.json();
  } catch {
    result = { error: `Coordinator returned HTTP ${response.status}` };
  }
  if (response.status === 401) {
    clearRuntimeSession();
    document.querySelector(".connection-panel").open = true;
    throw new Error("Owner session is not authorized. Sign in with your owner password.");
  }
  return { response, result };
}

function assertOwnerSession() {
  if (!runtimeConnected) {
    document.querySelector(".connection-panel").open = true;
    throw new Error("Sign in to the private owner session before starting work.");
  }
}

function setRuntimeStatus(message, connected = false) {
  runtimeConnected = connected;
  document.querySelector("#runtime-status").textContent = message;
  document.querySelector("#logout-runtime").hidden = !connected;
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
      command.state === "plan_ready" ? "Plan ready" : command.state,
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
    ["Job", "Workspace", "Worker", "State", "Result", "Decision", "Updated"],
    jobs.map((job) => [
      labelStack(job.jobId, job.assignedAgent),
      job.projectId === "project-one-off" ? "One-off work" : job.projectId,
      labelStack(job.adapter?.name || "Unassigned", job.adapter?.adapterId || "No adapter"),
      pill(job.status === "plan_ready" || (job.status === "done" && job.deliverable?.kind === "plan_evidence") ? "plan ready" : job.status),
      job.deliverable?.ownerUsable
        ? deliverableControls(job)
        : job.deliverable?.kind === "plan_evidence"
          ? deliverableControls(job)
          : (job.blockedReason || "In progress"),
      runtimeJobDecisionControls(job),
      new Date(job.updatedAt).toLocaleString()
    ])
  ));
}

function deliverableControls(job) {
  const wrapper = document.createElement("div");
  wrapper.className = "job-actions";
  const summary = document.createElement("span");
  summary.textContent = job.deliverable.ownerUsable
    ? `${job.deliverable.fileCount} deliverable file(s)`
    : "Plan only — no finished product";
  const open = document.createElement("button");
  open.type = "button";
  open.className = job.deliverable.ownerUsable ? "job-approve" : "secondary-action";
  open.textContent = job.deliverable.ownerUsable ? "Open result" : "View plan";
  open.addEventListener("click", () => openJobDeliverable(job));
  wrapper.append(summary, open);
  return wrapper;
}

function inlineWebsitePreview(deliverable) {
  const index = deliverable.files.find((file) => file.path === deliverable.entryFile);
  if (!index) return "<p>Preview entry file is missing.</p>";
  const parser = new DOMParser();
  const documentCopy = parser.parseFromString(index.content, "text/html");
  const byPath = new Map(deliverable.files.map((file) => [file.path.replace(/^\.\//, ""), file]));
  documentCopy.querySelectorAll("link[rel='stylesheet'][href]").forEach((link) => {
    const file = byPath.get(link.getAttribute("href").replace(/^\.\//, ""));
    if (!file) return;
    const style = documentCopy.createElement("style");
    style.textContent = file.content;
    link.replaceWith(style);
  });
  documentCopy.querySelectorAll("script[src]").forEach((script) => {
    const file = byPath.get(script.getAttribute("src").replace(/^\.\//, ""));
    if (!file) return script.remove();
    const inline = documentCopy.createElement("script");
    inline.textContent = file.content;
    script.replaceWith(inline);
  });
  documentCopy.querySelectorAll("form").forEach((form) => form.addEventListener("submit", (event) => event.preventDefault()));
  return `<!doctype html>${documentCopy.documentElement.outerHTML}`;
}

async function openJobDeliverable(job) {
  assertOwnerSession();
  const loading = document.createElement("p");
  loading.textContent = "Loading the recorded result...";
  openWorkspaceDialog({ eyebrow: "Result", title: job.jobId, content: loading });
  try {
    const { response, result } = await runtimeRequest(`/api/v1/jobs/${encodeURIComponent(job.jobId)}/deliverable`);
    if (!response.ok) throw new Error(result.detail || result.error || "Deliverable failed to load");
    const shell = document.createElement("div");
    shell.className = "workspace-stack";
    const notice = document.createElement("p");
    notice.className = "workspace-access-note";
    notice.textContent = result.ownerUsable
      ? "This is the real recorded output from the worker. The preview is sandboxed inside AG OS."
      : "This run produced planning evidence only. It did not produce a website or other finished deliverable.";
    shell.append(notice);
    if (result.previewAvailable) {
      const frame = document.createElement("iframe");
      frame.className = "deliverable-preview";
      frame.setAttribute("sandbox", "allow-scripts");
      frame.setAttribute("title", `Preview of ${job.jobId}`);
      frame.srcdoc = inlineWebsitePreview(result);
      shell.append(frame);
    }
    const fileList = document.createElement("ul");
    fileList.className = "policy-checks";
    result.files.forEach((file) => {
      const item = document.createElement("li");
      item.textContent = `${file.path} (${file.bytes} bytes)`;
      fileList.append(item);
    });
    shell.append(sectionBlock("Files", fileList));
    if (!result.ownerUsable && result.files[0]?.content) {
      const source = document.createElement("pre");
      source.className = "deliverable-source";
      source.textContent = result.files[0].content;
      shell.append(sectionBlock("Plan evidence", source));
    }
    openWorkspaceDialog({ eyebrow: result.ownerUsable ? "Deliverable" : "Plan only", title: job.jobId, content: shell });
  } catch (error) {
    const failure = document.createElement("p");
    failure.textContent = `Could not open result: ${error.message}`;
    openWorkspaceDialog({ eyebrow: "Result", title: job.jobId, content: failure });
  }
}

function runtimeJobDecisionControls(job) {
  const actions = document.createElement("div");
  actions.className = "job-actions";
  for (const action of job.availableRecoveryActions || []) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = action === "replan" ? "job-approve" : "secondary-action";
    button.textContent = action === "replan" ? "Replan + rebuild" : "Retry";
    button.addEventListener("click", () => recoverRuntimeJob(job, action, button));
    actions.append(button);
  }
  if (!job.availableDecisions?.length) {
    if (!(job.availableRecoveryActions || []).length) {
      actions.textContent = job.status === "done" ? "Completed" : (job.status === "plan_ready" ? "Plan ready" : "No decision needed");
    }
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

async function recoverRuntimeJob(job, action, button) {
  const exact = `${action.toUpperCase()} ${job.jobId}`;
  if (!window.confirm(`${action === "replan" ? "Create a new plan and rebuild" : "Retry this command"} as a new traceable job?\n\n${exact}`)) return;
  button.disabled = true;
  setRuntimeStatus(`${action === "replan" ? "Replanning" : "Retrying"} ${job.jobId}...`, true);
  try {
    assertOwnerSession();
    const { response, result } = await runtimeRequest(`/api/v1/jobs/${encodeURIComponent(job.jobId)}/recover`, {
      method: "POST",
      body: JSON.stringify({ action, confirmation: exact })
    });
    if (!response.ok) throw new Error(result.detail || result.error || "Recovery failed");
    setRuntimeStatus(`${job.jobId} recovery created ${result.jobId}. The original evidence remains unchanged.`, true);
    await connectRuntime();
  } catch (error) {
    setRuntimeStatus(`Recovery stopped: ${error.message}`, true);
    button.disabled = false;
  }
}

async function decideRuntimeJob(job, decision, button) {
  const label = decision === "approve"
    ? "approve exactly one execution"
    : (decision === "revoke" ? "revoke this approval before the adapter performs another step" : "reject and cancel this job");
  if (!window.confirm(`${label} for ${job.jobId}?`)) return;
  button.disabled = true;
  setRuntimeStatus(`${decision === "approve" ? "Approving" : (decision === "revoke" ? "Revoking" : "Rejecting")} ${job.jobId}...`, true);
  try {
    assertOwnerSession();
    const { response, result } = await runtimeRequest(`/api/v1/jobs/${encodeURIComponent(job.jobId)}/decision`, {
      method: "POST",
      body: JSON.stringify({
        decision,
        confirmation: `${decision.toUpperCase()} ${job.jobId}`
      })
    });
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

async function connectRuntime(options = {}) {
  const restoring = options?.restoring === true;
  const ownerPasswordField = document.querySelector("#owner-password");
  const ownerCredential = ownerPasswordField.value;
  let token = document.querySelector("#owner-token").value;
  sessionStorage.setItem("ag-os-coordinator-url", document.querySelector("#coordinator-url").value.trim());
  setRuntimeStatus("Connecting...");
  try {
    if (ownerCredential) {
      const loginResponse = await fetch(`${coordinatorBaseUrl()}/api/v1/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ["password"]: ownerCredential })
      });
      const loginResult = await loginResponse.json().catch(() => ({}));
      ownerPasswordField.value = "";
      if (!loginResponse.ok) {
        if (loginResponse.status === 429) throw new Error("Too many failed attempts. Wait 15 minutes before trying again.");
        if (loginResponse.status === 503) throw new Error("Password login has not been activated on the private runtime yet.");
        throw new Error(loginResult.error === "invalid_credentials" ? "That password is incorrect." : (loginResult.error || "Password sign-in failed"));
      }
      token = "";
      document.querySelector("#owner-token").value = "";
      sessionStorage.removeItem("ag-os-owner-token");
    }
    if (token) sessionStorage.setItem("ag-os-owner-token", token);
    else sessionStorage.removeItem("ag-os-owner-token");
    const { response, result } = await runtimeRequest("/api/v1/status");
    if (!response.ok) {
      throw new Error(result.detail || result.error || "Connection failed");
    }
    const authLabel = result.authentication?.method === "password_session"
      ? `Password session remembered for up to ${result.authentication.sessionDays} days.`
      : "Recovery-token session active for this tab.";
    setRuntimeStatus(`Connected. ${authLabel} Private runtime is ${result.runtimeDeployment?.status || "live"}; coordinator readiness is ${result.readiness?.coordinator?.passedCheckCount || 0}/${result.readiness?.coordinator?.requiredCheckCount || 0}; operational safeguards are ${result.safeguards?.status || "unknown"}. Gated actions remain approval-controlled.`, true);
    document.querySelector(".connection-panel").open = false;
    runtimeAiPlanner = result.aiPlanner;
    runtimeAiWorker = result.aiWorker;
    runtimeAutomation = result.automation;
    runtimeSafeguards = result.safeguards;
    runtimeOperatingSystems = result.operatingSystems;
    runtimeLessonDecisions = result.lessonDecisions;
    document.querySelector("#worker-routing-help").textContent = runtimeAiWorker?.ready
      ? `Professional builder ${runtimeAiWorker.model} is ready. AG OS automatically uses it when the outcome requires files; every paid use remains costed and approval-limited.`
      : `Planning is available, but real file generation needs builder activation. AG OS will stop with a clear setup message instead of claiming a plan is a finished product.`;
    renderActivationCenter(true, result.runtimeDeployment?.status || "live_private", runtimeAiPlanner, runtimeAiWorker);
    renderRecentCommands(result.recentCommands);
    renderRuntimeJobs(result.jobs);
    renderProjects(result.projects);
    renderOperatingSystems(runtimeOperatingSystems);
    renderUnifiedMemory(runtimeLessonDecisions);
    populateProjectSelect(result.projects);
  } catch (error) {
    ownerPasswordField.value = "";
    setRuntimeStatus(restoring ? "Sign in once with your owner password to activate this browser." : `Connection failed: ${error.message}`);
    document.querySelector(".connection-panel").open = true;
  }
}

async function logoutRuntime() {
  try {
    await fetch(`${coordinatorBaseUrl()}/api/v1/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" }
    });
  } finally {
    clearRuntimeSession();
    setRuntimeStatus("Signed out. Your password was never stored in the browser.");
    document.querySelector(".connection-panel").open = true;
  }
}

async function submitOwnerCommand(event) {
  event.preventDefault();
  const button = event.currentTarget.querySelector("button[type='submit']");
  button.disabled = true;
  setRuntimeStatus("Creating the gated work package...", true);
  try {
    assertOwnerSession();
    const { response, result } = await runtimeRequest("/api/v1/commands", {
      method: "POST",
      body: JSON.stringify({
        command: document.querySelector("#owner-command").value,
        projectId: document.querySelector("#owner-command-project").value
      })
    });
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
  document.querySelector("#logout-runtime").addEventListener("click", logoutRuntime);
  document.querySelector("#owner-command-form").addEventListener("submit", submitOwnerCommand);
  document.querySelector("#projects-go-command").addEventListener("click", () => {
    setDashboardView("home");
    document.querySelector("#owner-command").focus();
  });
  document.querySelector("#projects-new").addEventListener("click", openNewProjectDialog);
  document.querySelector("#workspace-dialog-close").addEventListener("click", () => document.querySelector("#workspace-dialog").close());
  document.querySelector("#workspace-dialog").addEventListener("click", (event) => {
    if (event.target === event.currentTarget) event.currentTarget.close();
  });
  renderRecentCommands();
  renderRuntimeJobs();
  connectRuntime({ restoring: true });
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
