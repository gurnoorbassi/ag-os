import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { scanSecrets } from "../security/secret-scanner.mjs";
import { isoTimestamp, normalizeRunId, writeJson } from "./common.mjs";
import { assertApprovalStillActive, assertExactConnectorApproval } from "./connector-approval-guard.mjs";
import { fetchWithTimeout } from "./fetch-with-timeout.mjs";
import { assertSafeStaticNetlifyToml } from "./static-netlify-config.mjs";

const API_BASE = "https://api.netlify.com/api/v1";
const MAX_FILES = 200;
const MAX_FILE_BYTES = 2_000_000;
const MAX_TOTAL_BYTES = 10_000_000;
const PUBLIC_EXTENSIONS = new Set([".css", ".gif", ".html", ".ico", ".jpeg", ".jpg", ".js", ".json", ".map", ".png", ".svg", ".toml", ".txt", ".webp", ".woff", ".woff2", ".xml"]);

function safeValue(value, label, pattern) {
  const text = String(value || "").trim();
  if (!pattern.test(text)) throw new Error(`invalid Netlify ${label}`);
  return text;
}

function sourceDirectory(value, root) {
  const normalized = String(value || "").replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/$/, "");
  if (!normalized.startsWith(".codex/workspaces/") || normalized.split("/").includes("..")) {
    throw new Error("Netlify sourceDirectory must be inside .codex/workspaces");
  }
  const absolute = path.resolve(root, normalized);
  const workspaceRoot = path.resolve(root, ".codex/workspaces");
  if (!absolute.startsWith(`${workspaceRoot}${path.sep}`)) throw new Error("Netlify sourceDirectory escapes the isolated workspace");
  return { normalized, absolute };
}

function collectFiles(directory) {
  if (!existsSync(directory.absolute)) throw new Error("Netlify sourceDirectory does not exist");
  const files = [];
  let totalBytes = 0;
  let workProductPresent = false;
  function walk(absoluteDirectory, prefix = "") {
    for (const entry of readdirSync(absoluteDirectory, { withFileTypes: true })) {
      const absolute = path.join(absoluteDirectory, entry.name);
      const relative = path.posix.join(prefix, entry.name);
      const stat = lstatSync(absolute);
      if (stat.isSymbolicLink()) throw new Error(`Netlify source files must not contain symlinks: ${relative}`);
      if (entry.isDirectory()) { walk(absolute, relative); continue; }
      if (!entry.isFile()) continue;
      if (relative === "WORK_PRODUCT.md") { workProductPresent = true; continue; }
      const extension = path.extname(entry.name).toLowerCase();
      if (!PUBLIC_EXTENSIONS.has(extension)) throw new Error(`Netlify source file extension is not allowed: ${relative}`);
      if (extension === ".xml" && relative !== "sitemap.xml") throw new Error(`Netlify XML source files are limited to a root sitemap.xml: ${relative}`);
      if (extension === ".toml") assertSafeStaticNetlifyToml({ filePath: relative, content: readFileSync(absolute, "utf8") });
      if (stat.size > MAX_FILE_BYTES) throw new Error(`Netlify source file exceeds ${MAX_FILE_BYTES} bytes: ${relative}`);
      totalBytes += stat.size;
      if (totalBytes > MAX_TOTAL_BYTES) throw new Error(`Netlify source files exceed ${MAX_TOTAL_BYTES} total bytes`);
      const content = readFileSync(absolute);
      files.push({ path: relative, content, sha1: createHash("sha1").update(content).digest("hex") });
      if (files.length > MAX_FILES) throw new Error(`Netlify source directory exceeds ${MAX_FILES} files`);
    }
  }
  walk(directory.absolute);
  if (!workProductPresent) throw new Error("Netlify sourceDirectory must include private WORK_PRODUCT.md completion evidence");
  if (!files.some((file) => file.path === "index.html")) throw new Error("Netlify sourceDirectory must include index.html");
  return { files, totalBytes };
}

export function validateNetlifyStagingRequest({ request, root = process.cwd() }) {
  if (request?.adapterId !== "netlify-staging" || request?.operation !== "create_draft_deploy") {
    throw new Error("executionRequest must select the Netlify staging adapter and create_draft_deploy operation");
  }
  if (request.draft !== true) throw new Error("Netlify staging adapter requires draft=true");
  const siteId = safeValue(request.siteId, "siteId", /^[A-Za-z0-9-]{3,80}$/);
  const branch = safeValue(request.branch, "branch", /^codex\/[A-Za-z0-9][A-Za-z0-9._/-]{0,199}$/);
  const title = String(request.title || "").trim();
  if (!title || title.length > 200) throw new Error("Netlify deploy title must be between 1 and 200 characters");
  const directory = sourceDirectory(request.sourceDirectory, root);
  const secretScan = scanSecrets({ root: directory.absolute });
  if (!secretScan.ok) throw new Error(`Netlify source secret scan failed with ${secretScan.findings.length} finding(s)`);
  const source = collectFiles(directory);
  const digest = createHash("sha256");
  for (const file of source.files) digest.update(file.path).update("\0").update(file.content).update("\0");
  return { siteId, branch, title, directory, source, sourceDigest: digest.digest("hex"), secretScanPassed: true };
}

