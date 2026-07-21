import assert from "node:assert/strict";
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  ANTHROPIC_WORKER_MAX_TOKENS,
  ANTHROPIC_WORKER_TIMEOUT_MS,
  assertWorkProductMatchesCommand,
  assertWorkProductShape,
  createAnthropicWorkProduct,
  writeAnthropicWorkProduct
} from "../scripts/lib/runtime/anthropic-worker.mjs";
import { evaluateAnthropicWorkerReadiness } from "../scripts/lib/runtime/anthropic-worker-readiness.mjs";
import { submitOwnerCommand } from "../scripts/lib/runtime/live-command-service.mjs";

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function tempWorkspace() {
  const target = mkdtempSync(path.join(tmpdir(), "ag-os-worker-"));
  cpSync(sourceRoot, target, {
    recursive: true,
    filter: (source) => ![".git", "node_modules"].includes(path.basename(source))
  });
  return target;
}

function safeWorkProduct() {
  return {
    summary: "Owner operations dashboard work product",
    files: [
      {
        path: "dashboard/index.html",
        content: "<!doctype html><title>Operations</title><main>Ready</main>",
        purpose: "Accessible dashboard shell"
      },
      {
        path: "dashboard/config.json",
        content: JSON.stringify({ theme: "dark", mode: "private" }),
        purpose: "Validated dashboard configuration"
      }
    ],
    validationNotes: ["HTML and JSON are syntactically complete."],
    qualityEvidence: ["The output directly satisfies the requested private dashboard outcome."]
  };
}

test("Anthropic worker requests a bounded schema and validates safe file output", async () => {
  const root = tempWorkspace();
  let request;
  const result = await createAnthropicWorkProduct({
    command: { rawCommand: "Build a private operations dashboard" },
    job: { jobId: "job-anthropic-worker-test", projectId: "project-quote-builder" },
    plan: {
      projectId: "project-quote-builder",
      summary: "Build the dashboard.",
      tasks: [],
      expectedOutput: "Dashboard files",
      basis: {
        relevantMemory: {
          strategy: "project_archetype_output_similarity_v1",
          acceptedLessonPaths: [".codex/memory/accepted/lesson-20260713-runtime-ag-os-compounding-completion-20260713-03.json"],
          exampleScorePaths: [".codex/quality-scores/quality-score-20260713-runtime-ag-os-compounding-completion-20260713.json"]
        }
      },
      stopConditions: ["Stop before deployment."]
    },
    apiKey: "test-only-key",
    model: "claude-sonnet-5",
    baseUrl: "https://anthropic.test",
    root,
    inputCostPerMillionUsd: 2,
    outputCostPerMillionUsd: 10,
    approvalId: "approval-anthropic-worker-test",
    approvalMaxUsd: 0.25,
    now: new Date("2026-07-16T12:00:00.000Z"),
    fetchImpl: async (url, options) => {
      request = { url, options };
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            model: "claude-sonnet-5",
            usage: { input_tokens: 120, output_tokens: 240 },
            content: [{ type: "text", text: JSON.stringify(safeWorkProduct()) }]
          };
        }
      };
    }
  });

  assert.equal(request.url, "https://anthropic.test/v1/messages");
  assert.equal(request.options.headers["x-api-key"], "test-only-key");
  const body = JSON.parse(request.options.body);
  assert.equal(body.max_tokens, 16_000);
  assert.equal(ANTHROPIC_WORKER_MAX_TOKENS, 16_000);
  assert.equal(ANTHROPIC_WORKER_TIMEOUT_MS, 120_000);
  assert.equal(body.output_config.format.type, "json_schema");
  assert.equal(JSON.stringify(body.output_config.format.schema).includes("maxItems"), false);
  assert.equal(body.messages[0].content.includes("test-only-key"), false);
  const workerBrief = JSON.parse(body.messages[0].content);
  assert.match(workerBrief.relevantLessons[0].lesson, /archetype/i);
  assert.equal(workerBrief.qualityExamples[0].overallScore >= 8, true);
  assert.equal(workerBrief.evidenceGrantsPermission, false);
  assert.equal(result.validation.paths.length, 2);
  assert.deepEqual(result.usage, { input_tokens: 120, output_tokens: 240 });
});

