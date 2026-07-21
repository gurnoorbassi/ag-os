import { budgetView, jobGlyph, jobTone } from "./ops-model.mjs";

const activity = document.querySelector("#ops-activity");
const braille = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
let spinnerFrame = 0;
let latestStatus = null;
let tickCount = 0;
const bootedAt = Date.now();

function number(value, digits = 0) {
  return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function clock(value = new Date()) {
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(value);
}

function elapsed(seconds) {
  const total = Math.max(0, Math.round(Number(seconds || 0)));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

function line(message, tone = "idle", occurredAt = new Date().toISOString()) {
  const row = document.createElement("p");
  row.dataset.tone = tone;
  const time = document.createElement("time");
  const content = document.createElement("span");
  time.textContent = clock(new Date(occurredAt));
  content.textContent = message;
  row.append(time, content);
  activity.append(row);
  while (activity.childElementCount > 200) activity.firstElementChild.remove();
  activity.scrollTop = activity.scrollHeight;
}

function panel(selector, title, body) {
  const root = document.querySelector(selector);
  root.replaceChildren();
  const header = document.createElement("header");
  const heading = document.createElement("h2");
  heading.textContent = title;
  header.append(heading);
  root.append(header, body);
}

function renderBudget(status) {
  const budget = budgetView(status, window.AG_OS_DASHBOARD_DATA);
  const body = document.createElement("div");
  body.className = "ops-budget";
  const value = document.createElement("strong");
  value.textContent = `$${number(budget.monthlyActualUsd, 2)} / $${number(budget.monthlyMaxUsd, 0)}`;
  const track = document.createElement("div");
  track.className = "ops-meter";
  track.setAttribute("role", "progressbar");
  track.setAttribute("aria-valuenow", String(Math.round(budget.percent)));
  track.setAttribute("aria-valuemin", "0");
  track.setAttribute("aria-valuemax", "100");
  const fill = document.createElement("span");
  fill.style.width = `${budget.percent}%`;
  track.append(fill);
  const detail = document.createElement("p");
  detail.textContent = `${number(budget.callsToday)} / ${number(budget.dailyCallLimit)} calls today · $${number(budget.perTaskMaxUsd, 2)} task cap`;
  const breaker = document.createElement("p");
  breaker.className = budget.breakerArmed ? "ops-ok" : "ops-bad";
  breaker.textContent = budget.breakerArmed ? "● breaker armed" : "■ breaker unavailable";
  body.append(value, track, detail, breaker);
  panel("#ops-budget-panel", "budget", body);
}

function renderJobs(status) {
  const list = document.createElement("ul");
  list.className = "ops-list";
  (status.jobs || []).slice(0, 6).forEach((job) => {
    const item = document.createElement("li");
    item.dataset.tone = jobTone(job.status);
    const glyph = document.createElement("span");
    glyph.textContent = job.status === "running" ? braille[spinnerFrame] : jobGlyph(job.status);
    glyph.dataset.spinner = job.status === "running" ? "true" : "false";
    const label = document.createElement("span");
    label.textContent = `${job.status} · ${job.jobId}`;
    item.append(glyph, label);
    list.append(item);
  });
  if (!list.childElementCount) list.append(Object.assign(document.createElement("li"), { textContent: "○ no jobs" }));
  panel("#ops-jobs-panel", "jobs", list);
}

function renderMemory(status) {
  const memory = status.lessonDecisions || {};
  const body = document.createElement("div");
  body.className = "ops-copy";
  const counts = document.createElement("strong");
  counts.textContent = `${number(memory.acceptedCount)} accepted · ${number(memory.activeCandidateCount)} candidates`;
  const note = document.createElement("p");
  note.textContent = memory.activeCandidateCount > 0 ? "▲ owner review required" : "● all lessons decided";
  note.className = memory.activeCandidateCount > 0 ? "ops-warn" : "ops-ok";
  body.append(counts, note);
  panel("#ops-memory-panel", "memory", body);
}

function renderConnectors(status) {
  const list = document.createElement("ul");
  list.className = "ops-list";
  const adapters = status.automation?.adapters || [];
  if (adapters.length) {
    adapters.slice(0, 6).forEach((adapter) => {
      const item = document.createElement("li");
      item.dataset.tone = adapter.executionReady ? "ok" : "idle";
      item.textContent = `${adapter.executionReady ? "●" : "○"} ${adapter.name || adapter.adapterId}`;
      list.append(item);
    });
  } else {
    (window.AG_OS_DASHBOARD_DATA?.connectorRegistry?.connectors || []).forEach((connector) => {
      const item = document.createElement("li");
      item.dataset.tone = connector.includes("connected") ? "ok" : "idle";
      item.textContent = `${connector.includes("connected") ? "●" : "○"} ${connector}`;
      list.append(item);
    });
  }
  panel("#ops-connectors-panel", "connectors", list);
}

function render(status) {
  latestStatus = status;
  tickCount += 1;
  document.querySelector("#ops-uptime").textContent = `uptime ${elapsed(status.uptimeSeconds ?? (Date.now() - bootedAt) / 1000)}`;
  document.querySelector("#ops-automation").textContent = `automation ${status.automation?.enabled === false ? "off" : "on"}`;
  document.querySelector("#ops-tick").textContent = `tick ${number(tickCount)}`;
  renderBudget(status);
  renderJobs(status);
  renderMemory(status);
  renderConnectors(status);
}

window.addEventListener("agos:status", (event) => {
  if (!latestStatus) line("● authenticated runtime connected", "ok");
  render(event.detail);
});
window.addEventListener("agos:status-error", () => line("▲ owner sign-in required for live Ops data", "warn"));
window.addEventListener("agos:event", (event) => {
  const record = event.detail;
  const tone = record.status === "failed" || record.status === "budget_blocked" ? "bad" : record.status === "waiting_approval" ? "warn" : "ok";
  line(`${jobGlyph(record.status)} ${record.summary || record.type}`, tone, record.occurredAt);
  document.querySelector("#ops-stream-state").textContent = "live";
});

window.setInterval(() => {
  document.querySelector("#ops-clock").textContent = clock();
  spinnerFrame = (spinnerFrame + 1) % braille.length;
  document.querySelectorAll("[data-spinner='true']").forEach((node) => { node.textContent = braille[spinnerFrame]; });
}, 120);
document.querySelector("#ops-clock").textContent = clock();
if (window.AGOS.latestStatus) render(window.AGOS.latestStatus);
