import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "..");
const fixedNodeArgs = ["scripts/validate-foundation.mjs"];

function runValidator(cwd) {
  const result = spawnSync(process.execPath, fixedNodeArgs, {
    cwd,
    encoding: "utf8"
  });
  return {
    status: result.status,
    output: `${result.stdout || ""}${result.stderr || ""}`
  };
}

function runBootCheck(cwd) {
  const result = spawnSync(process.execPath, ["scripts/boot-check.mjs"], {
    cwd,
    encoding: "utf8"
  });
  return {
    status: result.status,
    output: `${result.stdout || ""}${result.stderr || ""}`
  };
}

function runDashboardBuild(cwd) {
  const result = spawnSync(process.execPath, ["scripts/build-dashboard.mjs"], {
    cwd,
    encoding: "utf8"
  });
  return {
    status: result.status,
    output: `${result.stdout || ""}${result.stderr || ""}`
  };
}

function copyTrackedRepo() {
  const root = mkdtempSync(path.join(os.tmpdir(), "ag-os-validator-"));
  const tracked = execFileSync("git", ["ls-files", "-z"], {
    cwd: repoRoot,
    encoding: "utf8"
  }).split("\0").filter(Boolean);

  for (const relativePath of tracked) {
    const source = path.join(repoRoot, relativePath);
    const target = path.join(root, relativePath);
    mkdirSync(path.dirname(target), { recursive: true });
    cpSync(source, target);
  }

  return root;
}

function readJson(root, relativePath) {
  return JSON.parse(readFileSync(path.join(root, relativePath), "utf8"));
}

function writeJson(root, relativePath, value) {
  writeFileSync(path.join(root, relativePath), `${JSON.stringify(value, null, 2)}\n`);
}

function ensureQualityScoresFoundation(root) {
  const directory = path.join(root, ".codex/quality-scores");
  mkdirSync(directory, { recursive: true });
  const readmePath = path.join(directory, "README.md");
  if (!existsSync(readmePath)) {
    writeFileSync(readmePath, "# Quality Scores\n");
  }
}

function ensureCritiquesFoundation(root) {
  const directory = path.join(root, ".codex/critiques");
  mkdirSync(directory, { recursive: true });
  const readmePath = path.join(directory, "README.md");
  if (!existsSync(readmePath)) {
    writeFileSync(readmePath, "# Critiques\n");
  }
}

function clearJsonRecords(root, relativeDir, prefix) {
  const directory = path.join(root, relativeDir);
  if (!existsSync(directory)) {
    return;
  }

  for (const name of readdirSync(directory)) {
    if (!name.endsWith(".json")) {
      continue;
    }
    if (prefix && !name.startsWith(prefix)) {
      continue;
    }
    rmSync(path.join(directory, name), { force: true });
  }
}

function clearQualityScoreRecords(root) {
  clearJsonRecords(root, ".codex/quality-scores", "quality-score-");
}

function clearCritiqueRecords(root) {
  clearJsonRecords(root, ".codex/critiques", "critique-");
}

function clearLessonCandidateRecords(root) {
  clearJsonRecords(root, ".codex/memory/lessons/candidates", "lesson-");
}