test("Anthropic worker rejects a truncated structured response before parsing partial JSON", async () => {
  const root = tempWorkspace();
  await assert.rejects(() => createAnthropicWorkProduct({
    command: { rawCommand: "Build a private operations dashboard" },
    job: { jobId: "job-anthropic-worker-truncated", projectId: "project-quote-builder" },
    plan: {
      projectId: "project-quote-builder",
      summary: "Build the dashboard.",
      tasks: [],
      expectedOutput: "Dashboard files",
      basis: { relevantMemory: {} },
      stopConditions: ["Stop before deployment."]
    },
    apiKey: "test-only-key",
    model: "claude-sonnet-5",
    baseUrl: "https://anthropic.test",
    root,
    inputCostPerMillionUsd: 2,
    outputCostPerMillionUsd: 10,
    approvalId: "approval-anthropic-worker-test",
    approvalMaxUsd: 0.25,
    now: new Date("2026-07-16T12:05:00.000Z"),
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      async json() {
        return {
          model: "claude-sonnet-5",
          stop_reason: "max_tokens",
          usage: { input_tokens: 120, output_tokens: 16_000 },
          content: [{ type: "text", text: '{"summary":"partial' }]
        };
      }
    })
  }), /truncated structured response \(max_tokens\)/);
});

test("Anthropic worker rejects traversal, hidden files, invalid JSON, and oversized output", () => {
  const source = safeWorkProduct();
  assert.throws(() => assertWorkProductShape({
    ...source,
    files: [{ path: "../escape.md", content: "no", purpose: "unsafe" }]
  }), /unsafe artifact path/);
  assert.throws(() => assertWorkProductShape({
    ...source,
    files: [{ path: ".env", content: "no", purpose: "hidden" }]
  }), /hidden files/);
  assert.throws(() => assertWorkProductShape({
    ...source,
    files: [{ path: "bad.json", content: "{", purpose: "invalid" }]
  }), SyntaxError);
  assert.throws(() => assertWorkProductShape({
    ...source,
    files: [{ path: "large.md", content: "x".repeat(200_001), purpose: "large" }]
  }), /exceeds 200000 bytes/);
});

test("website work products require a previewable root entry file", () => {
  assert.throws(() => assertWorkProductMatchesCommand({ command: { rawCommand: "Build a polished website" }, workProduct: safeWorkProduct() }), /root index\.html/);
  const website = safeWorkProduct();
  website.files[0].path = "index.html";
  assert.doesNotThrow(() => assertWorkProductMatchesCommand({ command: { rawCommand: "Build a polished website" }, workProduct: website }));
});

test("Anthropic worker cannot write paid work-product evidence without an exact approval id", () => {
  const root = tempWorkspace();
  const options = {
    job: { jobId: "job-worker-test", projectId: "project-quote-builder", riskLevel: "R1" },
    plan: { planId: "plan-worker-test", jobId: "job-worker-test", projectId: "project-quote-builder", expectedOutput: "Files", riskLevel: "R1" },
    command: { rawCommand: "Build files" },
    result: { workProduct: safeWorkProduct() },
    root,
    now: new Date("2026-07-13T18:00:00.000Z")
  };
  assert.throws(() => writeAnthropicWorkProduct(options), /requires an exact approvalId/);

  const written = writeAnthropicWorkProduct({
    ...options,
    result: { ...options.result, approvalId: "approval-20260713-anthropic-builder-test" }
  });
  assert.equal(existsSync(path.join(root, written.workProductPath)), true);
  const step = JSON.parse(readFileSync(path.join(root, written.executionPath), "utf8"));
  assert.equal(step.approvalId, "approval-20260713-anthropic-builder-test");
  assert.equal(step.safety.credentialsAllowed, true);
  assert.equal(step.safety.liveServiceUseAllowed, true);
  assert.equal(step.safety.paidActionAllowed, true);
  assert.equal(step.safety.deploymentAllowed, false);
});

