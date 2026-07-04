import process from "node:process";
import path from "node:path";
import { existsSync, readdirSync } from "node:fs";
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

function slugFragment(value) {
  const fragment = String(value || "item")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "item";

  return fragment
    .replaceAll("sk-", "s-k-")
    .replaceAll("ghp-", "g-h-p-");
}

function uniqueStrings(values = []) {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    if (typeof value !== "string" || value.length === 0 || seen.has(value)) {
      continue;
    }
    seen.add(value);
    result.push(value);
  }
  return result;
}

function resolveArchetypeId({ commandIntake, planDraft }) {
  const draftArchetype = planDraft?.basis?.productArchetype;
  if (typeof draftArchetype === "string" && draftArchetype.length > 0 && draftArchetype !== "none") {
    return draftArchetype;
  }

  const productArchetype = commandIntake?.productContext?.archetypeId;
  if (typeof productArchetype === "string" && productArchetype.length > 0) {
    return productArchetype;
  }

  const understandingArchetype = commandIntake?.understanding?.productArchetype;
  if (typeof understandingArchetype === "string" && understandingArchetype.length > 0 && understandingArchetype !== "none") {
    return understandingArchetype;
  }

  const gap = commandIntake?.productContext?.archetypeGap;
  if (typeof gap === "string" && gap.startsWith("missing_registered_archetype:")) {
    return gap.replace("missing_registered_archetype:", "");
  }

  return null;
}

function findActiveArchetype(archetypeId, root = process.cwd()) {
  if (!archetypeId) {
    return { archetype: null, filePath: null };
  }

  const archetypeDir = path.join(root, ".codex/archetypes");
  if (!existsSync(archetypeDir)) {
    return { archetype: null, filePath: null };
  }

  for (const name of readdirSync(archetypeDir).filter((item) => item.endsWith(".json")).sort()) {
    const relativePath = `.codex/archetypes/${name}`;
    try {
      const record = readJson(relativePath, root);
      if (record.archetypeId === archetypeId && record.status === "active") {
        return { archetype: record, filePath: relativePath };
      }
    } catch {
      // Invalid archetype records are handled by foundation validation.
    }
  }

  return { archetype: null, filePath: null };
}

function stackChoiceFromArchetype(archetype) {
  if (!archetype?.recommendedStack) {
    return undefined;
  }

  const components = Array.isArray(archetype.recommendedStack.components)
    ? archetype.recommendedStack.components.join("; ")
    : "";
  const notes = archetype.recommendedStack.notes ? ` Notes: ${archetype.recommendedStack.notes}` : "";
  return `Bootstrap Mode stack: ${components}.${notes}`;
}

function phaseLabels(archetype) {
  return (archetype?.phases || []).map((phase) => {
    const goals = Array.isArray(phase.goals) ? phase.goals.join(" ") : "";
    return `${phase.phaseId}: ${phase.name} - ${goals}`;
  });
}

function buildArchetypeTasks({ archetypeId, archetype }) {
  if (!archetype) {
    return archetypeId
      ? [
          {
            taskId: "work-register-missing-archetype",
            description: `Missing archetype: ${archetypeId}. Author and register the product archetype under .codex/archetypes/ before build planning, per docs/product-archetypes.md.`,
            owner: "planner-foundation",
            status: "planned"
          }
        ]
      : [];
  }

  const tasks = [];
  for (const item of archetype.whatToBuildFirst || []) {
    tasks.push({
      taskId: `work-archetype-first-${slugFragment(item)}`,
      description: `Archetype first build item for ${archetype.name}: ${item}`,
      owner: "planner-foundation",
      status: "planned"
    });
  }

  for (const phase of archetype.phases || []) {
    tasks.push({
      taskId: `work-archetype-${phase.phaseId}`,
      description: `${archetype.name} phase - ${phase.name}: ${(phase.goals || []).join(" ")}`,
      owner: "planner-foundation",
      status: "planned"
    });
  }

  if (Array.isArray(archetype.commonModules) && archetype.commonModules.length > 0) {
    tasks.push({
      taskId: "work-archetype-common-modules",
      description: `Plan common ${archetype.name} modules/features: ${archetype.commonModules.join(" ")}`,
      owner: "planner-foundation",
      status: "planned"
    });
  }

  if (Array.isArray(archetype.knownPitfalls) && archetype.knownPitfalls.length > 0) {
    tasks.push({
      taskId: "work-archetype-risk-review",
      description: `Review ${archetype.name} known pitfalls before build mode: ${archetype.knownPitfalls.join(" ")}`,
      owner: "quality-os",
      status: "planned"
    });
  }

  return tasks;
}

function buildArchetypeApprovalGates(archetype) {
  return (archetype?.approvalGates || []).map((gate) => ({
    gateId: `approval-archetype-${slugFragment(gate)}`,
    approvalRequired: true,
    reason: gate
  }));
}

function buildArchetypeStopConditions(archetype) {
  const stopConditions = [...(archetype?.stopConditions || [])];
  for (const item of archetype?.whatNotToOverbuildEarly || []) {
    stopConditions.push(`Do not overbuild early: ${item}`);
  }
  return stopConditions;
}

