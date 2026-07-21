import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { collectDashboardData } from "./build-dashboard.mjs";

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
  "dashboard/shell.js",
  "dashboard/console.js"
]) {
  requireFile(relativePath);
}

const data = collectDashboardData();

if (data.meta.mode !== "read_only") {
  fail("dashboard mode must be read_only");
}
if (data.constitution.status !== "Active Constitution v1.0.") {
  fail("dashboard must show active Constitution v1.0 status");
}
if (data.projectRegistry.status !== "active") {
  fail("dashboard must show active Project Registry status");
}
const ownerProjectIds = data.projectRegistry.projects.map((project) => project.id);
if (JSON.stringify(ownerProjectIds) !== JSON.stringify(["project-quote-builder", "project-ai-lead-command-center"])) {
  fail("dashboard must expose exactly Quote Builder and AI Lead Command Center as owner projects");
}
for (const project of data.projectRegistry.projects) {
  if (project.status !== "active" || !project.ownerWorkspace?.liveUrl || !project.ownerWorkspace?.operations?.length) {
    fail(`owner project must be active and operationally structured: ${project.id}`);
  }
}

const index = existsSync(path.join(root, "dashboard/index.html")) ? read("dashboard/index.html") : "";
const app = existsSync(path.join(root, "dashboard/app.js")) ? read("dashboard/app.js") : "";
const shell = existsSync(path.join(root, "dashboard/shell.js")) ? read("dashboard/shell.js") : "";
const consoleView = existsSync(path.join(root, "dashboard/console.js")) ? read("dashboard/console.js") : "";
const styles = existsSync(path.join(root, "dashboard/styles.css")) ? read("dashboard/styles.css") : "";
const dashboardSource = `${index}\n${app}\n${shell}\n${consoleView}`;

