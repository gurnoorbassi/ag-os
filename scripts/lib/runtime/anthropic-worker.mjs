import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { isoTimestamp, normalizeRunId, slugify, writeJson } from "./common.mjs";
import { toAnthropicStructuredOutputSchema } from "./anthropic-planner.mjs";
import { loadWorkerEvidence } from "./worker-evidence-loader.mjs";

const DEFAULT_BASE_URL = "https://api.anthropic.com";
const ANTHROPIC_VERSION = "2023-06-01";
const ALLOWED_EXTENSIONS = new Set([".css", ".html", ".js", ".json", ".md", ".svg", ".txt", ".yaml", ".yml"]);
const MAX_FILES = 20;
const MAX_FILE_BYTES = 200_000;
const MAX_TOTAL_BYTES = 1_000_000;

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

export async function createAnthropicWorkProduct({ command, plan, apiKey, model, baseUrl = DEFAULT_BASE_URL, fetchImpl = globalThis.fetch, root = process.cwd() }) {
  if (!apiKey) throw new Error("Anthropic worker credential is not configured");
  if (!model) throw new Error("Anthropic worker model is not configured");
  if (typeof fetchImpl !== "function") throw new Error("Anthropic worker fetch implementation is unavailable");
  const workerEvidence = loadWorkerEvidence({ plan, root });
  const response = await fetchImpl(`${baseUrl.replace(/\/$/, "")}/v1/messages`, {
    method: "POST",
    headers: {
      "anthropic-version": ANTHROPIC_VERSION,
      "content-type": "application/json",
      "x-api-key": apiKey
    },
    body: JSON.stringify({
      model,
      max_tokens: 8000,
      system: "You are the AG OS builder worker. Produce professional work-product files that satisfy the approved plan. Work only inside the isolated artifact workspace. Never include secrets, credentials, customer data, production data, deployment commands, messages, posts, paid actions, DNS changes, or claims that an external action occurred. Return complete usable file contents, not placeholders.",
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
          evidenceStrategy: workerEvidence.strategy,
          evidenceGrantsPermission: false,
          stopConditions: plan.stopConditions
        })
      }],
      output_config: {
        format: {
          type: "json_schema",
          schema: toAnthropicStructuredOutputSchema(WORK_PRODUCT_SCHEMA)
        }
      }
    })
  });
  if (!response.ok) throw new Error(`Anthropic worker request failed with HTTP ${response.status}`);
  const payload = await response.json();
  const text = payload.content?.find((block) => block.type === "text")?.text;
  if (!text) throw new Error("Anthropic worker returned no structured work product");
  const workProduct = JSON.parse(text);
  const validation = assertWorkProductShape(workProduct);
  return { workProduct, validation, model: payload.model || model, usage: payload.usage || {} };
}

export function writeAnthropicWorkProduct({ job, plan, command, result, runId, root = process.cwd(), now = new Date() }) {
  if (!result?.approvalId) throw new Error("Anthropic worker execution requires an exact approvalId");
  const validation = assertWorkProductShape(result?.workProduct);
  const workspace = `.codex/workspaces/${slugify(job.projectId)}/${slugify(job.jobId)}/deliverables`;
  const written = result.workProduct.files.map((file) => {
    const relative = normalizedArtifactPath(file.path);
    const recordPath = `${workspace}/${relative}`;
    const absolute = path.join(root, recordPath);
    mkdirSync(path.dirname(absolute), { recursive: true });
    writeFileSync(absolute, file.content, "utf8");
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
  writeFileSync(path.join(root, manifestPath), manifest, "utf8");
  return { executionPath, executionStep, workProductPath: manifestPath, workProductPaths: [manifestPath, ...written] };
}
