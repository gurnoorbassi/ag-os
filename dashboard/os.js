"use strict";

const $ = (sel) => document.querySelector(sel);
const stage = $("#keep-stage");
const connBadge = $("#os-conn");
const promptInput = $("#os-input");

const DEMO = new URLSearchParams(location.search).has("demo");
let demoActive = DEMO;
let status = null;
let prevJobs = new Map();
let lessonQueue = null;
let activeView = location.hash.replace("#", "") || "console";
if (!["console", "ops", "keep"].includes(activeView)) activeView = "console";

function esc(value) {
  const div = document.createElement("div");
  div.textContent = String(value ?? "");
  return div.innerHTML;
}

function short(value, max = 26) {
  const text = String(value ?? "");
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function glyphFor(jobStatus) {
  if (jobStatus === "done") return ["●", "ok"];
  if (jobStatus === "running") return ["◐", "warn"];
  if (jobStatus === "waiting_approval") return ["▲", "warn"];
  if (jobStatus === "failed") return ["■", "bad"];
  return ["○", "dim"];
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "content-type": "application/json" },
    ...options
  });
  const body = await response.json().catch(() => ({}));
  if (response.status === 401) {
    connBadge.textContent = "logged out — open dash to log in";
    connBadge.className = "os-conn bad";
    throw new Error("unauthorized: log in from the dash view first");
  }
  if (!response.ok) throw new Error(body.detail || body.error || `HTTP ${response.status}`);
  return body;
}

function demoStatus() {
  const now = new Date().toISOString();
  return {
    demo: true,
    automation: { enabled: true, pollIntervalSeconds: 15 },
    jobs: [
      { jobId: "job-runtime-operator-demo-landing", status: "waiting_approval", riskLevel: "R3", approvalRequired: true, expectedOutput: "Plumber landing page deliverable.", availableDecisions: ["approve", "reject"], adapter: { adapterId: "local-work-product", name: "Local work product" }, createdAt: now, updatedAt: now },
      { jobId: "job-runtime-operator-demo-report", status: "running", riskLevel: "R1", approvalRequired: false, expectedOutput: "Weekly report draft.", availableDecisions: [], adapter: { adapterId: "local-work-product" }, createdAt: now, updatedAt: now },
      { jobId: "job-runtime-operator-demo-crm", status: "done", riskLevel: "R1", approvalRequired: false, expectedOutput: "CRM starter files.", availableDecisions: [], adapter: { adapterId: "local-work-product" }, createdAt: now, updatedAt: now }
    ],
    lessonDecisions: {
      acceptedCount: 1,
      activeCandidateCount: 23,
      recommendedCount: 4,
      decisions: [
        { lessonId: "lesson-demo-quality-bar", recommendation: "recommended", canPromote: true },
        { lessonId: "lesson-demo-scope-locks", recommendation: "recommended", canPromote: true },
        { lessonId: "lesson-demo-duplicate", recommendation: "possible_duplicate", canPromote: false }
      ]
    },
    budgetView: { spent: 2.14, cap: 50, pct: 4 }
  };
}

function findBudget(payload) {
  let found = null;
  const seen = new Set();
  (function walk(node) {
    if (found || !node || typeof node !== "object" || seen.has(node)) return;
    seen.add(node);
    const cap = node.monthlyMaxUsd ?? node.monthlyBudgetUsd ?? node.maxUsd;
    const spent = node.totalRecordedActualUsd ?? node.spentUsd ?? node.recordedUsd ?? node.totalUsd;
    if (typeof cap === "number" && cap > 0 && typeof spent === "number") {
      found = { spent, cap, pct: Math.min(100, Math.round((spent / cap) * 100)) };
      return;
    }
    for (const value of Object.values(node)) walk(value);
  })(payload);
  return found || payload?.budgetView || null;
}

async function refreshStatus() {
  if (demoActive) {
    status = status?.demo ? status : demoStatus();
    connBadge.textContent = "demo mode";
    connBadge.className = "os-conn warn";
    onStatus();
    return;
  }
  try {
    status = await api("/api/v1/status");
    connBadge.textContent = "live";
    connBadge.className = "os-conn ok";
    onStatus();
  } catch (error) {
    if (!status && !String(error.message).startsWith("unauthorized")) {
      demoActive = true;
      status = demoStatus();
      connBadge.textContent = "offline — demo data";
      connBadge.className = "os-conn warn";
      onStatus();
    }
  }
}

