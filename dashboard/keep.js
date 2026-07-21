import { budgetPercent, gateControlsForJob, packetStage, standupDue, standupLessonTitles, waitingApprovalJobs } from "./keep-model.mjs";

(() => {
  const world = document.querySelector("#keep-world");
  const overlay = document.querySelector("#keep-overlay");
  const readModel = window.AG_OS_DASHBOARD_DATA || {};
  const characterModules = {
    intake: "command intake + classification",
    planner: "planner processor + Anthropic planner",
    codex: "Anthropic worker + execution adapters",
    fable: "quality learning + lesson candidates",
    memory: "accepted memory + relevance retrieval",
    gatekeeper: "job approval service",
    watchdog: "operational safeguards + internal watchdog"
  };
  let latestStatus = null;
  let selectedEntity = null;
  let standupTimer = null;
  let standupSpeechTimer = null;
  let lastScheduledStandupDate = null;

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function minifig({ id, name, role, style = "", accessory = "" }) {
    const actor = node("div", `keep-actor ${style}`);
    actor.dataset.keepEntity = id;
    actor.dataset.role = role;
    actor.setAttribute("aria-label", `${name}, ${role}`);
    const figure = node("div", "minifig");
    const head = node("span", "minifig-head");
    head.append(node("i", "minifig-eye left"), node("i", "minifig-eye right"));
    const torso = node("span", "minifig-torso");
    torso.append(node("i", "minifig-arm left"), node("i", "minifig-arm right"));
    const legs = node("span", "minifig-legs");
    legs.append(node("i", "minifig-leg left"), node("i", "minifig-leg right"));
    figure.append(head, torso, legs);
    if (accessory) figure.append(node("span", `minifig-accessory ${accessory}`));
    actor.append(figure, node("span", "keep-actor-name", name), node("span", "keep-actor-role", role));
    return actor;
  }

  function desk(label) {
    const item = node("div", "keep-desk");
    item.append(node("span", "keep-monitor", "▰"), node("span", "keep-desk-label", label));
    return item;
  }

  function room(id, title, tint) {
    const section = node("section", `keep-room keep-room-${id} ${tint}`);
    section.dataset.room = id;
    const header = node("header", "keep-room-label");
    header.append(node("span", "", title), node("span", "keep-room-state", "○ idle"));
    section.append(header);
    return section;
  }

  function buildPlanningHall() {
    const section = room("planning", "planning hall", "room-blue");
    const desks = node("div", "keep-desk-row");
    desks.append(desk("intake"), desk("planner"));
    const actors = node("div", "keep-actor-row");
    actors.append(
      minifig({ id: "intake", name: "Intake", role: "command classifier", style: "fig-intake" }),
      minifig({ id: "planner", name: "Planner", role: "plan worker", style: "fig-planner" })
    );
    section.append(desks, actors);
    return section;
  }

  function buildForge() {
    const section = room("forge", "build forge", "room-clay");
    const reactor = node("div", "keep-reactor");
    reactor.dataset.keepEntity = "reactor";
    const crystal = node("span", "reactor-crystal");
    const fuel = node("div", "reactor-fuel");
    const fuelFill = node("span", "reactor-fuel-fill");
    const monthly = Number(readModel.costs?.limits?.monthlyMaxUsd || 0);
    const spent = Number(readModel.costs?.totalRecordedActualUsd || 0);
    fuelFill.style.width = `${monthly > 0 ? Math.max(0, Math.min(100, (spent / monthly) * 100)) : 0}%`;
    fuel.append(fuelFill);
    reactor.append(crystal, node("strong", "", "claude reactor"), fuel, node("small", "", "breaker armed"));
    if (readModel.costs?.budgetStatus === "within_limit") reactor.classList.add("is-live");
    const forgeFloor = node("div", "keep-forge-floor");
    forgeFloor.append(minifig({ id: "codex", name: "Codex", role: "builder warrior", style: "fig-codex", accessory: "sword" }), desk("work product"), reactor);
    section.append(forgeFloor);
    return section;
  }

  function buildLibrary() {
    const section = room("library", "library of lessons", "room-purple");
    const memory = readModel.unifiedMemory || {};
    const shelves = node("div", "lesson-shelves");
    const books = node("div", "lesson-books");
    books.dataset.keepEntity = "accepted-lessons";
    books.append(node("span", "book-stack", "▥"), node("strong", "", `${Number(memory.acceptedCount || 0).toLocaleString()} bound books`));
    const scrolls = node("div", "lesson-scrolls");
    scrolls.dataset.keepEntity = "lesson-queue";
    scrolls.append(node("span", "scroll-stack", "▤"), node("strong", "", `×${Number(memory.candidateCount || 0).toLocaleString()} candidate scrolls`));
    shelves.append(books, scrolls);
    const cast = node("div", "keep-actor-row library-cast");
    cast.append(minifig({ id: "fable", name: "Fable", role: "learning guide", style: "fig-fable" }));
    const brain = node("div", "memory-brain");
    brain.dataset.keepEntity = "memory";
    brain.setAttribute("aria-label", "Memory, accepted lessons and candidate review");
    brain.append(node("span", "brain-lobe one"), node("span", "brain-lobe two"), node("i", "brain-eye left"), node("i", "brain-eye right"), node("strong", "", "Memory"));
    cast.append(brain);
    section.append(shelves, cast);
    return section;
  }

  function buildGatehouse() {
    const section = room("gate", "gatehouse", "room-green");
    const gate = node("div", "keep-gate");
    gate.dataset.keepEntity = "gate";
    gate.setAttribute("aria-label", "Approval gate");
    const arch = node("div", "gate-arch");
    arch.append(node("span", "gate-bars"));
    gate.append(arch, node("strong", "gate-label", "○ gate: quiet"));
    section.append(minifig({ id: "gatekeeper", name: "Gate", role: "approval guard", style: "fig-gate" }), gate);
    return section;
  }

  function buildOwnerAlcove() {
    const section = node("section", "owner-alcove");
    section.dataset.keepEntity = "owner";
    const deskTop = node("div", "owner-desk");
    const pending = Number(readModel.approvals?.activeCount || 0);
    deskTop.append(node("span", "owner-scrolls", pending ? `▤×${pending}` : "▱"), node("small", "", "pending locks"));
    section.append(node("strong", "owner-crown", "♛ owner — you"), deskTop, node("div", "owner-figure-slot", "session offline"));
    return section;
  }

  function buildCenter() {
    const center = node("section", "keep-center");
    const stone = node("div", "constitution-stone");
    stone.dataset.keepEntity = "constitution";
    stone.append(node("span", "", "CONSTITUTION"), node("strong", "", "v1.0"));
    const archive = node("div", "archive-slot");
    archive.dataset.keepEntity = "archive";
    archive.append(node("span", "", "▰"), node("strong", "", "archive"));
    const standup = node("div", "standup-table");
    standup.dataset.keepEntity = "standup";
    standup.append(node("span", "", "standup table"));
    center.append(stone, archive, standup);
    return center;
  }

  function buildWatchdog() {
    const patrol = node("div", "watchdog-patrol");
    const dog = node("div", "watchdog-dog");
    dog.dataset.keepEntity = "watchdog";
    dog.setAttribute("aria-label", "Watchdog, internal safety monitor");
    dog.append(node("span", "dog-body"), node("span", "dog-head"), node("span", "dog-ear"), node("span", "dog-tail"), node("i", "dog-leg one"), node("i", "dog-leg two"), node("i", "dog-leg three"), node("i", "dog-leg four"), node("strong", "", "Watchdog"));
    if (readModel.watchdog?.status === "configured") patrol.classList.add("is-patrolling");
    patrol.append(dog);
    return patrol;
  }

  function button(label, action, className = "") {
    const control = node("button", className, label);
    control.type = "button";
    control.addEventListener("click", action);
    return control;
  }

  function overlayShell(title) {
    overlay.replaceChildren();
    const header = node("header", "keep-overlay-header");
    header.append(node("h2", "", title), button("close ×", () => {
      overlay.hidden = true;
      selectedEntity = null;
    }, "keep-overlay-close"));
    const content = node("div", "keep-overlay-content");
    overlay.append(header, content);
    overlay.hidden = false;
    return content;
  }

  function definition(rows) {
    const list = node("dl", "keep-definition");
    rows.forEach(([term, value]) => {
      list.append(node("dt", "", term), node("dd", "", value || "not recorded"));
    });
    return list;
  }

  function currentJobFor(entity) {
    const jobs = latestStatus?.jobs || [];
    if (["intake", "planner"].includes(entity)) return jobs.find((job) => ["queued", "planning", "plan_ready"].includes(job.status));
    if (entity === "codex") return jobs.find((job) => job.status === "running");
    if (entity === "gatekeeper") return jobs.find((job) => job.status === "waiting_approval");
    return jobs[0];
  }

  function renderCharacter(entity) {
    const actor = world.querySelector(`[data-keep-entity='${entity}']`);
    const job = currentJobFor(entity);
    const content = overlayShell(actor?.querySelector(".keep-actor-name")?.textContent || entity);
    content.append(definition([
      ["role", actor?.dataset.role || entity],
      ["module", characterModules[entity]],
      ["current job", job?.jobId || "none"],
      ["state", job?.status || "idle"],
      ["last activity", job?.updatedAt ? new Date(job.updatedAt).toLocaleString() : "no runtime activity"]
    ]));
  }

  async function decideJob(job, decision, stamp) {
    if (!window.confirm(`${decision.toUpperCase()} exact job ${job.jobId}? Existing server-side approval and safety guards still apply.`)) return;
    stamp.textContent = "recording decision…";
    const { response, result } = await window.AGOS.request(`/api/v1/jobs/${encodeURIComponent(job.jobId)}/decision`, {
      method: "POST",
      body: JSON.stringify({ decision, confirmation: `${decision.toUpperCase()} ${job.jobId}` })
    });
    if (!response.ok) throw new Error(result.detail || result.error || "job decision rejected");
    stamp.textContent = decision === "approve" ? "✓ stamped" : "■ rejected";
    stamp.className = `gate-stamp ${decision === "approve" ? "is-stamped" : "is-rejected"}`;
    await window.AGOS.refreshStatus();
  }

  function renderGate() {
    const content = overlayShell("approval gate");
    const waiting = waitingApprovalJobs(latestStatus?.jobs || []);
    if (!waiting.length) {
      content.append(node("p", "keep-empty", "nothing at the gate — all quiet"));
      return;
    }
    waiting.forEach((job) => {
      const card = node("article", "gate-job-card");
      const stamp = node("p", "gate-stamp", "▲ owner lock required");
      card.append(node("h3", "", job.commandPreview || job.jobId), definition([
        ["job", job.jobId],
        ["scope", job.approvalScope],
        ["risk", job.riskLevel],
        ["requested action", job.requestedAction],
        ["cost estimate", `$${Number(job.estimatedCostUsd || 0).toFixed(2)}`]
      ]));
      const evidence = node("div", "gate-evidence");
      evidence.append(node("strong", "", "evidence"));
      if (job.evidence?.length) job.evidence.forEach((record) => evidence.append(node("code", "", record)));
      else evidence.append(node("span", "", "No completion evidence yet; approval applies only to the requested adapter action."));
      if (job.evidence?.length) evidence.append(button("Open Dash evidence", () => window.AGOS.setView("dash"), "evidence-link"));
      const actions = node("div", "gate-actions");
      const wrapDecision = (decision) => async () => {
        try { await decideJob(job, decision, stamp); }
        catch (error) { stamp.textContent = `■ ${error.message}`; stamp.className = "gate-stamp is-rejected"; }
      };
      gateControlsForJob(job).forEach((decision) => actions.append(button(decision === "approve" ? "Approve" : "Reject", wrapDecision(decision), `gate-${decision}`)));
      card.append(evidence, actions, stamp);
      content.append(card);
    });
  }

  function renderReactor() {
    const budget = latestStatus?.anthropicBudget || {};
    const content = overlayShell("claude reactor");
    content.append(definition([
      ["month", `$${Number(budget.monthlyActualUsd || 0).toFixed(2)} / $${Number(budget.limits?.monthlyMaxUsd || readModel.costs?.limits?.monthlyMaxUsd || 0).toFixed(2)}`],
      ["calls today", `${Number(budget.dailyCallCount || 0)} / ${Number(budget.dailyCallLimit || 0)}`],
      ["per-task cap", `$${Number(budget.limits?.perTaskMaxUsd || readModel.costs?.limits?.perTaskMaxUsd || 0).toFixed(2)}`],
      ["breaker", budget.breakerArmed === false ? "unavailable" : "armed"]
    ]));
  }

  async function decideLesson(lesson, decision, state) {
    if (!window.confirm(`${decision === "promote" ? "Accept" : "Reject"} ${lesson.title}? Memory remains advisory and cannot grant permission.`)) return;
    let reason = "Owner reviewed this candidate and chose not to retain it.";
    if (decision === "reject") {
      const supplied = window.prompt("Why should this lesson be rejected?", reason);
      if (supplied === null) return;
      reason = supplied.trim();
    }
    state.textContent = "recording…";
    const { response, result } = await window.AGOS.request("/api/v1/memory/lessons/decision", {
      method: "POST",
      body: JSON.stringify({ lessonIds: [lesson.lessonId], decision, reason })
    });
    if (!response.ok) throw new Error(result.detail || result.error || "lesson decision rejected");
    state.textContent = decision === "promote" ? "● accepted as advisory memory" : "■ rejected";
    await window.AGOS.refreshStatus();
  }

  function renderMemory() {
    const content = overlayShell("lesson memory");
    const lessons = latestStatus?.lessonDecisions;
    content.append(definition([
      ["accepted", String(lessons?.acceptedCount || 0)],
      ["candidates", String(lessons?.activeCandidateCount || 0)],
      ["permission", "advisory only — never grants live action"]
    ]));
    const queue = node("div", "keep-lesson-queue");
    (lessons?.decisions || []).slice(0, 12).forEach((lesson) => {
      const card = node("article", "keep-lesson-card");
      const state = node("small", "", lesson.recommendation);
      const actions = node("div", "gate-actions");
      const act = (decision) => async () => {
        try { await decideLesson(lesson, decision, state); }
        catch (error) { state.textContent = `■ ${error.message}`; }
      };
      actions.append(button("Accept", act("promote")), button("Reject", act("reject")));
      card.append(node("strong", "", lesson.title), state, actions);
      queue.append(card);
    });
    if (!queue.childElementCount) queue.append(node("p", "keep-empty", "No lessons need a decision."));
    content.append(queue);
    startStandup(60_000);
  }

  function renderOwner() {
    const content = overlayShell("owner desk");
    const waiting = waitingApprovalJobs(latestStatus?.jobs || []);
    content.append(node("p", "keep-copy", `${waiting.length} exact job approval${waiting.length === 1 ? "" : "s"} waiting.`));
    waiting.forEach((job) => {
      const jump = button(`${job.riskLevel} · ${job.commandPreview || job.jobId}`, () => {
        selectedEntity = "gate";
        renderGate();
      }, "owner-approval-link");
      content.append(jump);
    });
  }

  function renderConstitution() {
    const content = overlayShell("authority order");
    const order = ["Owner", "Active Constitution", "Exact approval locks", "Security OS", "Governance OS", "Quality OS", "Cost OS", "Command OS", "Connector Registry", "Project rules", "Agent rules"];
    const list = node("ol", "authority-list");
    order.forEach((item) => list.append(node("li", "", item)));
    content.append(list, node("p", "keep-copy", "The more restrictive safety rule wins. Memory and connector availability never grant permission."));
  }

  function renderArchive() {
    const content = overlayShell("archive · last 10 records");
    const list = node("div", "archive-list");
    (latestStatus?.recentAudit || []).forEach((record) => {
      const item = node("article", "archive-record");
      item.append(node("strong", "", record.eventType), node("span", "", record.id), node("time", "", new Date(record.occurredAt).toLocaleString()), node("p", "", record.summary));
      list.append(item);
    });
    if (!list.childElementCount) list.append(node("p", "keep-empty", "No audit records are available in this authenticated view."));
    content.append(list);
  }

  function renderWatchdog() {
    const watchdog = (latestStatus?.operatingSystems || []).find((item) => item.id === "watchdog-os");
    const content = overlayShell("Watchdog");
    content.append(definition([
      ["state", watchdog?.status || latestStatus?.safeguards?.status],
      ["cadence", watchdog?.detail || "internal recurring safeguards"],
      ["authority", "monitor and report only"]
    ]));
  }

  function openEntity(entity) {
    selectedEntity = entity;
    if (["intake", "planner", "codex", "fable", "gatekeeper"].includes(entity)) renderCharacter(entity);
    else if (entity === "gate") renderGate();
    else if (entity === "reactor") renderReactor();
    else if (["lesson-queue", "accepted-lessons", "memory"].includes(entity)) renderMemory();
    else if (entity === "owner") renderOwner();
    else if (entity === "constitution") renderConstitution();
    else if (entity === "archive") renderArchive();
    else if (entity === "watchdog") renderWatchdog();
    else if (entity === "standup") renderStandupPanel();
  }

  function activateEntities() {
    world.querySelectorAll("[data-keep-entity]").forEach((entity) => {
      entity.setAttribute("role", "button");
      entity.setAttribute("tabindex", "0");
      entity.addEventListener("click", () => openEntity(entity.dataset.keepEntity));
      entity.addEventListener("keydown", (event) => {
        if (["Enter", " "].includes(event.key)) {
          event.preventDefault();
          openEntity(entity.dataset.keepEntity);
        }
      });
    });
  }

  function populateQuestProjects(status) {
    const select = document.querySelector("#keep-quest-project");
    const selected = select.value;
    select.replaceChildren(new Option("one-off work", "project-one-off"));
    (status.projects || []).forEach((project) => select.append(new Option(project.name, project.id)));
    if ([...select.options].some((option) => option.value === selected)) select.value = selected;
  }

  function renderPackets(jobs) {
    world.querySelectorAll(".job-packet").forEach((packet) => packet.remove());
    jobs.slice(0, 8).forEach((job, index) => {
      const packet = node("div", "job-packet");
      const stage = packetStage(job.status);
      packet.dataset.stage = stage;
      packet.style.setProperty("--packet-index", String(index));
      packet.title = `${job.jobId}: ${job.status}`;
      packet.append(node("span", "packet-chip"), node("strong", "", (job.commandPreview || job.jobId).slice(0, 24)));
      world.append(packet);
    });
  }

  function markWorking(selector, active) {
    world.querySelector(selector)?.classList.toggle("is-working", active);
  }

  function renderLiveState(status) {
    latestStatus = status;
    populateQuestProjects(status);
    const jobs = status.jobs || [];
    const waiting = waitingApprovalJobs(jobs);
    const running = jobs.filter((job) => job.status === "running");
    const planning = jobs.filter((job) => ["queued", "planning", "plan_ready"].includes(job.status));
    world.querySelector(".keep-room-planning .keep-room-state").textContent = planning.length ? `◐ ${planning.length} active` : "○ idle";
    world.querySelector(".keep-room-forge .keep-room-state").textContent = running.length ? `◐ ${running.length} building` : "○ idle";
    world.querySelector(".keep-room-gate .keep-room-state").textContent = waiting.length ? `▲ ${waiting.length} waiting` : "○ quiet";
    const gate = world.querySelector(".keep-gate");
    gate.classList.toggle("is-closed", waiting.length > 0);
    gate.querySelector(".gate-label").textContent = waiting.length ? "■ gate: closed" : "○ gate: quiet";
    markWorking("[data-keep-entity='intake']", planning.length > 0);
    markWorking("[data-keep-entity='planner']", planning.length > 0);
    markWorking("[data-keep-entity='codex']", running.length > 0);
    const ownerSlot = world.querySelector(".owner-figure-slot");
    ownerSlot.textContent = "owner online";
    ownerSlot.classList.add("is-online");
    world.querySelector(".owner-scrolls").textContent = waiting.length ? `▤×${waiting.length}` : "▱";
    const budget = status.anthropicBudget || {};
    const fill = world.querySelector(".reactor-fuel-fill");
    fill.style.width = `${budgetPercent(budget.monthlyActualUsd, budget.limits?.monthlyMaxUsd)}%`;
    const blocked = jobs.some((job) => job.status === "budget_blocked") || budget.breakerArmed === false;
    world.querySelector(".keep-reactor").classList.toggle("is-dimmed", blocked);
    const lessons = status.lessonDecisions || {};
    world.querySelector(".lesson-books strong").textContent = `${Number(lessons.acceptedCount || 0).toLocaleString()} bound books`;
    world.querySelector(".lesson-scrolls strong").textContent = `×${Number(lessons.activeCandidateCount || 0).toLocaleString()} candidate scrolls`;
    const watchdog = (status.operatingSystems || []).find((item) => item.id === "watchdog-os");
    world.querySelector(".watchdog-patrol").classList.toggle("is-patrolling", watchdog?.status === "operational");
    renderPackets(jobs);
    document.querySelector("#keep-mode-line").textContent = waiting.length ? `waiting at the gate — owner lock required` : `${status.runtimeDeployment?.status || "private"} · ${running.length} running · ${planning.length} queued`;
    if (selectedEntity && !overlay.hidden) openEntity(selectedEntity);
  }

  function ensureStandupGathering() {
    let gathering = world.querySelector(".standup-gathering");
    if (gathering) return gathering;
    gathering = node("div", "standup-gathering");
    gathering.append(node("span", "standup-member", "Planner"), node("span", "standup-member", "Codex"), node("span", "standup-member", "Gate"), node("span", "standup-member", "Fable"), node("span", "standup-memory", "Memory"), node("blockquote", "standup-speech"));
    world.append(gathering);
    return gathering;
  }

  function stopStandup() {
    window.clearTimeout(standupTimer);
    window.clearInterval(standupSpeechTimer);
    standupTimer = null;
    standupSpeechTimer = null;
    world.classList.remove("standup-active");
  }

  function startStandup(durationMs = 60_000) {
    const titles = standupLessonTitles(latestStatus?.lessonDecisions?.decisions || []);
    if (!titles.length) return false;
    stopStandup();
    const gathering = ensureStandupGathering();
    const speech = gathering.querySelector(".standup-speech");
    let index = 0;
    speech.textContent = titles[index];
    world.classList.add("standup-active");
    standupSpeechTimer = window.setInterval(() => {
      index = (index + 1) % titles.length;
      speech.textContent = titles[index];
    }, 3_500);
    standupTimer = window.setTimeout(stopStandup, durationMs);
    return true;
  }

  function renderStandupPanel() {
    const content = overlayShell("daily standup · read only");
    const titles = standupLessonTitles(latestStatus?.lessonDecisions?.decisions || [], 10);
    if (titles.length) {
      const list = node("ul", "standup-lesson-list");
      titles.forEach((title) => list.append(node("li", "", title)));
      content.append(node("p", "keep-copy", "The team is discussing real candidate lessons. This scene cannot accept or reject anything."), list);
      startStandup(60_000);
    } else content.append(node("p", "keep-empty", "No candidate lessons are waiting for standup."));
  }

  function checkScheduledStandup(now = new Date()) {
    if (!standupDue(now, lastScheduledStandupDate, 9)) return;
    const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    if (startStandup(5 * 60_000)) lastScheduledStandupDate = localDate;
  }

  async function submitQuest(event) {
    event.preventDefault();
    const input = document.querySelector("#keep-quest-command");
    const command = input.value.trim();
    if (!command) return;
    const button = event.currentTarget.querySelector("button");
    button.disabled = true;
    document.querySelector("#keep-mode-line").textContent = "routing quest through command intake…";
    try {
      const { response, result } = await window.AGOS.request("/api/v1/commands", {
        method: "POST",
        body: JSON.stringify({ command, projectId: document.querySelector("#keep-quest-project").value })
      });
      if (!response.ok) throw new Error(result.detail || result.error || "quest rejected");
      input.value = "";
      document.querySelector("#keep-mode-line").textContent = `${result.jobId} · ${result.status}`;
      await window.AGOS.refreshStatus();
    } catch (error) {
      document.querySelector("#keep-mode-line").textContent = `■ stopped safely · ${error.message}`;
    } finally { button.disabled = false; }
  }

  world.append(buildPlanningHall(), buildOwnerAlcove(), buildForge(), buildCenter(), buildLibrary(), buildGatehouse(), buildWatchdog());
  activateEntities();
  document.querySelector("#keep-quest-form").addEventListener("submit", submitQuest);
  window.addEventListener("agos:status", (event) => renderLiveState(event.detail));
  window.addEventListener("agos:status-error", () => {
    document.querySelector("#keep-mode-line").textContent = "owner sign-in required for live world state";
    world.querySelector(".owner-figure-slot").textContent = "session offline";
  });
  window.addEventListener("agos:event", (event) => {
    const record = event.detail;
    if (record.type === "lesson_decision" && record.status === "promote") world.classList.add("lesson-accepted-event");
    window.setTimeout(() => world.classList.remove("lesson-accepted-event"), 450);
    if (record.type === "job_state_transition") {
      const actorId = record.status === "running" ? "codex" : record.status === "waiting_approval" ? "gatekeeper" : "planner";
      const actor = world.querySelector(`[data-keep-entity='${actorId}']`);
      actor?.classList.add("is-walking");
      window.setTimeout(() => actor?.classList.remove("is-walking"), 1_200);
    }
  });
  if (window.AGOS.latestStatus) renderLiveState(window.AGOS.latestStatus);
  checkScheduledStandup();
  window.setInterval(checkScheduledStandup, 60_000);
})();
