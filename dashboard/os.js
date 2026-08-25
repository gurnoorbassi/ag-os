"use strict";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const VALID_VIEWS = new Set(["console", "ops", "director", "keep", "dash"]);
const state = {
  view: VALID_VIEWS.has(location.hash.slice(1)) ? location.hash.slice(1) : "console",
  status: null,
  previousJobs: new Map(),
  activeMissionId: sessionStorage.getItem("ag_os_active_mission") || "",
  mission: null,
  missionStream: null,
  directorView: "overview",
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
    await refreshMission();
    renderAll();
  } catch (error) {
    if (!quiet && error.message !== "Owner sign-in required") consoleLine(`■ ${error.message}`, "bad");
  }
}

async function refreshMission() {
  const missions = state.status?.missions || [];
  if (!state.activeMissionId || !missions.some((mission) => mission.missionId === state.activeMissionId)) {
    state.activeMissionId = missions[0]?.missionId || "";
  }
  if (!state.activeMissionId) {
    state.mission = null;
    connectMissionStream();
    return;
  }
  state.mission = await api(`/api/v1/missions/${encodeURIComponent(state.activeMissionId)}`);
  sessionStorage.setItem("ag_os_active_mission", state.activeMissionId);
  connectMissionStream();
}

function connectMissionStream() {
  const mission = state.mission;
  const streamable = mission && !state.ownerToken && !["completed", "failed", "cancelled"].includes(mission.status);
  if (state.missionStream?.missionId === mission?.missionId && streamable) return;
  state.missionStream?.close();
  state.missionStream = null;
  if (!streamable) return;
  const stream = new EventSource(`/api/v1/missions/${encodeURIComponent(mission.missionId)}/events/stream`);
  stream.missionId = mission.missionId;
  stream.onmessage = () => { void refreshMission().then(renderKeep).catch(() => {}); };
  stream.onerror = () => stream.close();
  state.missionStream = stream;
}

