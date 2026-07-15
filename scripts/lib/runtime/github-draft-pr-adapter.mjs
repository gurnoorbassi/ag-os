import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { scanSecrets } from "../security/secret-scanner.mjs";
import { isoTimestamp, normalizeRunId, writeJson } from "./common.mjs";

const API_BASE = "https://api.github.com";
const MAX_FILES = 100;
const MAX_FILE_BYTES = 500_000;
const MAX_TOTAL_BYTES = 2_000_000;
const TEXT_EXTENSIONS = new Set([".css", ".csv", ".html", ".js", ".json", ".md", ".mjs", ".svg", ".txt", ".yaml", ".yml"]);

function safeSegment(value, label) {
  const text = String(value || "").trim();
  if (!/^[A-Za-z0-9_.-]+$/.test(text) || text === "." || text === "..") throw new Error(`invalid GitHub ${label}`);
  return text;
}

function safeBranch(value) {
  const branch = String(value || "").trim();
  if (!/^codex\/[A-Za-z0-9][A-Za-z0-9._/-]{0,199}$/.test(branch) || branch.includes("..") || branch.endsWith("/")) {
    throw new Error("GitHub draft PR branch must be a safe codex/* branch");
  }
  return branch;
}

function sourceDirectoryPath(value, root) {
  const normalized = String(value || "").replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/$/, "");
  if (!normalized.startsWith(".codex/workspaces/") || normalized.split("/").includes("..")) {
    throw new Error("GitHub sourceDirectory must be inside .codex/workspaces");
  }
  const absolute = path.resolve(root, normalized);
  const workspaceRoot = path.resolve(root, ".codex/workspaces");
  if (!absolute.startsWith(`${workspaceRoot}${path.sep}`)) throw new Error("GitHub sourceDirectory escapes the isolated workspace");
  return { normalized, absolute };
}

function collectFiles(directory) {
  const files = [];
  let totalBytes = 0;
  function walk(absoluteDirectory, prefix = "") {
    for (const entry of readdirSync(absoluteDirectory, { withFileTypes: true })) {
      const absolute = path.join(absoluteDirectory, entry.name);
      const relative = path.posix.join(prefix, entry.name);
      const stat = lstatSync(absolute);
      if (stat.isSymbolicLink()) throw new Error(`GitHub source files must not contain symlinks: ${relative}`);
      if (entry.isDirectory()) {
        walk(absolute, relative);
        continue;
      }
      if (!entry.isFile()) continue;
      const extension = path.extname(entry.name).toLowerCase();
      if (!TEXT_EXTENSIONS.has(extension)) throw new Error(`GitHub source file extension is not allowed: ${relative}`);
      if (stat.size > MAX_FILE_BYTES) throw new Error(`GitHub source file exceeds ${MAX_FILE_BYTES} bytes: ${relative}`);
      totalBytes += stat.size;
      if (totalBytes > MAX_TOTAL_BYTES) throw new Error(`GitHub source files exceed ${MAX_TOTAL_BYTES} total bytes`);
      files.push({ path: relative, content: readFileSync(absolute, "utf8") });
      if (files.length > MAX_FILES) throw new Error(`GitHub source directory exceeds ${MAX_FILES} files`);
    }
  }
  walk(directory.absolute);
  if (files.length === 0) throw new Error("GitHub sourceDirectory contains no eligible files");
  return { files, totalBytes };
}