test("planner approval cannot activate the separate Anthropic builder worker", () => {
  const root = tempWorkspace();
  const readiness = evaluateAnthropicWorkerReadiness({
    root,
    env: {
      AG_OS_AI_WORKER_ENABLED: "true",
      ANTHROPIC_API_KEY: "configured",
      AG_OS_AI_WORKER_APPROVAL_ID: "approval-20260712-anthropic-planning",
      ANTHROPIC_INPUT_COST_PER_MILLION_USD: "2",
      ANTHROPIC_OUTPUT_COST_PER_MILLION_USD: "10"
    },
    now: new Date("2026-07-13T18:00:00.000Z")
  });
  assert.equal(readiness.ready, false);
  assert.ok(readiness.blockers.some((item) => item.includes("does not allow work-product generation")));
});

test("owner command closes the real file, score, lesson, cost, and audit loop with a mocked approved builder", async () => {
  const root = tempWorkspace();
  const approvalId = "approval-20260713-anthropic-builder-test";
  const result = await submitOwnerCommand({
    command: "Build a private operations dashboard",
    projectId: "project-quote-builder",
    useAiWorker: true,
    aiWorkerReadiness: {
      ready: true,
      approvalId,
      approval: { budget: { maxUsd: 0.25 } },
      inputCostPerMillionUsd: 2,
      outputCostPerMillionUsd: 10,
      blockers: []
    },
    workProductProvider: async () => ({
      workProduct: safeWorkProduct(),
      model: "claude-sonnet-5",
      usage: { input_tokens: 1000, output_tokens: 500 }
    }),
    root,
    now: new Date("2026-07-13T18:30:00.000Z")
  });

  assert.equal(result.status, "done");
  assert.equal(result.aiWorker.used, true);
  assert.equal(result.aiWorker.actualCostUsd, 0.007);
  assert.ok(result.aiWorker.workProductPaths.length >= 3);
  assert.ok(result.aiWorker.lessonCandidatePaths.length > 0);
  assert.ok(result.aiWorker.archetypeProposalPaths.length > 0);
  for (const recordPath of [
    ...result.aiWorker.workProductPaths,
    result.aiWorker.qualityScorePath,
    ...result.aiWorker.lessonCandidatePaths,
    ...result.aiWorker.archetypeProposalPaths
  ]) {
    assert.equal(existsSync(path.join(root, recordPath)), true, recordPath);
  }
  const score = JSON.parse(readFileSync(path.join(root, result.aiWorker.qualityScorePath), "utf8"));
  assert.equal(score.scoreType, "product_quality_score");
  const plan = JSON.parse(readFileSync(path.join(root, `.codex/plans/${result.planId}.json`), "utf8"));
  assert.match(plan.summary, /owner-usable dashboard/);
  assert.doesNotMatch(plan.summary, /Plan-only scaffold/);
  const usageAudit = result.recordsCreated.find((item) => item.includes("anthropic-worker-use"));
  assert.ok(usageAudit);
  assert.equal(JSON.parse(readFileSync(path.join(root, usageAudit), "utf8")).eventType, "standing_approval_used");
});

