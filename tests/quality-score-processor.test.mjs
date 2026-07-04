import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { buildQualityScoreRecord, writeQualityScoreRecord } from "../scripts/process-quality-score.mjs";

const repoRoot = path.resolve(import.meta.dirname, "..");
const fixedNow = new Date("2026-07-04T08:00:00.000Z");

function withTempDir(assertion) {
  const root = mkdtempSync(path.join(os.tmpdir(), "ag-os-quality-score-"));
  try {
    return assertion(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function writeJson(filePath, value) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function writeCrmPlan(root) {
  const planPath = path.join(root, "plan-crm-quality-test.json");
  writeJson(planPath, {
    planId: "plan-crm-quality-test",
    jobId: "job-crm-quality-test",
    commandId: "command-intake-crm-quality-test",
    projectId: "project-unregistered-crm",
    summary: "Plan-only CRM plan with archetype-backed phases, gates, and quality expectations.",
    riskLevel: "R1",
    estimatedCostUsd: 0,
    tools: ["local-filesystem"],
    tasks: [
      {
        taskId: "work-crm-entities",
        description: "Define CRM entities, statuses, ownership, and activity history.",
        owner: "planner-foundation",
        status: "planned"
      },
      {
        taskId: "work-crm-operator-interface",
        description: "Plan list, detail, filters, task queue, and status review views.",
        owner: "planner-foundation",
        status: "planned"
      }
    ],
    basis: {
      productArchetype: "archetype-crm",
      archetypeFile: ".codex/archetypes/crm-system.json",
      appliedPhases: [
        "phase-model: Data Model And Workflow - Define core entities, statuses, ownership, and audit needs."
      ],
      appliedWhatToBuildFirst: [
        "Entity schema and status model."
      ],
      appliedApprovalGates: [
        "Owner approval is required before connecting live email, SMS, CRM, payment, database, or automation services."
      ],
      appliedStopConditions: [
        "Stop before handling credentials, production data, customer data, live imports, live exports, or paid enrichment."
      ],
      appliedKnownPitfalls: [
        "Overbuilding custom automation before the core operator workflow is stable."
      ],
      stackChoice: "Bootstrap Mode stack: Repository records or local JSON for first model validation.",
      qualityBar: [
        "Core entities and status transitions are explicit and validated.",
        "No live imports, exports, email sync, SMS, payment, or production data connection exists without approval.",
        "Core entities, statuses, required fields, and transitions are validated."
      ]
    },
    approvalGates: [
      {
        gateId: "approval-live-connector-action",
        approvalRequired: true,
        reason: "Any live connector action requires owner approval."
      }
    ],
    expectedOutput: "A plan-only CRM record. No live actions.",
    stopConditions: [
      "Stop before using credentials, private endpoints, paid services, customer data, or production data."
    ],
    safety: {
      executionAuthorized: false,
      liveServiceUseAllowed: false,
      deploymentAllowed: false,
      productionDataAllowed: false,
      paidActionAllowed: false
    },
    createdAt: "2026-07-04T08:00:00.000Z",
    updatedAt: "2026-07-04T08:00:00.000Z"
  });
  return planPath;
}

test("quality score processor builds a candidate plan quality score from an archetype-backed plan", () => withTempDir((root) => {
  const crmPlanPath = writeCrmPlan(root);
  const score = buildQualityScoreRecord({
    planPath: crmPlanPath,
    root: repoRoot,
    now: fixedNow
  });

  assert.equal(score.scoreType, "plan_quality_score");
  assert.equal(score.status, "candidate");
  assert.equal(score.projectId, "project-unregistered-crm");
  assert.equal(score.planId, "plan-crm-quality-test");
  assert.equal(score.sourcePlanPath, crmPlanPath.replaceAll("\\", "/"));
  assert.equal(score.archetypeId, "archetype-crm");
  assert.equal(score.archetypeFile, ".codex/archetypes/crm-system.json");
  assert.equal(score.outputType, "crm");
  assert.equal(score.generatedBy, "scripts/process-quality-score.mjs");
  assert.equal(score.checklistItemsEvaluated.length > 0, true);
  assert.equal(score.evidence.includes(crmPlanPath.replaceAll("\\", "/")), true);
  assert.equal(score.limitations.some((item) => item.includes("plan quality only")), true);
  assert.equal(score.dimensions.security, 10);
  assert.equal(score.dimensions.costDiscipline, 10);
  assert.equal(score.overallScore > 0, true);
}));

test("quality score processor writes the generated record to an explicit output path", () => withTempDir((root) => {
  const crmPlanPath = writeCrmPlan(root);
  const outputPath = path.join(root, "quality-score-output.json");

  const result = writeQualityScoreRecord({
    planPath: crmPlanPath,
    outputPath,
    root: repoRoot,
    now: fixedNow
  });

  assert.equal(result.filePath, outputPath);
  assert.deepEqual(readJson(outputPath), result.record);
  assert.equal(result.record.status, "candidate");
}));

test("quality score processor fails when a plan does not cite an archetype", () => withTempDir((root) => {
  const planPath = path.join(root, "plan-no-archetype.json");
  writeJson(planPath, {
    planId: "plan-no-archetype",
    projectId: "project-unregistered",
    tasks: [],
    approvalGates: [],
    stopConditions: [],
    safety: {
      executionAuthorized: false,
      liveServiceUseAllowed: false,
      deploymentAllowed: false,
      productionDataAllowed: false,
      paidActionAllowed: false
    }
  });

  assert.throws(
    () => buildQualityScoreRecord({ planPath, root: repoRoot, now: fixedNow }),
    /plan must cite a product archetype/
  );
}));

test("quality score processor fails when the cited archetype file is missing", () => withTempDir((root) => {
  const planPath = path.join(root, "plan-missing-archetype.json");
  writeJson(planPath, {
    planId: "plan-missing-archetype",
    projectId: "project-unregistered",
    basis: {
      productArchetype: "archetype-missing",
      archetypeFile: ".codex/archetypes/missing.json"
    },
    tasks: [],
    approvalGates: [],
    stopConditions: [],
    safety: {
      executionAuthorized: false,
      liveServiceUseAllowed: false,
      deploymentAllowed: false,
      productionDataAllowed: false,
      paidActionAllowed: false
    }
  });

  assert.throws(
    () => buildQualityScoreRecord({ planPath, root: repoRoot, now: fixedNow }),
    /active archetype record not found/
  );
}));
