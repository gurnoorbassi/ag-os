import path from "node:path";
import { slugify } from "./common.mjs";
import { selectExecutionAdapter } from "./execution-adapter-registry.mjs";

const NETLIFY_PREVIEW_INTENT = /\bnetlify\b/i;
const PREVIEW_ACTION = /\b(?:deploy|preview|draft|publish)\b/i;

export function deriveExecutionRequest({ command, job, workerExecution, env = process.env } = {}) {
  const rawCommand = String(command?.rawCommand ?? command ?? "").trim();
  const selected = selectExecutionAdapter({ command: { rawCommand }, env });
  if (command?.executionRequest) return { request: command.executionRequest, adapter: selected, derived: false, blockers: [] };

  if (selected.adapterId !== "netlify-staging" || !NETLIFY_PREVIEW_INTENT.test(rawCommand) || !PREVIEW_ACTION.test(rawCommand)) {
    return {
      request: null,
      adapter: selected,
      derived: false,
      blockers: selected.adapterId === "local-work-product" ? [] : [`exact ${selected.adapterId} execution details could not be safely derived from the owner command`]
    };
  }

  const siteId = String(env.AG_OS_NETLIFY_PREVIEW_SITE_ID || "").trim();
  if (!/^[A-Za-z0-9-]{3,80}$/.test(siteId)) {
    return { request: null, adapter: selected, derived: false, blockers: ["AG_OS_NETLIFY_PREVIEW_SITE_ID is not configured"] };
  }
  if (!workerExecution?.workProductPath) {
    return { request: null, adapter: selected, derived: false, blockers: ["generated work-product path is missing"] };
  }

  const sourceDirectory = path.posix.dirname(String(workerExecution.workProductPath).replaceAll("\\", "/"));
  const branch = `codex/${slugify(job.jobId).slice(0, 180)}`;
  return {
    request: {
      adapterId: "netlify-staging",
      operation: "create_draft_deploy",
      siteId,
      branch,
      title: `AG OS preview for ${job.jobId}`.slice(0, 200),
      sourceDirectory,
      draft: true
    },
    adapter: selected,
    derived: true,
    blockers: []
  };
}