export function netlifyApprovalCriteria(validated) {
  return [
    `Netlify site ID is exactly ${validated.siteId}.`,
    `Netlify deploy branch is exactly ${validated.branch}.`,
    `Netlify source digest is exactly sha256:${validated.sourceDigest}.`,
    "Netlify deploy must remain a draft preview and must not publish to production."
  ];
}

async function netlifyJson(fetchImpl, token, method, pathname, body, timeoutMs) {
  const response = await fetchWithTimeout(fetchImpl, `${API_BASE}${pathname}`, {
    method,
    headers: { accept: "application/json", authorization: `Bearer ${token}`, "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  }, timeoutMs);
  if (!response.ok) throw new Error(`Netlify ${method} ${pathname} failed with HTTP ${response.status}`);
  return response.json();
}

export async function executeNetlifyStagingDeploy({ request, job, adapter, approval, token, fetchImpl = globalThis.fetch, root = process.cwd(), now = new Date(), timeoutMs = process.env.AG_OS_PROVIDER_TIMEOUT_MS }) {
  if (!token) throw new Error("Netlify private runtime credential is not configured");
  if (typeof fetchImpl !== "function") throw new Error("Netlify transport is unavailable");
  const validated = validateNetlifyStagingRequest({ request, root });
  assertExactConnectorApproval({ approval, job, adapter, criteria: netlifyApprovalCriteria(validated) });
  const mutate = async (method, pathname, body, headers) => {
    assertApprovalStillActive({ approvalId: approval.approvalId, connectorName: "Netlify", root, now });
    if (!headers) return netlifyJson(fetchImpl, token, method, pathname, body, timeoutMs);
    const response = await fetchWithTimeout(fetchImpl, `${API_BASE}${pathname}`, { method, headers: { authorization: `Bearer ${token}`, ...headers }, body }, timeoutMs);
    if (!response.ok) throw new Error(`Netlify ${method} ${pathname} failed with HTTP ${response.status}`);
    return response.json();
  };
  const fileMap = Object.fromEntries(validated.source.files.map((file) => [`/${file.path}`, file.sha1]));
  const deploy = await mutate("POST", `/sites/${encodeURIComponent(validated.siteId)}/deploys`, {
    files: fileMap,
    draft: true,
    async: false,
    branch: validated.branch,
    title: validated.title
  });
  if (!deploy?.id || deploy.site_id !== validated.siteId || deploy.draft !== true) throw new Error("Netlify did not create the exact draft deploy");
  const byDigest = new Map(validated.source.files.map((file) => [file.sha1, file]));
  for (const digest of deploy.required || []) {
    const file = byDigest.get(digest);
    if (!file) throw new Error(`Netlify requested an unknown file digest: ${digest}`);
    await mutate("PUT", `/deploys/${encodeURIComponent(deploy.id)}/files/${file.path.split("/").map(encodeURIComponent).join("/")}`, file.content, {
      "content-type": "application/octet-stream",
      "content-length": String(file.content.length)
    });
  }
  const verified = await netlifyJson(fetchImpl, token, "GET", `/deploys/${encodeURIComponent(deploy.id)}`);
  if (verified.site_id !== validated.siteId || verified.draft !== true || verified.published_at) {
    throw new Error("Netlify draft verification failed or the deploy was published");
  }
  if (["error", "rejected"].includes(verified.state)) throw new Error(`Netlify draft deploy failed with state ${verified.state}`);

  const timestamp = isoTimestamp(now);
  const runId = normalizeRunId(job.jobId.replace(/^job-/, ""));
  const record = {
    connectorExecutionId: `connector-exec-${runId}-netlify-draft-deploy`,
    status: "done",
    connectorId: "connector-netlify-mcp",
    requestedAction: adapter.requestedAction,
    riskLevel: job.riskLevel,
    projectId: job.projectId,
    approvalRequired: true,
    approvalId: approval.approvalId,
    requiredPermissions: ["site:read", "deploy:create"],
    evidenceRequired: ["secret scan pass", "exact site ID", "draft deploy URL", "source digest"],
    safety: { executesLiveAction: true, usesCredentials: true, triggersDeployment: false, changesDomain: false, usesPaidAction: false, accessesProductionData: false },
    result: { siteId: validated.siteId, deployId: deploy.id, deployUrl: verified.deploy_ssl_url || verified.deploy_url || verified.review_url, state: verified.state, draft: true, branch: validated.branch, fileCount: validated.source.files.length, totalBytes: validated.source.totalBytes, sourceDigest: validated.sourceDigest, secretScanPassed: true },
    prohibitedActionsConfirmedFalse: ["production_publish", "domain_change", "dns_change", "environment_change", "paid_action"],
    notes: "Created only an approved Netlify draft preview. Production publish, domain, DNS, and environment changes remain separately gated.",
    createdAt: timestamp,
    updatedAt: timestamp
  };
  const filePath = `.codex/connectors/${record.connectorExecutionId}.json`;
  writeJson(filePath, record, root);
  return { record, filePath, executionPath: filePath, workProductPath: `${validated.directory.normalized}/WORK_PRODUCT.md` };
}
