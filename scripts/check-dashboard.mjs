import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { collectDashboardData, renderDashboardDataModule } from "./build-dashboard.mjs";

const root = process.cwd();
const failures = [];

function fail(message) {
  failures.push(message);
}

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function requireFile(relativePath) {
  if (!existsSync(path.join(root, relativePath))) {
    fail(`missing dashboard file: ${relativePath}`);
  }
}

for (const relativePath of [
  "dashboard/index.html",
  "dashboard/styles.css",
  "dashboard/app.js",
  "dashboard/dashboard-data.js"
]) {
  requireFile(relativePath);
}

const data = collectDashboardData();
const expectedDataModule = renderDashboardDataModule(data);
const actualDataModule = existsSync(path.join(root, "dashboard/dashboard-data.js"))
  ? read("dashboard/dashboard-data.js")
  : "";

if (actualDataModule !== expectedDataModule) {
  fail("dashboard/dashboard-data.js is stale; run npm.cmd run dashboard:build");
}

if (data.meta.mode !== "read_only") {
  fail("dashboard mode must be read_only");
}
if (data.constitution.status !== "Active Constitution v1.0.") {
  fail("dashboard must show active Constitution v1.0 status");
}
if (data.projectRegistry.status !== "active") {
  fail("dashboard must show active Project Registry status");
}
if (data.leadGenerationSystem.status !== "complete" || data.leadGenerationSystem.managementMode !== "observe_only") {
  fail("dashboard must show Lead Generation System as complete and observe_only");
}
if (data.aiReceptionist.status !== "active" || data.aiReceptionist.managementMode !== "active_build") {
  fail("dashboard must show AI Receptionist as active and active_build");
}

const index = existsSync(path.join(root, "dashboard/index.html")) ? read("dashboard/index.html") : "";
const app = existsSync(path.join(root, "dashboard/app.js")) ? read("dashboard/app.js") : "";
const dashboardSource = `${index}\n${app}`;

for (const forbiddenPattern of [
  /<button\b/i,
  /<form\b/i,
  /<input\b/i,
  /<textarea\b/i,
  /contenteditable/i,
  /\bfetch\s*\(/,
  /XMLHttpRequest/,
  /navigator\.sendBeacon/,
  /\blocalStorage\b/,
  /\bsessionStorage\b/
]) {
  if (forbiddenPattern.test(dashboardSource)) {
    fail(`dashboard read-only check failed for pattern: ${forbiddenPattern}`);
  }
}

for (const requiredText of [
  "Constitution",
  "Project Registry",
  "Projects",
  "Connector Registry",
  "Command Registry",
  "Capability Registry",
  "Cost OS",
  "Watchdog OS",
  "Memory OS",
  "Safe Merge"
]) {
  if (!dashboardSource.includes(requiredText)) {
    fail(`dashboard missing required visible section: ${requiredText}`);
  }
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`FAIL ${failure}`);
  }
  process.exit(1);
}

console.log("Dashboard check passed.");
