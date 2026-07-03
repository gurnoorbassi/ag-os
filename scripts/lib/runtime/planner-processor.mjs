import process from "node:process";
import { DEFAULT_OWNER_ID, isoTimestamp, normalizeRunId, readJson, writeJson } from "./common.mjs";

const PER_TASK_COST_LIMIT_USD = 5;

// These gates and stop conditions are mandatory in every plan. A worker
// draft can add gates and stop conditions but can never remove these.
const MANDATORY_APPROVAL_GATES = [
  {
    gateId: "approval-live-connector-action",
    approvalRequired: true,
    reason: "Any live connector action, including repository creation, requires owner approval."
  },
  {
    gateId: "approval-preview-or-production-deploy",
    approvalRequired: true,
    reason: "Any staging or production deploy requires owner approval before live connector use."
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

const MANDATORY_STOP_CONDITIONS = [
  "Stop before any live connector action without a valid approval lock.",
  "Stop before any deployment, preview deployment, domain change, or DNS change.",
  "Stop before using credentials, private endpoints, paid services, customer data, or production data.",
  "Stop when scope, risk tier, or approval requirements become unclear."
];

const DRAFT_REQUIRED_FIELDS = ["summary", "tasks", "tools", "expectedOutput"];

// Deterministic gate for worker-authored plan drafts. The planner assembles
// and verifies; it does not author plan content.
export function assertPlanDraftShape(planDraft) {
  for (const field of DRAFT_REQUIRED_FIELDS) {
    if (!Object.hasOwn(planDraft, field)) {
      throw new Error(`plan draft missing required field: ${field}`);
    }
  }

  if (!Array.isArray(planDraft.tasks) || planDraft.tasks.length === 0) {
    throw new Error("plan draft tasks must be a non-empty array");
  }

  for (const task of planDraft.tasks) {
    if (!task.taskId || !task.description) {
      throw new Error("every plan draft task needs taskId and description");
    }
  }

  if (planDraft.estimatedCostUsd !== undefined) {
    if (typeof planDraft.estimatedCostUsd !== "number" || planDraft.estimatedCostUsd < 0) {
      throw new Error("plan draft estimatedCostUsd must be a non-negative number");
    }
    if (planDraft.estimatedCostUsd > PER_TASK_COST_LIMIT_USD) {
      throw new Error(`plan draft estimatedCostUsd exceeds the $${PER_TASK_COST_LIMIT_USD} per-task limit and requires owner approval`);
    }
  }

  if (planDraft.basis && !planDraft.basis.productArchetype) {
    throw new Error("plan draft basis must cite a productArchetype or state none");
  }
}

function mergeApprovalGates(draftGates = []) {
  const gates = [...MANDATORY_APPROVAL_GATES];
  const knownGateIds = new Set(gates.map((gate) => gate.gateId));
  for (const gate of draftGates) {
    if (gate?.gateId && !knownGateIds.has(gate.gateId)) {
      gates.push({
        gateId: gate.gateId,
        approvalRequired: gate.approvalRequired !== false,
        reason: gate.reason || "Draft-added gate; approval required by default."
      });
      knownGateIds.add(gate.gateId);
    }
  }
  return gates;
}

function mergeStopConditions(draftStopConditions = []) {
  const merged = [...MANDATORY_STOP_CONDITIONS];
  for (const stopCondition of draftStopConditions) {
    if (typeof stopCondition === "string" && stopCondition.length > 0 && !merged.includes(stopCondition)) {
      merged.push(stopCondition);
    }
  }
  return merged;
}

function buildFallbackDraft(commandIntake) {
  const subject = commandIntake?.normalizedCommand || "the owner command";
  return {
    summary: `Plan-only scaffold for: ${subject} No worker plan draft was provided, so this plan only defines the planning work itself.`,
    tools: ["local-filesystem"],
    tasks: [
      {
        taskId: "work-produce-understanding-block",
        description: "Produce a worker understanding block for the command per docs/command-intake.md.",
        owner: DEFAULT_OWNER_ID,
        status: "planned"
      },
      {
        taskId: "work-author-plan-draft",
        description: "Author a worker plan draft citing an archetype, stack choice, quality bar, and assumptions per docs/planner.md.",
        owner: "planner-foundation",
        status: "planned"
      },
      {
        taskId: "work-list-approval-gates",
        description: "List the approvals required before repository creation, connector use, deployment, domain changes, or paid actions.",
        owner: "planner-foundation",
        status: "planned"
      }
    ],
    expectedOutput: "A worker-authored plan draft ready for planner assembly and validation. No live actions, credentials, paid use, or production data."
  };
}

export function buildPlanRecord({ route, job, commandIntake, planDraft, runId, now = new Date() }) {
  if (!route?.routeId) {
    throw new Error("route with routeId is required");
  }

  const draft = planDraft ?? buildFallbackDraft(commandIntake);
  assertPlanDraftShape(draft);

  const normalizedRunId = normalizeRunId(runId || route.routeId.replace(/^route-/, ""));
  const timestamp = isoTimestamp(now);
  const commandId = job?.commandId || commandIntake?.commandIntakeId || "command-intake-unavailable";
  const jobId = job?.jobId || route.jobId;
  const projectId = route.projectId || job?.projectId || commandIntake?.projectId || "project-unregistered";

  return {
    planId: commandIntake?.nextRecord?.planId || `plan-${normalizedRunId}`,
    jobId,
    commandId,
    projectId,
    summary: draft.summary,
    riskLevel: route.riskLevel || job?.riskLevel || "R1",
    estimatedCostUsd: draft.estimatedCostUsd ?? 0,
    tools: draft.tools,
    tasks: draft.tasks.map((task) => ({
      taskId: task.taskId,
      description: task.description,
      owner: task.owner || "planner-foundation",
      status: task.status || "planned"
    })),
    ...(draft.basis ? { basis: draft.basis } : {}),
    approvalGates: mergeApprovalGates(draft.approvalGates),
    expectedOutput: draft.expectedOutput,
    stopConditions: mergeStopConditions(draft.stopConditions),
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
  planDraft,
  routeRecordPath,
  jobRecordPath,
  commandRecordPath,
  planDraftPath,
  runId,
  now,
  root = process.cwd()
}) {
  const sourceRoute = route ?? readJson(routeRecordPath, root);
  const sourceJob = job ?? (jobRecordPath ? readJson(jobRecordPath, root) : undefined);
  const sourceCommandIntake = commandIntake ?? (commandRecordPath ? readJson(commandRecordPath, root) : undefined);
  const sourcePlanDraft = planDraft ?? (planDraftPath ? readJson(planDraftPath, root) : undefined);
  const record = buildPlanRecord({
    route: sourceRoute,
    job: sourceJob,
    commandIntake: sourceCommandIntake,
    planDraft: sourcePlanDraft,
    runId,
    now
  });
  const filePath = `.codex/plans/${record.planId}.json`;
  writeJson(filePath, record, root);
  return { filePath, record };
}