export function validateGitHubDraftPrRequest({ request, root = process.cwd() }) {
  if (request?.adapterId !== "github-draft-pr" || request?.operation !== "create_draft_pr") {
    throw new Error("executionRequest must select the GitHub draft PR adapter and create_draft_pr operation");
  }
  const owner = safeSegment(request.repository?.owner, "repository owner");
  const repo = safeSegment(request.repository?.name, "repository name");
  const baseBranch = safeSegment(request.baseBranch || "main", "base branch");
  const expectedBaseCommit = String(request.expectedBaseCommit || "").trim().toLowerCase();
  if (!/^[a-f0-9]{40}$/.test(expectedBaseCommit)) throw new Error("GitHub expectedBaseCommit must be an exact 40-character commit SHA");
  const branch = safeBranch(request.branch);
  const title = String(request.title || "").trim();
  if (!title || title.length > 200) throw new Error("GitHub draft PR title must be between 1 and 200 characters");
  const directory = sourceDirectoryPath(request.sourceDirectory, root);
  const secretScan = scanSecrets({ root: directory.absolute });
  if (!secretScan.ok) throw new Error(`GitHub source secret scan failed with ${secretScan.findings.length} finding(s)`);
  const source = collectFiles(directory);
  if (!source.files.some((file) => file.path === "WORK_PRODUCT.md")) {
    throw new Error("GitHub sourceDirectory must include WORK_PRODUCT.md completion evidence");
  }
  const sourceDigest = createHash("sha256");
  for (const file of source.files) sourceDigest.update(file.path).update("\0").update(file.content).update("\0");
  return {
    owner,
    repo,
    repository: `${owner}/${repo}`,
    baseBranch,
    expectedBaseCommit,
    branch,
    title,
    body: String(request.body || "AG OS generated work product. Review is required before merge."),
    directory,
    source,
    sourceDigest: sourceDigest.digest("hex"),
    secretScanPassed: true
  };
}

function assertApproval({ approval, job, adapter, validated }) {
  if (!approval || approval.status !== "approved") throw new Error("GitHub execution requires an active exact approval");
  if (approval.projectId !== job.projectId) throw new Error("GitHub approval project does not match the job");
  if (!approval.approvedActions?.includes(adapter.requestedAction)) throw new Error("GitHub approval does not cover draft PR creation");
  if (!approval.inclusionCriteria?.includes(`Job is exactly ${job.jobId}.`)) throw new Error("GitHub approval does not name the exact job");
  const target = `${job.projectId}:${job.jobId}:${adapter.adapterId}`;
  if (approval.target !== target) throw new Error("GitHub approval target does not match the exact job and adapter");
  if (approval.prohibitedActions?.includes(adapter.requestedAction)) throw new Error("GitHub requested action is prohibited by the approval");
  if (!validated.branch.startsWith("codex/")) throw new Error("GitHub approval permits codex/* branches only");
  if (!approval.inclusionCriteria?.includes(`Repository is exactly ${validated.repository}.`)) throw new Error("GitHub approval repository does not match");
  if (!approval.inclusionCriteria?.includes(`Branch is exactly ${validated.branch}.`)) throw new Error("GitHub approval branch does not match");
  if (!approval.inclusionCriteria?.includes(`Base commit is exactly ${validated.expectedBaseCommit}.`)) throw new Error("GitHub approval base commit does not match");
  if (!approval.inclusionCriteria?.includes(`Source digest is exactly sha256:${validated.sourceDigest}.`)) throw new Error("GitHub approval source digest does not match");
}

function assertApprovalStillActive({ approvalId, root, now = new Date() }) {
  const approvalPath = path.join(root, ".codex", "approvals", `${approvalId}.json`);
  let current;
  try {
    current = JSON.parse(readFileSync(approvalPath, "utf8"));
  } catch {
    throw new Error("GitHub approval record is unavailable before connector mutation");
  }
  if (current.status !== "approved") throw new Error(`GitHub approval is ${current.status}; stop before the next connector mutation`);
  if (!current.expiresAt || Date.parse(current.expiresAt) <= now.getTime()) throw new Error("GitHub approval expired before the next connector mutation");
}