function onStatus() {
  const jobs = status?.jobs || [];
  for (const job of jobs) {
    const before = prevJobs.get(job.jobId);
    if (!before) {
      if (job.status === "queued" || job.status === "running") keepSpawnPacket(job);
      opsFeedLine(job, "entered the queue");
    } else if (before !== job.status) {
      opsFeedLine(job, `→ ${job.status}`);
      if (job.status === "running") keepPacketToForge(job.jobId);
      if (job.status === "waiting_approval") keepPacketToGate(job);
      if (job.status === "done") keepCompleteJob(job.jobId);
      if (job.status === "failed") keepFailJob(job.jobId);
    }
  }
  prevJobs = new Map(jobs.map((job) => [job.jobId, job.status]));
  renderOps();
  renderKeepData();
}

function setView(view) {
  activeView = view;
  location.hash = view;
  for (const button of document.querySelectorAll("#os-views button")) {
    button.classList.toggle("active", button.dataset.view === view);
  }
  $("#view-console").classList.toggle("os-hidden", view !== "console");
  $("#view-ops").classList.toggle("os-hidden", view !== "ops");
  $("#view-keep").classList.toggle("os-hidden", view !== "keep");
}

$("#os-views").addEventListener("click", (event) => {
  const view = event.target?.dataset?.view;
  if (view) setView(view);
});

const conScreen = $("#con-screen");

function conLine(html, cls = "") {
  const line = document.createElement("div");
  line.className = `con-line ${cls}`;
  line.innerHTML = html;
  conScreen.appendChild(line);
  conScreen.scrollTop = conScreen.scrollHeight;
  return line;
}

function conStep(label, value, cls = "ok") {
  const lead = "·".repeat(Math.max(2, 22 - label.length));
  conLine(`<span class="dim">${esc(label)}</span> <span class="con-lead">${lead}</span> <span class="${cls}">${esc(value)}</span>`);
}

function conHelp() {
  conLine('<span class="dim">local: status · jobs · budget · lessons · help — anything else is sent to AG OS as an owner command</span>');
}

function conStatus() {
  const jobs = status?.jobs || [];
  conStep("coordinator", demoActive ? "demo" : "live", demoActive ? "warn" : "ok");
  conStep("automation", status?.automation?.enabled ? "on · 15s tick" : "off", status?.automation?.enabled ? "ok" : "warn");
  const waiting = jobs.filter((job) => job.status === "waiting_approval").length;
  conStep("jobs", `${jobs.length} tracked · ${waiting} waiting on you`, waiting ? "warn" : "ok");
  const memory = status?.lessonDecisions;
  if (memory) conStep("memory", `${memory.acceptedCount} accepted · ${memory.activeCandidateCount} candidates`, memory.activeCandidateCount ? "warn" : "ok");
  const budget = findBudget(status);
  if (budget) conStep("budget", `$${budget.spent.toFixed(2)} / $${budget.cap.toFixed(2)} (${budget.pct}%)`, budget.pct > 80 ? "warn" : "ok");
}

function conJobs() {
  const jobs = status?.jobs || [];
  if (!jobs.length) return conLine('<span class="dim">no jobs tracked</span>');
  for (const job of jobs.slice(0, 12)) {
    const [glyph, cls] = glyphFor(job.status);
    conLine(`<span class="${cls}">${glyph}</span> ${esc(job.jobId)} <span class="dim">${esc(job.status)} · ${esc(job.riskLevel || "")}</span>`);
  }
}

function conBudget() {
  const budget = findBudget(status);
  if (!budget) return conLine('<span class="dim">no budget data in the status payload</span>');
  const filled = Math.round(budget.pct / 100 * 18);
  conLine(`$${budget.spent.toFixed(2)} <span class="dim">of</span> $${budget.cap.toFixed(2)}  <span class="ok">${"█".repeat(filled)}${"░".repeat(18 - filled)}</span> ${budget.pct}% <span class="dim">· breaker armed</span>`);
}

function conLessons() {
  const memory = status?.lessonDecisions;
  if (!memory) return conLine('<span class="dim">no lesson data</span>');
  conStep("accepted", String(memory.acceptedCount), "ok");
  conStep("candidates", String(memory.activeCandidateCount), memory.activeCandidateCount ? "warn" : "ok");
  conLine('<span class="dim">open the keep and click the scroll pile (or Memory) to decide</span>');
}

