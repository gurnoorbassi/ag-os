import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { isoTimestamp, normalizeRunId, writeJson } from "./common.mjs";
import { fetchWithTimeout } from "./fetch-with-timeout.mjs";

const API_BASE = "https://api.github.com";

function safeSegment(value, label) {
  const text = String(value || "").trim();
  if (!/^[A-Za-z0-9_.-]+$/.test(text) || text === "." || text === "..") {
    throw new Error(`invalid GitHub ${label}`);
  }
  return text;
}

function safeProjectRecordPath(value) {
  const normalized = String(value || "").replaceAll("\\", "/");
  if (!/^\.codex\/projects\/[a-z0-9-]+\.json$/.test(normalized)) {
    throw new Error("GitHub private repository projectRecordPath must identify one AG OS project record");
  }
  return normalized;
}

export function validateGitHubPrivateRepositoryRequest({ request, root = process.cwd() }) {
  if (request?.adapterId !== "github-private-repository" || request?.operation !== "create_private_repository") {
    throw new Error("executionRequest must select github-private-repository and create_private_repository");
  }
  const owner = safeSegment(request.repository?.owner, "repository owner");
  const name = safeSegment(request.repository?.name, "repository name");
  const projectRecordPath = safeProjectRecordPath(request.projectRecordPath);
  const absoluteProjectPath = path.join(root, projectRecordPath);
  if (!existsSync(absoluteProjectPath)) throw new Error("GitHub private repository project record does not exist");
  const project = JSON.parse(readFileSync(absoluteProjectPath, "utf8"));
  if (project.id !== request.projectId) throw new Error("GitHub private repository project id does not match its record");
  return {
    owner,
    name,
    repository: `${owner}/${name}`,
    description: String(request.description || `Private source repository for ${project.name}`).trim().slice(0, 350),
    project,
    projectRecordPath
  };
}

export function githubPrivateRepositoryApprovalCriteria(validated) {
  return [
    `Repository is exactly ${validated.repository}.`,
    "Repository visibility is exactly private.",
    `Project record is exactly ${validated.projectRecordPath}.`
  ];
}

function assertApproval({ approval, job, adapter, validated }) {
  if (!approval || approval.status !== "approved") throw new Error("GitHub repository creation requires an active exact approval");
  if (approval.projectId !== job.projectId) throw new Error("GitHub repository approval project does not match the job");
  if (!approval.approvedActions?.includes(adapter.requestedAction)) throw new Error("GitHub repository approval does not cover repository creation");
  if (approval.target !== `${job.projectId}:${job.jobId}:${adapter.adapterId}`) throw new Error("GitHub repository approval target does not match");
  for (const criterion of githubPrivateRepositoryApprovalCriteria(validated)) {
    if (!approval.inclusionCriteria?.includes(criterion)) throw new Error(`GitHub repository approval is missing exact criterion: ${criterion}`);
  }
}

function assertApprovalStillActive({ approvalId, root, now }) {
  const record = JSON.parse(readFileSync(path.join(root, ".codex", "approvals", `${approvalId}.json`), "utf8"));
  if (record.status !== "approved") throw new Error(`GitHub repository approval is ${record.status}`);
  if (!record.expiresAt || Date.parse(record.expiresAt) <= now.getTime()) throw new Error("GitHub repository approval expired");
}

async function github(fetchImpl, token, method, pathname, body, timeoutMs) {
  const response = await fetchWithTimeout(fetchImpl, `${API_BASE}${pathname}`, {
    method,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "x-github-api-version": "2022-11-28"
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  }, timeoutMs);
  if (response.status === 404 && method === "GET") return null;
  if (!response.ok) throw new Error(`GitHub ${method} ${pathname} failed with HTTP ${response.status}`);
  return response.status === 204 ? null : response.json();
}

