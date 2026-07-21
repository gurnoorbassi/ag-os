"use strict";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const VALID_VIEWS = new Set(["console", "ops", "keep", "dash"]);
const state = {
  view: VALID_VIEWS.has(location.hash.slice(1)) ? location.hash.slice(1) : "console",
  status: null,
  previousJobs: new Map(),
  ownerToken: sessionStorage.getItem("ag_os_owner_token") || "",
  authenticated: false,
  busy: false
};

const connBadge = $("#os-conn");
const authDialog = $("#auth-dialog");
const drawer = $("#detail-drawer");
const drawerBody = $("#drawer-body");
const promptInput = $("#os-input");
const consoleScreen = $("#con-screen");
const keepStage = $("#keep-stage");

function escapeHtml(value) {
  const node = document.createElement("div");
  node.textContent = String(value ?? "");
  return node.innerHTML;
}

function short(value, max = 58) {
  const text = String(value ?? "");
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function titleCase(value) {
  return String(value || "unknown").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function timeAgo(value) {
  const timestamp = Date.parse(value || "");
  if (!Number.isFinite(timestamp)) return "just now";
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function statusTone(value) {
  const normalized = String(value || "").toLowerCase();
  if (["done", "complete", "operational", "protected", "active", "pass", "ready"].includes(normalized)) return "ok";
  if (["failed", "blocked", "rejected", "revoked", "expired"].includes(normalized)) return "bad";
  if (["waiting_approval", "needs_revision", "running", "queued", "operational_attention", "setup_needed", "proposed"].includes(normalized)) return "warn";
  return "dim";
}

function statusChip(value, label = titleCase(value)) {
  return `<span class="status-chip ${statusTone(value)}">${escapeHtml(label)}</span>`;
}

async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (!headers.has("content-type") && options.body !== undefined) headers.set("content-type", "application/json");
  if (state.ownerToken) headers.set("authorization", `Bearer ${state.ownerToken}`);
  const response = await fetch(path, { credentials: "same-origin", ...options, headers });
  const body = await response.json().catch(() => ({}));
  if (response.status === 401) {
    setAuthenticated(false);
    throw new Error("Owner sign-in required");
  }
  if (!response.ok) throw new Error(body.detail || body.error || `Request failed (${response.status})`);
  return body;
}

function setAuthenticated(authenticated) {
  state.authenticated = authenticated;
  connBadge.className = `presence-pill ${authenticated ? "live" : "offline"}`;
  connBadge.innerHTML = `<span></span>${authenticated ? "Live · private" : "Locked"}`;
  $("#console-state").textContent = authenticated ? "Live · private · fail-closed" : "Locked · sign in to operate";
  if (!authenticated && !authDialog.open) authDialog.showModal();
  if (authenticated && authDialog.open) authDialog.close();
}

async function refreshStatus({ quiet = false } = {}) {
  try {
    const next = await api("/api/v1/status");
    state.status = next;
    setAuthenticated(true);
    processJobTransitions(next.jobs || []);
    renderAll();
  } catch (error) {
    if (!quiet && error.message !== "Owner sign-in required") consoleLine(`■ ${error.message}`, "bad");
  }
}

function processJobTransitions(jobs) {
  for (const job of jobs) {
    const previous = state.previousJobs.get(job.jobId);
    if (previous && previous !== job.status) {
      if (job.status === "running") keepPacketToForge(job.jobId);
      if (job.status === "waiting_approval") keepPacketToGate(job);
      if (job.status === "done") keepCompleteJob(job.jobId);
      if (job.status === "failed") keepFailJob(job.jobId);
    } else if (!previous && ["queued", "running", "waiting_approval"].includes(job.status)) {
      keepSpawnPacket(job);
    }
  }
  state.previousJobs = new Map(jobs.map((job) => [job.jobId, job.status]));
}

function setView(view) {
  if (!VALID_VIEWS.has(view)) view = "console";
  state.view = view;
  history.replaceState(null, "", `#${view}`);
  for (const button of $$("#os-tabs button[data-view]")) {
    const active = button.dataset.view === view;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  }
  for (const name of VALID_VIEWS) $(`#view-${name}`).classList.toggle("os-hidden", name !== view);
}

function consoleLine(text, tone = "") {
  $("#console-empty").classList.add("hidden");
  consoleScreen.classList.add("has-lines");
  const line = document.createElement("div");
  line.className = `con-line ${tone}`;
  line.textContent = text;
  consoleScreen.appendChild(line);
  consoleScreen.scrollTop = consoleScreen.scrollHeight;
  return line;
}

function consoleStep(label, value, tone = "ok") {
  const line = document.createElement("div");
  line.className = "con-line";
  line.innerHTML = `<span class="dim">${escapeHtml(label)}</span> <span class="con-lead">${"·".repeat(Math.max(2, 24 - label.length))}</span> <span class="${tone}">${escapeHtml(value)}</span>`;
  consoleScreen.appendChild(line);
  consoleScreen.scrollTop = consoleScreen.scrollHeight;
}

function budgetView() {
  let result = null;
  const seen = new Set();
  (function walk(node) {
    if (result || !node || typeof node !== "object" || seen.has(node)) return;
    seen.add(node);
    const cap = node.monthlyMaxUsd ?? node.monthlyBudgetUsd ?? node.maxUsd;
    const spent = node.totalRecordedActualUsd ?? node.spentUsd ?? node.recordedUsd ?? node.totalUsd;
    if (typeof cap === "number" && cap > 0 && typeof spent === "number") {
      result = { spent, cap, percent: Math.min(100, Math.round((spent / cap) * 100)) };
      return;
    }
    for (const value of Object.values(node)) walk(value);
  })(state.status);
  return result || { spent: 0, cap: 50, percent: 0 };
}

function renderProjectTarget() {
  const select = $("#os-project");
  const selected = select.value;
  select.replaceChildren(new Option("One-off work", ""));
  for (const project of state.status?.projects || []) select.add(new Option(project.name, project.id));
  if ([...select.options].some((option) => option.value === selected)) select.value = selected;
}

async function submitCommand(command) {
  const text = String(command || "").trim();
  if (!text || state.busy) return;
  setView("console");
  consoleLine(`› ${text}`, "con-user");
  const local = text.toLowerCase();
  if (["status", "jobs", "budget", "lessons", "projects", "help"].includes(local)) {
    renderLocalCommand(local);
    return;
  }
  state.busy = true;
  $("#send-command").disabled = true;
  const pending = consoleLine("◌ AG OS is routing the work…", "warn");
  try {
    const projectId = $("#os-project").value || undefined;
    const result = await api("/api/v1/commands", {
      method: "POST",
      body: JSON.stringify({ command: text, ...(projectId ? { projectId } : {}) })
    });
    pending.remove();
    const intakeId = result.commandIntakeId || result.commandIntake?.commandIntakeId || result.record?.commandIntakeId;
    const planId = result.planId || result.plan?.planId || result.commandIntake?.nextRecord?.planId;
    const jobId = result.jobId || result.job?.jobId || result.commandIntake?.nextRecord?.jobId;
    const jobStatus = result.status || result.job?.status || "queued";
    consoleStep("intake", intakeId || "classified");
    if (planId) consoleStep("plan", planId);
    if (jobId) consoleStep("job", `${short(jobId, 70)} · ${titleCase(jobStatus)}`, statusTone(jobStatus));
    if (jobStatus === "waiting_approval") consoleLine("▲ The job is waiting in Ops for your decision.", "warn");
    await refreshStatus({ quiet: true });
  } catch (error) {
    pending.remove();
    consoleLine(`■ ${error.message}`, "bad");
  } finally {
    state.busy = false;
    $("#send-command").disabled = false;
  }
}

function renderLocalCommand(command) {
  const jobs = state.status?.jobs || [];
  const lessons = state.status?.lessonDecisions || {};
  const budget = budgetView();
  if (command === "status") {
    consoleStep("coordinator", state.authenticated ? "live and private" : "locked", state.authenticated ? "ok" : "warn");
    consoleStep("automation", state.status?.automation?.enabled ? "running" : "paused", state.status?.automation?.enabled ? "ok" : "warn");
    consoleStep("owner decisions", String(ownerDecisions().length), ownerDecisions().length ? "warn" : "ok");
    consoleStep("budget", `$${budget.spent.toFixed(2)} of $${budget.cap.toFixed(2)}`, budget.percent > 80 ? "warn" : "ok");
  } else if (command === "jobs") {
    if (!jobs.length) consoleLine("No jobs yet.", "dim");
    for (const job of jobs.slice(0, 10)) consoleStep(short(job.jobId.replace("job-runtime-operator-", ""), 22), titleCase(job.status), statusTone(job.status));
  } else if (command === "budget") {
    consoleStep("spent", `$${budget.spent.toFixed(2)}`);
    consoleStep("monthly cap", `$${budget.cap.toFixed(2)}`);
    consoleStep("circuit breaker", "armed");
  } else if (command === "lessons") {
    consoleStep("accepted", String(lessons.acceptedCount || 0));
    consoleStep("waiting for you", String(lessons.activeCandidateCount || 0), lessons.activeCandidateCount ? "warn" : "ok");
    consoleLine("Open Ops → Needs you to decide lessons.", "dim");
  } else if (command === "projects") {
    const projects = state.status?.projects || [];
    if (!projects.length) consoleLine("No projects registered.", "dim");
    for (const project of projects) consoleStep(project.name, titleCase(project.status), statusTone(project.status));
  } else {
    consoleLine("Local commands: status · jobs · budget · lessons · projects · help", "dim");
    consoleLine("Anything else becomes a real owner command.", "dim");
  }
}

function jobSummary(job) {
  return job.expectedOutput || job.command || job.jobId;
}

function projectCard(project) {
  return `<article class="ops-card" data-open-project="${escapeHtml(project.id)}" tabindex="0">
    <div class="ops-card-head"><h3>${escapeHtml(project.name)}</h3>${statusChip(project.status)}</div>
    <p>${escapeHtml(short(project.ownerWorkspace?.summary || project.boundary || "Project workspace", 120))}</p>
    <div class="ops-card-meta"><span>${escapeHtml(titleCase(project.managementMode))}</span><span>·</span><span>${escapeHtml(project.sensitivity?.label || titleCase(project.riskLevel))}</span></div>
  </article>`;
}

function jobCard(job) {
  const deliverable = job.deliverable || {};
  return `<article class="ops-card" data-open-job="${escapeHtml(job.jobId)}" tabindex="0">
    <div class="ops-card-head"><h3>${escapeHtml(short(jobSummary(job), 82))}</h3>${statusChip(job.status)}</div>
    <p>${escapeHtml(short(job.jobId.replace("job-runtime-operator-", "Run "), 58))}</p>
    <div class="ops-card-meta"><span>${escapeHtml(job.projectId || "One-off")}</span>${deliverable.ownerUsable ? `<span>·</span><span class="ok">${deliverable.fileCount || 0} files</span>` : ""}<span>·</span><span>${escapeHtml(timeAgo(job.updatedAt || job.createdAt))}</span></div>
  </article>`;
}

function waitingJobCard(job) {
  const decisions = (job.availableDecisions || []).filter((item) => ["approve", "reject", "revoke"].includes(item));
  return `<article class="ops-card">
    <div class="ops-card-head"><h3>${escapeHtml(short(jobSummary(job), 78))}</h3>${statusChip(job.status)}</div>
    <p>${escapeHtml(short(job.blockedReason || "An exact owner decision is required before AG OS continues.", 130))}</p>
    <div class="decision-actions">${decisions.map((decision) => `<button type="button" class="${decision === "approve" ? "primary" : "danger"}" data-job-decision="${escapeHtml(decision)}" data-job-id="${escapeHtml(job.jobId)}">${escapeHtml(titleCase(decision))}</button>`).join("")}<button type="button" data-open-job="${escapeHtml(job.jobId)}">Inspect</button></div>
  </article>`;
}

function proposalCard(proposal) {
  return `<article class="ops-card">
    <div class="ops-card-head"><h3>${escapeHtml(proposal.title)}</h3>${statusChip(proposal.priority, titleCase(proposal.priority))}</div>
    <p>${escapeHtml(short(proposal.reason, 140))}</p>
    <div class="decision-actions"><button type="button" class="primary" data-proposal-decision="accept" data-proposal-id="${escapeHtml(proposal.proposalId)}">Accept</button><button type="button" class="danger" data-proposal-decision="reject" data-proposal-id="${escapeHtml(proposal.proposalId)}">Dismiss</button><button type="button" data-open-proposal="${escapeHtml(proposal.proposalId)}">Inspect</button></div>
  </article>`;
}

function lessonCard(lesson) {
  const disabled = lesson.canPromote === false;
  return `<article class="ops-card">
    <div class="ops-card-head"><h3>${escapeHtml(lesson.title || lesson.lessonId)}</h3>${statusChip(lesson.recommendation, titleCase(lesson.recommendation))}</div>
    <p>${escapeHtml(short(lesson.whyThisMatters || lesson.lesson || "Candidate lesson awaiting owner judgment.", 140))}</p>
    <div class="decision-actions"><button type="button" class="primary" data-lesson-decision="promote" data-lesson-id="${escapeHtml(lesson.lessonId)}" ${disabled ? "disabled" : ""}>Accept lesson</button><button type="button" class="danger" data-lesson-decision="reject" data-lesson-id="${escapeHtml(lesson.lessonId)}">Reject</button></div>
  </article>`;
}

function ownerDecisions() {
  const jobs = (state.status?.jobs || []).filter((job) => job.status === "waiting_approval");
  const proposals = (state.status?.proposals || []).filter((proposal) => proposal.status === "proposed");
  const lessons = state.status?.lessonDecisions?.decisions || [];
  return [...jobs, ...proposals, ...lessons];
}

function renderOps() {
  const projects = state.status?.projects || [];
  const jobs = state.status?.jobs || [];
  const activeJobs = jobs.filter((job) => !["waiting_approval", "archived"].includes(job.status)).slice(0, 12);
  const waiting = jobs.filter((job) => job.status === "waiting_approval");
  const proposals = (state.status?.proposals || []).filter((proposal) => proposal.status === "proposed").slice(0, 4);
  const lessons = (state.status?.lessonDecisions?.decisions || []).slice(0, 4);
  $("#project-count").textContent = String(projects.length);
  $("#job-count").textContent = String(activeJobs.length);
  $("#decision-count").textContent = String(waiting.length + proposals.length + lessons.length);
  $("#ops-tab-count").hidden = waiting.length + proposals.length + lessons.length === 0;
  $("#ops-tab-count").textContent = String(waiting.length + proposals.length + lessons.length);
  $("#ops-project-list").innerHTML = projects.length ? projects.map(projectCard).join("") : '<div class="empty-card">No projects yet. Start one from Console.</div>';
  $("#ops-job-list").innerHTML = activeJobs.length ? activeJobs.map(jobCard).join("") : '<div class="empty-card">No active work. The forge is quiet.</div>';
  const decisionCards = [...waiting.map(waitingJobCard), ...proposals.map(proposalCard), ...lessons.map(lessonCard)];
  const visibleCards = decisionCards.slice(0, 5);
  if (decisionCards.length > visibleCards.length) {
    visibleCards.push(`<article class="ops-card" data-open-decision-queue tabindex="0"><div class="ops-card-head"><h3>${decisionCards.length - visibleCards.length} more decisions</h3>${statusChip("dim", "Queue")}</div><p>Open the full owner queue without adding more clutter to mission control.</p></article>`);
  }
  $("#ops-decision-list").innerHTML = visibleCards.join("") || '<div class="empty-card">Your desk is clear. AG OS will stop here when it needs you.</div>';
}

function renderDash() {
  const jobs = state.status?.jobs || [];
  const budget = budgetView();
  const lessons = state.status?.lessonDecisions || {};
  const systems = state.status?.operatingSystems || [];
  const active = jobs.filter((job) => ["queued", "running", "waiting_approval", "needs_revision"].includes(job.status));
  const qualityJobs = jobs.filter((job) => job.hasQualityScore || job.completionEvidence?.qualityScorePath);
  const metrics = [
    ["Work in motion", String(active.length), `${jobs.length} tracked runs`],
    ["Needs you", String(ownerDecisions().length), "approvals, proposals, lessons"],
    ["AI spend", `$${budget.spent.toFixed(2)}`, `${budget.percent}% of $${budget.cap.toFixed(0)} cap`],
    ["Learning", String(lessons.acceptedCount || 0), `${lessons.activeCandidateCount || 0} candidates waiting`]
  ];
  $("#dash-metrics").innerHTML = metrics.map(([label, value, note]) => `<article class="metric-card"><span class="label">${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(note)}</small></article>`).join("");
  $("#dash-systems").innerHTML = systems.length ? systems.map((system) => `<div class="system-row" data-open-system="${escapeHtml(system.id)}" tabindex="0"><div><strong>${escapeHtml(system.name)}</strong><small>${escapeHtml(short(system.summary, 100))}</small></div>${statusChip(system.status)}</div>`).join("") : '<div class="empty-card">System status is loading.</div>';
  const focus = [];
  for (const job of jobs.filter((item) => item.status === "waiting_approval").slice(0, 3)) focus.push(["Approval", jobSummary(job), `Open Ops to decide · ${timeAgo(job.updatedAt)}`, `data-open-job="${escapeHtml(job.jobId)}"`]);
  for (const proposal of (state.status?.proposals || []).filter((item) => item.status === "proposed").slice(0, 2)) focus.push(["Suggestion", proposal.title, proposal.reason, `data-open-proposal="${escapeHtml(proposal.proposalId)}"`]);
  if (!focus.length) focus.push(["All clear", "No urgent owner decisions", "AG OS is operating within its current gates.", ""]);
  $("#dash-focus").innerHTML = focus.map(([kind, title, note, attr]) => `<div class="focus-row" ${attr} tabindex="0"><div><span class="eyebrow">${escapeHtml(kind)}</span><strong>${escapeHtml(short(title, 74))}</strong><small>${escapeHtml(short(note, 120))}</small></div></div>`).join("");
  $("#dash-updated").textContent = `Live · ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  void qualityJobs;
}

function renderAll() {
  renderProjectTarget();
  renderOps();
  renderDash();
  renderKeep();
}

function openDrawer({ kicker = "AG OS", title = "Details", html = "" }) {
  $("#drawer-kicker").textContent = kicker;
  $("#drawer-title").textContent = title;
  drawerBody.innerHTML = html;
  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
  $(".drawer-close").focus();
}

function closeDrawer() {
  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
}

function keyValue(label, value) {
  return `<div class="drawer-kv"><span>${escapeHtml(label)}</span><span>${escapeHtml(value ?? "—")}</span></div>`;
}

async function openProject(projectId) {
  openDrawer({ kicker: "Workspace", title: "Loading…", html: '<div class="empty-card">Opening project workspace…</div>' });
  try {
    const data = await api(`/api/v1/projects/${encodeURIComponent(projectId)}`);
    const project = data.project;
    const links = project.ownerWorkspace || {};
    const liveUrl = links.liveUrl || links.productionUrl || links.previewUrl;
    const repository = links.repositoryUrl || (links.repositoryFullName ? `https://github.com/${links.repositoryFullName}` : "");
    openDrawer({
      kicker: "Project workspace",
      title: project.name,
      html: `<section class="drawer-section"><p class="drawer-copy">${escapeHtml(project.goal)}</p></section>
        <section class="drawer-section"><h3>Progress</h3>${keyValue("Status", titleCase(project.status))}${keyValue("Jobs", data.progress.jobCount)}${keyValue("Completed", data.progress.completedJobCount)}${keyValue("Quality coverage", `${data.progress.qualityCoverage}%`)}${keyValue("Recorded cost", `$${Number(data.progress.recordedCostUsd || 0).toFixed(2)}`)}</section>
        <section class="drawer-section"><h3>Open</h3><div class="drawer-actions">${liveUrl ? `<a class="quiet-button" href="${escapeHtml(liveUrl)}" target="_blank" rel="noopener">Live app</a>` : ""}${repository ? `<a class="quiet-button" href="${escapeHtml(repository)}" target="_blank" rel="noopener">GitHub</a>` : ""}<button type="button" data-target-project="${escapeHtml(project.id)}">Command project</button></div></section>
        <section class="drawer-section"><h3>Recent work</h3>${data.jobs.length ? data.jobs.map((job) => `<div class="drawer-item" data-open-job="${escapeHtml(job.jobId)}"><strong>${escapeHtml(short(job.expectedOutput || job.jobId, 95))}</strong><p>${escapeHtml(titleCase(job.status))} · ${escapeHtml(timeAgo(job.updatedAt))}${job.deliverable?.ownerUsable ? ` · ${job.deliverable.fileCount} files` : ""}</p></div>`).join("") : '<div class="empty-card">No work recorded yet.</div>'}</section>`
    });
  } catch (error) {
    openDrawer({ kicker: "Workspace", title: "Could not open project", html: `<p class="drawer-copy bad">${escapeHtml(error.message)}</p>` });
  }
}

function findJob(jobId) {
  return (state.status?.jobs || []).find((job) => job.jobId === jobId);
}

function openJob(jobId) {
  const job = findJob(jobId);
  if (!job) return;
  const recovery = job.availableRecoveryActions || (["failed", "blocked", "cancelled", "needs_revision", "plan_ready"].includes(job.status) ? ["retry", "replan"] : []);
  const deliverable = job.deliverable || {};
  openDrawer({
    kicker: "Work run",
    title: short(jobSummary(job), 84),
    html: `<section class="drawer-section">${keyValue("Status", titleCase(job.status))}${keyValue("Project", job.projectId || "One-off")}${keyValue("Worker", job.assignedAgent || job.adapter?.name || "AG OS")}${keyValue("Updated", timeAgo(job.updatedAt || job.createdAt))}</section>
      ${job.blockedReason ? `<section class="drawer-section"><h3>Why it stopped</h3><p class="drawer-copy">${escapeHtml(job.blockedReason)}</p></section>` : ""}
      <section class="drawer-section"><h3>Result</h3><p class="drawer-copy">${deliverable.ownerUsable ? `${deliverable.fileCount || 0} owner-usable file(s) are ready.` : "No owner-usable deliverable is recorded yet."}</p><div class="drawer-actions">${deliverable.fileCount ? `<button class="primary" type="button" data-view-deliverable="${escapeHtml(job.jobId)}">View result</button>` : ""}${recovery.map((action) => `<button type="button" data-job-recovery="${escapeHtml(action)}" data-job-id="${escapeHtml(job.jobId)}">${escapeHtml(titleCase(action))}</button>`).join("")}${job.status === "done" && !job.outcomeRecorded ? `<button type="button" data-rate-job="${escapeHtml(job.jobId)}">Rate outcome</button>` : ""}</div></section>`
  });
}

function openProposal(proposalId) {
  const proposal = (state.status?.proposals || []).find((item) => item.proposalId === proposalId);
  if (!proposal) return;
  openDrawer({
    kicker: "AG OS suggestion",
    title: proposal.title,
    html: `<section class="drawer-section"><h3>Why now</h3><p class="drawer-copy">${escapeHtml(proposal.reason)}</p></section><section class="drawer-section"><h3>Proposed command</h3><div class="drawer-item"><p>${escapeHtml(proposal.proposedCommand)}</p></div></section><section class="drawer-section"><p class="drawer-copy">Accepting creates a normal command package. It does not approve any later external action.</p><div class="drawer-actions"><button class="primary" data-proposal-decision="accept" data-proposal-id="${escapeHtml(proposal.proposalId)}">Accept and start</button><button class="danger" data-proposal-decision="reject" data-proposal-id="${escapeHtml(proposal.proposalId)}">Dismiss</button></div></section>`
  });
}

function openSystem(systemId) {
  const system = (state.status?.operatingSystems || []).find((item) => item.id === systemId);
  if (!system) return;
  openDrawer({
    kicker: "Core system",
    title: system.name,
    html: `<section class="drawer-section">${statusChip(system.status)}<p class="drawer-copy">${escapeHtml(system.summary)}</p>${keyValue("Metric", system.metric)}</section><section class="drawer-section"><h3>Working</h3>${(system.working || []).map((item) => `<div class="drawer-item"><strong class="ok">✓ ${escapeHtml(item)}</strong></div>`).join("")}</section>${system.remaining?.length ? `<section class="drawer-section"><h3>Needs attention</h3>${system.remaining.map((item) => `<div class="drawer-item"><strong class="warn">${escapeHtml(item)}</strong></div>`).join("")}</section>` : ""}`
  });
}

function openDecisionQueue() {
  const jobs = (state.status?.jobs || []).filter((job) => job.status === "waiting_approval");
  const proposals = (state.status?.proposals || []).filter((proposal) => proposal.status === "proposed");
  const lessons = state.status?.lessonDecisions?.decisions || [];
  openDrawer({
    kicker: "Owner queue",
    title: `${jobs.length + proposals.length + lessons.length} decisions`,
    html: `<section class="drawer-section"><h3>Approvals</h3>${jobs.map(waitingJobCard).join("") || '<div class="empty-card">No job approvals.</div>'}</section><section class="drawer-section"><h3>AG OS suggestions</h3>${proposals.map(proposalCard).join("") || '<div class="empty-card">No suggestions.</div>'}</section><section class="drawer-section"><h3>Lesson candidates</h3>${lessons.map(lessonCard).join("") || '<div class="empty-card">No lesson decisions.</div>'}</section>`
  });
}

async function viewDeliverable(jobId) {
  drawerBody.innerHTML = '<div class="empty-card">Loading deliverable…</div>';
  try {
    const result = await api(`/api/v1/jobs/${encodeURIComponent(jobId)}/deliverable`);
    const files = result.files || [];
    drawerBody.innerHTML = `<section class="drawer-section">${keyValue("Type", titleCase(result.kind))}${keyValue("Files", result.fileCount)}${keyValue("Owner usable", result.ownerUsable ? "Yes" : "No")}</section><section class="drawer-section"><h3>Files</h3>${files.map((file) => `<details class="drawer-item"><summary><strong>${escapeHtml(file.path)}</strong><p>${Number(file.bytes || 0).toLocaleString()} bytes</p></summary><pre>${escapeHtml(short(file.content || "", 20000))}</pre></details>`).join("") || '<div class="empty-card">No result files found.</div>'}</section>${result.previewAvailable ? `<section class="drawer-section"><div class="drawer-actions"><a class="quiet-button" href="/api/v1/jobs/${encodeURIComponent(jobId)}/preview/" target="_blank" rel="noopener">Open full preview</a></div><iframe class="deliverable-preview" sandbox="allow-scripts" title="Deliverable preview" src="/api/v1/jobs/${encodeURIComponent(jobId)}/preview/"></iframe></section>` : ""}`;
  } catch (error) {
    drawerBody.innerHTML = `<p class="drawer-copy bad">${escapeHtml(error.message)}</p>`;
  }
}

async function decideJob(jobId, decision) {
  if (!confirm(`${titleCase(decision)} this exact job?\n\n${jobId}`)) return;
  try {
    await api(`/api/v1/jobs/${encodeURIComponent(jobId)}/decision`, { method: "POST", body: JSON.stringify({ decision, confirmation: `${decision.toUpperCase()} ${jobId}` }) });
    closeDrawer();
    await refreshStatus();
  } catch (error) { alert(error.message); }
}

async function recoverJob(jobId, action) {
  if (!confirm(`${titleCase(action)} this job once with its recorded context?\n\n${jobId}`)) return;
  try {
    await api(`/api/v1/jobs/${encodeURIComponent(jobId)}/recover`, { method: "POST", body: JSON.stringify({ action, confirmation: `${action.toUpperCase()} ${jobId}` }) });
    closeDrawer();
    await refreshStatus();
  } catch (error) { alert(error.message); }
}

async function decideProposal(proposalId, decision) {
  if (!confirm(`${titleCase(decision)} this AG OS suggestion?`)) return;
  try {
    await api(`/api/v1/proposals/${encodeURIComponent(proposalId)}/decision`, { method: "POST", body: JSON.stringify({ decision, confirmation: `${decision.toUpperCase()} ${proposalId}` }) });
    closeDrawer();
    await refreshStatus();
  } catch (error) { alert(error.message); }
}

async function decideLesson(lessonId, decision) {
  const reason = decision === "reject" ? prompt("Why reject this lesson? This becomes audit evidence.") : "Owner accepted this reviewed lesson.";
  if (decision === "reject" && (!reason || reason.trim().length < 3)) return;
  if (!confirm(`${decision === "promote" ? "Accept" : "Reject"} this lesson?\n\n${lessonId}`)) return;
  try {
    await api("/api/v1/memory/lessons/decision", { method: "POST", body: JSON.stringify({ lessonIds: [lessonId], decision, reason }) });
    await refreshStatus();
  } catch (error) { alert(error.message); }
}

async function rateJob(jobId) {
  const rating = Number(prompt("Rate the result from 1 to 5:"));
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return;
  const reason = prompt("In one line, what made it good or bad?");
  if (!reason || reason.trim().length < 3) return;
  try {
    await api(`/api/v1/jobs/${encodeURIComponent(jobId)}/outcome`, { method: "POST", body: JSON.stringify({ rating, reason, confirmation: `RATE ${jobId} ${rating}` }) });
    closeDrawer();
    await refreshStatus();
  } catch (error) { alert(error.message); }
}

/* Interactive Keep */
const figures = {};
const packets = new Map();
let gateNode;
let gateTag;
let stampNode;

function keepElement(className, styles = {}, html = "", parent = keepStage) {
  const node = document.createElement("div");
  node.className = className;
  Object.assign(node.style, styles);
  node.innerHTML = html;
  parent.appendChild(node);
  return node;
}

function makeFigure({ key, name, x, y, torso, helmet = false, sword = false, mode = "idle", bubble = "" }) {
  const node = keepElement(`kp-fig ${mode}${helmet ? " helm" : ""}${bubble ? " talk" : ""} kp-clicky`, { left: `${x}%`, top: `${y}%` });
  node.innerHTML = `<div class="in"><span class="kp-name">${escapeHtml(name)}</span><span class="kp-head"></span><span class="kp-torso"></span>${sword ? '<span class="kp-sword"></span>' : ""}<span class="kp-legs"><span class="kp-la"></span><span class="kp-lb"></span></span>${bubble ? `<span class="kp-bubble">${escapeHtml(bubble)}</span>` : ""}</div>`;
  $(".kp-torso", node).style.background = torso;
  node.dataset.keepEntity = key;
  figures[key] = { node, helmet, bubble };
}

function setFigureMode(key, mode) {
  const figure = figures[key];
  if (!figure) return;
  figure.node.className = `kp-fig ${mode}${figure.helmet ? " helm" : ""}${figure.bubble ? " talk" : ""} kp-clicky`;
}

function buildKeep() {
  const rooms = [
    ["planning hall", 2, 5, 27, 42, "rgba(74,105,135,.045)"],
    ["build forge", 71, 5, 27, 42, "rgba(183,105,67,.045)"],
    ["library of lessons", 2, 56, 27, 39, "rgba(125,107,176,.045)"],
    ["gatehouse", 71, 56, 27, 39, "rgba(78,125,91,.045)"]
  ];
  for (const [label, x, y, width, height, background] of rooms) keepElement("kp-room", { left: `${x}%`, top: `${y}%`, width: `${width}%`, height: `${height}%`, background }, `<span class="kp-tag">${label}</span>`);
  const constitution = keepElement("kp-stone kp-clicky", {}, '<div class="t1">CONSTITUTION</div><div class="t2">v1.0</div>');
  constitution.dataset.keepEntity = "constitution";
  const archive = keepElement("kp-archive kp-clicky"); archive.dataset.keepEntity = "archive";
  keepElement("kp-archive-label", {}, "archive");
  const owner = keepElement("kp-owner kp-clicky", {}, '<span class="kp-tag">owner — you</span>'); owner.dataset.keepEntity = "owner";
  keepElement("kp-scrolls", {}, "▤▤▤");
  const ownerNote = keepElement("kp-owner-note"); ownerNote.id = "kp-owner-note";
  const reactor = keepElement("kp-reactor kp-clicky"); reactor.id = "kp-reactor"; reactor.dataset.keepEntity = "reactor";
  const reactorLabel = keepElement("kp-reactor-label", {}, "claude reactor"); reactorLabel.id = "kp-reactor-label";
  for (const [x, y] of [[8,24],[18,37],[75,37]]) keepElement("kp-desk", { left: `${x}%`, top: `${y}%` }, '<span class="kp-monitor"></span>');
  makeFigure({ key: "planner", name: "Planner", x: 9.5, y: 23, torso: "#3f6d9e", mode: "type" });
  makeFigure({ key: "intake", name: "Intake", x: 19.5, y: 36, torso: "#3f6d9e", mode: "type" });
  makeFigure({ key: "codex", name: "Codex", x: 76.5, y: 36, torso: "#16130f", helmet: true, sword: true, mode: "type" });
  makeFigure({ key: "fable", name: "Fable", x: 16, y: 74, torso: "#d68b5d", bubble: "quality first" });
  makeFigure({ key: "gatekeeper", name: "Gate", x: 81, y: 74, torso: "#4e7d5b" });
  const brain = keepElement("kp-brain kp-clicky", { left: "24%", top: "88%" }, '<span class="bl"></span><span class="ey"></span><span class="ey"></span>'); brain.dataset.keepEntity = "memory";
  keepElement("kp-name", { position: "absolute", left: "24%", top: "89.5%", transform: "translateX(-50%)" }, "Memory");
  const shelf = keepElement("kp-shelf kp-clicky", {}, '<div class="books" id="kp-books"></div><div class="lbl" id="kp-books-label">accepted: —</div>'); shelf.dataset.keepEntity = "lessons";
  const pile = keepElement("kp-pile kp-clicky", {}, '<div class="cnt" id="kp-pile-count">▤×—</div><div class="lbl">candidates await stamp</div>'); pile.dataset.keepEntity = "lessons";
  gateNode = keepElement("kp-gate", {}, '<div class="post l"></div><div class="post r"></div>'); gateNode.dataset.keepEntity = "gate";
  for (let index = 0; index < 3; index += 1) { const bar = keepElement("bar", { left: `${6 + index * 6}px` }, "", gateNode); void bar; }
  gateTag = keepElement("kp-gate-tag", {}, "■ gate: closed");
  stampNode = keepElement("kp-stamp", {}, "✓ approval stamped");
  const dog = keepElement("kp-dog kp-clicky", { left: "33%", top: "96%" }, '<span class="tl"></span><span class="bd"></span><span class="hd"></span><span class="l1"></span><span class="l2"></span><span class="l3"></span><span class="l4"></span>'); dog.dataset.keepEntity = "watchdog";
  keepElement("kp-name", { position: "absolute", left: "33%", top: "97.5%", transform: "translateX(-50%)" }, "Watchdog");
}

function keepSpawnPacket(job) {
  if (!keepStage || packets.has(job.jobId) || packets.size >= 5) return;
  const node = keepElement("kp-packet", { left: "15%", top: "33%" });
  const label = keepElement("kp-packet-label", { left: "15%", top: "29.5%" }, escapeHtml(short(jobSummary(job), 24)));
  packets.set(job.jobId, { node, label, x: 15, y: 33 });
}

function movePacket(packet, x, y, duration, done) {
  if (!packet) return;
  const startX = packet.x; const startY = packet.y; const started = performance.now();
  function frame(now) {
    const progress = Math.min(1, (now - started) / duration);
    packet.x = startX + (x - startX) * progress; packet.y = startY + (y - startY) * progress;
    packet.node.style.left = `${packet.x}%`; packet.node.style.top = `${packet.y}%`;
    packet.label.style.left = `${packet.x}%`; packet.label.style.top = `${packet.y - 3.5}%`;
    if (progress < 1) requestAnimationFrame(frame); else done?.();
  }
  requestAnimationFrame(frame);
}

function keepPacketToGate(job) {
  if (!packets.has(job.jobId)) keepSpawnPacket(job);
  movePacket(packets.get(job.jobId), 46, 31.5, 1100);
}

function keepPacketToForge(jobId) {
  gateNode?.classList.add("open"); gateTag?.classList.add("open"); if (gateTag) gateTag.textContent = "□ gate: open"; stampNode?.classList.add("show");
  setFigureMode("codex", "type");
  movePacket(packets.get(jobId), 76, 32, 1400, () => setTimeout(() => { gateNode?.classList.remove("open"); gateTag?.classList.remove("open"); if (gateTag) gateTag.textContent = "■ gate: closed"; stampNode?.classList.remove("show"); }, 500));
}

function keepCompleteJob(jobId) {
  const packet = packets.get(jobId); if (packet) { packet.node.remove(); packet.label.remove(); packets.delete(jobId); }
  keepElement("kp-record");
}

function keepFailJob(jobId) { const packet = packets.get(jobId); if (packet) { packet.node.remove(); packet.label.remove(); packets.delete(jobId); } }

function renderKeep() {
  const jobs = state.status?.jobs || [];
  const waiting = jobs.filter((job) => job.status === "waiting_approval");
  const running = jobs.filter((job) => job.status === "running");
  if ($("#kp-owner-note")) $("#kp-owner-note").textContent = waiting.length ? `${waiting.length} decision${waiting.length === 1 ? "" : "s"} wait` : "desk clear";
  setFigureMode("codex", running.length ? "type" : "idle");
  const lessons = state.status?.lessonDecisions;
  if (lessons && $("#kp-books")) {
    $("#kp-books").innerHTML = Array.from({ length: Math.max(4, Math.min(12, lessons.acceptedCount || 0)) }, (_, index) => `<span class="kp-book ${index < (lessons.acceptedCount || 0) ? "lit" : ""}"></span>`).join("");
    $("#kp-books-label").textContent = `accepted: ${lessons.acceptedCount || 0}`;
    $("#kp-pile-count").textContent = `▤×${lessons.activeCandidateCount || 0}`;
  }
  const budget = budgetView();
  if ($("#kp-reactor-label")) $("#kp-reactor-label").textContent = `claude reactor · ${budget.percent}%`;
  const mode = waiting.length ? `${waiting.length} decision${waiting.length === 1 ? "" : "s"} at the gate` : running.length ? `${running.length} job${running.length === 1 ? "" : "s"} in the forge` : "Quiet · perimeter secure";
  $("#keep-mode").textContent = mode;
  for (const job of waiting) if (!packets.has(job.jobId)) keepPacketToGate(job);
}

function openKeepEntity(entity) {
  const jobs = state.status?.jobs || [];
  const systems = Object.fromEntries((state.status?.operatingSystems || []).map((item) => [item.id, item]));
  if (entity === "owner" || entity === "gate") {
    setView("ops");
    return;
  }
  if (entity === "lessons" || entity === "memory") {
    setView("ops");
    $("#ops-decision-list")?.scrollIntoView({ behavior: "smooth" });
    return;
  }
  if (entity === "reactor") {
    const budget = budgetView();
    openDrawer({ kicker: "Cost OS", title: "Claude reactor", html: `${keyValue("Spent this month", `$${budget.spent.toFixed(2)}`)}${keyValue("Monthly cap", `$${budget.cap.toFixed(2)}`)}${keyValue("Fuel used", `${budget.percent}%`)}${keyValue("Circuit breaker", "Armed")}` });
    return;
  }
  if (entity === "watchdog" && systems["watchdog-os"]) return openSystem("watchdog-os");
  if (entity === "constitution") {
    openDrawer({ kicker: "Authority", title: "Constitution v1.0", html: '<section class="drawer-section"><h3>Authority order</h3><div class="drawer-item"><strong>1. Owner</strong><p>Your explicit decision.</p></div><div class="drawer-item"><strong>2. Constitution</strong><p>The system-wide operating boundary.</p></div><div class="drawer-item"><strong>3. Exact approval locks</strong><p>Scoped permission for sensitive actions.</p></div><div class="drawer-item"><strong>4. Security, quality, cost, and evidence</strong><p>Every worker remains inside these gates.</p></div></section>' });
    return;
  }
  if (entity === "archive") {
    const recent = jobs.filter((job) => ["done", "failed", "needs_revision"].includes(job.status)).slice(0, 12);
    openDrawer({ kicker: "Records", title: "The archive", html: recent.map((job) => `<div class="drawer-item" data-open-job="${escapeHtml(job.jobId)}"><strong>${escapeHtml(short(jobSummary(job), 92))}</strong><p>${escapeHtml(titleCase(job.status))} · ${escapeHtml(timeAgo(job.updatedAt))}</p></div>`).join("") || '<div class="empty-card">No sealed records yet.</div>' });
    return;
  }
  const bios = {
    planner: ["Planner", "Turns the owner outcome into a bounded plan and quality bar."],
    intake: ["Intake", "Classifies the project, risk, and correct worker route."],
    codex: ["Codex", "Builds and repairs work through fail-closed execution adapters."],
    fable: ["Fable", "Independent quality reviewer. Advisory, never authorizing."],
    gatekeeper: ["Gatekeeper", "Holds sensitive actions until an exact owner approval matches."],
    watchdog: ["Watchdog OS", "Patrols runtime integrity and reports any condition that needs attention."]
  };
  if (bios[entity]) openDrawer({ kicker: "Keep resident", title: bios[entity][0], html: `<p class="drawer-copy">${escapeHtml(bios[entity][1])}</p>` });
}

document.addEventListener("click", (event) => {
  const viewButton = event.target.closest("[data-view]");
  if (viewButton) return setView(viewButton.dataset.view);
  if (event.target.closest("[data-close-drawer]")) return closeDrawer();
  const project = event.target.closest("[data-open-project]"); if (project) return void openProject(project.dataset.openProject);
  const job = event.target.closest("[data-open-job]"); if (job) return openJob(job.dataset.openJob);
  const proposal = event.target.closest("[data-open-proposal]"); if (proposal) return openProposal(proposal.dataset.openProposal);
  const system = event.target.closest("[data-open-system]"); if (system) return openSystem(system.dataset.openSystem);
  if (event.target.closest("[data-open-decision-queue]")) return openDecisionQueue();
  const jobDecision = event.target.closest("[data-job-decision]"); if (jobDecision) return void decideJob(jobDecision.dataset.jobId, jobDecision.dataset.jobDecision);
  const jobRecovery = event.target.closest("[data-job-recovery]"); if (jobRecovery) return void recoverJob(jobRecovery.dataset.jobId, jobRecovery.dataset.jobRecovery);
  const proposalDecision = event.target.closest("[data-proposal-decision]"); if (proposalDecision) return void decideProposal(proposalDecision.dataset.proposalId, proposalDecision.dataset.proposalDecision);
  const lessonDecision = event.target.closest("[data-lesson-decision]"); if (lessonDecision) return void decideLesson(lessonDecision.dataset.lessonId, lessonDecision.dataset.lessonDecision);
  const deliverable = event.target.closest("[data-view-deliverable]"); if (deliverable) return void viewDeliverable(deliverable.dataset.viewDeliverable);
  const rating = event.target.closest("[data-rate-job]"); if (rating) return void rateJob(rating.dataset.rateJob);
  const targetProject = event.target.closest("[data-target-project]"); if (targetProject) { $("#os-project").value = targetProject.dataset.targetProject; closeDrawer(); setView("console"); promptInput.focus(); return; }
  const quick = event.target.closest("[data-quick-command]"); if (quick) return void submitCommand(quick.dataset.quickCommand);
  const keepEntity = event.target.closest("[data-keep-entity]"); if (keepEntity) return openKeepEntity(keepEntity.dataset.keepEntity);
});

$("#command-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const command = promptInput.value.trim();
  if (!command) return;
  promptInput.value = "";
  void submitCommand(command);
});

promptInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    $("#command-form").requestSubmit();
  }
});

$("#refresh-ops").addEventListener("click", () => void refreshStatus());

$("#auth-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = $("#auth-message");
  message.textContent = "Unlocking…";
  try {
    const response = await fetch("/api/v1/auth/login", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: $("#owner-password").value }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error === "invalid_credentials" ? "That password did not work." : body.error || "Sign-in failed.");
    $("#owner-password").value = "";
    message.textContent = "";
    await refreshStatus();
  } catch (error) { message.textContent = error.message; }
});

$("#use-token").addEventListener("click", async () => {
  const token = $("#owner-token").value.trim();
  if (!token) return;
  state.ownerToken = token;
  sessionStorage.setItem("ag_os_owner_token", token);
  $("#owner-token").value = "";
  await refreshStatus();
});

$("#owner-menu").addEventListener("click", () => {
  openDrawer({ kicker: "Owner session", title: "Gurnoor Bassi", html: `<section class="drawer-section">${keyValue("Runtime", state.authenticated ? "Live and private" : "Locked")}${keyValue("Safety", "Fail-closed")}${keyValue("Access", "Password session · Tailscale")}</section><section class="drawer-section"><div class="drawer-actions"><button type="button" class="danger" id="logout-owner">Sign out</button></div></section>` });
  $("#logout-owner")?.addEventListener("click", async () => {
    await fetch("/api/v1/auth/logout", { method: "POST", credentials: "same-origin" }).catch(() => {});
    state.ownerToken = ""; sessionStorage.removeItem("ag_os_owner_token"); closeDrawer(); setAuthenticated(false);
  });
});

window.addEventListener("hashchange", () => setView(location.hash.slice(1)));
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeDrawer();
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setView("console"); promptInput.focus(); }
});

buildKeep();
setView(state.view);
refreshStatus({ quiet: true });
setInterval(() => { if (!document.hidden && state.authenticated) void refreshStatus({ quiet: true }); }, 5000);