const history = [];
let historyIndex = -1;

async function submitCommand(text) {
  conLine(`<span class="mark">❯</span> ${esc(text)}`, "con-user");
  const lower = text.toLowerCase();
  if (lower === "help") return conHelp();
  if (lower === "status") return conStatus();
  if (lower === "jobs") return conJobs();
  if (lower === "budget") return conBudget();
  if (lower === "lessons") return conLessons();
  if (demoActive) {
    conStep("command intake", "classified (demo)", "ok");
    conStep("planner", "plan drafted (demo)", "ok");
    conStep("job", "queued (demo)", "ok");
    keepSpawnPacket({ jobId: `job-demo-${Date.now()}`, status: "queued", expectedOutput: text });
    conLine('<span class="dim">demo mode: nothing was sent. run the coordinator and log in for live commands.</span>');
    return;
  }
  const pending = conLine('<span class="warn">◐ sending to AG OS…</span>');
  try {
    const result = await api("/api/v1/commands", { method: "POST", body: JSON.stringify({ command: text }) });
    pending.remove();
    const intake = result.commandIntake || result.record || {};
    conStep("command intake", intake.commandIntakeId || "classified", "ok");
    if (intake.riskLevel) conStep("risk", intake.riskLevel, intake.riskLevel === "R1" ? "ok" : "warn");
    if (result.plan?.planId || intake.nextRecord?.planId) conStep("plan", result.plan?.planId || intake.nextRecord.planId, "ok");
    const jobId = result.job?.jobId || intake.nextRecord?.jobId;
    if (jobId) conStep("job", `${jobId} · ${result.job?.status || "queued"}`, "ok");
    if (result.job?.status === "waiting_approval") conLine('<span class="warn">▲ waiting at the gate — open the keep and click the gate to decide</span>');
    refreshStatus();
  } catch (error) {
    pending.remove();
    conLine(`<span class="bad">■ ${esc(error.message)}</span>`);
  }
}

promptInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && promptInput.value.trim()) {
    const text = promptInput.value.trim();
    history.push(text);
    historyIndex = history.length;
    promptInput.value = "";
    if (activeView !== "console") setView("console");
    submitCommand(text);
  } else if (event.key === "ArrowUp" && history.length) {
    historyIndex = Math.max(0, historyIndex - 1);
    promptInput.value = history[historyIndex] || "";
  } else if (event.key === "ArrowDown" && history.length) {
    historyIndex = Math.min(history.length, historyIndex + 1);
    promptInput.value = history[historyIndex] || "";
  }
});

const opsFeed = $("#ops-feed");

function opsFeedLine(job, note) {
  const [glyph, cls] = glyphFor(job.status);
  const line = document.createElement("div");
  const time = new Date().toTimeString().slice(0, 8);
  line.innerHTML = `<span class="dim">${time}</span>  <span class="${cls}">${glyph}</span> ${esc(short(job.jobId, 40))} <span class="dim">${esc(note)}</span>`;
  opsFeed.appendChild(line);
  while (opsFeed.children.length > 200) opsFeed.removeChild(opsFeed.firstChild);
  opsFeed.scrollTop = opsFeed.scrollHeight;
}

function renderOps() {
  const budget = findBudget(status);
  if (budget) {
    $("#ops-budget").textContent = `$${budget.spent.toFixed(2)} / $${budget.cap.toFixed(2)}`;
    const filled = Math.round(budget.pct / 100 * 16);
    $("#ops-budget-bar").textContent = `${"█".repeat(filled)}${"░".repeat(16 - filled)} ${budget.pct}%`;
  } else {
    $("#ops-budget").textContent = "—";
    $("#ops-budget-bar").textContent = "";
  }
  const jobsNode = $("#ops-jobs");
  jobsNode.replaceChildren();
  for (const job of (status?.jobs || []).slice(0, 6)) {
    const [glyph, cls] = glyphFor(job.status);
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `<span class="${cls}">${glyph}</span> <span>${esc(short(job.jobId.replace("job-runtime-operator-", ""), 26))}</span> <span class="st">${esc(job.status)}</span>`;
    jobsNode.appendChild(row);
  }
  const memory = status?.lessonDecisions;
  $("#ops-memory").textContent = memory
    ? `accepted ${memory.acceptedCount} · candidates ${memory.activeCandidateCount}`
    : "—";
  $("#ops-automation").textContent = status?.automation?.enabled
    ? `on · ${status.automation.pollIntervalSeconds || 15}s tick`
    : "off";
}