function withTempRepo(assertion) {
  const root = copyTrackedRepo();
  try {
    return assertion(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("validator succeeds on current valid repo state", () => {
  const result = runValidator(repoRoot);

  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /Foundation validation passed\./);
});

test("validator fails when a required field is missing", () => withTempRepo((root) => {
  const recordPath = ".codex/connectors/registry.json";
  const registry = readJson(root, recordPath);
  delete registry.status;
  writeJson(root, recordPath, registry);

  const result = runValidator(root);

  assert.notEqual(result.status, 0);
  assert.match(result.output, /missing required field: status/);
}));

test("validator blocks new completed jobs without mechanical learning evidence", () => withTempRepo((root) => {
  const recordPath = ".codex/jobs/job-runtime-quality-loop-crm-20260704.json";
  const job = readJson(root, recordPath);
  job.status = "done";
  job.queueTimestamps.completedAt = "2026-07-10T00:00:00.000Z";
  job.updatedAt = "2026-07-10T00:00:00.000Z";
  writeJson(root, recordPath, job);

  const result = runValidator(root);

  assert.notEqual(result.status, 0);
  assert.match(result.output, /completed after the job completion policy activation but has no completionEvidence/);
}));

test("validator blocks completed jobs whose learning evidence paths do not exist", () => withTempRepo((root) => {
  const recordPath = ".codex/jobs/job-runtime-quality-loop-crm-20260704.json";
  const job = readJson(root, recordPath);
  job.status = "done";
  job.queueTimestamps.completedAt = "2026-07-10T00:00:00.000Z";
  job.updatedAt = "2026-07-10T00:00:00.000Z";
  job.completionEvidence = {
    policyVersion: 1,
    qualityScorePath: ".codex/quality-scores/quality-score-missing.json",
    lessonCandidatePaths: [
      ".codex/memory/lessons/candidates/lesson-missing-01.json"
    ],
    generatedBy: "scripts/lib/runtime/job-completion-processor.mjs"
  };
  writeJson(root, recordPath, job);

  const result = runValidator(root);

  assert.notEqual(result.status, 0);
  assert.match(result.output, /completion evidence does not exist/);
}));

test("validator fails when a schema enum value is wrong", () => withTempRepo((root) => {
  const recordPath = ".codex/connectors/registry.json";
  const registry = readJson(root, recordPath);
  registry.status = "unsupported";
  writeJson(root, recordPath, registry);

  const result = runValidator(root);

  assert.notEqual(result.status, 0);
  assert.match(result.output, /status must use a schema enum value/);
}));

test("validator fails when additionalProperties false is violated", () => withTempRepo((root) => {
  const recordPath = ".codex/connectors/registry.json";
  const registry = readJson(root, recordPath);
  registry.unexpectedField = true;
  writeJson(root, recordPath, registry);

  const result = runValidator(root);

  assert.notEqual(result.status, 0);
  assert.match(result.output, /includes field not allowed by schema: unexpectedField/);
}));

test("validator fails on an invalid active archetype record", () => withTempRepo((root) => {
  const recordPath = ".codex/archetypes/crm-system.json";
  const archetype = readJson(root, recordPath);
  archetype.status = "unsupported";
  writeJson(root, recordPath, archetype);

  const result = runValidator(root);

  assert.notEqual(result.status, 0);
  assert.match(result.output, /crm-system\.json\.status must use a schema enum value/);
}));

test("validator fails on an invalid owner preference record", () => withTempRepo((root) => {
  const recordPath = ".codex/owners/preferences/owner-preferences.json";
  const preferences = readJson(root, recordPath);
  preferences.preferences[0].category = "unsupported";
  writeJson(root, recordPath, preferences);

  const result = runValidator(root);

  assert.notEqual(result.status, 0);
  assert.match(result.output, /owner-preferences\.json\.preferences\[0\]\.category must use a schema enum value/);
}));

test("validator fails when a credential reference tries to store a secret in repo", () => withTempRepo((root) => {
  const recordPath = ".codex/credentials/credential-ref-instagram-oauth.json";
  mkdirSync(path.dirname(path.join(root, recordPath)), { recursive: true });
  writeJson(root, recordPath, {
    "$schema": "../../schemas/credential-reference.schema.json",
    credentialRefId: "credential-ref-instagram-oauth",
    provider: "instagram",
    purpose: "future_connected_draft_only_oauth",
    storageBackend: "future_secure_connector_credential_store",
    secretValueStoredInRepo: true,
    repoSafe: true,
    ownerApprovalRequired: true,
    rotationPolicy: "Rotate immediately on suspected exposure and at owner-approved cadence.",
    revocationPolicy: "Owner can revoke by disconnecting the provider credential and marking the reference revoked.",
    auditRequirement: "Audit event required for create, use, rotation, and revocation.",
    allowedConnectors: ["connector-future-social-oauth"],
    prohibitedUses: ["post_content", "schedule_content", "use_analytics_api"]
  });

  const result = runValidator(root);

  assert.notEqual(result.status, 0);
  assert.match(result.output, /credential-ref-instagram-oauth\.json\.secretValueStoredInRepo must be false/);
}));

test("validator fails when a credential reference contains token material", () => withTempRepo((root) => {
  const recordPath = ".codex/credentials/credential-ref-instagram-oauth.json";
  mkdirSync(path.dirname(path.join(root, recordPath)), { recursive: true });
  writeJson(root, recordPath, {
    "$schema": "../../schemas/credential-reference.schema.json",
    credentialRefId: "credential-ref-instagram-oauth",
    status: "approved_reference",
    provider: "instagram",
    purpose: "future_connected_draft_only_oauth",
    storageBackend: "future_secure_connector_credential_store",
    secretValueStoredInRepo: false,
    repoSafe: true,
    ownerApprovalRequired: true,
    rotationPolicy: "Rotate immediately on suspected exposure and at owner-approved cadence.",
    revocationPolicy: "Owner can revoke by disconnecting the provider credential and marking the reference revoked.",
    auditRequirement: "Audit event required for create, use, rotation, and revocation.",
    allowedConnectors: ["connector-future-social-oauth"],
    prohibitedUses: ["post_content", "schedule_content", "use_analytics_api"],
    notes: "access_token abcdefghijklmnopqrstuvwxyz"
  });

  const result = runValidator(root);

  assert.notEqual(result.status, 0);
  assert.match(result.output, /credential reference must not contain credential or token material/);
}));

test("validator fails when a lesson candidate uses an invalid candidate status", () => withTempRepo((root) => {
  const recordPath = ".codex/memory/lessons/candidates/lesson-20260703-github-repo-creation-gates.json";
  const lesson = readJson(root, recordPath);
  lesson.status = "accepted";
  writeJson(root, recordPath, lesson);

  const result = runValidator(root);

  assert.notEqual(result.status, 0);
  assert.match(result.output, /status must be one of: candidate, rejected/);
}));

test("validator exits nonzero when a temp record is invalid JSON", () => withTempRepo((root) => {
  writeFileSync(path.join(root, ".codex/connectors/registry.json"), "{ invalid json\n");

  const result = runValidator(root);

  assert.notEqual(result.status, 0);
  assert.match(result.output, /connector registry could not be validated/);
}));

test("validator accepts current tracked runtime records in an isolated copy", () => withTempRepo((root) => {
  const result = runValidator(root);

  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /Foundation validation passed\./);
}));

test("validator fails on an invalid cost ledger runtime record", () => withTempRepo((root) => {
  const recordPath = ".codex/costs/cost-ledger-runtime-construction-website-automated-20260703.json";
  const costLedger = readJson(root, recordPath);
  delete costLedger.summary.budgetStatus;
  writeJson(root, recordPath, costLedger);

  const result = runValidator(root);

  assert.notEqual(result.status, 0);
  assert.match(result.output, /cost-ledger-runtime-construction-website-automated-20260703\.json\.summary missing required field: budgetStatus/);
}));

test("validator fails on an invalid connector execution runtime record", () => withTempRepo((root) => {
  const recordPath = ".codex/connectors/connector-exec-runtime-github-construction-website-repo-20260703-create-repo.json";
  const connectorExecution = readJson(root, recordPath);
  connectorExecution.status = "unsupported";
  writeJson(root, recordPath, connectorExecution);

  const result = runValidator(root);

  assert.notEqual(result.status, 0);
  assert.match(result.output, /connector-exec-runtime-github-construction-website-repo-20260703-create-repo\.json\.status must use a schema enum value/);
}));

test("validator fails on an invalid GitHub execution plan runtime record", () => withTempRepo((root) => {
  const recordPath = ".codex/github/github-plan-runtime-github-construction-website-repo-20260703.json";
  const githubPlan = readJson(root, recordPath);
  githubPlan.plannedActions = [];
  writeJson(root, recordPath, githubPlan);

  const result = runValidator(root);

  assert.notEqual(result.status, 0);
  assert.match(result.output, /github-plan-runtime-github-construction-website-repo-20260703\.json\.plannedActions must include at least 1 item/);
}));

test("validator fails on an invalid GitHub MCP execution gate runtime record", () => withTempRepo((root) => {
  const recordPath = ".codex/github/github-mcp-gate-runtime-github-construction-website-repo-20260703.json";
  const githubGate = readJson(root, recordPath);
  githubGate.mode = "unsupported";
  writeJson(root, recordPath, githubGate);

  const result = runValidator(root);

  assert.notEqual(result.status, 0);
  assert.match(result.output, /github-mcp-gate-runtime-github-construction-website-repo-20260703\.json\.mode must be "execution_gate_only"/);
}));

test("validator allows an empty quality-score directory", () => withTempRepo((root) => {
  ensureQualityScoresFoundation(root);
  clearQualityScoreRecords(root);

  const result = runValidator(root);

  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /no active quality score records found in \.codex\/quality-scores/);
}));

