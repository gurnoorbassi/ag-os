import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const now = new Date();
const checks = [];

function addCheck(checkId, status, evidence, required = true) {
  checks.push({ checkId, status, required, evidence });
}

function readText(relativePath) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function listDirectJson(relativeDir, options = {}) {
  const absoluteDir = path.join(root, relativeDir);
  if (!existsSync(absoluteDir)) {
    return [];
  }

  const excluded = new Set(options.exclude ?? []);
  return readdirSync(absoluteDir)
    .filter((name) => name.endsWith(".json"))
    .filter((name) => !name.endsWith(".template.json"))
    .filter((name) => !excluded.has(name))
    .map((name) => path.join(relativeDir, name).replaceAll("\\", "/"));
}

function runLocalNodeScript(relativePath) {
  return spawnSync(process.execPath, [relativePath], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
}

function checkConstitution() {
  const constitutionPath = "docs/ag-os-constitution-v1.md";
  if (!existsSync(path.join(root, constitutionPath))) {
    addCheck("constitution-status", "failed", `${constitutionPath} is missing`);
    return;
  }

  const constitution = readText(constitutionPath);
  const active = constitution.includes("Status: Active Constitution v1.0.") &&
    constitution.includes("This file activates Constitution v1.0 as the canonical operating contract.");
  addCheck(
    "constitution-status",
    active ? "pass" : "failed",
    active ? "Constitution v1.0 is active." : "Constitution v1.0 active markers are missing."
  );
}

function checkProjectRegistry() {
  const registry = readJson(".codex/projects/registry.json");
  const projectRecordsExist = (registry.projects ?? []).every((project) => existsSync(path.join(root, project.recordPath)));
  const projectsKnown = (registry.projects ?? []).length > 0;
  addCheck(
    "project-registry",
    registry.status === "active" && projectsKnown && projectRecordsExist ? "pass" : "failed",
    `${registry.projects?.length ?? 0} project registry entries checked.`
  );
}

function checkConnectorRegistry() {
  const registry = readJson(".codex/connectors/registry.json");
  const connectorIds = new Set((registry.connectors ?? []).map((connector) => connector.id));
  const requiredConnectors = ["connector-github-mcp", "connector-n8n-mcp", "connector-netlify-mcp"];
  const allPresent = requiredConnectors.every((connectorId) => connectorIds.has(connectorId));
  addCheck(
    "connector-registry",
    allPresent ? "pass" : "failed",
    allPresent ? "Required connected connector records are present." : "One or more required connector records are missing."
  );
}

function checkCommandRegistry() {
  const registry = readJson(".codex/commands/registry.json");
  const categories = new Set((registry.categories ?? []).map((category) => category.id));
  const requiredCategories = ["plan_only", "build", "deploy_staging", "deploy_production", "connect_service", "change_domain"];
  const allPresent = requiredCategories.every((category) => categories.has(category));
  addCheck(
    "command-registry",
    allPresent ? "pass" : "failed",
    `${registry.categories?.length ?? 0} command categories checked.`
  );
}

function checkCapabilityRegistry() {
  const registry = readJson(".codex/capabilities/registry.json");
  const rulesReady = registry.rules?.ownerApprovalRequiredForLiveActions === true &&
    registry.rules?.ownerApprovalRequiredForPaidActions === true;
  addCheck(
    "capability-registry",
    rulesReady ? "pass" : "failed",
    rulesReady ? "Capability registry safety rules are present." : "Capability registry safety rules are incomplete."
  );
}

function checkOwnerRecord() {
  const owners = listDirectJson(".codex/owners");
  const activeOwners = owners
    .map((ownerPath) => readJson(ownerPath))
    .filter((owner) => owner.status === "active" && owner.authorityLevel === "final");
  addCheck(
    "owner-record",
    activeOwners.length > 0 ? "pass" : "failed",
    `${activeOwners.length} active final owner record(s) found.`
  );
}

function checkValidationStatus() {
  const foundation = runLocalNodeScript("scripts/validate-foundation.mjs");
  const dashboard = runLocalNodeScript("scripts/check-dashboard.mjs");
  const passed = foundation.status === 0 && dashboard.status === 0;
  addCheck(
    "validation-status",
    passed ? "pass" : "failed",
    passed ? "Local foundation and dashboard checks passed." : "Local validation failed; run npm.cmd run validate for details."
  );
}

function checkCostBudget() {
  const budget = readJson(".codex/costs/budget.json");
  const limitsReady = budget.limits?.monthlyMaxUsd === 50 &&
    budget.limits?.dailyMaxUsd === 10 &&
    budget.limits?.perTaskMaxUsd === 5;
  const defaultBlocksReady = budget.defaultRestrictions?.credentialsAllowed === false &&
    budget.defaultRestrictions?.deploymentsAllowedByDefault === false &&
    budget.defaultRestrictions?.paidActionsAllowedByDefault === false;
  addCheck(
    "cost-budget",
    limitsReady && defaultBlocksReady ? "pass" : "failed",
    "Cost budget limits and default restrictions checked."
  );
}

function listQualityScorePaths() {
  return listDirectJson(".codex/quality-scores")
    .filter((scorePath) => path.basename(scorePath).startsWith("quality-score-"));
}

function listCritiquePaths() {
  return listDirectJson(".codex/critiques")
    .filter((critiquePath) => path.basename(critiquePath).startsWith("critique-"));
}

function listLessonCandidatePaths() {
  return listDirectJson(".codex/memory/lessons/candidates")
    .filter((lessonPath) => path.basename(lessonPath).startsWith("lesson-"));
}

function checkQualityScores() {
  const qualityScoreDir = ".codex/quality-scores";
  const directoryExists = existsSync(path.join(root, qualityScoreDir));
  const scoreCount = directoryExists ? listQualityScorePaths().length : 0;

  addCheck(
    "quality-scores",
    directoryExists ? "pass" : "failed",
    directoryExists
      ? `Quality score directory exists with ${scoreCount} source-controlled score record(s).`
      : "Quality score directory is missing."
  );
}

function checkCritiques() {
  const critiqueDir = ".codex/critiques";
  const directoryExists = existsSync(path.join(root, critiqueDir));
  const critiqueCount = directoryExists ? listCritiquePaths().length : 0;

  addCheck(
    "plan-critiques",
    directoryExists ? "pass" : "failed",
    directoryExists
      ? `Critique directory exists with ${critiqueCount} source-controlled critique record(s).`
      : "Critique directory is missing."
  );
}

function checkActiveIncidents() {
  const incidents = listDirectJson(".codex/incidents");
  if (incidents.length === 0) {
    addCheck("active-incidents", "pass", "No active incident records found.");
    return;
  }

  const blockingIncidents = incidents
    .map((incidentPath) => readJson(incidentPath))
    .filter((incident) => !["resolved", "closed", "archived"].includes(incident.status));
  addCheck(
    "active-incidents",
    blockingIncidents.length === 0 ? "pass" : "failed",
    `${blockingIncidents.length} blocking incident record(s) found.`
  );
}

function checkActiveApprovals() {
  const approvals = listDirectJson(".codex/approvals");
  if (approvals.length === 0) {
    addCheck("active-approvals", "pass", "No active approval lock records found.");
    return;
  }

  const invalidApprovals = approvals
    .map((approvalPath) => readJson(approvalPath))
    .filter((approval) => approval.status !== "approved");
  addCheck(
    "active-approvals",
    invalidApprovals.length === 0 ? "pass" : "failed",
    `${approvals.length} approval lock record(s) checked.`
  );
}

function checkStaleLocks() {
  const lockPaths = [
    ...listDirectJson(".codex/approvals"),
    ...listDirectJson(".codex/locks")
  ];

  const staleLocks = lockPaths
    .map((lockPath) => ({ lockPath, record: readJson(lockPath) }))
    .filter(({ record }) => {
      if (!record.expiresAt) {
        return false;
      }
      return new Date(record.expiresAt) < now && !["expired", "revoked", "cancelled", "closed", "archived"].includes(record.status);
    });

  addCheck(
    "stale-locks",
    staleLocks.length === 0 ? "pass" : "failed",
    `${staleLocks.length} stale lock record(s) found.`
  );
}

checkConstitution();
checkProjectRegistry();
checkConnectorRegistry();
checkCommandRegistry();
checkCapabilityRegistry();
checkOwnerRecord();
checkValidationStatus();
checkCostBudget();
checkQualityScores();
checkCritiques();
checkActiveIncidents();
checkActiveApprovals();
checkStaleLocks();

// Worker briefing: offline context assembled from source-controlled records
// only. This is intelligence delivery, not authorization. No live calls.
function buildWorkerBriefing() {
  const budget = readJson(".codex/costs/budget.json");

  const preferencesPath = ".codex/owners/preferences/owner-preferences.json";
  const ownerPreferences = existsSync(path.join(root, preferencesPath))
    ? readJson(preferencesPath)
    : null;

  const archetypes = listDirectJson(".codex/archetypes").map((archetypePath) => {
    const archetype = readJson(archetypePath);
    return { archetypeId: archetype.archetypeId, name: archetype.name, category: archetype.category, status: archetype.status };
  });

  const acceptedLessons = listDirectJson(".codex/memory/lessons").map((lessonPath) => {
    const lesson = readJson(lessonPath);
    return { lessonId: lesson.lessonId, title: lesson.title, scope: lesson.scope, status: lesson.status };
  });

  const lessonCandidateSummaries = listLessonCandidatePaths()
    .map((lessonPath) => ({ lessonPath, lesson: readJson(lessonPath) }))
    .map(({ lessonPath, lesson }) => ({
      lessonId: lesson.lessonId,
      title: lesson.title,
      scope: lesson.scope,
      status: lesson.status,
      updatedAt: lesson.updatedAt,
      lessonPath
    }))
    .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)));

  const skillSummaries = listDirectJson(".codex/skills").map((skillPath) => {
    const skill = readJson(skillPath);
    return { id: skill.id, name: skill.name, category: skill.category, status: skill.status, skillPath };
  });
  const activeSkills = skillSummaries.filter((skill) => skill.status === "active");
  const skillLibrary = {
    directoryExists: existsSync(path.join(root, ".codex/skills")),
    count: skillSummaries.length,
    activeCount: activeSkills.length,
    draftCount: skillSummaries.filter((skill) => skill.status === "draft").length,
    deprecatedCount: skillSummaries.filter((skill) => skill.status === "deprecated").length,
    skillsGrantPermission: false
  };

  const activeApprovals = listDirectJson(".codex/approvals").map((approvalPath) => {
    const approval = readJson(approvalPath);
    return { approvalId: approval.approvalId, status: approval.status, expiresAt: approval.expiresAt ?? null };
  });

  const connectorRegistry = readJson(".codex/connectors/registry.json");
  const connectorStatus = (connectorRegistry.connectors ?? []).map((connector) => ({
    id: connector.id,
    connectionStatus: connector.connectionStatus
  }));

  const qualityScorePaths = listQualityScorePaths();
  const qualityScoreSummaries = qualityScorePaths
    .map((scorePath) => ({ scorePath, score: readJson(scorePath) }))
    .map(({ scorePath, score }) => ({
      scoreId: score.scoreId,
      scoreType: score.scoreType ?? null,
      status: score.status ?? null,
      projectId: score.projectId,
      archetypeId: score.archetypeId,
      outputType: score.outputType,
      overallScore: score.overallScore,
      meetsBar: score.meetsBar,
      reviewStatus: score.reviewStatus ?? null,
      updatedAt: score.updatedAt,
      scorePath
    }))
    .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)));
  const qualityScores = {
    directoryExists: existsSync(path.join(root, ".codex/quality-scores")),
    count: qualityScoreSummaries.length,
    acceptedActiveCount: qualityScoreSummaries.length,
    latest: qualityScoreSummaries[0] ?? null
  };

  const critiqueSummaries = listCritiquePaths()
    .map((critiquePath) => ({ critiquePath, critique: readJson(critiquePath) }))
    .map(({ critiquePath, critique }) => ({
      critiqueId: critique.critiqueId,
      sourcePlanId: critique.sourcePlanId,
      archetypeId: critique.archetypeId,
      reviewStatus: critique.reviewStatus,
      blocksBuildMode: critique.blocksBuildMode,
      findingCount: critique.findings?.length ?? 0,
      requiredFixCount: critique.requiredFixes?.length ?? 0,
      createdAt: critique.createdAt,
      critiquePath
    }))
    .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
  const reviewRequiredCritiques = critiqueSummaries.filter((critique) => critique.blocksBuildMode || critique.reviewStatus === "review" || critique.reviewStatus === "fail");
  const failedCritiques = critiqueSummaries.filter((critique) => critique.reviewStatus === "fail");
  const critiques = {
    directoryExists: existsSync(path.join(root, ".codex/critiques")),
    count: critiqueSummaries.length,
    latest: critiqueSummaries[0] ?? null,
    reviewRequiredCount: reviewRequiredCritiques.length,
    failedCount: failedCritiques.length,
    reviewRequired: reviewRequiredCritiques,
    failed: failedCritiques,
    critiqueIsApproval: false
  };

  const lessonMemory = {
    acceptedCount: acceptedLessons.length,
    candidateCount: lessonCandidateSummaries.length,
    latestCandidate: lessonCandidateSummaries[0] ?? null,
    candidatesLoadedAsTruth: false
  };

  const countActive = (relativeDir) => listDirectJson(relativeDir).length;
  const engineStatus = {
    activeCommandIntakes: listDirectJson(".codex/commands", { exclude: ["registry.json"] }).length,
    activeJobs: countActive(".codex/jobs"),
    activePlans: countActive(".codex/plans"),
    activeRoutes: countActive(".codex/router"),
    activeExecutionSteps: countActive(".codex/execution"),
    bootRuns: countActive(".codex/boot")
  };

  return {
    constitutionStatus: checks.find((check) => check.checkId === "constitution-status")?.status ?? "unknown",
    repoHealth: checks.every((check) => !check.required || check.status === "pass") ? "healthy" : "blocked",
    budget: budget.limits ?? null,
    ownerPreferences,
    archetypes,
    acceptedLessons,
    lessonMemory,
    activeSkills,
    skillLibrary,
    activeApprovals,
    connectorStatus,
    qualityScores,
    critiques,
    blockers: checks.filter((check) => check.required && check.status !== "pass").map((check) => check.checkId),
    engineStatus
  };
}

const failedRequiredChecks = checks.filter((check) => check.required && check.status !== "pass");
const report = {
  bootCheck: "offline",
  status: failedRequiredChecks.length === 0 ? "ready" : "blocked",
  generatedAt: now.toISOString(),
  checks,
  briefing: buildWorkerBriefing(),
  safety: {
    liveCalls: false,
    credentialAccess: false,
    connectorActions: false,
    deployments: false,
    paidActions: false
  }
};

console.log(JSON.stringify(report, null, 2));

if (failedRequiredChecks.length > 0) {
  process.exit(1);
}
