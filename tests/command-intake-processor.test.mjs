import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildCommandIntakeRecord,
  routeCommandCategory,
  writeCommandIntakeRecord
} from "../scripts/lib/runtime/command-intake-processor.mjs";

const fixedNow = new Date("2026-07-03T12:00:00.000Z");

test("builds a plan-only command intake record for a construction website", () => {
  const record = buildCommandIntakeRecord({
    command: "make me a construction website",
    runId: "construction-website-dry-run",
    now: fixedNow
  });

  assert.equal(record.commandIntakeId, "command-intake-runtime-construction-website-dry-run");
  assert.equal(record.status, "classified");
  assert.equal(record.rawCommand, "make me a construction website");
  assert.equal(record.commandCategory, "plan_only");
  assert.equal(record.projectId, "project-unregistered-construction-website");
  assert.equal(record.productContext.archetypeId, "archetype-website");
  assert.equal(record.productContext.archetypeGap, null);
  assert.equal(record.riskLevel, "R1");
  assert.equal(record.classification.requiresPlan, true);
  assert.equal(record.classification.requiresApproval, false);
  assert.equal(record.classification.requiresLiveService, false);
  assert.equal(record.classification.requiresDeployment, false);
  assert.equal(record.classification.requiresDomainChange, false);
  assert.equal(record.classification.requiresPaidAction, false);
  assert.equal(record.classification.requiresProductionData, false);
  assert.equal(record.nextRecord.jobId, "job-runtime-construction-website-dry-run");
  assert.equal(record.nextRecord.planId, "plan-runtime-construction-website-dry-run");
  assert.deepEqual(record.safety, {
    executesCommand: false,
    createsLiveSideEffect: false,
    usesCredentials: false,
    callsConnector: false
  });
  assert.equal(JSON.stringify(record).includes("REQUIRED_"), false);
});

test("classifies Archetype Pack v1 intake commands without website fallback", () => {
  const cases = [
    {
      command: "Make me a client portal for an agency.",
      runId: "client-portal-intake-gap",
      archetypeId: "archetype-client-portal",
      productType: "client portal",
      projectId: "project-unregistered-client-portal"
    },
    {
      command: "Make me a construction client portal.",
      runId: "construction-client-portal-intake-gap",
      archetypeId: "archetype-client-portal",
      productType: "client portal",
      projectId: "project-unregistered-client-portal"
    },
    {
      command: "Make me an ecommerce store for one hero product.",
      runId: "ecommerce-store-intake-gap",
      archetypeId: "archetype-ecommerce-store",
      productType: "ecommerce store",
      projectId: "project-unregistered-ecommerce-store"
    },
    {
      command: "Make me an e-commerce store for one hero product.",
      runId: "e-commerce-store-intake-gap",
      archetypeId: "archetype-ecommerce-store",
      productType: "ecommerce store",
      projectId: "project-unregistered-ecommerce-store"
    },
    {
      command: "Make me an online store for one hero product.",
      runId: "online-store-intake-gap",
      archetypeId: "archetype-ecommerce-store",
      productType: "ecommerce store",
      projectId: "project-unregistered-ecommerce-store"
    },
    {
      command: "Make me a hero product store.",
      runId: "hero-product-store-intake-gap",
      archetypeId: "archetype-ecommerce-store",
      productType: "ecommerce store",
      projectId: "project-unregistered-ecommerce-store"
    },
    {
      command: "Make me an AI receptionist for a pizza shop.",
      runId: "ai-receptionist-intake-gap",
      archetypeId: "archetype-ai-tool",
      productType: "ai receptionist",
      projectId: "project-unregistered-ai-receptionist"
    },
    {
      command: "Make me a receptionist for a pizza shop.",
      runId: "receptionist-intake-gap",
      archetypeId: "archetype-ai-tool",
      productType: "ai receptionist",
      projectId: "project-unregistered-ai-receptionist"
    },
    {
      command: "Make me a phone receptionist for a pizza shop.",
      runId: "phone-receptionist-intake-gap",
      archetypeId: "archetype-ai-tool",
      productType: "ai receptionist",
      projectId: "project-unregistered-ai-receptionist"
    },
    {
      command: "Make me call answering for a pizza shop.",
      runId: "call-answering-intake-gap",
      archetypeId: "archetype-ai-tool",
      productType: "ai receptionist",
      projectId: "project-unregistered-ai-receptionist"
    },
    {
      command: "Make me a pizza shop receptionist.",
      runId: "pizza-shop-receptionist-intake-gap",
      archetypeId: "archetype-ai-tool",
      productType: "ai receptionist",
      projectId: "project-unregistered-ai-receptionist"
    },
    {
      command: "Make me a social media management system.",
      runId: "social-media-intake",
      archetypeId: "archetype-social-media-content-operations-system",
      productType: "social media content operations",
      projectId: "project-unregistered-social-media-content-operations"
    }
  ];

  for (const item of cases) {
    const record = buildCommandIntakeRecord({
      command: item.command,
      runId: item.runId,
      now: fixedNow
    });

    assert.equal(record.productContext.productType, item.productType);
    assert.equal(record.productContext.archetypeId, item.archetypeId);
    assert.equal(record.productContext.archetypeRegistered, true);
    assert.equal(record.productContext.archetypeGap, null);
    assert.equal(record.projectId, item.projectId);
    assert.equal(record.projectId.includes("website"), false);
  }
});

