import process from "node:process";
import { validateGitHubDraftPrRequest } from "./github-draft-pr-adapter.mjs";
import { validateN8nDisabledWorkflowRequest } from "./n8n-disabled-workflow-adapter.mjs";
import { validateNetlifyStagingRequest } from "./netlify-staging-adapter.mjs";
import { validateN8nWorkflowControlRequest } from "./n8n-workflow-control-adapter.mjs";
import { validateProductionDeploymentRequest } from "./production-deployment-adapter.mjs";

export function validateExecutionRequest({ request, root = process.cwd() }) {
  if (!request?.adapterId) throw new Error("executionRequest.adapterId is required");
  if (request.adapterId === "github-draft-pr") return validateGitHubDraftPrRequest({ request, root });
  if (request.adapterId === "n8n-disabled-workflow") return validateN8nDisabledWorkflowRequest({ request, root });
  if (request.adapterId === "n8n-workflow-control") return validateN8nWorkflowControlRequest({ request, root });
  if (request.adapterId === "netlify-staging") return validateNetlifyStagingRequest({ request, root });
  if (request.adapterId === "production-deployment") return validateProductionDeploymentRequest({ request, root });
  throw new Error(`execution adapter is not registered for structured requests: ${request.adapterId}`);
}
