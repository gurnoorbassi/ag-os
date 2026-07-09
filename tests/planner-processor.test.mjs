import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildCommandIntakeRecord } from "../scripts/lib/runtime/command-intake-processor.mjs";
import { buildJobRecord } from "../scripts/lib/runtime/job-queue-processor.mjs";
import { buildTaskRouteRecord } from "../scripts/lib/runtime/task-router-processor.mjs";
import {
  buildPlanRecord,
  writePlanRecord
} from "../scripts/lib/runtime/planner-processor.mjs";

const fixedNow = new Date("2026-07-03T12:00:00.000Z");

function buildChain(command = "make me a construction website", runId = "construction-website-dry-run") {
  const commandIntake = buildCommandIntakeRecord({
    command,
    runId,
    now: fixedNow
  });
  const job = buildJobRecord({ commandIntake, now: fixedNow });
  const route = buildTaskRouteRecord({ job, commandIntake, now: fixedNow });
  return { commandIntake, job, route };
}

test("builds a deterministic local fallback plan when no worker draft is provided", () => {
  const { commandIntake, job, route } = buildChain();
  const record = buildPlanRecord({
    route,
    job,
    commandIntake,
    now: fixedNow
  });

  assert.equal(record.planId, "plan-runtime-construction-website-dry-run");
  assert.equal(record.jobId, "job-runtime-construction-website-dry-run");
  assert.equal(record.commandId, "command-intake-runtime-construction-website-dry-run");
  assert.equal(record.projectId, "project-unregistered-construction-website");
  assert.equal(record.summary.includes("No worker plan draft was provided"), true);
  assert.equal(record.estimatedCostUsd, 0);
  assert.equal(record.tools.includes("local-filesystem"), true);
  assert.equal(record.tasks.length > 3, true);
  assert.equal(record.tasks.every((item) => item.taskId.startsWith("work-")), true);
  assert.equal(record.basis.productArchetype, "archetype-website");
  assert.equal(record.basis.archetypeFile, ".codex/archetypes/website.json");
  assert.equal(record.basis.qualityBar.length > 0, true);
  assert.equal(record.approvalGates.length > 4, true);
  assert.equal(record.approvalGates.every((gate) => gate.approvalRequired === true), true);
  assert.equal(record.approvalGates.some((gate) => gate.gateId === "approval-live-connector-action"), true);
  assert.equal(record.stopConditions.some((condition) => condition.includes("deployment")), true);
  assert.deepEqual(record.safety, {
    executionAuthorized: false,
    liveServiceUseAllowed: false,
    deploymentAllowed: false,
    productionDataAllowed: false,
    paidActionAllowed: false
  });
  assert.equal(JSON.stringify(record).includes("REQUIRED_"), false);
});

test("uses CRM archetype content for tasks, quality bar, gates, and basis", () => {
  const { commandIntake, job, route } = buildChain(
    "make me a CRM for a local service business",
    "crm-archetype-aware-plan"
  );

  const record = buildPlanRecord({ route, job, commandIntake, now: fixedNow });
  const taskText = record.tasks.map((task) => task.description).join(" ");
  const qualityText = record.basis.qualityBar.join(" ");

  assert.equal(record.basis.productArchetype, "archetype-crm");
  assert.equal(record.basis.archetypeFile, ".codex/archetypes/crm-system.json");
  assert.equal(record.basis.qualityChecklistSource, "archetype:archetype-crm");
  assert.equal(record.basis.appliedPhases.some((phase) => phase.includes("Data Model And Workflow")), true);
  assert.equal(record.basis.appliedWhatToBuildFirst.some((item) => item.includes("Entity schema")), true);
  assert.equal(record.basis.appliedKnownPitfalls.some((item) => item.includes("Overbuilding custom automation")), true);
  assert.equal(record.basis.appliedApprovalGates.some((gate) => gate.includes("live email")), true);
  assert.equal(record.basis.appliedStopConditions.some((condition) => condition.includes("customer data")), true);
  assert.equal(taskText.includes("core entities"), true);
  assert.equal(qualityText.includes("Core entities"), true);
  assert.equal(record.basis.stackChoice.includes("Repository records or local JSON"), true);
  assert.equal(record.tasks.some((task) => task.taskId.includes("website")), false);
});