test("validator fails on an invalid quality-score record", () => withTempRepo((root) => {
  ensureQualityScoresFoundation(root);
  writeJson(root, ".codex/quality-scores/quality-score-invalid.json", {
    "$schema": "../../schemas/quality-score.schema.json",
    "scoreId": "quality-score-invalid"
  });

  const result = runValidator(root);

  assert.notEqual(result.status, 0);
  assert.match(result.output, /quality-score-invalid\.json missing required field: projectId/);
}));

test("validator accepts a generated plan quality-score record", () => withTempRepo((root) => {
  ensureQualityScoresFoundation(root);
  writeJson(root, ".codex/quality-scores/quality-score-20260704-crm-plan-quality.json", {
    "$schema": "../../schemas/quality-score.schema.json",
    scoreId: "quality-score-20260704-crm-plan-quality",
    status: "candidate",
    scoreType: "plan_quality_score",
    projectId: "project-unregistered-crm",
    planId: "plan-crm-quality-test",
    sourcePlanPath: ".codex/plans/plan-crm-quality-test.json",
    outputType: "crm",
    archetypeId: "archetype-crm",
    archetypeFile: ".codex/archetypes/crm-system.json",
    checklistItemsEvaluated: [
      "Core entities, statuses, required fields, and transitions are validated."
    ],
    dimensions: {
      completeness: 9,
      craft: 9,
      maintainability: 9,
      ux: 7,
      security: 10,
      performance: 7,
      ownerAcceptance: 8,
      archetypeFit: 10,
      costDiscipline: 10
    },
    overallScore: 8.8,
    meetsBar: true,
    reviewStatus: "review",
    improvementRecommendations: [
      "Carry archetype UX expectations into the next plan artifact before build mode."
    ],
    lessonCandidates: [],
    evidence: [
      ".codex/plans/plan-crm-quality-test.json"
    ],
    generatedBy: "scripts/process-quality-score.mjs",
    limitations: [
      "No product output was provided; this is a plan quality only score."
    ],
    notes: "Candidate score only.",
    createdAt: "2026-07-04T08:00:00.000Z",
    updatedAt: "2026-07-04T08:00:00.000Z"
  });

  const result = runValidator(root);

  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /quality score active record structurally valid: \.codex\/quality-scores\/quality-score-20260704-crm-plan-quality\.json/);
}));

