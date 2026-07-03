const data = window.AG_OS_DASHBOARD_DATA;

function statusClass(value) {
  const normalized = String(value).toLowerCase();
  if (normalized.includes("active")) return "status-active";
  if (normalized.includes("complete")) return "status-complete";
  if (normalized.includes("connected")) return "status-connected";
  if (normalized.includes("allowed")) return "status-allowed";
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

function renderOverview() {
  const root = document.querySelector("#overview-grid");
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
    })
  );
}

function renderProjects() {
  const tbody = document.querySelector("#projects-table");
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
  const root = document.querySelector("#registry-grid");
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
      detail: "Future capabilities remain approval-gated",
      meta: data.capabilityRegistry.allowedTypes
    })
  );
}

function renderOperatingSystems() {
  const root = document.querySelector("#os-grid");
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
    })
  );
}

function renderSafeMerge() {
  const root = document.querySelector("#safe-merge-panel");
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
renderProjects();
renderRegistries();
renderOperatingSystems();
renderSafeMerge();
