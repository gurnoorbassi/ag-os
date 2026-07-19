import process from "node:process";
import { readJson } from "./common.mjs";

const RECOVERABLE_STATUSES = new Set(["failed", "blocked", "cancelled", "needs_revision", "plan_ready"]);
const ONE_OFF_PROJECT_ID = "project-one-off";

function assertJobId(jobId) {
  if (!/^job-[a-z0-9-]+$/.test(String(jobId || ""))) throw new Error("a valid job id is required");
}

export function prepareJobRecovery({ jobId, action, confirmation, root = process.cwd(), now = new Date() }) {
  assertJobId(jobId);
  if (!["retry", "replan"].includes(action)) throw new Error("recovery action must be retry or replan");
  const expected = `${action.toUpperCase()} ${jobId}`;
  if (confirmation !== expected) throw new Error(`exact confirmation is required: ${expected}`);

  const job = readJson(`.codex/jobs/${jobId}.json`, root);
  if (!RECOVERABLE_STATUSES.has(job.status)) throw new Error(`job ${jobId} cannot be recovered from status ${job.status}`);
  const command = readJson(`.codex/commands/${job.commandId}.json`, root);
  if (!command.rawCommand) throw new Error(`original owner command is missing for ${jobId}`);
  const registry = readJson(".codex/projects/registry.json", root);
  const projectId = registry.projects?.some((item) => item.projectId === job.projectId)
    ? job.projectId
    : ONE_OFF_PROJECT_ID;

  return {
    command: command.rawCommand,
    projectId,
    recovery: {
      action,
      sourceJobId: jobId,
      requestedAt: now.toISOString()
    },
    originalJob: job,
    originalCommand: command
  };
}