test("validator allows an empty critique directory", () => withTempRepo((root) => {
  ensureCritiquesFoundation(root);
  clearCritiqueRecords(root);

  const result = runValidator(root);

  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /no active plan critique records found in \.codex\/critiques/);
}));

test("validator fails on an invalid plan critique record", () => withTempRepo((root) => {
  ensureCritiquesFoundation(root);
  writeJson(root, ".codex/critiques/critique-invalid.json", {
    "$schema": "../../schemas/plan-critique.schema.json",
    critiqueId: "critique-invalid"
  });

  const result = runValidator(root);

  assert.notEqual(result.status, 0);
  assert.match(result.output, /critique-invalid\.json missing required field: sourcePlanId/);
}));

test("validator accepts a generated plan critique record", () => withTempRepo((root) => {
  ensureCritiquesFoundation(root);
  writeJson(root, ".codex/critiques/critique-20260704-crm-plan-quality.json", {
    "$schema": "../../schemas/plan-critique.schema.json",
    critiqueId: "critique-20260704-crm-plan-quality",
    sourcePlanId: "plan-crm-quality-test",
    sourcePlanPath: ".codex/plans/plan-crm-quality-test.json",
    archetypeId: "archetype-crm",
    archetypeFile: ".codex/archetypes/crm-system.json",
    reviewerType: "critic_worker",
    authority: "advisory_only",
    reviewStatus: "review",
    blocksBuildMode: true,
    findings: [
      {
        findingId: "finding-assumptions-missing",
        severity: "medium",
        category: "assumptions",
        message: "Plan assumptions are not explicit.",
        evidence: [
          ".codex/plans/plan-crm-quality-test.json"
        ],
        requiredFix: "Add explicit assumptions before build mode."
      }
    ],
    requiredFixes: [
      "Add explicit assumptions before build mode."
    ],
    optionalImprovements: [
      "Keep critique as advisory input until owner review."
    ],
    evidence: [
      ".codex/plans/plan-crm-quality-test.json"
    ],
    generatedBy: "scripts/process-plan-critique.mjs",
    limitations: [
      "Critic output is advisory and cannot approve live actions."
    ],
    createdAt: "2026-07-04T09:00:00.000Z"
  });

  const result = runValidator(root);

  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /plan critique active record structurally valid: \.codex\/critiques\/critique-20260704-crm-plan-quality\.json/);
}));

