import process from "node:process";
import { validateGitHubDraftPrRequest } from "./github-draft-pr-adapter.mjs";
import { validateN8nDisabledWorkflowRequest } from "./n8n-disabled-workflow-adapter.mjs";
import { validateNetlifyStagingRequest } from "./netlify-staging-adapter.mjs";

export function validateExecutionRequest({ request, root = process.cwd() }) {
  if (!request?.adapterId) throw new Error("executionRequest.adapterId is required");
  if (request.adapterId === "github-draft-pr") return validateGitHubDraftPrRequest({ request, root });
  if (request.adapterId === "n8n-disabled-workflow") return validateN8nDisabledWorkflowRequest({ request, root });
  if (request.adapterId === "netlify-staging") return validateNetlifyStagingRequest({ request, root });
  throw new Error(`execution adapter is not registered for structured requests: ${request.adapterId}`);
}