test("routes unknown product types through the registered general work archetype", () => {
  const record = buildCommandIntakeRecord({
    command: "make me a vendor scheduling hub",
    runId: "unknown-product-type",
    now: fixedNow
  });

  assert.equal(record.productContext.productType, "general digital work product");
  assert.equal(record.productContext.archetypeId, "archetype-general-digital-work");
  assert.equal(record.productContext.archetypeRegistered, true);
  assert.equal(record.productContext.archetypeGap, null);
  assert.equal(record.projectId, "project-unregistered-vendor-scheduling-hub");
});

test("active command registry routes live owner intent into the correct execution posture", () => {
  assert.equal(routeCommandCategory({ command: "Build me a client portal" }).id, "build");
  assert.equal(routeCommandCategory({ command: "Audit the security policy" }).id, "audit");
  assert.equal(routeCommandCategory({ command: "Deploy this preview to staging" }).id, "deploy_staging");
  assert.equal(routeCommandCategory({ command: "Deploy the approved release to production" }).id, "deploy_production");
  assert.equal(routeCommandCategory({ command: "Connect the n8n integration" }).id, "connect_service");
  assert.equal(routeCommandCategory({ command: "Rollback the last release" }).id, "rollback");
  assert.equal(routeCommandCategory({ command: "Stop all automation" }).id, "stop_all");
});

test("structured adapter requests route through the registry and inherit approval posture", () => {
  const executionRequest = { adapterId: "production-deployment" };
  const category = routeCommandCategory({ command: "Ship the approved release", executionRequest });
  assert.equal(category.id, "deploy_production");
  assert.equal(category.requiresOwnerApproval, true);
});

test("uses an explicit registered-project target without changing product classification", () => {
  const record = buildCommandIntakeRecord({
    command: "Improve the internal dashboard navigation",
    projectId: "project-quote-builder",
    runId: "coordinator-dashboard-target",
    now: fixedNow
  });

  assert.equal(record.projectId, "project-quote-builder");
  assert.equal(record.productContext.archetypeId, "archetype-dashboard");
});

test("writes command intake records to a local workspace only", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "ag-os-command-intake-"));

  try {
    const result = writeCommandIntakeRecord({
      command: "make me a construction website",
      runId: "construction-website-dry-run",
      now: fixedNow,
      root
    });

    assert.equal(result.filePath, ".codex/commands/command-intake-runtime-construction-website-dry-run.json");
    const written = JSON.parse(readFileSync(path.join(root, result.filePath), "utf8"));
    assert.equal(written.commandIntakeId, result.record.commandIntakeId);
    assert.equal(written.safety.callsConnector, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