function mergeTasks(...taskLists) {
  const merged = [];
  const knownIds = new Set();
  for (const task of taskLists.flat()) {
    if (!task?.taskId || knownIds.has(task.taskId)) {
      continue;
    }
    knownIds.add(task.taskId);
    merged.push({
      taskId: task.taskId,
      description: task.description,
      owner: task.owner || "planner-foundation",
      status: task.status || "planned"
    });
  }
  return merged;
}

function buildArchetypeBasis({ archetypeId, archetype, archetypeFile, draftBasis = {} }) {
  if (!archetypeId && !draftBasis.productArchetype) {
    return draftBasis && Object.keys(draftBasis).length > 0 ? draftBasis : undefined;
  }

  if (!archetype) {
    return {
      ...draftBasis,
      productArchetype: archetypeId || draftBasis.productArchetype || "none",
      archetypeFile: null,
      archetypeVersion: null,
      qualityChecklistSource: archetypeId ? `missing:${archetypeId}` : "none",
      appliedPhases: [],
      appliedWhatToBuildFirst: [],
      appliedApprovalGates: [],
      appliedStopConditions: [],
      appliedKnownPitfalls: [],
      appliedCommonModules: [],
      appliedWhatNotToOverbuildEarly: [],
      stackChoice: draftBasis.stackChoice || "No active archetype was loaded. Keep planning local and register the archetype before build mode.",
      qualityBar: uniqueStrings([
        ...(draftBasis.qualityBar || []),
        "Register the missing product archetype before build planning or execution."
      ])
    };
  }

  const stackChoice = stackChoiceFromArchetype(archetype);
  return {
    ...draftBasis,
    productArchetype: archetype.archetypeId,
    archetypeFile,
    archetypeVersion: archetype.version ?? null,
    qualityChecklistSource: `archetype:${archetype.archetypeId}`,
    appliedPhases: phaseLabels(archetype),
    appliedWhatToBuildFirst: [...(archetype.whatToBuildFirst || [])],
    appliedApprovalGates: [...(archetype.approvalGates || [])],
    appliedStopConditions: [...(archetype.stopConditions || [])],
    appliedKnownPitfalls: [...(archetype.knownPitfalls || [])],
    appliedCommonModules: [...(archetype.commonModules || [])],
    appliedWhatNotToOverbuildEarly: [...(archetype.whatNotToOverbuildEarly || [])],
    stackChoice: stackChoice || draftBasis.stackChoice || "Bootstrap Mode local planning first.",
    qualityBar: uniqueStrings([
      ...(draftBasis.qualityBar || []),
      ...(archetype.minimumQualityBar || []),
      ...(archetype.qualityChecklist || [])
    ])
  };
}

function buildFallbackDraft(commandIntake) {
  const subject = commandIntake?.normalizedCommand || "the owner command";
  const archetypeGap = commandIntake?.productContext?.archetypeGap;
  const archetypeGapTasks = archetypeGap
    ? [
        {
          taskId: "work-register-missing-archetype",
          description: `Missing archetype: ${archetypeGap}. Author and register the product archetype under .codex/archetypes/ before build planning, per docs/product-archetypes.md.`,
          owner: "planner-foundation",
          status: "planned"
        }
      ]
    : [];
  return {
    summary: `Plan-only scaffold for: ${subject} No worker plan draft was provided, so this plan only defines the planning work itself.`,
    tools: ["local-filesystem"],
    tasks: [
      ...archetypeGapTasks,
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

export function buildPlanRecord({ route, job, commandIntake, planDraft, runId, now = new Date(), root = process.cwd() }) {
  if (!route?.routeId) {
    throw new Error("route with routeId is required");
  }

  const draft = planDraft ?? buildFallbackDraft(commandIntake);
  assertPlanDraftShape(draft);
  const archetypeId = resolveArchetypeId({ commandIntake, planDraft: draft });
  const { archetype, filePath: archetypeFile } = findActiveArchetype(archetypeId, root);
  const archetypeTasks = buildArchetypeTasks({ archetypeId, archetype });
  const basis = buildArchetypeBasis({
    archetypeId,
    archetype,
    archetypeFile,
    draftBasis: draft.basis || {}
  });
  const archetypeApprovalGates = buildArchetypeApprovalGates(archetype);
  const archetypeStopConditions = buildArchetypeStopConditions(archetype);

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
    tasks: mergeTasks(archetypeTasks, draft.tasks),
    ...(basis ? { basis } : {}),
    approvalGates: mergeApprovalGates([
      ...(draft.approvalGates || []),
      ...archetypeApprovalGates
    ]),
    expectedOutput: draft.expectedOutput,
    stopConditions: mergeStopConditions([
      ...(draft.stopConditions || []),
      ...archetypeStopConditions
    ]),
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
    now,
    root
  });
  const filePath = `.codex/plans/${record.planId}.json`;
  writeJson(filePath, record, root);
  return { filePath, record };
}