test("validator accepts a generated lesson candidate with candidate-only metadata", () => withTempRepo((root) => {
  writeJson(root, ".codex/memory/lessons/candidates/lesson-20260704-crm-plan-quality-01.json", {
    "$schema": "../../../../schemas/lesson.schema.json",
    lessonId: "lesson-20260704-crm-plan-quality-01",
    title: "Improve low quality dimensions for archetype-crm",
    lesson: "When a plan quality score has below-bar dimensions, keep the work in plan-only review and strengthen the weak dimensions before build mode.",
    sources: [
      ".codex/quality-scores/quality-score-20260704-crm-plan-quality.json",
      ".codex/plans/plan-crm-quality-test.json"
    ],
    scope: "agent_shared",
    confidence: "medium",
    status: "candidate",
    owner: "owner-gurnoor-bassi",
    projectId: "project-unregistered-crm",
    appliesTo: [
      "archetype-crm",
      "plan_quality_score"
    ],
    sourceScoreId: "quality-score-20260704-crm-plan-quality",
    generatedBy: "scripts/process-lesson-candidates.mjs",
    whyThisMatters: "Quality OS should turn weak score evidence into specific planning work.",
    whenToUse: "Use when a quality score has one or more dimensions below 8/10.",
    whenNotToUse: "Do not use as authority to approve execution or live connectors.",
    notes: "Candidate only.",
    createdAt: "2026-07-04T08:05:00.000Z",
    updatedAt: "2026-07-04T08:05:00.000Z"
  });

  const result = runValidator(root);

  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /lesson candidate active record structurally valid: \.codex\/memory\/lessons\/candidates\/lesson-20260704-crm-plan-quality-01\.json/);
}));