test("uses presentation archetype content instead of app workflow defaults", () => {
  const { commandIntake, job, route } = buildChain(
    "make me a PowerPoint for a business pitch",
    "powerpoint-archetype-aware-plan"
  );

  const record = buildPlanRecord({ route, job, commandIntake, now: fixedNow });
  const combined = JSON.stringify(record);

  assert.equal(record.basis.productArchetype, "archetype-presentation");
  assert.equal(record.basis.archetypeFile, ".codex/archetypes/powerpoint-deck.json");
  assert.equal(combined.includes("Audience brief"), true);
  assert.equal(combined.includes("Narrative structure"), true);
  assert.equal(combined.includes("Source and claim checklist"), true);
  assert.equal(combined.includes("story arc"), true);
  assert.equal(combined.includes("External sharing"), true);
});

test("uses ecommerce archetype content with commerce-specific gates", () => {
  const { commandIntake, job, route } = buildChain(
    "make me an ecommerce store for one hero product",
    "ecommerce-archetype-aware-plan"
  );

  const record = buildPlanRecord({ route, job, commandIntake, now: fixedNow });
  const combined = JSON.stringify(record);

  assert.equal(record.basis.productArchetype, "archetype-ecommerce-store");
  assert.equal(record.basis.archetypeFile, ".codex/archetypes/ecommerce-store.json");
  assert.equal(combined.includes("Catalog data model"), true);
  assert.equal(combined.includes("blocked checkout"), true);
  assert.equal(combined.includes("payment"), true);
  assert.equal(combined.includes("customer data"), true);
  assert.equal(combined.includes("live checkout"), true);
});

test("uses social media archetype content for source video, accounts, approvals, scheduling, and analytics", () => {
  const { commandIntake, job, route } = buildChain(
    "make me a social media management system where I upload 5 videos per day and it creates different posts across multiple platforms and accounts with approval before anything goes live",
    "social-media-archetype-aware-plan"
  );

  const record = buildPlanRecord({ route, job, commandIntake, now: fixedNow });
  const combined = JSON.stringify(record);

  assert.equal(record.basis.productArchetype, "archetype-social-media-content-operations-system");
  assert.equal(record.basis.archetypeFile, ".codex/archetypes/social-media-content-operations-system.json");
  assert.equal(record.basis.relevantMemory.strategy, "project_archetype_output_similarity_v1");
  assert.equal(record.basis.relevantMemory.candidatesLoadedAsTruth, false);
  assert.equal(record.basis.relevantMemory.memoryGrantsPermission, false);
  assert.equal(record.basis.relevantMemory.examplesGrantPermission, false);
  assert.equal(record.basis.relevantMemory.exampleScorePaths.length > 0, true);
  assert.equal(combined.includes("source video"), true);
  assert.equal(combined.includes("accounts"), true);
  assert.equal(combined.includes("approval"), true);
  assert.equal(combined.includes("scheduling"), true);
  assert.equal(combined.includes("Analytics"), true);
  assert.equal(combined.includes("No publish path exists without an approval gate"), true);
});

test("generated archetype plan identifiers do not look like secret tokens", () => {
  for (const [command, runId] of [
    ["make me a CRM for a local service business", "crm-secret-safe-id-plan"],
    ["make me a PowerPoint for a business pitch", "powerpoint-secret-safe-id-plan"]
  ]) {
    const { commandIntake, job, route } = buildChain(command, runId);
    const record = buildPlanRecord({ route, job, commandIntake, now: fixedNow });

    assert.equal(/sk-[A-Za-z0-9_-]{20,}/.test(JSON.stringify(record)), false);
  }
});

