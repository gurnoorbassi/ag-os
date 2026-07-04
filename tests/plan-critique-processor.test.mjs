import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildPlanCritiqueRecord,
  writePlanCritiqueRecord
} from "../scripts/process-plan-critique.mjs";

const repoRoot = path.resolve(import.meta.dirname, "..");
const fixedNow = new Date("2026-07-04T09:00:00.000Z");

function withTempDir(assertion) {
  const root = mkdtempSync(path.join(os.tmpdir(), "ag-os-plan-critique-"));
  try {
    return assertion(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function writeJson(filePath, value) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function cleanCrmPlan(overrides = {}) {
  return {
    planId: "plan-critic-clean-crm",
    jobId: "job-critic-clean-crm",
    commandId: "command-intake-critic-clean-crm",
    projectId: "project-unregistered-crm",
    summary: "Plan-only CRM plan with archetype-backed tasks, gates, stops, and assumptions.",
    riskLevel: "R1",
    estimatedCostUsd: 0,
    tools: ["local-filesystem"],
    tasks: [
      {
        taskId: "work-crm-model",
        description: "Define CRM entities, status transitions, ownership, and audit fields.",
        owner: "planner-foundation",
        status: "planned"
      },
      {
        taskId: "work-crm-interface",
        description: "Plan read-only list, detail, filters, task queue, and status review views.",
        owner: "planner-foundation",
        status: "planned"
      }
    ],
    basis: {
      productArchetype: "archetype-crm",
      archetypeFile: ".codex/archetypes/crm-system.json",
      archetypeVersion: null,
      qualityChecklistSource: "archetype:archetype-crm",
      appliedPhases: [
        "phase-model: Data Model And Workflow - Define core entities, statuses, ownership, and audit needs.",
        "phase-interface: Operator Interface - Build list, detail, filters, task queue, and status review views."
      ],
      appliedWhatToBuildFirst: [
        "Entity schema and status model.",
        "Read-only list/detail interface for representative record shapes without production data."
      ],
      appliedApprovalGates: [
        "Owner approval is required before connecting live email, SMS, CRM, payment, database, or automation services.",
        "Owner approval is required before importing, exporting, or transforming production or customer data.",
        "Owner approval is required before deployment, domain or DNS change, paid tool use, or credential handling."
      ],
      appliedStopConditions: [
        "Stop before handling credentials, production data, customer data, live imports, live exports, or paid enrichment.",
        "Stop before connecting email, SMS, CRM, database, n8n, Netlify, domain, DNS, or deployment services.",
        "Stop before touching the existing Lead Gen production system or AI Receptionist repo without separate approval."
      ],
      appliedKnownPitfalls: [
        "Overbuilding custom automation before the core operator workflow is stable.",
        "Treating CRM data as low-risk when it may become customer or production data."
      ],
      appliedCommonModules: [
        "Account and contact records with ownership, status, notes, and activity history.",
        "Task queue, reminders, filters, saved views, and audit events for operator activity."
      ],
      appliedWhatNotToOverbuildEarly: [
        "Custom sales forecasting, AI scoring, or complex automation before core data quality is proven."
      ],
      stackChoice: "Bootstrap Mode stack: repository records first; existing Postgres only after approved runtime phase.",
      qualityBar: [
        "Core entities and status transitions are explicit and validated.",
        "No live imports, exports, email sync, SMS, payment, or production data connection exists without approval.",
        "Core entities, statuses, required fields, and transitions are validated.",
        "Operator workflows can be completed without live services."
      ],
      assumptions: [
        "The first CRM pass is plan-only and local.",
        "No production or customer data is available or allowed."
      ]
    },
    approvalGates: [
      {
        gateId: "approval-live-connector-action",
        approvalRequired: true,
        reason: "Any live connector action, credential use, email/SMS/CRM/database/n8n/Netlify connection, or production data action requires owner approval."
      },
      {
        gateId: "approval-deploy-domain-paid",
        approvalRequired: true,
        reason: "Deployment, domain/DNS changes, paid tools, posting, outreach, phone/voice actions, Lead Gen changes, AI Receptionist changes, and Constitution changes require owner approval."
      }
    ],
    expectedOutput: "A plan-only CRM plan. No live services, credentials, deployment, paid actions, or production data.",
    stopConditions: [
      "Stop before any live service, credential use, connector call, n8n activation, Netlify activation, deployment, domain/DNS change, paid tool, production data, customer data, posting, outreach, phone/voice action, Lead Gen change, AI Receptionist change, or Constitution change.",
      "Stop when scope, risk tier, cost, or approval requirements become unclear."
    ],
    safety: {
      executionAuthorized: false,
      liveServiceUseAllowed: false,
      deploymentAllowed: false,
      productionDataAllowed: false,
      paidActionAllowed: false
    },
    createdAt: "2026-07-04T09:00:00.000Z",
    updatedAt: "2026-07-04T09:00:00.000Z",
    ...overrides
  };
}

function writePlan(root, plan = cleanCrmPlan()) {
  const planPath = path.join(root, `${plan.planId}.json`);
  writeJson(planPath, plan);
  return planPath;
}

function writeCommandIntake(root, overrides = {}) {
  const commandPath = path.join(root, "command-intake-critic-clean-crm.json");
  writeJson(commandPath, {
    commandIntakeId: "command-intake-critic-clean-crm",
    status: "classified",
    rawCommand: "Make me a CRM for a local service business.",
    normalizedCommand: "Create a plan-only crm plan.",
    commandCategory: "plan_only",
    projectId: "project-unregistered-crm",
    riskLevel: "R1",
    classification: {
      requiresPlan: true,
      requiresApproval: false,
      requiresLiveService: false,
      requiresDeployment: false,
      requiresDomainChange: false,
      requiresPaidAction: false,
      requiresProductionData: false
    },
    productContext: {
      productType: "crm",
      archetypeId: "archetype-crm",
      archetypeRegistered: true,
      archetypeGap: null
    },
    understanding: {
      producedBy: "command-intake-processor",
      inferredBusinessObjective: "Plan a CRM for a local service business.",
      productArchetype: "archetype-crm",
      targetUser: "Local service business operator.",
      successCriteria: ["Clear contacts, tasks, status, and audit planning."],
      criticalUnknowns: ["Which service niche should the CRM serve?"],
      confidence: "medium",
      assumptions: ["Plan-only first."],
      ownerConstraints: ["No live services."]
    },
    plannedOutput: "Plan-only command intake record for crm.",
    nextRecord: {
      jobId: "job-critic-clean-crm",
      planId: "plan-critic-clean-crm"
    },
    safety: {
      executesCommand: false,
      createsLiveSideEffect: false,
      usesCredentials: false,
      callsConnector: false
    },
    createdAt: "2026-07-04T09:00:00.000Z",
    updatedAt: "2026-07-04T09:00:00.000Z",
    ...overrides
  });
  return commandPath;
}

function writeQualityScore(root, overrides = {}) {
  const scorePath = path.join(root, "quality-score-critic-clean-crm.json");
  writeJson(scorePath, {
    "$schema": "../../schemas/quality-score.schema.json",
    scoreId: "quality-score-critic-clean-crm",
    status: "candidate",
    scoreType: "plan_quality_score",
    projectId: "project-unregistered-crm",
    planId: "plan-critic-clean-crm",
    sourcePlanPath: "plan-critic-clean-crm.json",
    outputType: "crm",
    archetypeId: "archetype-crm",
    archetypeFile: ".codex/archetypes/crm-system.json",
    checklistItemsEvaluated: [
      "Core entities and status transitions are explicit and validated."
    ],
    dimensions: {
      completeness: 9,
      craft: 9,
      maintainability: 9,
      ux: 9,
      security: 10,
      performance: 8,
      ownerAcceptance: 8,
      archetypeFit: 10,
      costDiscipline: 10
    },
    overallScore: 9.1,
    meetsBar: true,
    reviewStatus: "pass",
    improvementRecommendations: [],
    lessonCandidates: [],
    evidence: ["plan-critic-clean-crm.json"],
    generatedBy: "scripts/process-quality-score.mjs",
    limitations: ["Plan-quality score only."],
    createdAt: "2026-07-04T09:00:00.000Z",
    updatedAt: "2026-07-04T09:00:00.000Z",
    ...overrides
  });
  return scorePath;
}

function findingCategories(record) {
  return record.findings.map((finding) => finding.category);
}

test("critic builds an advisory pass critique for a clean archetype-aware CRM plan", () => withTempDir((root) => {
  const planPath = writePlan(root);
  const commandPath = writeCommandIntake(root);
  const qualityScorePath = writeQualityScore(root);

  const critique = buildPlanCritiqueRecord({
    planPath,
    commandIntakePath: commandPath,
    qualityScorePath,
    root: repoRoot,
    now: fixedNow
  });

  assert.equal(critique.reviewerType, "critic_worker");
  assert.equal(critique.authority, "advisory_only");
  assert.equal(critique.reviewStatus, "pass");
  assert.equal(critique.blocksBuildMode, false);
  assert.equal(critique.sourcePlanId, "plan-critic-clean-crm");
  assert.equal(critique.archetypeId, "archetype-crm");
  assert.equal(critique.requiredFixes.length, 0);
  assert.equal(critique.optionalImprovements.length >= 1, true);
  assert.equal(critique.limitations.some((item) => item.includes("cannot approve live actions")), true);
}));

test("critic flags a missing mandatory approval gate", () => withTempDir((root) => {
  const planPath = writePlan(root, cleanCrmPlan({ approvalGates: [] }));

  const critique = buildPlanCritiqueRecord({ planPath, root: repoRoot, now: fixedNow });

  assert.equal(critique.reviewStatus, "fail");
  assert.equal(critique.blocksBuildMode, true);
  assert.equal(findingCategories(critique).includes("approval_gates"), true);
  assert.match(critique.requiredFixes.join(" "), /mandatory approval gate/i);
}));

test("critic flags a missing stop condition", () => withTempDir((root) => {
  const planPath = writePlan(root, cleanCrmPlan({ stopConditions: [] }));

  const critique = buildPlanCritiqueRecord({ planPath, root: repoRoot, now: fixedNow });

  assert.equal(critique.reviewStatus, "fail");
  assert.equal(findingCategories(critique).includes("stop_conditions"), true);
}));

test("critic flags over-budget plans", () => withTempDir((root) => {
  const planPath = writePlan(root, cleanCrmPlan({ estimatedCostUsd: 6 }));

  const critique = buildPlanCritiqueRecord({ planPath, root: repoRoot, now: fixedNow });

  assert.equal(critique.reviewStatus, "fail");
  assert.equal(findingCategories(critique).includes("cost_discipline"), true);
  assert.match(critique.requiredFixes.join(" "), /\$5/);
}));

test("critic flags plan and command archetype mismatch", () => withTempDir((root) => {
  const planPath = writePlan(root, cleanCrmPlan({
    basis: {
      ...cleanCrmPlan().basis,
      productArchetype: "archetype-website",
      archetypeFile: ".codex/archetypes/website.json"
    }
  }));
  const commandPath = writeCommandIntake(root);

  const critique = buildPlanCritiqueRecord({
    planPath,
    commandIntakePath: commandPath,
    root: repoRoot,
    now: fixedNow
  });

  assert.equal(critique.reviewStatus, "fail");
  assert.equal(findingCategories(critique).includes("archetype_match"), true);
}));

test("critic flags too many critical questions from command intake", () => withTempDir((root) => {
  const planPath = writePlan(root);
  const commandPath = writeCommandIntake(root, {
    understanding: {
      ...readJson(writeCommandIntake(root)).understanding,
      criticalUnknowns: ["one", "two", "three", "four"]
    }
  });

  const critique = buildPlanCritiqueRecord({
    planPath,
    commandIntakePath: commandPath,
    root: repoRoot,
    now: fixedNow
  });

  assert.equal(critique.reviewStatus, "review");
  assert.equal(findingCategories(critique).includes("critical_questions"), true);
}));

test("critic flags live action implications without approval", () => withTempDir((root) => {
  const planPath = writePlan(root, cleanCrmPlan({
    expectedOutput: "Deploy the CRM to Netlify and connect n8n after planning."
  }));

  const critique = buildPlanCritiqueRecord({ planPath, root: repoRoot, now: fixedNow });

  assert.equal(critique.reviewStatus, "fail");
  assert.equal(findingCategories(critique).includes("live_action_implication"), true);
}));

test("critic output is advisory and never writes accepted lessons", () => withTempDir((root) => {
  const planPath = writePlan(root);
  const outputPath = path.join(root, "critique-output.json");

  const result = writePlanCritiqueRecord({
    planPath,
    outputPath,
    root: repoRoot,
    now: fixedNow
  });

  assert.equal(result.record.authority, "advisory_only");
  assert.notEqual(result.record.reviewStatus, "accepted");
  assert.deepEqual(readdirSync(root).filter((name) => /lesson/i.test(name)), []);
  assert.deepEqual(readJson(outputPath), result.record);
}));
