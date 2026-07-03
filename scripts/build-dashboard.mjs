import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = process.cwd();

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(root, relativePath), "utf8"));
}

function readText(relativePath) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function lineValue(content, label) {
  const match = content.match(new RegExp(`^${label}:\\s*(.+)$`, "m"));
  return match?.[1]?.trim() ?? "Not recorded";
}

function money(value, currency) {
  return `${currency} $${value}`;
}

function projectBoundary(project) {
  if (project.id === "project-lead-generation-system") {
    return "No source, VPS, Postgres, n8n, domain, DNS, deployment, credential, production data, or customer data changes.";
  }
  if (project.id === "project-ag-digitalz-ai-receptionist") {
    return "Separate product project; no live service status inferred beyond repository records.";
  }
  return project.outOfScope?.[0] ?? "Boundary not recorded.";
}

function projectRecord(entry) {
  const project = readJson(entry.recordPath);
  return {
    id: project.id,
    name: project.name,
    status: project.status,
    managementMode: project.managementMode,
    projectType: project.projectType,
    riskLevel: entry.riskLevel ?? "not_recorded",
    owner: project.owner,
    recordPath: entry.recordPath,
    boundary: projectBoundary(project)
  };
}

export function collectDashboardData() {
  const constitution = readText("docs/ag-os-constitution-v1.md");
  const projectRegistry = readJson(".codex/projects/registry.json");
  const connectorRegistry = readJson(".codex/connectors/registry.json");
  const commandRegistry = readJson(".codex/commands/registry.json");
  const costBudget = readJson(".codex/costs/budget.json");
  const capabilityRegistry = readJson(".codex/capabilities/registry.json");
  const watchdogPolicy = readJson(".codex/watchdog/policy.json");
  const memoryPolicy = readJson(".codex/memory/policy.json");

  const projects = projectRegistry.projects.map(projectRecord);
  const leadGen = projects.find((project) => project.id === "project-lead-generation-system");
  const aiReceptionist = projects.find((project) => project.id === "project-ag-digitalz-ai-receptionist");

  if (!leadGen) {
    throw new Error("Dashboard data missing Lead Generation System project record.");
  }
  if (!aiReceptionist) {
    throw new Error("Dashboard data missing AG Digitalz AI Receptionist project record.");
  }

  return {
    meta: {
      title: "AG OS Dashboard",
      version: 1,
      mode: "read_only",
      dataSource: "source-controlled AG OS repository records",
      generatedBy: "scripts/build-dashboard.mjs"
    },
    constitution: {
      status: lineValue(constitution, "Status"),
      version: "v1.0",
      activationDate: lineValue(constitution, "Activation date").replace(".", ""),
      source: "docs/ag-os-constitution-v1.md"
    },
    projectRegistry: {
      status: projectRegistry.status,
      count: projectRegistry.projects.length,
      source: ".codex/projects/registry.json",
      projects
    },
    leadGenerationSystem: leadGen,
    aiReceptionist,
    connectorRegistry: {
      status: connectorRegistry.status,
      connectedCount: connectorRegistry.connectors.filter((connector) => connector.connectionStatus === "connected").length,
      connectors: connectorRegistry.connectors.map((connector) => `${connector.name}: ${connector.connectionStatus}`)
    },
    commandRegistry: {
      status: commandRegistry.status,
      categoryCount: commandRegistry.categories.length,
      gatedCategories: commandRegistry.categories
        .filter((category) => category.requiresOwnerApproval)
        .map((category) => `${category.id}: approval-gated`)
    },
    costOs: {
      status: costBudget.status,
      monthlyMax: money(costBudget.limits.monthlyMaxUsd, costBudget.currency),
      dailyMax: `Daily max: ${money(costBudget.limits.dailyMaxUsd, costBudget.currency)}`,
      perTaskMax: `Per-task max: ${money(costBudget.limits.perTaskMaxUsd, costBudget.currency)}`,
      paidTools: costBudget.approvalRules.paidToolsRequireOwnerApproval
        ? "Paid tools require owner approval"
        : "Paid tool approval not recorded"
    },
    capabilityRegistry: {
      status: capabilityRegistry.status,
      count: capabilityRegistry.capabilities.length,
      allowedTypes: capabilityRegistry.allowedCapabilityTypes.map((type) => `${type}: allowed foundation type`)
    },
    watchdog: {
      status: watchdogPolicy.status,
      monitoring: watchdogPolicy.defaults.monitoringEnabled ? "Enabled" : "Disabled",
      plannedChecks: watchdogPolicy.plannedCheckTypes.map((type) => `${type}: planned`)
    },
    memoryOs: {
      status: memoryPolicy.status,
      shortTermDays: memoryPolicy.windows.shortTermDays,
      rules: [
        memoryPolicy.rules.secretsAllowed ? "Secrets allowed" : "Secrets blocked",
        memoryPolicy.rules.customerDataAllowed ? "Customer data allowed" : "Customer data blocked",
        memoryPolicy.rules.productionDataAllowed ? "Production data allowed" : "Production data blocked"
      ]
    },
    safeMerge: {
      status: "conditional",
      mode: "Policy-gated",
      summary: "Allowed only after CI, local validation, safety review, clear scope, and no blocked risk conditions.",
      sources: ["docs/safe-merge-policy.md", "docs/action-matrix.md"],
      requiredChecks: [
        "GitHub CI succeeds",
        "npm.cmd run validate passes",
        "No credentials or secrets",
        "No live service connection",
        "No deployment",
        "No domain or DNS change",
        "No production or customer data",
        "No paid action",
        "No risky files",
        "No merge conflict"
      ]
    }
  };
}

export function renderDashboardDataModule(data) {
  return `window.AG_OS_DASHBOARD_DATA = ${JSON.stringify(data, null, 2)};\n`;
}

export function writeDashboardData() {
  const outputPath = path.join(root, "dashboard", "dashboard-data.js");
  const data = collectDashboardData();
  writeFileSync(outputPath, renderDashboardDataModule(data));
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  if (!existsSync(path.join(root, "dashboard"))) {
    throw new Error("dashboard directory is missing.");
  }
  writeDashboardData();
  console.log("Dashboard data generated: dashboard/dashboard-data.js");
}
