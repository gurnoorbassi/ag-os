import path from "node:path";
import process from "node:process";
import { isoTimestamp, normalizeRunId, slugify, writeJson, writeText } from "./common.mjs";
import { toAnthropicStructuredOutputSchema } from "./anthropic-planner.mjs";
import { loadWorkerEvidence } from "./worker-evidence-loader.mjs";
import { finalizeAnthropicBudgetReservation, reserveAnthropicBudget } from "./anthropic-budget-guard.mjs";
import { fetchWithTimeout } from "./fetch-with-timeout.mjs";
import { writeAnthropicApprovalUse } from "./anthropic-usage-audit.mjs";

const DEFAULT_BASE_URL = "https://api.anthropic.com";
const ANTHROPIC_VERSION = "2023-06-01";
const ALLOWED_EXTENSIONS = new Set([".css", ".html", ".js", ".json", ".md", ".svg", ".txt", ".xml", ".yaml", ".yml"]);
const MAX_FILES = 20;
const MAX_FILE_BYTES = 200_000;
const MAX_TOTAL_BYTES = 1_000_000;
export const ANTHROPIC_WORKER_MAX_TOKENS = 16_000;
export const ANTHROPIC_WORKER_TIMEOUT_MS = 120_000;

export const WORK_PRODUCT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "files", "validationNotes", "qualityEvidence"],
  properties: {
    summary: { type: "string", minLength: 1 },
    files: {
      type: "array",
      minItems: 1,
      maxItems: MAX_FILES,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["path", "content", "purpose"],
        properties: {
          path: { type: "string", minLength: 1 },
          content: { type: "string", minLength: 1 },
          purpose: { type: "string", minLength: 1 }
        }
      }
    },
    validationNotes: { type: "array", items: { type: "string", minLength: 1 } },
    qualityEvidence: { type: "array", minItems: 1, items: { type: "string", minLength: 1 } }
  }
};

function normalizedArtifactPath(value) {
  const normalized = String(value || "").replaceAll("\\", "/").replace(/^\.\//, "");
  if (!normalized || normalized.startsWith("/") || normalized.split("/").includes("..")) {
    throw new Error(`worker returned an unsafe artifact path: ${value}`);
  }
  if (normalized.split("/").some((part) => part.startsWith("."))) {
    throw new Error(`worker artifacts must not create hidden files: ${value}`);
  }
  const extension = path.posix.extname(normalized).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(extension)) throw new Error(`worker artifact extension is not allowed: ${extension || "none"}`);
  if (extension === ".xml" && normalized !== "sitemap.xml") {
    throw new Error(`worker XML artifacts are limited to a root sitemap.xml: ${normalized}`);
  }
  return normalized;
}

export function assertWorkProductShape(workProduct) {
  if (!workProduct || typeof workProduct !== "object" || Array.isArray(workProduct)) throw new Error("worker output must be an object");
  if (typeof workProduct.summary !== "string" || workProduct.summary.trim().length === 0) throw new Error("worker summary is required");
  if (!Array.isArray(workProduct.files) || workProduct.files.length < 1 || workProduct.files.length > MAX_FILES) {
    throw new Error(`worker must return between 1 and ${MAX_FILES} files`);
  }
  let totalBytes = 0;
  const paths = new Set();
  for (const file of workProduct.files) {
    const safePath = normalizedArtifactPath(file?.path);
    if (paths.has(safePath)) throw new Error(`worker returned duplicate artifact path: ${safePath}`);
    paths.add(safePath);
    if (typeof file.content !== "string" || file.content.length === 0) throw new Error(`worker artifact content is required: ${safePath}`);
    const bytes = Buffer.byteLength(file.content, "utf8");
    if (bytes > MAX_FILE_BYTES) throw new Error(`worker artifact exceeds ${MAX_FILE_BYTES} bytes: ${safePath}`);
    totalBytes += bytes;
    if (path.posix.extname(safePath).toLowerCase() === ".json") JSON.parse(file.content);
  }
  if (totalBytes > MAX_TOTAL_BYTES) throw new Error(`worker artifacts exceed ${MAX_TOTAL_BYTES} total bytes`);
  if (!Array.isArray(workProduct.qualityEvidence) || workProduct.qualityEvidence.length === 0) throw new Error("worker quality evidence is required");
  return { totalBytes, paths: [...paths] };
}