test("boot check remains ready when no quality-score records exist", () => withTempRepo((root) => {
  ensureQualityScoresFoundation(root);
  clearQualityScoreRecords(root);
  const build = runDashboardBuild(root);
  assert.equal(build.status, 0, build.output);

  const result = runBootCheck(root);

  assert.equal(result.status, 0, result.output);
  const report = JSON.parse(result.output);
  assert.equal(report.status, "ready");
  assert.equal(report.briefing.qualityScores.directoryExists, true);
  assert.equal(report.briefing.qualityScores.acceptedActiveCount, 0);
  assert.equal(report.briefing.qualityScores.count, 0);
  assert.equal(report.briefing.qualityScores.latest, null);
}));

test("boot check surfaces quality scores and keeps candidate lessons out of accepted truth", () => withTempRepo((root) => {
  ensureQualityScoresFoundation(root);
  clearQualityScoreRecords(root);
  clearLessonCandidateRecords(root);
  writeJson(root, ".codex/quality-scores/quality-score-20260704-crm-plan-quality.json", {
    "$schema": "../../schemas/quality-score.schema.json",
    scoreId: "quality-score-20260704-crm-plan-quality",
    status: "candidate",
    scoreType: "plan_quality_score",
    projectId: "project-unregistered-crm",
    planId: "plan-crm-quality-test",
    sourcePlanPath: ".codex/plans/plan-crm-quality-test.json",
    outputType: "crm",
    archetypeId: "archetype-crm",
    archetypeFile: ".codex/archetypes/crm-system.json",
    checklistItemsEvaluated: [
      "Core entities, statuses, required fields, and transitions are validated."
    ],
    dimensions: {
      completeness: 9,
      craft: 9,
      maintainability: 9,
      ux: 7,
      security: 10,
      performance: 7,
      ownerAcceptance: 8,
      archetypeFit: 10,
      costDiscipline: 10
    },
    overallScore: 8.8,
    meetsBar: true,
    reviewStatus: "review",
    evidence: [
      ".codex/plans/plan-crm-quality-test.json"
    ],
    generatedBy: "scripts/process-quality-score.mjs",
    limitations: [
      "No product output was provided; this is a plan quality only score."
    ],
    createdAt: "2026-07-04T08:00:00.000Z",
    updatedAt: "2026-07-04T08:00:00.000Z"
  });
  writeJson(root, ".codex/memory/lessons/lesson-20260704-accepted-quality-loop.json", {
    "$schema": "../../../schemas/lesson.schema.json",
    lessonId: "lesson-20260704-accepted-quality-loop",
    title: "Accepted quality loop example",
    lesson: "Accepted lessons are loaded from the accepted lesson folder only.",
    sources: [
      ".codex/quality-scores/quality-score-20260704-crm-plan-quality.json"
    ],
    scope: "agent_shared",
    confidence: "high",
    status: "accepted",
    owner: "owner-gurnoor-bassi",
    createdAt: "2026-07-04T08:10:00.000Z",
    updatedAt: "2026-07-04T08:10:00.000Z"
  });
  writeJson(root, ".codex/memory/lessons/candidates/lesson-20260704-crm-plan-quality-01.json", {
    "$schema": "../../../../schemas/lesson.schema.json",
    lessonId: "lesson-20260704-crm-plan-quality-01",
    title: "Candidate quality loop reminder",
    lesson: "Candidate lessons stay out of accepted truth until owner promotion.",
    sources: [
      ".codex/quality-scores/quality-score-20260704-crm-plan-quality.json"
    ],
    scope: "agent_shared",
    confidence: "medium",
    status: "candidate",
    owner: "owner-gurnoor-bassi",
    whyThisMatters: "Candidate records are useful for review but not authority.",
    whenToUse: "Use as review input during future owner promotion.",
    whenNotToUse: "Do not load as accepted planning truth.",
    createdAt: "2026-07-04T08:05:00.000Z",
    updatedAt: "2026-07-04T08:05:00.000Z"
  });
  const build = runDashboardBuild(root);
  assert.equal(build.status, 0, build.output);

  const result = runBootCheck(root);

  assert.equal(result.status, 0, result.output);
  const report = JSON.parse(result.output);
  assert.equal(report.briefing.qualityScores.count, 1);
  assert.equal(report.briefing.qualityScores.latest.scoreId, "quality-score-20260704-crm-plan-quality");
  assert.equal(report.briefing.lessonMemory.acceptedCount, 1);
  assert.equal(report.briefing.lessonMemory.candidateCount, 1);
  assert.equal(report.briefing.lessonMemory.candidatesLoadedAsTruth, false);
  assert.equal(report.briefing.acceptedLessons.length, 1);
  assert.equal(report.briefing.acceptedLessons[0].lessonId, "lesson-20260704-accepted-quality-loop");
}));