const figs = {};
let gateNode = null;
let gateTag = null;
let stampNode = null;
let modeNode = null;
const packets = new Map();

function kEl(className, styles, html, parent = stage) {
  const node = document.createElement("div");
  if (className) node.className = className;
  Object.assign(node.style, styles || {});
  if (html) node.innerHTML = html;
  parent.appendChild(node);
  return node;
}

function makeFig({ key, name, x, y, torso, helm, sword, mode = "idle", bubble }) {
  const node = kEl(`kp-fig ${mode}${helm ? " helm" : ""}${bubble ? " talk" : ""} kp-clicky`, { left: `${x}%`, top: `${y}%` });
  node.innerHTML = `<div class="in">${name ? `<span class="kp-name">${esc(name)}</span>` : ""}<span class="kp-head"></span><span class="kp-torso"></span>${sword ? '<span class="kp-sword"></span>' : ""}<span class="kp-legs"><span class="kp-la"></span><span class="kp-lb"></span></span>${bubble ? `<span class="kp-bubble">${esc(bubble)}</span>` : ""}</div>`;
  node.querySelector(".kp-torso").style.background = torso;
  node.dataset.entity = key;
  figs[key] = { node, x, y, helm: Boolean(helm), mode };
  return figs[key];
}

function setFigMode(key, mode) {
  const fig = figs[key];
  if (!fig) return;
  fig.mode = mode;
  fig.node.className = `kp-fig ${mode}${fig.helm ? " helm" : ""}${fig.node.querySelector(".kp-bubble") ? " talk" : ""} kp-clicky`;
}