test("builder completion blocks ambiguous external action details instead of creating an unusable approval", async () => {
  const root = tempWorkspace();
  const result = await submitOwnerCommand({
    command: "Build and deploy a private operations dashboard to production",
    projectId: "project-quote-builder",
    useAiWorker: true,
    aiWorkerReadiness: {
      ready: true,
      approvalId: "approval-20260713-anthropic-builder-test",
      approval: { budget: { maxUsd: 0.25 } },
      inputCostPerMillionUsd: 2,
      outputCostPerMillionUsd: 10,
      blockers: []
    },
    workProductProvider: async () => ({
      workProduct: safeWorkProduct(),
      model: "claude-sonnet-5",
      usage: { input_tokens: 100, output_tokens: 100 }
    }),
    root,
    now: new Date("2026-07-13T18:40:00.000Z")
  });
  assert.equal(result.status, "blocked");
  const job = JSON.parse(readFileSync(path.join(root, `.codex/jobs/${result.jobId}.json`), "utf8"));
  assert.equal(job.status, "blocked");
  assert.equal(job.approvalRequired, false);
  assert.match(job.blockedReason, /could not be safely derived/);
  assert.ok(job.completionEvidence.qualityScorePath);
});

test("independent critic blocks a builder result from marking itself complete", async () => {
  const root = tempWorkspace();
  const result = await submitOwnerCommand({
    command: "Build a private operations dashboard",
    projectId: "project-quote-builder",
    useAiWorker: true,
    aiWorkerReadiness: {
      ready: true, approvalId: "approval-20260713-anthropic-builder-test", approval: { budget: { maxUsd: 0.25 } }, inputCostPerMillionUsd: 2, outputCostPerMillionUsd: 10, blockers: []
    },
    aiCriticReadiness: {
      ready: true, required: true, approvalId: "approval-20260719-anthropic-critic-test", approval: { budget: { maxUsd: 0.25 } }, inputCostPerMillionUsd: 1, outputCostPerMillionUsd: 5, blockers: []
    },
    workProductProvider: async () => ({ workProduct: safeWorkProduct(), model: "builder-model", usage: { input_tokens: 100, output_tokens: 100 } }),
    criticProvider: async () => ({ critique: { verdict: "needs_revision", score: 6, summary: "Navigation is incomplete.", requirementChecks: [], defects: [{ severity: "high", message: "Missing navigation", evidence: "index.html" }], requiredFixes: ["Add working navigation."], safetyFindings: [] }, model: "critic-model", usage: { input_tokens: 100, output_tokens: 50 } }),
    root,
    now: new Date("2026-07-19T18:30:00.000Z")
  });
  assert.equal(result.status, "needs_revision");
  assert.equal(result.aiCritic.verdict, "needs_revision");
  assert.equal(result.aiWorker.qualityScorePath, null);
  const job = JSON.parse(readFileSync(path.join(root, `.codex/jobs/${result.jobId}.json`), "utf8"));
  assert.equal(job.status, "needs_revision");
  assert.match(job.blockedReason, /Add working navigation/);
});

test("required independent critic fails closed before builder spending when not ready", async () => {
  const root = tempWorkspace();
  let builderCalled = false;
  await assert.rejects(() => submitOwnerCommand({
    command: "Build a private operations dashboard",
    projectId: "project-quote-builder",
    useAiWorker: true,
    aiWorkerReadiness: { ready: true, approvalId: "approval-builder", approval: { budget: { maxUsd: 0.25 } }, inputCostPerMillionUsd: 2, outputCostPerMillionUsd: 10, blockers: [] },
    aiCriticReadiness: { ready: false, required: true, blockers: ["critic approval missing"] },
    workProductProvider: async () => { builderCalled = true; return { workProduct: safeWorkProduct(), model: "builder", usage: {} }; },
    root
  }), /Independent critic is required but not ready/);
  assert.equal(builderCalled, false);
});