function processJobTransitions(jobs) {
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
    const missionId = result.missionId || result.mission?.missionId;
    consoleStep("intake", intakeId || "classified");
    if (planId) consoleStep("plan", planId);
    if (jobId) consoleStep("job", `${short(jobId, 70)} · ${titleCase(jobStatus)}`, statusTone(jobStatus));
    if (missionId) {
      state.activeMissionId = missionId;
      sessionStorage.setItem("ag_os_active_mission", missionId);
      consoleStep("mission", missionId);
    }
    if (jobStatus === "waiting_approval") consoleLine("▲ The job is waiting in Ops for your decision.", "warn");
    await refreshStatus({ quiet: true });
    if (missionId) setView("keep");
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

function moneyText(value) {
  return `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: Number(value || 0) < 100 ? 2 : 0, maximumFractionDigits: 2 })}`;
}

function opportunityCard(opportunity) {
  return `<article class="director-card" data-open-opportunity="${escapeHtml(opportunity.opportunityId)}" tabindex="0">
    <div class="director-card-head"><div><span class="eyebrow">${escapeHtml(titleCase(opportunity.type))}</span><h3>${escapeHtml(opportunity.title)}</h3></div><strong class="opportunity-score">${escapeHtml(opportunity.score)}</strong></div>
    <p>${escapeHtml(short(opportunity.summary, 180))}</p>
    <div class="director-card-meta">${statusChip(opportunity.status)}<span>${escapeHtml(opportunity.confidence)}% confidence</span><span>${escapeHtml(opportunity.evidenceIds?.length || 0)} evidence</span><span>${escapeHtml(opportunity.reachability)} access</span></div>
  </article>`;
}

function setDirectorView(view) {
  const valid = new Set(["overview", "opportunities", "people", "experiments", "learned", "activity"]);
  state.directorView = valid.has(view) ? view : "overview";
  for (const button of $$("#director-tabs [data-director-view]")) button.classList.toggle("active", button.dataset.directorView === state.directorView);
  for (const name of valid) $(`#director-${name}`).classList.toggle("os-hidden", name !== state.directorView);
}

function renderDirector() {
  const data = state.status?.opportunityDirector;
  if (!data) return;
  $("#director-objective").textContent = data.director?.objective || "Owner objective not recorded.";
  $("#director-status").textContent = data.statusLabel || "Waiting";
  $("#director-status").className = `status-chip ${statusTone(data.statusLabel)}`;
  $("#director-last-wake").textContent = data.director?.lastWakeAt ? `Last wake ${timeAgo(data.director.lastWakeAt)}` : "No wake recorded";
  $("#director-tab-count").hidden = !(data.ownerDecisionsRequired || []).length;
  $("#director-tab-count").textContent = String((data.ownerDecisionsRequired || []).length);

  const top = data.topOpportunities || [];
  const overviewMetrics = [
    ["AI spend", moneyText(data.aiSpendUsd), `of ${moneyText(data.costLimitUsd)} Cost OS cap`],
    ["Treasury", moneyText(data.treasury?.availableCapital), "simulation only · $0 until funded"],
    ["Pipeline EV", moneyText(top.filter((item) => item.status !== "killed").reduce((sum, item) => sum + Number(item.economicModel?.expectedValueUsd || 0), 0)), "estimate · assumptions visible"],
    ["Needs you", String((data.ownerDecisionsRequired || []).length), "validation proposals only"]
  ];
  const people = data.people || [];
  const experiments = data.experiments || [];
  const killed = data.killed || [];
  $("#director-overview").innerHTML = `<div class="director-metrics">${overviewMetrics.map(([label, value, note]) => `<article><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(note)}</small></article>`).join("")}</div>
    <div class="director-overview-grid">
      <section class="director-panel director-top"><div class="panel-heading"><div><span class="eyebrow">Top opportunities</span><h2>Ranked by evidence and economics</h2></div></div><div class="director-card-list">${top.filter((item) => item.status !== "killed").slice(0, 5).map(opportunityCard).join("") || '<div class="empty-card">No evidence-backed opportunity yet. The Director is waiting rather than inventing activity.</div>'}</div></section>
      <div class="director-side-stack">
        <section class="director-panel"><div class="panel-heading"><div><span class="eyebrow">People worth knowing</span><h2>Legitimate network paths</h2></div></div><div class="compact-list">${people.slice(0, 5).map((person) => `<div><strong>${escapeHtml(person.name)}</strong><span>${escapeHtml(person.organization)} · ${escapeHtml(titleCase(person.relationshipState))}</span><small>${escapeHtml(short(person.whyRelevant, 100))}</small></div>`).join("") || '<div class="empty-card">No public or owner-confirmed people recorded.</div>'}</div></section>
        <section class="director-panel"><div class="panel-heading"><div><span class="eyebrow">What it killed</span><h2>Time not wasted</h2></div></div><div class="compact-list">${killed.slice(0, 4).map((item) => `<div data-open-opportunity="${escapeHtml(item.opportunityId)}" tabindex="0"><strong>${escapeHtml(item.title)}</strong><span>Score ${escapeHtml(item.score)} · ${escapeHtml(item.confidence)}% confidence</span><small>${escapeHtml(short(item.recommendedNextAction, 110))}</small></div>`).join("") || '<div class="empty-card">No killed opportunities recorded.</div>'}</div></section>
      </div>
    </div>`;
  $("#director-opportunities").innerHTML = `<div class="director-page-head"><div><span class="eyebrow">Opportunity graph</span><h2>Observed facts before hypotheses</h2></div><small>${top.length} persisted</small></div><div class="director-card-list director-all">${top.map(opportunityCard).join("") || '<div class="empty-card">No opportunities persisted.</div>'}</div>`;
  $("#director-people").innerHTML = `<div class="director-page-head"><div><span class="eyebrow">People</span><h2>Professional network map</h2></div><small>No relationship is inferred</small></div><div class="director-table"><div class="director-table-head"><span>Person</span><span>Why relevant</span><span>Relationship</span><span>Next follow-up</span></div>${people.map((person) => `<div><span><strong>${escapeHtml(person.name)}</strong><small>${escapeHtml(person.organization)}</small></span><span>${escapeHtml(person.whyRelevant)}</span><span>${statusChip(person.relationshipState)}</span><span>${escapeHtml(person.nextFollowupAt || "Not scheduled")}</span></div>`).join("") || '<div class="empty-card">No people recorded.</div>'}</div>`;
  $("#director-experiments").innerHTML = `<div class="director-page-head"><div><span class="eyebrow">Experiments</span><h2>Signal, metric, stop condition</h2></div><small>No endless research</small></div><div class="director-card-list">${experiments.map((item) => `<article class="director-card"><div class="director-card-head"><div><span class="eyebrow">${escapeHtml(titleCase(item.actionClass))}</span><h3>${escapeHtml(item.hypothesis)}</h3></div>${statusChip(item.status)}</div><p><strong>Metric:</strong> ${escapeHtml(item.successMetric)}</p><div class="director-card-meta"><span>Target: ${escapeHtml(item.target)}</span><span>Cost ${moneyText(item.cost)} / ${moneyText(item.budgetCap)}</span></div><small class="stop-line">Stop: ${escapeHtml((item.stopConditions || []).join(" · "))}</small></article>`).join("") || '<div class="empty-card">No active experiments. An idea does not graduate because a model likes it.</div>'}</div>`;
  $("#director-learned").innerHTML = `<div class="director-page-head"><div><span class="eyebrow">Learned</span><h2>Tactical rules, never new permissions</h2></div><small>Memory OS promotion required</small></div><div class="director-card-list">${(data.learned || []).map((rule) => `<article class="director-card"><div class="director-card-head"><h3>${escapeHtml(rule.statement)}</h3>${statusChip(rule.status)}</div><p>${escapeHtml(rule.scope)} · ${escapeHtml(rule.confidence)}% confidence</p><div class="director-card-meta"><span>${escapeHtml(rule.supportingOutcomeIds?.length || 0)} supporting outcomes</span><span>${escapeHtml(rule.contradictingOutcomeIds?.length || 0)} contradictions</span></div></article>`).join("") || '<div class="empty-card">No tactical rule has earned activation.</div>'}</div>`;
  $("#director-activity").innerHTML = `<div class="director-page-head"><div><span class="eyebrow">Decision journal</span><h2>Concise rationale, not model traces</h2></div><small>${escapeHtml((data.activity || []).length)} decisions</small></div><div class="activity-timeline">${(data.activity || []).map((item) => `<article><i class="${statusTone(item.chosenAction)}"></i><div><strong>${escapeHtml(item.summary)}</strong><p>${escapeHtml(item.reasonSummary)}</p><small>${escapeHtml(titleCase(item.decisionType))} · ${timeAgo(item.createdAt)} · cost ${moneyText(item.actualCost)}</small></div></article>`).join("") || '<div class="empty-card">No meaningful decision recorded.</div>'}</div>`;
  setDirectorView(state.directorView);
}

