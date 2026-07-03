import process from "node:process";
import { DEFAULT_OWNER_ID, isoTimestamp, normalizeRunId, readJson, writeJson } from "./common.mjs";

const CONSTRUCTION_WEBSITE_STOP_CONDITIONS = [
  "Stop before creating any repository without owner approval.",
  "Stop before calling GitHub, Netlify, n8n, Hetzner, Postgres, or any live connector.",
  "Stop before any deployment, preview deployment, domain change, or DNS change.",
  "Stop before using credentials, private endpoints, paid services, customer data, or production data."
];

function buildApprovalGates() {
  return [
    {
      gateId: "approval-create-product-repository",
      approvalRequired: true,
      reason: "Creating a new GitHub repository is a live connector action and requires owner approval."
    },
    {
      gateId: "approval-preview-or-production-deploy",
      approvalRequired: true,
      reason: "Any Netlify preview or production deploy requires owner approval before live connector use."
    },
    {
      gateId: "approval-domain-or-dns-change",
      approvalRequired: true,
      reason: "Any domain or DNS change is blocked until explicit owner approval."
    },
    {
      gateId: "approval-paid-tool-use",
      approvalRequired: true,
      reason: "Paid tools or paid API usage are blocked unless owner approved and within Cost OS limits."
    }
  ];
}

function buildTasks() {
  return [
    {
      taskId: "work-define-construction-site-scope",
      description: "Define the website pages, offer, audience, and conversion path using owner-provided requirements.",
      owner: DEFAULT_OWNER_ID,
      status: "planned"
    },
    {
      taskId: "work-select-lightweight-stack",
      description: "Select a low-cost static or lightweight web stack that can later deploy to Netlify after approval.",
      owner: "planner-foundation",
      status: "planned"
    },
    {
      taskId: "work-draft-information-architecture",
      description: "Plan the first page structure for services, proof, contact path, and local search content.",
      owner: "planner-foundation",
      status: "planned"
    },
    {
      taskId: "work-list-future-approval-gates",
      description: "List the approvals required before repository creation, connector use, deployment, domain changes, or paid actions.",
      owner: "planner-foundation",
      status: "planned"
    }
  ];
}

export function buildPlanRecord({ route, job, commandIntake, runId, now = new Date() }) {
  if (!route?.routeId) {
    throw new Error("route with routeId is required");
  }

  const normalizedRunId = normalizeRunId(runId || route.routeId.replace(/^route-/, ""));
  const timestamp = isoTimestamp(now);
  const commandId = job?.commandId || commandIntake?.commandIntakeId || "command-intake-unavailable";
  const jobId = job?.jobId || route.jobId;
  const projectId = route.projectId || job?.projectId || "project-unregistered-construction-website";

  return {
    planId: commandIntake?.nextRecord?.planId || `plan-${normalizedRunId}`,
    jobId,
    commandId,
    projectId,
    summary: "Detected project type: website. This is a local dry-run plan for a construction website using existing AG OS rules and no live actions.",
    riskLevel: route.riskLevel || job?.riskLevel || "R1",
    estimatedCostUsd: 0,
    tools: [
      "local-filesystem",
      "GitHub after owner approval",
      "Netlify after owner approval",
      "Base44 optional prototype only if owner approves later",
      "Hetzner, Postgres, and n8n not required for the first static website plan"
    ],
    tasks: buildTasks(),
    approvalGates: buildApprovalGates(),
    expectedOutput: "Plan-only construction website proposal with recommended stack, first tasks, approval gates, and stop conditions. No repository, deployment, live connector action, credentials, paid use, or production data.",
    stopConditions: CONSTRUCTION_WEBSITE_STOP_CONDITIONS,
    safety: {
      executionAuthorized: false,
      liveServiceUseAllowed: false,
      deploymentAllowed: false,
      productionDataAllowed: false,
      paidActionAllowed: false
    },
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

export function writePlanRecord({
  route,
  job,
  commandIntake,
  routeRecordPath,
  jobRecordPath,
  commandRecordPath,
  runId,
  now,
  root = process.cwd()
}) {
  const sourceRoute = route ?? readJson(routeRecordPath, root);
  const sourceJob = job ?? (jobRecordPath ? readJson(jobRecordPath, root) : undefined);
  const sourceCommandIntake = commandIntake ?? (commandRecordPath ? readJson(commandRecordPath, root) : undefined);
  const record = buildPlanRecord({
    route: sourceRoute,
    job: sourceJob,
    commandIntake: sourceCommandIntake,
    runId,
    now
  });
  const filePath = `.codex/plans/${record.planId}.json`;
  writeJson(filePath, record, root);
  return { filePath, record };
}
