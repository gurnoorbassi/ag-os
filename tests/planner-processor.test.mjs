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

function buildChain() {
  const commandIntake = buildCommandIntakeRecord({
    command: "make me a construction website",
    runId: "construction-website-dry-run",
    now: fixedNow
  });
  const job = buildJobRecord({ commandIntake, now: fixedNow });
  const route = buildTaskRouteRecord({ job, now: fixedNow });
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
  assert.equal(record.tasks.length, 3);
  assert.equal(record.tasks.every((item) => item.taskId.startsWith("work-")), true);
  assert.equal(record.approvalGates.length, 4);
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
  assert.equal(record.tasks.length, 1);
  assert.equal(record.basis.productArchetype, "archetype-website");
  assert.equal(record.approvalGates.some((gate) => gate.gateId === "approval-live-connector-action"), true);
  assert.equal(record.approvalGates.some((gate) => gate.gateId === "approval-custom-content-review"), true);
  assert.equal(record.stopConditions.some((condition) => condition.includes("deployment")), true);
  assert.equal(record.stopConditions.some((condition) => condition.includes("production systems")), true);
  assert.equal(record.safety.liveServiceUseAllowed, false);
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