function buildKeep() {
  const rooms = [
    { label: "planning hall", x: 2, y: 5, w: 27, h: 42, tint: "rgba(63,109,158,.09)" },
    { label: "build forge", x: 71, y: 5, w: 27, h: 42, tint: "rgba(194,106,61,.09)" },
    { label: "library of lessons", x: 2, y: 56, w: 27, h: 39, tint: "rgba(125,107,176,.09)" },
    { label: "gatehouse", x: 71, y: 56, w: 27, h: 39, tint: "rgba(78,125,91,.09)" }
  ];
  for (const room of rooms) {
    kEl("kp-room", { left: `${room.x}%`, top: `${room.y}%`, width: `${room.w}%`, height: `${room.h}%`, background: room.tint },
      `<span class="kp-tag">${esc(room.label)}</span>`);
  }
  const stone = kEl("kp-stone kp-clicky", {}, '<div class="t1">CONSTITUTION</div><div class="t2">v1.0</div>');
  stone.dataset.entity = "constitution";
  const archive = kEl("kp-archive kp-clicky", {});
  archive.dataset.entity = "archive";
  kEl("kp-archive-label", {}, "archive");
  const owner = kEl("kp-owner kp-clicky", {}, '<span class="kp-tag">owner — you</span>');
  owner.dataset.entity = "owner";
  kEl("kp-scrolls", {}, "▤▤▤");
  const ownerNote = kEl("kp-owner-note", {}, "");
  ownerNote.id = "kp-owner-note";
  const reactor = kEl("kp-reactor kp-clicky", {});
  reactor.dataset.entity = "reactor";
  reactor.id = "kp-reactor";
  const reactorLabel = kEl("kp-reactor-label", {}, "claude reactor");
  reactorLabel.id = "kp-reactor-label";
  for (const desk of [[8, 24], [18, 37], [75, 37]]) {
    kEl("kp-desk", { left: `${desk[0]}%`, top: `${desk[1]}%` }, '<span class="kp-monitor"></span>');
  }
  makeFig({ key: "planner", name: "Planner", x: 9.5, y: 23, torso: "#3f6d9e", mode: "type" });
  makeFig({ key: "intake", name: "Intake", x: 19.5, y: 36, torso: "#3f6d9e", mode: "type" });
  makeFig({ key: "codex", name: "Codex", x: 76.5, y: 36, torso: "#16130f", helm: true, sword: true, mode: "type" });
  makeFig({ key: "fable", name: "Fable", x: 16, y: 74, torso: "#d68b5d", bubble: "reviewing quality…" });
  makeFig({ key: "gatekeeper", name: "Gate", x: 81, y: 74, torso: "#4e7d5b" });
  const brain = kEl("kp-brain kp-clicky", { left: "24%", top: "88%" }, '<span class="bl"></span><span class="ey"></span><span class="ey"></span>');
  brain.dataset.entity = "memory";
  kEl("kp-name", { position: "absolute", left: "24%", top: "89.5%", transform: "translateX(-50%)", zIndex: 4 }, "Memory");
  const shelf = kEl("kp-shelf kp-clicky", {}, '<div class="books" id="kp-books"></div><div class="lbl" id="kp-books-lbl">accepted: —</div>');
  shelf.dataset.entity = "lessons";
  const pile = kEl("kp-pile kp-clicky", {}, '<div class="cnt" id="kp-pile-cnt">▤×—</div><div class="lbl">candidates await stamp</div>');
  pile.dataset.entity = "lessons";
  gateNode = kEl("kp-gate", {}, '<div class="post l"></div><div class="post r"></div>');
  gateNode.dataset.entity = "gate";
  for (let index = 0; index < 3; index += 1) {
    const bar = document.createElement("div");
    bar.className = "bar";
    bar.style.left = `${6 + index * 6}px`;
    gateNode.appendChild(bar);
  }
  gateTag = kEl("kp-gate-tag", {}, "■ gate: closed");
  stampNode = kEl("kp-stamp", {}, "✓ approval stamped");
  modeNode = kEl("kp-mode", {}, "the keep is quiet — issue a quest below");
  const dog = kEl("kp-dog kp-clicky", { left: "33%", top: "96%" },
    '<span class="tl"></span><span class="bd"></span><span class="hd"></span><span class="l1"></span><span class="l2"></span><span class="l3"></span><span class="l4"></span>');
  dog.dataset.entity = "watchdog";
  const dogName = kEl("kp-name", { position: "absolute", left: "33%", top: "97.5%", transform: "translateX(-50%)", zIndex: 4 }, "Watchdog");
  const dogState = { x: 33, y: 96 };
  const waypoints = [[33, 96], [66, 96], [66, 52], [66, 96]];
  let waypointIndex = 0;
  setInterval(() => {
    const target = waypoints[waypointIndex];
    const dx = target[0] - dogState.x;
    const dy = target[1] - dogState.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 1) {
      waypointIndex = (waypointIndex + 1) % waypoints.length;
      return;
    }
    dogState.x += (dx / distance) * 0.3;
    dogState.y += (dy / distance) * 0.3;
    dog.style.left = `${dogState.x}%`;
    dog.style.top = `${dogState.y}%`;
    dogName.style.left = `${dogState.x}%`;
    dogName.style.top = `${dogState.y + 1.5}%`;
    dog.style.scale = dx < 0 ? "-1 1" : "1 1";
  }, 80);
  stage.addEventListener("click", (event) => {
    const entity = event.target.closest("[data-entity]");
    if (entity) openPanel(entity.dataset.entity);
  });
}

function keepMode(html) {
  if (modeNode) modeNode.innerHTML = html;
}

function packetFor(jobId) {
  return packets.get(jobId);
}

function keepSpawnPacket(job) {
  if (packets.has(job.jobId) || packets.size >= 4) return;
  const node = kEl("kp-packet", { left: "15%", top: "33%" });
  const label = kEl("kp-packet-label", { left: "15%", top: "29.5%" }, esc(short(job.expectedOutput || job.jobId.replace("job-runtime-operator-", ""), 24)));
  const packet = { node, label, x: 15, y: 33 };
  packets.set(job.jobId, packet);
  movePacket(packet, 46, 31.5, 2000);
  keepMode('<span class="ok">●</span> a quest packet moves toward the gate');
}

function movePacket(packet, x, y, ms, done) {
  const startX = packet.x;
  const startY = packet.y;
  const startTime = Date.now();
  const timer = setInterval(() => {
    const k = Math.min(1, (Date.now() - startTime) / ms);
    packet.x = startX + (x - startX) * k;
    packet.y = startY + (y - startY) * k;
    packet.node.style.left = `${packet.x}%`;
    packet.node.style.top = `${packet.y}%`;
    packet.label.style.left = `${packet.x}%`;
    packet.label.style.top = `${packet.y - 3.5}%`;
    if (k >= 1) {
      clearInterval(timer);
      if (done) done();
    }
  }, 30);
}