function renderAll() {
  renderProjectTarget();
  renderOps();
  renderDash();
  renderDirector();
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

function renderKeep() {
  const detail = state.mission;
  const mission = detail;
  const agents = detail?.agents || [];
  const tasks = detail?.tasks || [];
  const events = detail?.events || [];
  const activeCount = (state.status?.missions || []).filter((item) => ["planned", "running", "blocked"].includes(item.status)).length;
  $("#mission-tab-count").hidden = activeCount === 0;
  $("#mission-tab-count").textContent = String(activeCount);
  if (!mission) {
    $("#mission-title").textContent = "No mission selected";
    $("#mission-agents").innerHTML = '<div class="empty-card">No persisted agent runs.</div>';
    $("#mission-tasks").innerHTML = '<div class="empty-card">No task graph.</div>';
    $("#mission-events").innerHTML = '<div class="empty-card">No mission events.</div>';
    $("#mission-output").innerHTML = '<div class="empty-card">Mission artifacts will appear here.</div>';
    return;
  }
  $("#mission-title").textContent = mission.missionId;
  $("#mission-outcome").textContent = mission.ownerOutcome;
  $("#mission-status").className = `status-chip ${statusTone(mission.status)}`;
  $("#mission-status").textContent = titleCase(mission.status);
  $("#mission-progress").textContent = `${mission.progress?.completedTasks || 0} / ${mission.progress?.totalTasks || 0}`;
  $("#mission-progress-bar").style.width = `${mission.progress?.percent || 0}%`;
  $("#mission-budget").textContent = `$${Number(mission.budget?.spentUsd || 0).toFixed(3)} / $${Number(mission.budget?.limitUsd || 0).toFixed(2)}`;
  $("#mission-concurrency").textContent = String(mission.concurrencyLimit || 1);
  $("#mission-autonomy").textContent = titleCase(mission.autonomyLevel);
  $("#mission-run").hidden = !["planned", "blocked"].includes(mission.status);
  $("#mission-cancel").hidden = !["planned", "running", "blocked"].includes(mission.status);
  $("#mission-agents").innerHTML = agents.map((agent) => `<button class="mission-agent" type="button" data-open-agent="${escapeHtml(agent.agentRunId)}"><span class="agent-avatar">${escapeHtml(agent.role.split(/\s+/).map((part) => part[0]).join("").slice(0, 2))}</span><span><strong>${escapeHtml(agent.displayName)}</strong><small>${escapeHtml(agent.provider)} · ${escapeHtml(short(agent.model, 30))}</small><small>${agent.currentTaskId ? escapeHtml(short(agent.currentTaskId, 34)) : "No active task"}</small></span>${statusChip(agent.status)}</button>`).join("") || '<div class="empty-card">No agent runs.</div>';
  const taskById = new Map(tasks.map((task) => [task.taskId, task]));
  $("#mission-tasks").innerHTML = tasks.map((task) => `<article class="mission-task"><div><strong>${escapeHtml(task.title)}</strong>${statusChip(task.status)}<small>${escapeHtml(task.assignedRole)} · attempt ${task.attempt}/${task.maximumAttempts}</small></div><p>${task.dependencies.length ? `After: ${task.dependencies.map((dependency) => escapeHtml(taskById.get(dependency)?.title || dependency)).join(" · ")}` : "Ready from mission start"}</p>${task.workspace ? `<code>${escapeHtml(short(task.workspace.branch, 72))}</code>` : ""}</article>`).join("") || '<div class="empty-card">No tasks.</div>';
  $("#mission-events").innerHTML = events.slice(-80).reverse().map((event) => `<div class="mission-event"><i class="${statusTone(event.type.includes("failed") ? "failed" : event.type.includes("completed") || event.type.includes("passed") ? "complete" : "running")}"></i><div><strong>${escapeHtml(titleCase(event.type.replaceAll(".", " ")))}</strong><small>${escapeHtml(event.taskId ? short(event.taskId, 42) : event.agentRunId ? short(event.agentRunId, 42) : "mission")} · ${escapeHtml(timeAgo(event.timestamp))}</small></div></div>`).join("") || '<div class="empty-card">No events.</div>';
  const blockers = mission.blockers || [];
  const artifacts = detail.artifactRecords || [];
  const previewUrl = typeof mission.preview?.url === "string" && mission.preview.url.startsWith(`/api/v1/missions/${encodeURIComponent(mission.missionId)}/preview/`) ? mission.preview.url : "";
  const previewOutput = mission.preview?.ready && previewUrl
    ? `<a class="quiet-button" href="${escapeHtml(previewUrl)}" target="_blank" rel="noopener">Open verified preview</a><p>${escapeHtml(mission.preview.entryFile)}</p>`
    : "<p>No verified preview is available.</p>";
  $("#mission-output").innerHTML = `${blockers.length ? `<div class="mission-blockers"><strong>Blockers</strong>${blockers.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}</div>` : ""}<div class="drawer-item"><strong>${artifacts.length} persisted artifact${artifacts.length === 1 ? "" : "s"}</strong>${previewOutput}</div><div class="drawer-item"><strong>Integration branch</strong><p><code>${escapeHtml(mission.integrationWorkspace?.branch || "Not created")}</code></p></div>`;
}

function openMissionAgent(agentRunId) {
  const agent = state.mission?.agents?.find((item) => item.agentRunId === agentRunId);
  if (!agent) return;
  const task = state.mission?.tasks?.find((item) => item.taskId === agent.currentTaskId);
  openDrawer({
    kicker: "Mission agent run",
    title: agent.displayName,
    html: `${keyValue("Role", agent.role)}${keyValue("Status", titleCase(agent.status))}${keyValue("Provider", `${agent.provider} · ${agent.model}`)}${keyValue("Current task", task?.title || "None")}${keyValue("Workspace", agent.workspacePath || "Not assigned")}${keyValue("Branch", agent.branch || "Not assigned")}${keyValue("Tokens", `${agent.tokenUsage?.input || 0} in · ${agent.tokenUsage?.output || 0} out`)}${keyValue("Cost", `$${Number(agent.costUsd || 0).toFixed(4)}`)}${keyValue("External actions", agent.permissions?.externalActions ? "Allowed" : "Blocked")}`
  });
}

async function controlMission(action) {
  const missionId = state.mission?.missionId;
  if (!missionId) return;
  try {
    await api(`/api/v1/missions/${encodeURIComponent(missionId)}/controls`, { method: "POST", body: JSON.stringify({ action }) });
    await refreshStatus();
  } catch (error) {
    consoleLine(`■ Mission ${action} failed: ${error.message}`, "bad");
    setView("console");
  }
}

async function openOpportunity(opportunityId) {
  openDrawer({ kicker: "Opportunity Director", title: "Loading…", html: '<div class="empty-card">Loading persisted evidence and economics…</div>' });
  try {
    const detail = await api(`/api/v1/opportunities/${encodeURIComponent(opportunityId)}`);
    const item = detail.opportunity;
    const evidence = (item.observations || []).map((observation) => `<div class="drawer-item"><strong>Observed</strong><p>${escapeHtml(observation.statement)}</p><small>${escapeHtml(observation.evidenceId)}</small></div>`).join("");
    const assumptions = (item.assumptions || []).map((assumption) => `<div class="drawer-item"><strong>${escapeHtml(titleCase(assumption.kind))}</strong><p>${escapeHtml(assumption.statement)}</p></div>`).join("");
    const score = Object.entries(item.scoreBreakdown || {}).map(([key, value]) => keyValue(titleCase(key), value)).join("");
    const economics = item.economicModel || {};
    openDrawer({
      kicker: `${titleCase(item.type)} · Score ${item.score}`,
      title: item.title,
      html: `<section class="drawer-section">${keyValue("Status", titleCase(item.status))}${keyValue("Confidence", `${item.confidence}%`)}${keyValue("Access", titleCase(item.reachability))}${keyValue("Evidence", item.evidenceIds?.length || 0)}${keyValue("Research spend", moneyText(item.researchSpendUsd))}</section>
        <section class="drawer-section"><h3>Observed facts</h3>${evidence || '<div class="empty-card">No verified observation recorded.</div>'}</section>
        <section class="drawer-section"><h3>Hypothesis and assumptions</h3><p class="drawer-copy">${escapeHtml(item.problemHypothesis)}</p>${assumptions}</section>
        <section class="drawer-section"><h3>Score breakdown</h3>${score}</section>
        <section class="drawer-section"><h3>Economics · estimates, not facts</h3>${keyValue("Low / base / high", `${moneyText(economics.lowValueUsd)} / ${moneyText(economics.baseValueUsd)} / ${moneyText(economics.highValueUsd)}`)}${keyValue("Expected value", moneyText(economics.expectedValueUsd))}${keyValue("Validation cost", moneyText(economics.estimatedValidationSpendUsd))}${keyValue("Days to signal", item.estimatedDaysToSignal)}<div class="drawer-item"><strong>Assumptions</strong><p>${escapeHtml((economics.assumptions || []).join(" · "))}</p></div></section>
        <section class="drawer-section"><h3>Cheapest next test</h3><p class="drawer-copy">${escapeHtml(item.cheapestValidation || "Not recorded")}</p><div class="drawer-item"><strong>Stop conditions</strong><p>${escapeHtml((item.stopConditions || []).join(" · "))}</p></div></section>
        <section class="drawer-section"><h3>Owner actions</h3><div class="drawer-actions"><button type="button" data-opportunity-action="research_deeper" data-opportunity-id="${escapeHtml(item.opportunityId)}">Research deeper</button><button type="button" data-opportunity-action="watch" data-opportunity-id="${escapeHtml(item.opportunityId)}">Watch</button><button type="button" class="danger" data-opportunity-action="kill" data-opportunity-id="${escapeHtml(item.opportunityId)}">Kill</button><button type="button" class="primary" data-opportunity-action="prepare_validation" data-opportunity-id="${escapeHtml(item.opportunityId)}">Prepare validation</button><button type="button" data-opportunity-action="spawn_build_mission" data-opportunity-id="${escapeHtml(item.opportunityId)}">Spawn build mission</button></div><p class="drawer-copy">Build missions require an accepted matching owner proposal and still grant no downstream live permission.</p></section>`
    });
  } catch (error) {
    drawerBody.innerHTML = `<div class="empty-card">${escapeHtml(error.message)}</div>`;
  }
}

async function applyOpportunityAction(opportunityId, action) {
  try {
    await api(`/api/v1/opportunities/${encodeURIComponent(opportunityId)}/actions`, { method: "POST", body: JSON.stringify({ action, confirmation: `${action.toUpperCase()} ${opportunityId}` }) });
    closeDrawer();
    await refreshStatus();
    setView("director");
  } catch (error) {
    closeDrawer();
    setView("console");
    consoleLine(`■ Opportunity action stopped: ${error.message}`, "warn");
  }
}

document.addEventListener("click", (event) => {
  const viewButton = event.target.closest("[data-view]");
  if (viewButton) return setView(viewButton.dataset.view);
  if (event.target.closest("[data-close-drawer]")) return closeDrawer();
  const project = event.target.closest("[data-open-project]"); if (project) return void openProject(project.dataset.openProject);
  const job = event.target.closest("[data-open-job]"); if (job) return openJob(job.dataset.openJob);
  const proposal = event.target.closest("[data-open-proposal]"); if (proposal) return openProposal(proposal.dataset.openProposal);
  const system = event.target.closest("[data-open-system]"); if (system) return openSystem(system.dataset.openSystem);
  const directorTab = event.target.closest("[data-director-view]"); if (directorTab) return setDirectorView(directorTab.dataset.directorView);
  const opportunity = event.target.closest("[data-open-opportunity]"); if (opportunity) return void openOpportunity(opportunity.dataset.openOpportunity);
  const opportunityAction = event.target.closest("[data-opportunity-action]"); if (opportunityAction) return void applyOpportunityAction(opportunityAction.dataset.opportunityId, opportunityAction.dataset.opportunityAction);
  if (event.target.closest("[data-open-decision-queue]")) return openDecisionQueue();
  const jobDecision = event.target.closest("[data-job-decision]"); if (jobDecision) return void decideJob(jobDecision.dataset.jobId, jobDecision.dataset.jobDecision);
  const jobRecovery = event.target.closest("[data-job-recovery]"); if (jobRecovery) return void recoverJob(jobRecovery.dataset.jobId, jobRecovery.dataset.jobRecovery);
  const proposalDecision = event.target.closest("[data-proposal-decision]"); if (proposalDecision) return void decideProposal(proposalDecision.dataset.proposalId, proposalDecision.dataset.proposalDecision);
  const lessonDecision = event.target.closest("[data-lesson-decision]"); if (lessonDecision) return void decideLesson(lessonDecision.dataset.lessonId, lessonDecision.dataset.lessonDecision);
  const deliverable = event.target.closest("[data-view-deliverable]"); if (deliverable) return void viewDeliverable(deliverable.dataset.viewDeliverable);
  const rating = event.target.closest("[data-rate-job]"); if (rating) return void rateJob(rating.dataset.rateJob);
  const targetProject = event.target.closest("[data-target-project]"); if (targetProject) { $("#os-project").value = targetProject.dataset.targetProject; closeDrawer(); setView("console"); promptInput.focus(); return; }
  const quick = event.target.closest("[data-quick-command]"); if (quick) return void submitCommand(quick.dataset.quickCommand);
  const agent = event.target.closest("[data-open-agent]"); if (agent) return openMissionAgent(agent.dataset.openAgent);
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
$("#mission-run").addEventListener("click", () => void controlMission("run"));
$("#mission-cancel").addEventListener("click", () => void controlMission("cancel"));

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

setView(state.view);
refreshStatus({ quiet: true });
setInterval(() => { if (!document.hidden && state.authenticated) void refreshStatus({ quiet: true }); }, 5000);
