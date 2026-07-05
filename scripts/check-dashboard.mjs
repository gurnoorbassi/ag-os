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
if (data.clientManagement.clientCount !== 1 || data.clientManagement.engagementCount !== 1) {
  fail("dashboard control center must show the first registered client and engagement");
}
if (data.clientManagement.deliverableCount !== 6) {
  fail("dashboard control center must show six AG Digitalz deliverables");
}
if (data.clientManagement.accessRequestCount !== 4) {
  fail("dashboard control center must show four AG Digitalz social access requests");
}
if (data.clientManagement.pendingApprovalCount !== 2) {
  fail("dashboard control center must show two remaining pending AG Digitalz client approvals");
}
if (data.clientManagement.clients[0]?.clientName !== "AG Digitalz") {
  fail("dashboard control center must show AG Digitalz as the first registered client");
}
if (data.firstClientReadiness.status !== "active_draft_configured") {
  fail("dashboard control center must show first client active draft configured status");
}
if (data.firstClientReadiness.activeClientRecordsCreated !== true) {
  fail("dashboard control center must show active first-client records were created");
}
if (data.firstClientReadiness.missingRequiredFieldCount !== 0) {
  fail("dashboard control center must show no missing fields for the registered AG Digitalz client records");
}
if (data.socialMediaSystem.stagingUrl !== "https://ag-social-media-management-system-staging.netlify.app") {
  fail("dashboard control center must show the recorded Social Media staging URL");
}
if (!["v1.2", "v1.3 draft PR", "v1.3", "v1.4 draft PR", "v1.4 reviewed PR", "v1.4", "v1.5 owner-approved drafts", "v1.6 interactive draft UI"].includes(data.socialMediaSystem.currentVersion)) {
  fail("dashboard control center must show the recorded Social Media System version state");
}
if (data.socialMediaSystem.currentVersion === "v1.2" && data.socialMediaSystem.targetMergeSha !== "6f54d3b5b257c2662319f39c0b89f810e22289e5") {
  fail("dashboard control center must show the recorded Social Media AG Digitalz target merge SHA");
}
if (data.socialMediaSystem.contentSprint.sprintId !== "content-sprint-ag-digitalz-first-content-sprint-v1") {
  fail("dashboard control center must show AG Digitalz First Content Sprint v1");
}
if (data.socialMediaSystem.contentSprint.draftPostPackageCount !== 21) {
  fail("dashboard control center must show 21 draft post packages");
}
if (data.socialMediaSystem.contentSprint.weeklyReportDraftCount !== 1) {
  fail("dashboard control center must show one weekly report draft");
}
if (data.socialMediaSystem.contentSprint.pendingDraftApprovalCount !== 0) {
  fail("dashboard control center must show no pending draft approvals after owner draft approval");
}
if (["v1.4 draft PR", "v1.4 reviewed PR", "v1.4", "v1.5 owner-approved drafts", "v1.6 interactive draft UI"].includes(data.socialMediaSystem.currentVersion) &&
  (data.socialMediaSystem.contentSprint.postsReviewedCount !== 21 ||
    data.socialMediaSystem.contentSprint.postsRevisedCount !== 21 ||
    data.socialMediaSystem.contentSprint.approvedDraftCount !== 21 ||
    data.socialMediaSystem.contentSprint.needsRevisionCount !== 0 ||
    data.socialMediaSystem.contentSprint.blockedByMissingProofCount !== 0 ||
    data.socialMediaSystem.contentSprint.blockedByMissingHandleCount !== 0)) {
  fail("dashboard control center must show content review counts for the v1.4 draft PR");
}
if (data.socialMediaSystem.contentSprint.ownerApprovedDraftCount !== 21) {
  fail("dashboard control center must show 21 owner-approved draft post packages");
}
if (data.socialMediaSystem.contentSprint.weeklyReportApprovalStatus !== "owner_approved_draft") {
  fail("dashboard control center must show the weekly report approved as draft content");
}
if (data.socialMediaSystem.contentSprint.platforms.some((platform) => platform.handle !== "not_provided" || platform.handleStatus !== "pending_owner_input")) {
  fail("dashboard control center must keep official social handles pending owner input");
}
if (data.socialMediaSystem.contentSprint.socialOauthConnected !== false ||
  data.socialMediaSystem.contentSprint.credentialsStored !== false ||
  data.socialMediaSystem.contentSprint.analyticsApiUsed !== false ||
  data.socialMediaSystem.contentSprint.n8nActivated !== false) {
  fail("dashboard control center must show content sprint live integrations blocked");
}
const hasAgDigitalzRedeployRecord = data.socialMediaSystem.sourceRecords.includes(
  ".codex/connectors/connector-exec-20260704-ag-digitalz-netlify-staging-redeploy-live-result.json"
);
const hasAgDigitalzFirstContentSprintDeployRecord = data.socialMediaSystem.sourceRecords.includes(
  ".codex/connectors/connector-exec-20260704-ag-digitalz-first-content-sprint-netlify-staging-live-result.json"
);
const hasAgDigitalzContentReviewDeployRecord = data.socialMediaSystem.sourceRecords.includes(
  ".codex/connectors/connector-exec-20260704-ag-digitalz-content-review-netlify-staging-live-result.json"
);
const hasAgDigitalzDraftApprovalDeployRecord = data.socialMediaSystem.sourceRecords.includes(
  ".codex/connectors/connector-exec-20260704-ag-digitalz-draft-approval-netlify-staging-live-result.json"
);
const hasInteractiveDraftUiDeployRecord = data.socialMediaSystem.sourceRecords.includes(
  ".codex/connectors/connector-exec-20260705-social-media-interactive-draft-ui-netlify-staging-live-result.json"
);
const expectedSocialMediaDeployId = hasInteractiveDraftUiDeployRecord
  ? "6a4a0caed37d0800a1f19a0d"
  : hasAgDigitalzDraftApprovalDeployRecord
  ? "6a49fc6c75a309fb314ffb9d"
  : hasAgDigitalzContentReviewDeployRecord
  ? "6a49f1d33942a79f4190240c"
  : hasAgDigitalzFirstContentSprintDeployRecord
  ? "6a49e480fbe8fbbb83b933dc"
  : hasAgDigitalzRedeployRecord
  ? "6a49bd1932f7ae16701ece3f"
  : "6a49ad36a73303e2fa05755f";
if (data.socialMediaSystem.latestDeployId !== expectedSocialMediaDeployId) {
  fail("dashboard control center must show the latest available Social Media staging deploy ID");
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
if (data.socialMediaSystem.safetyBlocks.clientConfigAdded !== true) {
  fail("dashboard control center must show Social Media client config added after AG Digitalz records are registered");
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
