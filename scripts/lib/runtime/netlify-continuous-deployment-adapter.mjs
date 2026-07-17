import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { isoTimestamp, normalizeRunId, writeJson } from "./common.mjs";
import { fetchWithTimeout } from "./fetch-with-timeout.mjs";

const API_BASE = "https://api.netlify.com/api/v1";

export function validateNetlifyContinuousDeploymentRequest({ request, root = process.cwd() }) {
  if (request?.adapterId !== "netlify-continuous-deployment" || request?.operation !== "link_github_repository") {
    throw new Error("executionRequest must select netlify-continuous-deployment and link_github_repository");
  }
  const siteId = String(request.siteId || "").trim();
  if (!/^[a-f0-9-]{36}$/.test(siteId)) throw new Error("Netlify siteId must be an exact UUID");
  const owner = String(request.repository?.owner || "").trim();
  const name = String(request.repository?.name || "").trim();
  if (!/^[A-Za-z0-9_.-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(name)) throw new Error("Netlify repository owner and name must be safe");
  const repositoryId = Number(request.repository?.id);
  if (!Number.isSafeInteger(repositoryId) || repositoryId <= 0) throw new Error("Netlify repository id must be the exact GitHub numeric id");
  const isPrivate = request.repository?.private === true;
  const installationId = request.repository?.installationId === undefined ? undefined : Number(request.repository.installationId);
  if (isPrivate && (!Number.isSafeInteger(installationId) || installationId <= 0)) {
    throw new Error("Private Netlify GitHub repositories require the exact GitHub App installation id");
  }
  const branch = String(request.branch || "main").trim();
  if (!/^[A-Za-z0-9._/-]+$/.test(branch) || branch.includes("..")) throw new Error("Netlify branch is invalid");
  const command = String(request.buildCommand || "npm run build").trim();
  const publishDirectory = String(request.publishDirectory || "").trim();
  if (!command || !publishDirectory || publishDirectory.includes("..")) throw new Error("Netlify build command and publish directory are required");
  const projectRecordPath = String(request.projectRecordPath || "").replaceAll("\\", "/");
  if (!/^\.codex\/projects\/[a-z0-9-]+\.json$/.test(projectRecordPath) || !existsSync(path.join(root, projectRecordPath))) {
    throw new Error("Netlify projectRecordPath must identify one AG OS project record");
  }
  if (request.stopBuilds !== true) {
    throw new Error("Netlify repository linking must keep builds stopped until a separate production deployment approval");
  }
  return {
    siteId,
    siteName: String(request.siteName || siteId).trim(),
    repository: `${owner}/${name}`,
    owner,
    name,
    repositoryId,
    isPrivate,
    installationId,
    branch,
    command,
    publishDirectory,
    stopBuilds: true,
    projectRecordPath
  };
}

export function netlifyContinuousDeploymentApprovalCriteria(validated) {
  return [
    `Netlify site is exactly ${validated.siteId}.`,
    `Repository is exactly ${validated.repository}.`,
    `GitHub repository id is exactly ${validated.repositoryId}.`,
    `Branch is exactly ${validated.branch}.`,
    `Build command is exactly ${validated.command}.`,
    `Publish directory is exactly ${validated.publishDirectory}.`,
    "Automatic builds remain stopped until a separate production deployment approval."
  ];
}

function assertApproval({ approval, job, adapter, validated, root, now }) {
  if (!approval || approval.status !== "approved") throw new Error("Netlify repository linking requires an active exact approval");
  if (approval.projectId !== job.projectId || approval.target !== `${job.projectId}:${job.jobId}:${adapter.adapterId}`) throw new Error("Netlify approval target does not match");
  if (!approval.approvedActions?.includes(adapter.requestedAction)) throw new Error("Netlify approval does not cover continuous deployment linking");
  for (const criterion of netlifyContinuousDeploymentApprovalCriteria(validated)) {
    if (!approval.inclusionCriteria?.includes(criterion)) throw new Error(`Netlify approval is missing exact criterion: ${criterion}`);
  }
  const current = JSON.parse(readFileSync(path.join(root, ".codex/approvals", `${approval.approvalId}.json`), "utf8"));
  if (current.status !== "approved" || Date.parse(current.expiresAt) <= now.getTime()) throw new Error("Netlify approval is not active at mutation time");
}

export async function executeNetlifyContinuousDeployment({ request, job, adapter, approval, token, fetchImpl = globalThis.fetch, root = process.cwd(), now = new Date(), timeoutMs = process.env.AG_OS_PROVIDER_TIMEOUT_MS }) {
  if (!token) throw new Error("Netlify private runtime credential is not configured");
  const validated = validateNetlifyContinuousDeploymentRequest({ request, root });
  assertApproval({ approval, job, adapter, validated, root, now });
  const repo = {
    provider: "github",
    id: validated.repositoryId,
    repo: validated.repository,
    private: validated.isPrivate,
    branch: validated.branch,
    cmd: validated.command,
    dir: validated.publishDirectory,
    stop_builds: true,
    ...(validated.installationId ? { installation_id: validated.installationId } : {})
  };
  const response = await fetchWithTimeout(fetchImpl, `${API_BASE}/sites/${validated.siteId}`, {
    method: "PATCH",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ repo })
  }, timeoutMs);
  if (!response.ok) throw new Error(`Netlify repository link failed with HTTP ${response.status}`);
  const site = await response.json();
  const settings = site.build_settings || {};
  if (settings.provider !== "github" || settings.repo_path !== validated.repository || settings.repo_branch !== validated.branch || settings.stop_builds !== true) {
    throw new Error("Netlify did not return the exact requested GitHub continuous-deployment binding");
  }
  const project = JSON.parse(readFileSync(path.join(root, validated.projectRecordPath), "utf8"));
  const timestamp = isoTimestamp(now);
  writeJson(validated.projectRecordPath, {
    ...project,
    ownerWorkspace: {
      ...project.ownerWorkspace,
      adapters: [
        ...(project.ownerWorkspace?.adapters || []).filter((entry) => entry.adapterId !== "netlify-continuous-deployment"),
        {
          adapterId: "netlify-continuous-deployment",
          status: "connected",
          target: `${validated.siteName}:${validated.branch}`,
          detail: `GitHub continuous deployment is linked to ${validated.repository} on ${validated.branch}.`
        }
      ]
    },
    updatedAt: timestamp
  }, root);
  const runId = normalizeRunId(job.jobId.replace(/^job-/, ""));
  const record = {
    connectorExecutionId: `connector-exec-${runId}-netlify-continuous-deployment`,
    status: "done",
    connectorId: "connector-netlify-mcp",
    requestedAction: adapter.requestedAction,
    riskLevel: job.riskLevel,
    projectId: job.projectId,
    approvalRequired: true,
    approvalId: approval.approvalId,
    requiredPermissions: ["site_settings_write"],
    evidenceRequired: ["exact site", "exact GitHub repository", "exact branch", "returned build settings"],
    safety: { executesLiveAction: true, usesCredentials: true, triggersDeployment: false, changesDomain: false, usesPaidAction: false, accessesProductionData: false },
    result: { siteId: validated.siteId, siteName: site.name, repository: validated.repository, branch: validated.branch, buildCommand: validated.command, publishDirectory: validated.publishDirectory, continuousDeploymentConnected: true, buildsStopped: true },
    prohibitedActionsConfirmedFalse: ["domain_change", "dns_change", "environment_variable_change", "paid_action", "customer_data_access"],
    notes: "Linked only the exact approved Netlify site to the exact GitHub repository and branch with automatic builds stopped. Production build activation remains separately gated. Existing domains and environment variables were not changed.",
    createdAt: timestamp,
    updatedAt: timestamp
  };
  const filePath = `.codex/connectors/${record.connectorExecutionId}.json`;
  writeJson(filePath, record, root);
  return { record, filePath, workProductPath: filePath };
}