export function assertWorkProductMatchesCommand({ command, workProduct }) {
  const rawCommand = String(command?.rawCommand ?? command ?? "");
  const paths = workProduct.files.map((file) => normalizedArtifactPath(file.path));
  if (/\b(?:web\s*site|website|landing\s+page)\b/i.test(rawCommand) && !paths.includes("index.html")) {
    throw new Error("website work product must include a root index.html entry file");
  }
  return { paths };
}

export async function createAnthropicWorkProduct({ command, job, plan, apiKey, model, baseUrl = DEFAULT_BASE_URL, fetchImpl = globalThis.fetch, root = process.cwd(), inputCostPerMillionUsd, outputCostPerMillionUsd, approvalId, approvalMaxUsd, env, now, timeoutMs = process.env.AG_OS_AI_WORKER_TIMEOUT_MS || ANTHROPIC_WORKER_TIMEOUT_MS }) {
  if (!apiKey) throw new Error("Anthropic worker credential is not configured");
  if (!model) throw new Error("Anthropic worker model is not configured");
  if (typeof fetchImpl !== "function") throw new Error("Anthropic worker fetch implementation is unavailable");
  const workerEvidence = loadWorkerEvidence({ plan, root });
  const requestBody = {
    model,
    max_tokens: ANTHROPIC_WORKER_MAX_TOKENS,
    system: "You are the AG OS builder worker. Produce professional work-product files that satisfy the approved plan. Work only inside the isolated artifact workspace. Never include secrets, credentials, customer data, production data, deployment commands, messages, posts, paid actions, DNS changes, or claims that an external action occurred. Return complete usable file contents, not placeholders. For a website or landing page, return a complete root index.html entry file; add root-relative CSS or JavaScript files only when needed.",
    messages: [{
      role: "user",
      content: JSON.stringify({
        ownerOutcome: command.rawCommand,
        projectId: plan.projectId,
        planSummary: plan.summary,
        tasks: plan.tasks,
        expectedOutput: plan.expectedOutput,
        qualityBar: plan.basis?.qualityBar || [],
        relevantLessons: workerEvidence.lessons,
        qualityExamples: workerEvidence.examples,
        ownerOutcomeFeedback: workerEvidence.outcomes,
        evidenceStrategy: workerEvidence.strategy,
        evidenceGrantsPermission: false,
        stopConditions: plan.stopConditions,
        deliverableContract: /\b(?:web\s*site|website|landing\s+page)\b/i.test(command.rawCommand)
          ? { kind: "website", requiredEntryFile: "index.html", ownerUsable: true }
          : { kind: "files", ownerUsable: true }
      })
    }],
    output_config: {
      format: {
        type: "json_schema",
        schema: toAnthropicStructuredOutputSchema(WORK_PRODUCT_SCHEMA)
      }
    }
  };
  const budgetReservation = reserveAnthropicBudget({
    kind: "worker",
    job,
    requestBody,
    maxTokens: ANTHROPIC_WORKER_MAX_TOKENS,
    inputCostPerMillionUsd,
    outputCostPerMillionUsd,
    approvalId,
    approvalMaxUsd,
    root,
    env,
    now
  });
  let providerAcceptedRequest = false;
  let providerModel = model;
  let providerUsage = null;
  try {
    const response = await fetchWithTimeout(fetchImpl, `${baseUrl.replace(/\/$/, "")}/v1/messages`, {
    method: "POST",
    headers: {
      "anthropic-version": ANTHROPIC_VERSION,
      "content-type": "application/json",
      "x-api-key": apiKey
    },
      body: JSON.stringify(requestBody)
    }, timeoutMs);
    if (!response.ok) throw new Error(`Anthropic worker request failed with HTTP ${response.status}`);
    providerAcceptedRequest = true;
    const payload = await response.json();
    providerModel = payload.model || model;
    providerUsage = payload.usage || {};
    if (["max_tokens", "model_context_window_exceeded"].includes(payload.stop_reason)) {
      throw new Error(`Anthropic worker returned a truncated structured response (${payload.stop_reason})`);
    }
    const text = payload.content?.find((block) => block.type === "text")?.text;
    if (!text) throw new Error("Anthropic worker returned no structured work product");
    const workProduct = JSON.parse(text);
    const validation = assertWorkProductShape(workProduct);
    assertWorkProductMatchesCommand({ command, workProduct });
    const usageAudit = writeAnthropicApprovalUse({ kind: "worker", job, approvalId, model: providerModel, usage: providerUsage, inputCostPerMillionUsd, outputCostPerMillionUsd, reservation: budgetReservation, root, now });
    return { workProduct, validation, model: providerModel, usage: providerUsage, budgetReservation, usageAuditPath: usageAudit.filePath };
  } catch (error) {
    const usageAudit = providerAcceptedRequest
      ? writeAnthropicApprovalUse({ kind: "worker", job, approvalId, model: providerModel, usage: providerUsage, inputCostPerMillionUsd, outputCostPerMillionUsd, reservation: budgetReservation, outcome: "failed_after_provider_acceptance", root, now })
      : null;
    finalizeAnthropicBudgetReservation({ reservation: budgetReservation, consumed: providerAcceptedRequest, actualCostUsd: usageAudit?.billingReconciled ? usageAudit.costUsd : undefined, root, now });
    throw error;
  }
}