test("missing archetypes create an explicit task without website fallback", () => {
  const { commandIntake, job, route } = buildChain(
    "make me a vendor scheduling hub",
    "unknown-archetype-aware-plan"
  );

  const record = buildPlanRecord({
    route,
    job,
    commandIntake: {
      ...commandIntake,
      productContext: {
        productType: "vendor scheduling hub",
        archetypeId: "archetype-vendor-scheduling-hub",
        archetypeRegistered: false,
        archetypeGap: "missing_registered_archetype:archetype-vendor-scheduling-hub"
      }
    },
    now: fixedNow
  });

  assert.equal(record.basis.productArchetype, "archetype-vendor-scheduling-hub");
  assert.equal(record.basis.archetypeFile, null);
  assert.equal(record.tasks.some((task) => task.taskId === "work-register-missing-archetype"), true);
  assert.equal(JSON.stringify(record).includes("website"), false);
});

test("assembles worker plan drafts without dropping mandatory gates", () => {
  const { commandIntake, job, route } = buildChain();
  const record = buildPlanRecord({
    route,
    job,
    commandIntake,
    planDraft: {
      summary: "Worker-authored plan draft for a construction website.",
      estimatedCostUsd: 0,
      tools: ["local-filesystem", "github-after-approval"],
      tasks: [
        {
          taskId: "work-scope-website",
          description: "Scope the website offer, audience, and pages."
        }
      ],
      approvalGates: [
        {
          gateId: "approval-custom-content-review",
          approvalRequired: true,
          reason: "Owner reviews final website direction before build."
        }
      ],
      expectedOutput: "Plan-only website build outline.",
      stopConditions: ["Stop before changing production systems."],
      basis: {
        productArchetype: "archetype-website",
        ownerPreferencesUsed: ["pref-quality-over-quantity"],
        stackChoice: "Static website using existing GitHub first."
      }
    },
    now: fixedNow
  });

  assert.equal(record.summary, "Worker-authored plan draft for a construction website.");
  assert.equal(record.tasks.some((task) => task.taskId === "work-scope-website"), true);
  assert.equal(record.tasks.length > 1, true);
  assert.equal(record.basis.productArchetype, "archetype-website");
  assert.equal(record.approvalGates.some((gate) => gate.gateId === "approval-live-connector-action"), true);
  assert.equal(record.approvalGates.some((gate) => gate.gateId === "approval-custom-content-review"), true);
  assert.equal(record.stopConditions.some((condition) => condition.includes("deployment")), true);
  assert.equal(record.stopConditions.some((condition) => condition.includes("production systems")), true);
  assert.equal(record.safety.liveServiceUseAllowed, false);
});

test("rejects over-budget worker plan drafts", () => {
  const { commandIntake, job, route } = buildChain();

  assert.throws(
    () => buildPlanRecord({
      route,
      job,
      commandIntake,
      planDraft: {
        summary: "Over-budget worker-authored plan draft.",
        estimatedCostUsd: 6,
        tools: ["local-filesystem"],
        tasks: [
          {
            taskId: "work-over-budget",
            description: "This should be rejected before planning proceeds."
          }
        ],
        expectedOutput: "Rejected over-budget plan."
      },
      now: fixedNow
    }),
    /exceeds the \$5 per-task limit/
  );
});

test("writes plan records to a local workspace only", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "ag-os-planner-"));
  const { commandIntake, job, route } = buildChain();

  try {
    const result = writePlanRecord({
      route,
      job,
      commandIntake,
      now: fixedNow,
      root
    });

    assert.equal(result.filePath, ".codex/plans/plan-runtime-construction-website-dry-run.json");
    const written = JSON.parse(readFileSync(path.join(root, result.filePath), "utf8"));
    assert.equal(written.planId, result.record.planId);
    assert.equal(written.safety.liveServiceUseAllowed, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