test("a builder provider failure becomes a recoverable failed job instead of remaining queued", async () => {
  const root = tempWorkspace();
  const existingJobs = new Set(
    readdirSync(path.join(root, ".codex/jobs"))
      .filter((name) => name.startsWith("job-runtime-operator-") && name.endsWith(".json"))
  );
  await assert.rejects(() => submitOwnerCommand({
    command: "Build a private operations dashboard",
    projectId: "project-quote-builder",
    useAiWorker: true,
    aiWorkerReadiness: { ready: true, approvalId: "approval-builder-failure", approval: { budget: { maxUsd: 0.25 } }, inputCostPerMillionUsd: 2, outputCostPerMillionUsd: 10, blockers: [] },
    workProductProvider: async () => { throw new Error("provider unavailable"); },
    root,
    now: new Date("2026-07-19T19:00:00.000Z")
  }), /provider unavailable/);
  const jobs = readdirSync(path.join(root, ".codex/jobs"))
    .filter((name) => name.startsWith("job-runtime-operator-") && name.endsWith(".json"))
    .filter((name) => !existingJobs.has(name));
  assert.equal(jobs.length, 1);
  const job = JSON.parse(readFileSync(path.join(root, ".codex/jobs", jobs[0]), "utf8"));
  assert.equal(job.status, "failed");
  assert.match(job.blockedReason, /builder failed closed/);
  assert.equal(job.approvalRequired, false);
});

test("a successful builder use remains audited when the independent critic later fails", async () => {
  const root = tempWorkspace();
  const builderApprovalId = "approval-builder-before-critic-failure";
  await assert.rejects(() => submitOwnerCommand({
    command: "Build a private operations dashboard",
    projectId: "project-quote-builder",
    useAiWorker: true,
    aiWorkerReadiness: { ready: true, approvalId: builderApprovalId, approval: { budget: { maxUsd: 0.25 } }, inputCostPerMillionUsd: 2, outputCostPerMillionUsd: 10, blockers: [] },
    aiCriticReadiness: { ready: true, required: true, approvalId: "approval-critic-failure", approval: { budget: { maxUsd: 0.25 } }, inputCostPerMillionUsd: 1, outputCostPerMillionUsd: 5, blockers: [] },
    workProductProvider: async () => ({ workProduct: safeWorkProduct(), model: "builder-model", usage: { input_tokens: 100, output_tokens: 100 } }),
    criticProvider: async () => { throw new Error("critic response truncated"); },
    root,
    now: new Date("2026-07-19T19:05:00.000Z")
  }), /critic response truncated/);
  const audits = readdirSync(path.join(root, ".codex/audit")).filter((name) => name.endsWith(".json")).map((name) => JSON.parse(readFileSync(path.join(root, ".codex/audit", name), "utf8")));
  assert.equal(audits.filter((record) => record.eventType === "standing_approval_used" && record.relatedArtifacts.some((item) => item.reference === builderApprovalId)).length, 1);
});

test("concurrent paid calls cannot consume the same approval before its usage audit is written", async () => {
  const root = tempWorkspace();
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const readiness = {
    ready: true,
    approvalId: "approval-20260713-anthropic-builder-concurrency",
    approval: { budget: { maxUsd: 0.25 } },
    inputCostPerMillionUsd: 2,
    outputCostPerMillionUsd: 10,
    blockers: []
  };
  const first = submitOwnerCommand({
    command: "Build a private operations dashboard",
    projectId: "project-quote-builder",
    useAiWorker: true,
    aiWorkerReadiness: readiness,
    workProductProvider: async () => {
      await gate;
      return { workProduct: safeWorkProduct(), model: "claude-sonnet-5", usage: { input_tokens: 10, output_tokens: 10 } };
    },
    root,
    now: new Date("2026-07-13T18:50:00.000Z")
  });
  await assert.rejects(() => submitOwnerCommand({
    command: "Build another private operations dashboard",
    projectId: "project-quote-builder",
    useAiWorker: true,
    aiWorkerReadiness: readiness,
    workProductProvider: async () => ({ workProduct: safeWorkProduct(), model: "claude-sonnet-5", usage: {} }),
    root,
    now: new Date("2026-07-13T18:50:01.000Z")
  }), /already has a call in progress/);
  release();
  assert.equal((await first).status, "done");
});