export function writeAnthropicWorkProduct({ job, plan, command, result, runId, root = process.cwd(), now = new Date() }) {
  if (!result?.approvalId) throw new Error("Anthropic worker execution requires an exact approvalId");
  const validation = assertWorkProductShape(result?.workProduct);
  assertWorkProductMatchesCommand({ command, workProduct: result.workProduct });
  const workspace = `.codex/workspaces/${slugify(job.projectId)}/${slugify(job.jobId)}/deliverables`;
  const written = result.workProduct.files.map((file) => {
    const relative = normalizedArtifactPath(file.path);
    const recordPath = `${workspace}/${relative}`;
    writeText(recordPath, file.content, root);
    return recordPath.replaceAll("\\", "/");
  });
  const timestamp = isoTimestamp(now);
  const executionStep = {
    executionStepId: `exec-${normalizeRunId(runId || job.jobId.replace(/^job-/, ""))}-anthropic-work-product`,
    planId: plan.planId,
    jobId: job.jobId,
    projectId: job.projectId,
    stepType: "update_files",
    status: "done",
    riskLevel: job.riskLevel || plan.riskLevel || "R1",
    approvalId: result.approvalId,
    command: "Generate bounded professional work-product files through the separately approved Anthropic builder worker.",
    expectedResult: plan.expectedOutput,
    evidenceRequired: [...written, "token and cost ledger", "quality score", "lesson candidates"],
    rollbackRequired: false,
    rollbackPlan: "Remove only the isolated generated deliverable directory before owner acceptance.",
    safety: {
      credentialsAllowed: true,
      liveServiceUseAllowed: true,
      deploymentAllowed: false,
      domainChangeAllowed: false,
      productionDataAllowed: false,
      paidActionAllowed: true
    },
    deliverable: {
      kind: written.some((recordPath) => recordPath.endsWith("/index.html")) ? "website" : "files",
      ownerUsable: true,
      previewAvailable: written.some((recordPath) => recordPath.endsWith("/index.html")),
      entryFile: written.find((recordPath) => recordPath.endsWith("/index.html"))?.slice(`${workspace}/`.length) || "",
      files: written
    },
    createdAt: timestamp,
    updatedAt: timestamp
  };
  const executionPath = `.codex/execution/${executionStep.executionStepId}.json`;
  writeJson(executionPath, executionStep, root);
  const manifestPath = `${workspace}/WORK_PRODUCT.md`;
  const manifest = [
    `# ${result.workProduct.summary}`,
    "",
    ...result.workProduct.files.map((file) => `- \`${normalizedArtifactPath(file.path)}\`: ${file.purpose}`),
    "",
    "## Quality evidence",
    "",
    ...result.workProduct.qualityEvidence.map((item) => `- ${item}`),
    "",
    `Total generated bytes: ${validation.totalBytes}`,
    ""
  ].join("\n");
  writeText(manifestPath, manifest, root);
  return { executionPath, executionStep, workProductPath: manifestPath, workProductPaths: [manifestPath, ...written], deliverable: executionStep.deliverable };
}
