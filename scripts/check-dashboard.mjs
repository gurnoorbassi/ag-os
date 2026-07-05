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
  "Owner Attention",
  "Project Registry",
  "Projects",
  "Connector Registry",
  "Command Registry",
  "Capability Registry",
  "Capabilities",
  "Client Management",
  "Social Media System v1",
  "Approvals",
  "GitHub / Netlify / n8n",
  "Quality and Review",
  "Costs",
  "Skills",
  "Cost OS",
  "Watchdog OS",
  "Memory OS",
  "Safe Merge"
]) {
  if (!dashboardSource.includes(requiredText)) {
    fail(`dashboard missing required visible section: ${requiredText}`);
  }
}

if (data.systemStatus.bootStatus !== "ready") {
  fail("dashboard control center must show ready boot status from the read model");
}
if (data.systemStatus.safetyPosture !== "read_only_no_live_actions") {
  fail("dashboard control center must show read-only no-live-action safety posture");
}
if (data.capabilityRegistry.provenCount < 1) {
  fail("dashboard control center must show proven capabilities");
}
if (data.capabilityRegistry.blockedCount < 1) {
  fail("dashboard control center must show blocked capabilities");
}
if (data.clientManagement.clientCount !== 0 || data.clientManagement.engagementCount !== 0) {
  fail("dashboard control center must show zero client and engagement counts until real clients are registered");
}
if (data.clientManagement.pendingApprovalCount !== 0) {
  fail("dashboard control center must show zero pending client approvals until client approvals exist");
}
if (data.firstClientReadiness.status !== "intake_needed") {
  fail("dashboard control center must show first client intake-needed status while REQUIRED_ fields remain");
}
if (data.firstClientReadiness.activeClientRecordsCreated !== false) {
  fail("dashboard control center must not claim active first-client records were created");
}
if (data.firstClientReadiness.missingRequiredFieldCount < 1) {
  fail("dashboard control center must show missing first-client fields when placeholders remain");
}
if (data.socialMediaSystem.stagingUrl !== "https://ag-social-media-management-system-staging.netlify.app") {
  fail("dashboard control center must show the recorded Social Media staging URL");
}
if (data.socialMediaSystem.currentVersion !== "v1.1") {
  fail("dashboard control center must show Social Media System v1.1 after the recorded target merge");
}
if (data.socialMediaSystem.targetMergeSha !== "7204846654ef448f6c0c78027a569b7707c618b8") {
  fail("dashboard control center must show the recorded Social Media v1.1 target merge SHA");
}
if (data.socialMediaSystem.latestDeployId !== "6a49ad36a73303e2fa05755f") {
  fail("dashboard control center must show the latest Social Media v1.1 staging deploy ID");
}
if (data.socialMediaSystem.latestDeployHttpStatus !== 200) {
  fail("dashboard control center must show HTTP 200 for the latest Social Media staging deploy proof");
}
if (data.socialMediaSystem.safetyBlocks.livePostingBlocked !== true) {
  fail("dashboard control center must show Social Media live posting blocked");
}
if (data.socialMediaSystem.safetyBlocks.socialOauthConnected !== false) {
  fail("dashboard control center must show Social Media OAuth not connected");
}
if (data.connectorProofs.n8nActiveWorkflowCount !== 0) {
  fail("dashboard control center must not infer active n8n workflows from source records");
}
if (data.qualityReview.candidatesLoadedAsTruth !== false) {
  fail("dashboard control center must keep candidate lessons out of accepted truth");
}
if (data.skills.skillsGrantPermission !== false) {
  fail("dashboard control center must show skillsGrantPermission false");
}
if (data.costs.totalRecordedActualUsd > data.costs.limits.monthlyMaxUsd) {
  fail("dashboard control center must show recorded costs within the monthly budget");
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`FAIL ${failure}`);
  }
  process.exit(1);
}

console.log("Dashboard check passed.");