export async function executeGitHubPrivateRepository({ request, job, adapter, approval, token, fetchImpl = globalThis.fetch, root = process.cwd(), now = new Date(), timeoutMs = process.env.AG_OS_PROVIDER_TIMEOUT_MS }) {
  if (!token) throw new Error("GitHub private runtime credential is not configured");
  const validated = validateGitHubPrivateRepositoryRequest({ request, root });
  assertApproval({ approval, job, adapter, validated });
  const repoPath = `/repos/${encodeURIComponent(validated.owner)}/${encodeURIComponent(validated.name)}`;
  let repository = await github(fetchImpl, token, "GET", repoPath, undefined, timeoutMs);
  let created = false;
  if (!repository) {
    assertApprovalStillActive({ approvalId: approval.approvalId, root, now });
    repository = await github(fetchImpl, token, "POST", "/user/repos", {
      name: validated.name,
      description: validated.description,
      private: true,
      auto_init: true,
      has_issues: true,
      has_projects: false,
      has_wiki: false
    }, timeoutMs);
    created = true;
  }
  if (repository.full_name !== validated.repository || repository.private !== true) {
    throw new Error("GitHub repository result did not match the exact private target");
  }

  const project = JSON.parse(readFileSync(path.join(root, validated.projectRecordPath), "utf8"));
  const timestamp = isoTimestamp(now);
  const updatedProject = {
    ...project,
    knownFacts: [...new Set([...(project.knownFacts || []), `The canonical private source repository is ${repository.html_url}.`])],
    ownerWorkspace: {
      ...(project.ownerWorkspace || {}),
      summary: project.ownerWorkspace?.summary || project.goal,
      sourceControlStatus: "connected",
      sourceControlDetail: "Canonical private GitHub repository created and bound by an exact owner-approved AG OS job.",
      repositoryUrl: repository.html_url,
      repositoryFullName: repository.full_name,
      repositoryVisibility: "private",
      defaultBranch: repository.default_branch || "main",
      adapters: [
        ...(project.ownerWorkspace?.adapters || []).filter((entry) => entry.adapterId !== "github-draft-pr"),
        {
          adapterId: "github-draft-pr",
          status: "ready",
          target: repository.full_name,
          detail: "Exact codex/* branch and draft pull-request work is available after owner approval."
        }
      ],
      operations: project.ownerWorkspace?.operations || [
        "Give AG OS a command targeted to this project.",
        "Review jobs, evidence, quality, lessons, and cost.",
        "Open the canonical source repository."
      ]
    },
    updatedAt: timestamp
  };
  writeJson(validated.projectRecordPath, updatedProject, root);

  const runId = normalizeRunId(job.jobId.replace(/^job-/, ""));
  const workspacePath = `.codex/workspaces/${runId}-github-private-repository`;
  mkdirSync(path.join(root, workspacePath), { recursive: true });
  const workProductPath = `${workspacePath}/WORK_PRODUCT.md`;
  writeFileSync(path.join(root, workProductPath), `# Private repository provisioning\n\n- Project: ${project.name}\n- Repository: ${repository.full_name}\n- Visibility: private\n- Created by this run: ${created}\n- Default branch: ${repository.default_branch || "main"}\n`, "utf8");
  const record = {
    connectorExecutionId: `connector-exec-${runId}-github-private-repository`,
    status: "done",
    connectorId: "connector-github-mcp",
    requestedAction: adapter.requestedAction,
    riskLevel: job.riskLevel,
    projectId: job.projectId,
    approvalRequired: true,
    approvalId: approval.approvalId,
    requiredPermissions: ["repository_create"],
    evidenceRequired: ["exact owner", "exact repository name", "private visibility", "bound project record"],
    safety: {
      executesLiveAction: created,
      usesCredentials: true,
      triggersDeployment: false,
      changesDomain: false,
      usesPaidAction: false,
      accessesProductionData: false
    },
    result: {
      repositoryFullName: repository.full_name,
      repositoryUrl: repository.html_url,
      repositoryVisibility: "private",
      repositoryId: String(repository.id),
      defaultBranch: repository.default_branch || "main",
      created,
      projectRecordPath: validated.projectRecordPath
    },
    prohibitedActionsConfirmedFalse: ["pull_request_merge", "deployment", "credential_change", "paid_action", "dns_change"],
    notes: "Created or verified only the exact approved private repository and bound it to the matching AG OS project.",
    createdAt: timestamp,
    updatedAt: timestamp
  };
  const filePath = `.codex/connectors/${record.connectorExecutionId}.json`;
  writeJson(filePath, record, root);
  return { record, filePath, workProductPath };
}