function keepPacketToGate(job) {
  const packet = packetFor(job.jobId) || (keepSpawnPacket(job), packetFor(job.jobId));
  if (!packet) return;
  movePacket(packet, 46, 31.5, 1200);
  gateTag.textContent = "■ gate: closed";
  gateTag.classList.remove("open");
  keepMode('<span class="warn">▲</span> waiting at the gate — click the gate to decide');
}

function keepPacketToForge(jobId) {
  const packet = packetFor(jobId);
  gateNode.classList.add("open");
  gateTag.textContent = "□ gate: open";
  gateTag.classList.add("open");
  stampNode.classList.add("show");
  setFigMode("codex", "type");
  keepMode('<span class="ok">●</span> stamped — Codex forges the build');
  const closeGate = () => {
    gateNode.classList.remove("open");
    gateTag.textContent = "■ gate: closed";
    gateTag.classList.remove("open");
    stampNode.classList.remove("show");
  };
  if (packet) movePacket(packet, 76, 32, 1600, closeGate);
  else setTimeout(closeGate, 1600);
}

function keepDropRecord() {
  const record = kEl("kp-record", {});
  setTimeout(() => record.remove(), 1300);
}

function keepCompleteJob(jobId) {
  const packet = packetFor(jobId);
  keepDropRecord();
  keepMode('<span class="ok">●</span> deliverable ready · record sealed to the archive');
  if (packet) {
    packet.node.remove();
    packet.label.remove();
    packets.delete(jobId);
  }
}

function keepFailJob(jobId) {
  const packet = packetFor(jobId);
  keepMode('<span class="bad">■</span> a job failed closed — nothing leaked');
  if (packet) {
    packet.node.remove();
    packet.label.remove();
    packets.delete(jobId);
  }
}

function renderKeepData() {
  const jobs = status?.jobs || [];
  const waiting = jobs.filter((job) => job.status === "waiting_approval");
  const running = jobs.filter((job) => job.status === "running");
  const ownerNote = $("#kp-owner-note");
  if (ownerNote) ownerNote.textContent = waiting.length ? `${waiting.length} approval${waiting.length > 1 ? "s" : ""} wait` : "no approvals waiting";
  setFigMode("codex", running.length ? "type" : "idle");
  setFigMode("planner", jobs.some((job) => job.status === "queued") || running.length ? "type" : "idle");
  const budget = findBudget(status);
  const reactor = $("#kp-reactor");
  const reactorLabel = $("#kp-reactor-label");
  if (budget && reactorLabel) {
    reactorLabel.textContent = `claude reactor · ${budget.pct}%`;
    reactor?.classList.toggle("dim", budget.pct >= 100);
  }
  const memory = status?.lessonDecisions;
  const books = $("#kp-books");
  if (memory && books) {
    books.replaceChildren();
    const lit = Math.max(0, Math.min(12, memory.acceptedCount));
    for (let index = 0; index < Math.max(4, lit); index += 1) {
      const book = document.createElement("span");
      book.className = `kp-book${index < lit ? " lit" : ""}`;
      books.appendChild(book);
    }
    $("#kp-books-lbl").textContent = `accepted: ${memory.acceptedCount}`;
    $("#kp-pile-cnt").textContent = `▤×${memory.activeCandidateCount}`;
  }
  if (waiting.length && !gateNode.classList.contains("open")) {
    keepMode('<span class="warn">▲</span> waiting at the gate — click the gate to decide');
    for (const job of waiting) if (!packets.has(job.jobId)) keepSpawnPacket(job);
  }
}

const panel = $("#keep-panel");
const panelTitle = $("#keep-panel-title");
const panelBody = $("#keep-panel-body");
$("#keep-panel-close").addEventListener("click", () => panel.classList.add("os-hidden"));

function showPanel(title, html) {
  panelTitle.textContent = title;
  panelBody.innerHTML = html;
  panel.classList.remove("os-hidden");
}

const BIOS = {
  planner: ["Planner", "planning hall", "planner-processor.mjs + anthropic-planner.mjs", "Drafts bounded plans with quality bars from your commands."],
  intake: ["Intake", "planning hall", "command-intake-processor.mjs", "Classifies every owner command: product type, risk tier, gates."],
  codex: ["Codex — the black warrior", "build forge", "anthropic-worker.mjs + execution adapters", "Forges deliverables through fail-closed adapters. The sword is for scope creep."],
  fable: ["Fable", "library of lessons", "quality scores + plan critiques", "Reviews work against the quality bar. Advisory, never authorizing."],
  gatekeeper: ["Gate", "gatehouse", "job-approval-service.mjs", "Holds every live action until an exact owner approval lock exists."],
  watchdog: ["Watchdog", "perimeter patrol", "internal-watchdog.mjs + integrity workflow", "Patrols continuously. Barks in the audit log; never bites without you."],
  memory: ["Memory — the brain", "library of lessons", "lesson promotion + accepted-lesson loader", "Feeds owner-approved lessons into every future build. Grants no permission."]
};