async function github(fetchImpl, token, method, pathname, body) {
  const response = await fetchImpl(`${API_BASE}${pathname}`, {
    method,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "x-github-api-version": "2022-11-28"
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  if (!response.ok) throw new Error(`GitHub ${method} ${pathname} failed with HTTP ${response.status}`);
  return response.status === 204 ? null : response.json();
}

export async function executeGitHubDraftPr({ request, job, plan, adapter, approval, token, fetchImpl = globalThis.fetch, root = process.cwd(), now = new Date() }) {
  if (!token) throw new Error("GitHub private runtime credential is not configured");
  if (typeof fetchImpl !== "function") throw new Error("GitHub transport is unavailable");
  const validated = validateGitHubDraftPrRequest({ request, root });
  assertApproval({ approval, job, adapter, validated });
  const mutate = async (method, pathname, body) => {
    assertApprovalStillActive({ approvalId: approval.approvalId, root, now });
    return github(fetchImpl, token, method, pathname, body);
  };
  const repoPath = `/repos/${encodeURIComponent(validated.owner)}/${encodeURIComponent(validated.repo)}`;
  const baseRef = await github(fetchImpl, token, "GET", `${repoPath}/git/ref/heads/${encodeURIComponent(validated.baseBranch)}`);
  if (baseRef.object.sha !== validated.expectedBaseCommit) throw new Error("GitHub base branch moved after approval; stop before connector mutation");
  const baseCommit = await github(fetchImpl, token, "GET", `${repoPath}/git/commits/${baseRef.object.sha}`);
  const treeEntries = [];
  for (const file of validated.source.files) {
    const blob = await mutate("POST", `${repoPath}/git/blobs`, {
      content: file.content,
      encoding: "utf-8"
    });
    treeEntries.push({ path: file.path, mode: "100644", type: "blob", sha: blob.sha });
  }
  const tree = await mutate("POST", `${repoPath}/git/trees`, {
    base_tree: baseCommit.tree.sha,
    tree: treeEntries
  });
  const commit = await mutate("POST", `${repoPath}/git/commits`, {
    message: `AG OS: ${validated.title}`,
    tree: tree.sha,
    parents: [baseRef.object.sha]
  });
  await mutate("POST", `${repoPath}/git/refs`, {
    ref: `refs/heads/${validated.branch}`,
    sha: commit.sha
  });
  const pullRequest = await mutate("POST", `${repoPath}/pulls`, {
    title: validated.title,
    head: validated.branch,
    base: validated.baseBranch,
    body: validated.body,
    draft: true
  });
  if (pullRequest.draft !== true) throw new Error("GitHub returned a pull request that is not draft; stop for owner review");

  const timestamp = isoTimestamp(now);
  const runId = normalizeRunId(job.jobId.replace(/^job-/, ""));
  const record = {
    connectorExecutionId: `connector-exec-${runId}-github-draft-pr`,
    status: "done",
    connectorId: "connector-github-mcp",
    requestedAction: adapter.requestedAction,
    riskLevel: job.riskLevel,
    projectId: job.projectId,
    approvalRequired: true,
    approvalId: approval.approvalId,
    requiredPermissions: ["repository_contents_write", "pull_requests_write"],
    evidenceRequired: ["secret scan pass", "exact branch", "draft pull request URL", "immutable head commit"],
    safety: {
      executesLiveAction: true,
      usesCredentials: true,
      triggersDeployment: false,
      changesDomain: false,
      usesPaidAction: false,
      accessesProductionData: false
    },
    result: {
      repository: validated.repository,
      baseBranch: validated.baseBranch,
      baseCommit: validated.expectedBaseCommit,
      branch: validated.branch,
      headCommit: commit.sha,
      pullRequestNumber: pullRequest.number,
      pullRequestUrl: pullRequest.html_url,
      draft: true,
      fileCount: validated.source.files.length,
      totalBytes: validated.source.totalBytes,
      secretScanPassed: true
    },
    prohibitedActionsConfirmedFalse: ["merge", "deployment", "credential_change", "paid_action", "dns_change"],
    notes: "Created only the approved codex/* branch and draft pull request. Merge and deployment remain separately gated.",
    createdAt: timestamp,
    updatedAt: timestamp
  };
  const filePath = `.codex/connectors/${record.connectorExecutionId}.json`;
  writeJson(filePath, record, root);
  return { record, filePath, workProductPath: `${validated.directory.normalized}/WORK_PRODUCT.md` };
}
