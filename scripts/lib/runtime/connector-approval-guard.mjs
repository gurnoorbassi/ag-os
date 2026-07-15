import { readFileSync } from "node:fs";
import path from "node:path";

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function assertExactConnectorApproval({ approval, job, adapter, criteria }) {
  if (!approval || approval.status !== "approved") throw new Error(`${adapter.name} requires an active exact approval`);
  if (approval.projectId !== job.projectId) throw new Error(`${adapter.name} approval project does not match the job`);
  if (!approval.approvedActions?.includes(adapter.requestedAction)) throw new Error(`${adapter.name} approval does not cover the requested action`);
  if (approval.prohibitedActions?.includes(adapter.requestedAction)) throw new Error(`${adapter.name} requested action is prohibited by the approval`);
  if (approval.target !== `${job.projectId}:${job.jobId}:${adapter.adapterId}`) throw new Error(`${adapter.name} approval target does not match the exact job and adapter`);
  for (const criterion of [`Job is exactly ${job.jobId}.`, ...criteria]) {
    if (!approval.inclusionCriteria?.includes(criterion)) throw new Error(`${adapter.name} approval is missing exact criterion: ${criterion}`);
  }
}

export function assertApprovalStillActive({ approvalId, connectorName, root, now = new Date() }) {
  let current;
  try {
    current = JSON.parse(readFileSync(path.join(root, ".codex", "approvals", `${approvalId}.json`), "utf8"));
  } catch {
    throw new Error(`${connectorName} approval record is unavailable before connector mutation`);
  }
  if (current.status !== "approved") throw new Error(`${connectorName} approval is ${current.status}; stop before the next connector mutation`);
  if (!current.expiresAt || Date.parse(current.expiresAt) <= now.getTime()) {
    throw new Error(`${connectorName} approval expired before the next connector mutation`);
  }
}