for (const view of ["console", "ops", "keep", "dash"]) {
  if (!new RegExp(`data-os-view=["']${view}["']`).test(index) ||
      !new RegExp(`data-os-view-button=["']${view}["']`).test(index)) {
    fail(`owner shell must expose a structural surface and switch control for: ${view}`);
  }
}
if (!/views\.has\(value\)/.test(shell) || !/history\.replaceState\([^\n]+#\$\{next\}/.test(shell)) {
  fail("owner shell view selection must be allowlisted and persisted in the URL hash");
}

for (const requiredInterfacePattern of [
  /color-scheme:\s*dark/,
  /data-dashboard-view="home"/,
  /data-dashboard-view="projects"/,
  /data-dashboard-view="work"/,
  /data-dashboard-view="intelligence"/,
  /data-dashboard-view="system"/
]) {
  if (!requiredInterfacePattern.test(`${dashboardSource}\n${styles}`)) {
    fail(`dashboard navigation or dark-theme invariant missing: ${requiredInterfacePattern}`);
  }
}

const expectedDashboardViews = new Set(["home", "projects", "work", "intelligence", "system"]);
const navigationControls = [...index.matchAll(/<button\b[^>]*data-dashboard-view="([^"]+)"[^>]*>([\s\S]*?)<\/button>/gi)]
  .map((match) => ({ view: match[1], label: match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() }));
for (const view of expectedDashboardViews) {
  const controls = navigationControls.filter((control) => control.view === view);
  if (controls.length === 0 || controls.some((control) => control.label.length === 0)) {
    fail(`dashboard navigation must expose a non-empty control label for view: ${view}`);
  }
}

for (const forbiddenPattern of [
  /contenteditable/i,
  /XMLHttpRequest/,
  /navigator\.sendBeacon/,
  /\blocalStorage\b/,
  /type=["']file["']/i,
  /<button[^>]*>\s*(?:deploy|merge|publish|post|send|spend|change\s+dns)/i
]) {
  if (forbiddenPattern.test(dashboardSource)) {
    fail(`dashboard operator-safety check failed for pattern: ${forbiddenPattern}`);
  }
}

const interactiveLabels = [...dashboardSource.matchAll(/<(button|a)\b[^>]*>([\s\S]*?)<\/\1>/gi)]
  .map((match) => match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
if (interactiveLabels.some((label) => /\b(?:buy|purchase|subscribe)\b/i.test(label))) {
  fail("dashboard operator-safety check forbids purchase actions in interactive controls");
}

for (const requiredOperatorPattern of [
  /id="owner-command-form"/,
  /id="owner-password"[^>]*type="password"/,
  /id="owner-token"[^>]*type="password"/,
  /id="worker-routing-help"/,
  /dataset\.projectId = "project-one-off"/,
  /\/api\/v1\/jobs\/\$\{encodeURIComponent\(job\.jobId\)\}\/deliverable/,
  /credentials:\s*"include"/,
  /\/api\/v1\/auth\/login/,
  /authorization:\s*`Bearer \$\{token\}`/,
  /\/api\/v1\/commands/,
  /No live side effect was executed/
]) {
  if (!requiredOperatorPattern.test(dashboardSource)) {
    fail(`dashboard authenticated operator console missing invariant: ${requiredOperatorPattern}`);
  }
}

for (const requiredText of [
  "Constitution",
  "Ask AG OS to build or operate something",
  "Activation Center",
  "Owner Attention",
  "Dashboard Action Queue",
  "Project Registry",
  "Your projects",
  "Connector Registry",
  "Command Registry",
  "Capability Registry",
  "Capabilities",
  "Client Management",
  "Social Media System v1",
  "Production Social Posting",
  "Approvals",
  "GitHub / Netlify / n8n",
  "Quality and Review",
  "Unified Memory Learning",
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

for (const forbiddenOwnerUx of [
  "Auto-detect from command",
  "Create a new workspace",
  "Level 2 - reviewed staging"
]) {
  if (dashboardSource.includes(forbiddenOwnerUx)) {
    fail(`dashboard must not expose legacy or staging owner UX: ${forbiddenOwnerUx}`);
  }
}

for (const liveUrl of ["https://foreman-quote-studio.netlify.app/", "https://app.agdigitalz.net/"]) {
  if (!JSON.stringify(data.projectRegistry.projects).includes(liveUrl)) {
    fail(`dashboard owner project missing verified live URL: ${liveUrl}`);
  }
}

if (data.systemStatus.bootStatus !== "ready") {
  fail("dashboard control center must show ready boot status from the read model");
}
if (data.systemStatus.safetyPosture !== "read_only_no_live_actions") {
  fail("dashboard control center must show read-only no-live-action safety posture");
}
if (data.dashboardActionQueue.mode !== "read_only") {
  fail("dashboard action queue must remain read_only");
}
if (data.dashboardActionQueue.blockedActionCount < 1) {
  fail("dashboard action queue must surface blocked live actions");
}
if (data.dashboardActionQueue.approvalPackageCount < 1) {
  fail("dashboard action queue must surface approval package templates");
}
if (typeof data.dashboardActionQueue.manualPostingAvailable !== "boolean") {
  fail("dashboard action queue must report manual posting availability as a boolean");
}
if (typeof data.dashboardActionQueue.oauthBlockedReason !== "string" || data.dashboardActionQueue.oauthBlockedReason.length === 0) {
  fail("dashboard action queue must explain why OAuth is blocked");
}
if (typeof data.dashboardActionQueue.credentialStoreMissingReason !== "string" || data.dashboardActionQueue.credentialStoreMissingReason.length === 0) {
  fail("dashboard action queue must explain the credential-store decision state");
}
if (data.capabilityRegistry.provenCount < 1) {
  fail("dashboard control center must show proven capabilities");
}
if (data.capabilityRegistry.blockedCount < 1) {
  fail("dashboard control center must show protected capability boundaries");
}
if (data.capabilityRegistry.availableNowCount + data.capabilityRegistry.approvalGatedCount !== data.capabilityRegistry.provenCount) {
  fail("dashboard must classify every proven capability as available now or approval-gated");
}
if (data.commandRegistry.status !== "active" || data.commandRegistry.localCategories.length < 1) {
  fail("dashboard must show the active command router and its local-safe categories");
}
if (data.skills.activeCount < 1 || data.skills.skills.some((skill) => !skill.procedure.length || !skill.qualityChecklist.length)) {
  fail("dashboard must expose active skills with their procedures and quality checklists");
}
if (data.watchdog.status !== "configured" || !data.watchdog.monitoring.includes("60-second")) {
  fail("dashboard must show the configured built-in watchdog without fabricating a live heartbeat");
}
if (data.safeMerge.mergeExecuted !== false || data.safeMerge.invalidCount !== 0) {
  fail("safe merge dashboard state must be valid and must never claim that the checker executed a merge");
}
// --- Growth-safe invariants --------------------------------------------
// These checks verify correctness rules that stay true as the business
// grows. Adding a legitimate client, engagement, deliverable, or content
// sprint must never require editing this file. Safety rules stay exact.

function requireCount(label, actual, options = {}) {
  if (!Number.isInteger(actual) || actual < 0) {
    fail(`${label} must be a non-negative integer, got ${actual}`);
    return;
  }
  if (options.min !== undefined && actual < options.min) {
    fail(`${label} must be at least ${options.min}, got ${actual}`);
  }
  if (options.max !== undefined && actual > options.max) {
    fail(`${label} must be at most ${options.max}, got ${actual}`);
  }
  if (options.equals !== undefined && actual !== options.equals) {
    fail(`${label} must equal ${options.equals}, got ${actual}`);
  }
}

function listRecordFiles(relativeDir) {
  const absolute = path.join(root, relativeDir);
  if (!existsSync(absolute)) {
    return [];
  }
  return readdirSync(absolute).filter((name) => name.endsWith(".json"));
}

const cm = data.clientManagement;

// Dashboard counts must match the records on disk exactly: no record shown
// that does not exist, no record on disk missing from the dashboard.
requireCount("clientManagement.clientCount", cm.clientCount, {
  min: 1,
  equals: listRecordFiles(".codex/client-management/clients").length
});
requireCount("clientManagement.engagementCount", cm.engagementCount, {
  min: 1,
  equals: listRecordFiles(".codex/client-management/engagements").length
});
requireCount("clientManagement.deliverableCount", cm.deliverableCount, {
  equals: listRecordFiles(".codex/client-management/deliverables").length
});
requireCount("clientManagement.accessRequestCount", cm.accessRequestCount, {
  equals: listRecordFiles(".codex/client-management/access-requests").length
});
const pendingApprovalsOnDisk = listRecordFiles(".codex/client-management/approvals")
  .map((name) => JSON.parse(read(`.codex/client-management/approvals/${name}`)))
  .filter((approval) => approval.status === "pending").length;
requireCount("clientManagement.pendingApprovalCount", cm.pendingApprovalCount, {
  equals: pendingApprovalsOnDisk
});
for (const client of cm.clients) {
  if (!client.clientId || !client.clientName) {
    fail("every dashboard client must carry a clientId and clientName");
  }
}
if (!cm.clients.some((client) => client.clientName === "AG Digitalz")) {
  fail("dashboard control center must include the AG Digitalz internal client record");
}
if (data.firstClientReadiness.activeClientRecordsCreated !== true) {
  fail("dashboard control center must show active first-client records were created");
}
if (data.firstClientReadiness.missingRequiredFieldCount !== 0) {
  fail("dashboard control center must show no missing required fields in registered client records");
}
if (typeof data.firstClientReadiness.status !== "string" || data.firstClientReadiness.status.length === 0) {
  fail("dashboard control center must show a first-client readiness status");
}
if (!/^https:\/\/[a-z0-9-]+\.netlify\.app$/.test(data.socialMediaSystem.stagingUrl) ||
  !data.socialMediaSystem.stagingUrl.includes("staging")) {
  fail("dashboard control center must show a staging-only Netlify URL for the Social Media system");
}
if (typeof data.socialMediaSystem.currentVersion !== "string" || data.socialMediaSystem.currentVersion.length === 0) {
  fail("dashboard control center must show the recorded Social Media System version state");
}
const sprint = data.socialMediaSystem.contentSprint;
if (typeof sprint.sprintId !== "string" || !sprint.sprintId.startsWith("content-sprint-")) {
  fail("dashboard control center must show a content sprint record id");
}
requireCount("contentSprint.draftPostPackageCount", sprint.draftPostPackageCount);
requireCount("contentSprint.weeklyReportDraftCount", sprint.weeklyReportDraftCount);
requireCount("contentSprint.pendingDraftApprovalCount", sprint.pendingDraftApprovalCount);
requireCount("contentSprint.postsReviewedCount", sprint.postsReviewedCount);
requireCount("contentSprint.postsRevisedCount", sprint.postsRevisedCount);
requireCount("contentSprint.needsRevisionCount", sprint.needsRevisionCount);
requireCount("contentSprint.blockedByMissingProofCount", sprint.blockedByMissingProofCount);
requireCount("contentSprint.blockedByMissingHandleCount", sprint.blockedByMissingHandleCount);
requireCount("contentSprint.approvedDraftCount", sprint.approvedDraftCount, {
  max: sprint.draftPostPackageCount
});
requireCount("contentSprint.ownerApprovedDraftCount", sprint.ownerApprovedDraftCount, {
  max: sprint.draftPostPackageCount
});
if (sprint.ownerApprovedDraftCount > sprint.approvedDraftCount) {
  fail("owner-approved draft count cannot exceed reviewed approved draft count");
}
if (typeof sprint.weeklyReportApprovalStatus !== "string" || sprint.weeklyReportApprovalStatus.length === 0) {
  fail("dashboard control center must show a weekly report approval status");
}
for (const platform of sprint.platforms) {
  if (platform.handleStatus === "public_handle_provided") {
    if (typeof platform.handle !== "string" || !platform.handle.startsWith("@")) {
      fail(`platform ${platform.platform} claims a public handle but does not carry one`);
    }
  } else if (platform.handleStatus === "pending_owner_input") {
    if (platform.handle !== "not_provided") {
      fail(`platform ${platform.platform} is pending owner input but carries a handle`);
    }
  } else {
    fail(`platform ${platform.platform} has unknown handleStatus: ${platform.handleStatus}`);
  }
}
if (sprint.socialOauthConnected !== false ||
  sprint.credentialsStored !== false ||
  sprint.analyticsApiUsed !== false ||
  sprint.n8nActivated !== false) {
  fail("dashboard control center must show content sprint live integrations blocked");
}
const hasStagingDeployProof = data.socialMediaSystem.sourceRecords.some((recordPath) =>
  recordPath.startsWith(".codex/connectors/connector-exec-") &&
  recordPath.includes("netlify-staging") &&
  recordPath.endsWith("-live-result.json"));
if (!hasStagingDeployProof) {
  fail("dashboard control center must cite at least one Netlify staging deploy proof record");
}
if (typeof data.socialMediaSystem.latestDeployId !== "string" ||
  !/^[a-z0-9]{12,}$/.test(data.socialMediaSystem.latestDeployId)) {
  fail("dashboard control center must show the latest recorded Social Media staging deploy ID");
}
if (data.socialMediaSystem.latestDeployHttpStatus < 200 || data.socialMediaSystem.latestDeployHttpStatus > 299) {
  fail("dashboard control center must show a successful HTTP status for the latest staging deploy proof");
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
if (!data.socialPosting || data.socialPosting.status !== "archived") {
  fail("dashboard control center must preserve the archived Production Social Posting read model as inactive history");
}
if (data.socialPosting.targetHandle !== "@agdigitalz") {
  fail("dashboard control center must show @agdigitalz as the Instagram posting target handle");
}
if (data.socialPosting.accountState !== "access_requested") {
  fail("dashboard control center must show Instagram account access_requested until OAuth is approved and completed");
}
if (data.socialPosting.oauthStatus !== "ready_after_approval") {
  fail("dashboard control center must show Instagram OAuth ready_after_approval before execution approval");
}
if (data.socialPosting.credentialRefId !== "credential-ref-instagram-agdigitalz-oauth") {
  fail("dashboard control center must show the Instagram OAuth credential reference id");
}
if (data.socialPosting.credentialStoreReadiness !== "reference_ready") {
  fail("dashboard control center must show credential reference readiness for Instagram OAuth");
}
if (data.socialPosting.credentialReferenceSecretStoredInRepo !== false ||
  data.socialPosting.credentialReferenceRepoSafe !== true) {
  fail("dashboard control center must show the Instagram credential reference is repo-safe and stores no secret");
}
if (data.socialPosting.oauthPreflightStatus !== "blocked") {
  fail("dashboard control center must show Instagram OAuth preflight blocked until final approval and connector path");
}
if (!data.socialPosting.oauthPreflightBlockedReasons.includes("final_owner_approval_missing") ||
  !data.socialPosting.oauthPreflightBlockedReasons.includes("social_oauth_connector_missing")) {
  fail("dashboard control center must show Instagram OAuth final approval and connector path blockers");
}
if (data.socialPosting.credentialsStoredInRepo !== false) {
  fail("dashboard control center must show credentials are not stored in repo");
}
if (data.socialPosting.livePostingBlocked !== true ||
  data.socialPosting.schedulingBlocked !== true ||
  data.socialPosting.analyticsBlocked !== true ||
  data.socialPosting.dmCommentsBlocked !== true ||
  data.socialPosting.n8nActivationBlocked !== true) {
  fail("dashboard control center must show all production social actions blocked by default");
}
if (data.socialPosting.approvedDraftPostsCount !== sprint.ownerApprovedDraftCount) {
  fail("dashboard control center social posting approved-draft count must match the content sprint");
}
if (data.socialPosting.weeklyReportApprovalStatus !== sprint.weeklyReportApprovalStatus) {
  fail("dashboard control center social posting weekly report status must match the content sprint");
}
if (data.socialPosting.postsReadyForPublishApproval !== 0) {
  fail("dashboard control center must not show posts ready for publish approval before exact post records exist");
}
if (!data.socialPosting.blockedPublishReasons.includes("exact_single_post_publish_approval_missing")) {
  fail("dashboard control center must show exact single-post publish approval missing");
}
if (!data.socialPosting.blockedPublishReasons.includes("oauth_not_executed")) {
  fail("dashboard control center must show OAuth has not been executed");
}
if (data.socialPosting.productionReadiness?.activationAllowed !== false ||
  data.socialPosting.productionReadiness?.status !== "archived" ||
  data.socialPosting.productionReadiness?.permissionGrantedByReadiness !== false) {
  fail("dashboard must show archived production readiness as inactive and non-authorizing");
}
if (data.socialPosting.permissionModel.oauthDoesNotAuthorizePosting !== true ||
  data.socialPosting.permissionModel.connectedDraftOnlyDoesNotAuthorizePosting !== true ||
  data.socialPosting.permissionModel.draftApprovalDoesNotAuthorizePosting !== true ||
  data.socialPosting.permissionModel.memoryCanGrantPermission !== false ||
  data.socialPosting.permissionModel.skillsCanGrantPermission !== false ||
  data.socialPosting.permissionModel.candidateLessonsCanGrantPermission !== false) {
  fail("dashboard control center must show OAuth, drafts, memory, and skills cannot grant posting permission");
}
if (data.ownerAttention.some((item) => item.id === "instagram-oauth-execution-needed")) {
  fail("dashboard control center must not surface archived Instagram OAuth work as active owner attention");
}
if (data.ownerAttention.some((item) => item.id === "manual-posting-available")) {
  fail("dashboard control center must not surface archived manual posting work as active owner attention");
}
if (data.connectorProofs.n8nActiveWorkflowCount !== 0) {
  fail("dashboard control center must not infer active n8n workflows from source records");
}
if (data.qualityReview.candidatesLoadedAsTruth !== false) {
  fail("dashboard control center must keep candidate lessons out of accepted truth");
}
if (!data.unifiedMemory || data.unifiedMemory.status !== "active") {
  fail("dashboard control center must show active unified memory registry status");
}
if (data.unifiedMemory.candidatesLoadedAsTruth !== false) {
  fail("dashboard control center must keep unified memory candidatesLoadedAsTruth false");
}
if (data.unifiedMemory.rejectedLoadedAsTruth !== false) {
  fail("dashboard control center must keep rejected lessons out of runtime truth");
}
if (data.unifiedMemory.memoryGrantsPermission !== false) {
  fail("dashboard control center must show memoryGrantsPermission false");
}
if (data.unifiedMemory.skillsGrantPermission !== false) {
  fail("dashboard control center must show unified memory skillsGrantPermission false");
}
if (data.unifiedMemory.acceptedLessonsLoadedByRuntime !== true) {
  fail("dashboard control center must show accepted lessons are runtime-loadable");
}
if (data.unifiedMemory.candidateCount + data.unifiedMemory.acceptedCount + data.unifiedMemory.rejectedCount < data.qualityReview.candidateLessonCount) {
  fail("dashboard control center unified memory must account for pending and decided lesson candidates");
}
if (data.skills.skillsGrantPermission !== false) {
  fail("dashboard control center must show skillsGrantPermission false");
}
if (data.costs.totalRecordedActualUsd > data.costs.limits.monthlyMaxUsd) {
  fail("dashboard control center must show recorded costs within the monthly budget");
}
if (data.metrics?.status !== "computed_from_source_records" || data.metrics?.generatedFromLiveSystems !== false) {
  fail("dashboard operational metrics must be computed from source-controlled records only");
}
if (!data.metrics?.cost || !data.metrics?.quality || !data.metrics?.rework || !data.metrics?.lessonReuse) {
  fail("dashboard must include cost, quality, rework, and lesson-reuse metrics");
}
if (data.metrics.lessonReuse.acceptedLessonCount === 0 && data.metrics.lessonReuse.lessonReuseRatePercent !== 0) {
  fail("dashboard must report truthful zero lesson reuse when no accepted lessons exist");
}
if (data.approvals.standingCount < 1 || data.approvals.standingApprovals.length !== data.approvals.standingCount) {
  fail("dashboard control center must show every active scoped standing approval");
}
if (data.approvals.standingApprovals.some((approval) =>
  approval.revocableImmediately !== true ||
  !Number.isInteger(approval.maxUses) ||
  !Number.isInteger(approval.remainingUses) ||
  approval.remainingUses < 0 ||
  approval.remainingUses > approval.maxUses)) {
  fail("dashboard control center standing approvals must show valid remaining uses and immediate revocation");
}
const codexDraftPrApproval = data.approvals.standingApprovals.find((approval) => approval.approvalId === "approval-20260709-ag-os-codex-draft-pr-standing");
if (codexDraftPrApproval?.maxUses !== 10) {
  fail("dashboard control center must preserve the Codex draft PR standing approval usage limit");
}
const anthropicPlanningApproval = data.approvals.standingApprovals.find((approval) => approval.approvalId === "approval-20260712-anthropic-planning");
if (anthropicPlanningApproval?.maxUses !== 20 || anthropicPlanningApproval?.budget?.maxUsd !== 0.25) {
  fail("dashboard control center must show the Anthropic planning approval use and cost limits");
}
if (data.dashboardActionQueue.approvalBatch?.mode !== "read_only" ||
  data.dashboardActionQueue.approvalBatch?.writeActionsAllowed !== false ||
  data.dashboardActionQueue.approvalBatch?.batchApprovalGrantsPermission !== false) {
  fail("dashboard batched approval review must remain read-only and non-authorizing");
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`FAIL ${failure}`);
  }
  process.exit(1);
}

console.log("Dashboard check passed.");