test("boot check surfaces critique summaries without treating them as approval", () => withTempRepo((root) => {
  ensureCritiquesFoundation(root);
  clearCritiqueRecords(root);
  writeJson(root, ".codex/critiques/critique-20260704-crm-plan-quality.json", {
    "$schema": "../../schemas/plan-critique.schema.json",
    critiqueId: "critique-20260704-crm-plan-quality",
    sourcePlanId: "plan-crm-quality-test",
    sourcePlanPath: ".codex/plans/plan-crm-quality-test.json",
    archetypeId: "archetype-crm",
    archetypeFile: ".codex/archetypes/crm-system.json",
    reviewerType: "critic_worker",
    authority: "advisory_only",
    reviewStatus: "fail",
    blocksBuildMode: true,
    findings: [
      {
        findingId: "finding-gates-missing",
        severity: "high",
        category: "approval_gates",
        message: "Plan is missing mandatory approval gates.",
        evidence: [
          ".codex/plans/plan-crm-quality-test.json"
        ],
        requiredFix: "Add mandatory approval gates."
      }
    ],
    requiredFixes: [
      "Add mandatory approval gates."
    ],
    optionalImprovements: [
      "Re-run the critic after planner revision."
    ],
    evidence: [
      ".codex/plans/plan-crm-quality-test.json"
    ],
    generatedBy: "scripts/process-plan-critique.mjs",
    limitations: [
      "Critic output is advisory and cannot approve live actions."
    ],
    createdAt: "2026-07-04T09:00:00.000Z"
  });
  const build = runDashboardBuild(root);
  assert.equal(build.status, 0, build.output);

  const result = runBootCheck(root);

  assert.equal(result.status, 0, result.output);
  const report = JSON.parse(result.output);
  assert.equal(report.briefing.critiques.count, 1);
  assert.equal(report.briefing.critiques.latest.critiqueId, "critique-20260704-crm-plan-quality");
  assert.equal(report.briefing.critiques.reviewRequiredCount, 1);
  assert.equal(report.briefing.critiques.failedCount, 1);
  assert.equal(report.briefing.critiques.critiqueIsApproval, false);
}));

test("validator fails when an enforced schema uses an unsupported structural keyword", () => withTempRepo((root) => {
  const schemaPath = "schemas/cost-ledger.schema.json";
  const schema = readJson(root, schemaPath);
  schema.properties.costLedgerId.$ref = "#/$defs/costLedgerId";
  writeJson(root, schemaPath, schema);

  const result = runValidator(root);

  assert.notEqual(result.status, 0);
  assert.match(result.output, /unsupported schema keyword \$ref in enforced schema schemas\/cost-ledger\.schema\.json/);
}));

test("validator warns when format keywords are present but not enforced", () => withTempRepo((root) => {
  const result = runValidator(root);

  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /WARN schema format keyword is present but not enforced/);
}));

test("validator reports unsupported keywords in orphan schemas without failing", () => withTempRepo((root) => {
  const result = runValidator(root);

  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /WARN unsupported schema keyword \$ref in orphan schema schemas\/state-management\.schema\.json/);
}));

test("validator still succeeds on the real repo after invalid temp fixtures are cleaned up", () => {
  const result = runValidator(repoRoot);

  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /Foundation validation passed\./);
});