function jobItemHtml(job, withActions) {
  const [glyph, cls] = glyphFor(job.status);
  const decisions = withActions ? (job.availableDecisions || []) : [];
  const buttons = decisions
    .filter((decision) => ["approve", "reject", "revoke"].includes(decision))
    .map((decision) => `<button type="button" class="${decision}" data-decision="${decision}" data-job="${esc(job.jobId)}">${decision}</button>`)
    .join("");
  return `<div class="item"><div class="ttl"><span class="${cls}">${glyph}</span> ${esc(job.jobId)}</div>
    <div class="sub">${esc(job.status)} · risk ${esc(job.riskLevel || "?")} · adapter ${esc(job.adapter?.adapterId || "local")}</div>
    <div class="sub">${esc(short(job.expectedOutput || "", 90))}</div>
    ${buttons ? `<div class="actions">${buttons}</div>` : ""}</div>`;
}

async function decideJobClick(button) {
  const jobId = button.dataset.job;
  const decision = button.dataset.decision;
  const confirmation = `${decision.toUpperCase()} ${jobId}`;
  if (!window.confirm(`${confirmation}\n\nThis is a real owner decision. Continue?`)) return;
  button.disabled = true;
  try {
    if (demoActive) {
      if (decision === "approve") keepPacketToForge(jobId);
      else keepFailJob(jobId);
      showPanel("gate", '<div class="quiet">demo mode: decision simulated locally, nothing recorded.</div>');
      return;
    }
    await api(`/api/v1/jobs/${encodeURIComponent(jobId)}/decision`, {
      method: "POST",
      body: JSON.stringify({ decision, confirmation })
    });
    showPanel("gate", `<div><span class="ok">✓</span> ${esc(decision)} recorded for ${esc(jobId)}. All adapter gates still apply.</div>`);
    refreshStatus();
  } catch (error) {
    button.disabled = false;
    panelBody.insertAdjacentHTML("beforeend", `<div class="msg">■ ${esc(error.message)}</div>`);
  }
}

async function openLessonsPanel() {
  const memory = demoActive ? status?.lessonDecisions : await api("/api/v1/memory/lessons").catch(() => status?.lessonDecisions);
  lessonQueue = memory;
  if (!memory) return showPanel("library of lessons", '<div class="quiet">no lesson data available</div>');
  const items = (memory.decisions || []).slice(0, 20).map((lesson) => `
    <div class="item"><div class="ttl">${esc(lesson.lessonId)}</div>
    <div class="sub">${esc(lesson.recommendation || "")}${lesson.canPromote === false ? " · blocked by conflict" : ""}</div>
    <div class="actions">
      <button type="button" class="approve" data-lesson="${esc(lesson.lessonId)}" data-ldecision="promote" ${lesson.canPromote === false ? "disabled" : ""}>promote</button>
      <button type="button" class="reject" data-lesson="${esc(lesson.lessonId)}" data-ldecision="reject">reject</button>
    </div></div>`).join("");
  showPanel("library of lessons", `
    <div class="kv"><span class="k">accepted truth</span><span class="ok">${memory.acceptedCount}</span></div>
    <div class="kv"><span class="k">candidates</span><span class="warn">${memory.activeCandidateCount}</span></div>
    <div class="sect">CANDIDATES — YOUR STAMP DECIDES</div>
    ${items || '<div class="quiet">the pile is empty — the keep has learned all it can for now</div>'}`);
}

async function decideLessonClick(button) {
  const lessonId = button.dataset.lesson;
  const decision = button.dataset.ldecision;
  let reason;
  if (decision === "reject") {
    reason = window.prompt(`Why reject ${lessonId}? (recorded in the audit trail)`);
    if (!reason || reason.trim().length < 3) return;
  }
  button.disabled = true;
  try {
    if (demoActive) {
      showPanel("library of lessons", '<div class="quiet">demo mode: decision simulated, nothing recorded.</div>');
      return;
    }
    await api("/api/v1/memory/lessons/decision", {
      method: "POST",
      body: JSON.stringify({ lessonIds: [lessonId], decision, reason })
    });
    await refreshStatus();
    openLessonsPanel();
  } catch (error) {
    button.disabled = false;
    panelBody.insertAdjacentHTML("beforeend", `<div class="msg">■ ${esc(error.message)}</div>`);
  }
}

function openPanel(entity) {
  const jobs = status?.jobs || [];
  if (BIOS[entity]) {
    const [name, room, module, bio] = BIOS[entity];
    const mine = entity === "codex" ? jobs.filter((job) => ["running", "queued"].includes(job.status)) : [];
    showPanel(name, `
      <div class="kv"><span class="k">post</span><span>${esc(room)}</span></div>
      <div class="kv"><span class="k">real module</span><span>${esc(module)}</span></div>
      <div>${esc(bio)}</div>
      ${mine.length ? `<div class="sect">CURRENT WORK</div>${mine.map((job) => jobItemHtml(job, false)).join("")}` : ""}`);
    if (entity === "memory") openLessonsPanel();
    return;
  }
  if (entity === "gate") {
    const waiting = jobs.filter((job) => job.status === "waiting_approval");
    if (!waiting.length) {
      showPanel("the gate", '<div class="quiet">nothing at the gate — all quiet. gates stay closed by default.</div>');
      return;
    }
    showPanel("the gate — owner decision", `
      <div class="sub dim">approving creates a single-use, 1-hour, exact-scope approval lock. every adapter gate still applies.</div>
      ${waiting.map((job) => jobItemHtml(job, true)).join("")}`);
    return;
  }
  if (entity === "owner") {
    const waiting = jobs.filter((job) => job.status === "waiting_approval");
    showPanel("owner — you", waiting.length
      ? `<div class="sect">SCROLLS ON YOUR DESK</div>${waiting.map((job) => jobItemHtml(job, true)).join("")}`
      : '<div class="quiet">your desk is clear. the keep runs itself until something needs your stamp.</div>');
    return;
  }
  if (entity === "lessons") return void openLessonsPanel();
  if (entity === "reactor") {
    const budget = findBudget(status);
    showPanel("claude reactor", budget ? `
      <div class="kv"><span class="k">spent this month</span><span>$${budget.spent.toFixed(2)}</span></div>
      <div class="kv"><span class="k">monthly cap</span><span>$${budget.cap.toFixed(2)}</span></div>
      <div class="kv"><span class="k">fuel used</span><span class="${budget.pct > 80 ? "warn" : "ok"}">${budget.pct}%</span></div>
      <div class="kv"><span class="k">circuit breaker</span><span class="ok">armed</span></div>
      <div class="quiet">every plan and build rents intelligence through this reactor. at the cap, the forge goes dark until you refuel.</div>`
      : '<div class="quiet">no budget data in the status payload</div>');
    return;
  }
  if (entity === "constitution") {
    showPanel("constitution v1.0", `
      <div class="sect">AUTHORITY ORDER</div>
      <div>1. owner (you)</div><div>2. constitution</div><div>3. approval locks</div>
      <div>4. security os</div><div>5. governance · quality · cost os</div>
      <div>6. source-of-truth records</div><div>7. worker recommendations</div>
      <div class="quiet">workers may recommend. only you decide. the keep is built so this stays true even when nobody is watching.</div>`);
    return;
  }
  if (entity === "archive") {
    const recent = jobs.filter((job) => ["done", "failed"].includes(job.status)).slice(0, 10);
    showPanel("the archive", recent.length
      ? `<div class="sect">RECENT SEALED RECORDS</div>${recent.map((job) => jobItemHtml(job, false)).join("")}`
      : '<div class="quiet">the vault is quiet — records appear here as jobs complete.</div>');
  }
}

panelBody.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-decision]");
  if (button) return void decideJobClick(button);
  const lessonButton = event.target.closest("button[data-ldecision]");
  if (lessonButton) return void decideLessonClick(lessonButton);
});

setInterval(() => {
  const caret = $("#os-caret");
  caret.style.opacity = caret.style.opacity === "0" ? "1" : "0";
}, 550);

buildKeep();
setView(activeView);
conLine('<span class="dim">ag-os owner console · type help for local commands · the keep view shows your company live</span>');
refreshStatus();
setInterval(refreshStatus, 5000);
