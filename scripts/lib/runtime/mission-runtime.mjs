import { createHash, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import process from "node:process";
import { isoTimestamp, slugify, writeJson } from "./common.mjs";
import { allowedToolsForRole, assertAllowedAgentCommand, executeAgentTool, runAgentToolLoop } from "./agent-runner.mjs";
import { bootstrapMissionWorkspace } from "./mission-bootstrap.mjs";
import { missionPlanRoles, missionPlanTasks, SUPPORTED_MISSION_ROLES, validateMissionPlanDraft } from "./mission-plan.mjs";
import {
  appendMissionEvent,
  listMissionAgents,
  listMissionTasks,
  listMissions,
  missionDetail,
  missionPaths,
  readMission,
  writeAgentRun,
  writeHandoff,
  writeMission,
  writeMissionTask
} from "./mission-store.mjs";
import {
  cancelMissionWorkspaces,
  commitTaskWorkspace,
  createMissionIntegrationWorkspace,
  createTaskWorkspace,
  gitRevision,
  integrateTaskCommit
} from "./mission-workspace.mjs";
import { scanSecrets } from "../security/secret-scanner.mjs";

const DEFAULT_CONCURRENCY = 3;
const SOFTWARE_ROLES = new Set(SUPPORTED_MISSION_ROLES);

function id(prefix, value) {
  const candidate = `${prefix}-${slugify(value)}`;
  if (candidate.length <= 112) return candidate;
  const fingerprint = createHash("sha256").update(candidate).digest("hex").slice(0, 12);
  return `${candidate.slice(0, 99)}-${fingerprint}`;
}

function agentDefinition(missionId, role, index, { provider = "anthropic", model = "configured-at-runtime", now = new Date() } = {}) {
  const roleSlug = slugify(role);
  const timestamp = isoTimestamp(now);
  const allowedTools = allowedToolsForRole(role);
  return {
    agentRunId: id("agent-run", `${missionId}-${roleSlug}-${index + 1}`),
    missionId,
    role,
    displayName: role === "Commander" ? "Commander" : `${role}`,
    provider,
    model,
    status: role === "Commander" ? "idle" : "waiting",
    currentTaskId: null,
    allowedTools,
    permissions: { workspaceRead: allowedTools.some((tool) => ["list_files", "read_file", "search_files", "git_diff"].includes(tool)), workspaceWrite: allowedTools.some((tool) => ["write_file", "edit_file", "apply_patch"].includes(tool)), localCommands: allowedTools.some((tool) => tool.startsWith("run_")), localGit: allowedTools.includes("git_diff"), externalActions: false, credentials: false },
    workspacePath: null,
    branch: null,
    tokenUsage: { input: 0, output: 0 },
    costUsd: 0,
    startedAt: null,
    lastActivityAt: timestamp,
    completedAt: null,
    failure: null,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

export function buildDefaultMissionPlan({ missionId, ownerOutcome, projectId, validationCommands = ["npm test", "npm run build"] }) {
  const planningText = ownerOutcome.toLowerCase();
  const mentionsAny = (terms) => terms.some((term) => planningText.includes(term));
  const wantsUi = mentionsAny(["ui", "dashboard", "frontend", "page", "responsive", "website", "interface"]);
  const wantsBackend = mentionsAny(["api", "backend", "server", "lead", "crm", "data", "auth"]);
  const roles = ["Commander", "Architect"];
  if (wantsUi) roles.push("UI Designer", "Frontend Engineer");
  if (wantsBackend) roles.push("Backend Engineer");
  if (mentionsAny(["database", "postgres", "sql", "schema", "migration"])) roles.push("Database Engineer");
  if (mentionsAny(["security", "threat", "permission", "vulnerability"])) roles.push("Security Reviewer");
  roles.push("QA Engineer", "Code Reviewer", "Integration Agent");
  const uniqueRoles = [...new Set(roles)];
  const agents = uniqueRoles.map((role, index) => agentDefinition(missionId, role, index));
  const byRole = Object.fromEntries(agents.map((agent) => [agent.role, agent.agentRunId]));
  const tasks = [];
  const add = (key, title, description, role, dependencies, acceptanceCriteria, kind = "coding") => tasks.push({
    taskId: id("mission-task", `${missionId}-${key}`), missionId, projectId, title, description, assignedAgentRunId: byRole[role], assignedRole: role,
    status: dependencies.length === 0 ? "ready" : "waiting", dependencies, acceptanceCriteria, attempt: 1, maximumAttempts: role === "QA Engineer" ? 3 : 2,
    workspace: null, artifacts: [], filesTouched: [], commandsExecuted: [], blockers: [], reviewState: "pending", kind,
    validationCommands: ["QA Engineer", "Integration Agent"].includes(role) ? validationCommands : [], createdAt: null, startedAt: null, completedAt: null, updatedAt: null
  });
  add("architecture", "Define implementation architecture", `Define the smallest implementation architecture and file boundaries for: ${ownerOutcome}`, "Architect", [], ["Architecture and component boundaries are explicit", "Parallel work can proceed without shared-file ambiguity"], "planning");
  const architectureId = tasks[0].taskId;
  const buildIds = [];
  let designId = null;
  if (byRole["UI Designer"]) {
    add("design", "Define responsive interface contract", "Create the UI structure, interaction states, and responsive acceptance contract.", "UI Designer", [architectureId], ["States and responsive behavior are explicit"]);
    designId = tasks.at(-1).taskId;
  }
  let databaseId = null;
  if (byRole["Database Engineer"]) {
    add("database", "Build data layer", "Implement local schemas and data access required by the mission.", "Database Engineer", [architectureId], ["Schema supports required workflows", "Data validation is covered"]);
    databaseId = tasks.at(-1).taskId;
  }
  if (byRole["Frontend Engineer"]) {
    add("frontend", "Build frontend experience", "Implement the user-facing software experience in the isolated task workspace.", "Frontend Engineer", [designId || architectureId], ["Required views and flows work", "UI is responsive and accessible"]);
    buildIds.push(tasks.at(-1).taskId);
  } else if (designId) {
    buildIds.push(designId);
  }
  if (byRole["Backend Engineer"]) {
    add("backend", "Build application backend", "Implement the local API and domain behavior in the isolated task workspace.", "Backend Engineer", [databaseId || architectureId], ["API behavior matches the mission", "Invalid input fails safely"]);
    buildIds.push(tasks.at(-1).taskId);
  } else if (databaseId) {
    buildIds.push(databaseId);
  }
  const implementationDeps = buildIds.length > 0 ? buildIds : [architectureId];
  const reviewDeps = [...implementationDeps];
  if (byRole["Security Reviewer"]) {
    add("security", "Review implementation security", "Inspect local changes for unsafe data handling, permission expansion, secrets, and injection risks.", "Security Reviewer", implementationDeps, ["No unresolved blocking security finding remains"], "review");
    reviewDeps.push(tasks.at(-1).taskId);
  }
  add("review", "Review integrated implementation", "Inspect the integrated diff for correctness, security, maintainability, and mission acceptance.", "Code Reviewer", reviewDeps, ["No blocking review findings remain"], "review");
  const reviewId = tasks.at(-1).taskId;
  add("qa", "Validate target project", "Run the target project's declared validation strategy and report concrete defects.", "QA Engineer", [reviewId], ["All target validation commands pass"], "qa");
  const qaId = tasks.at(-1).taskId;
  add("integration", "Seal mission integration", "Confirm all task commits are integrated in dependency order and the final target validation passes.", "Integration Agent", [qaId], ["Integration branch contains all accepted work", "Final validation passes"], "integration");
  return {
    summary: `Build and validate the owner outcome with ${uniqueRoles.length} runtime agents and an isolated dependency graph.`,
    agents,
    tasks,
    integrationOrder: tasks.map((task) => task.taskId),
    validationStrategy: validationCommands,
    expectedArtifacts: ["integrated source tree", "target validation evidence", "mission event stream"],
    risks: ["External actions remain approval gated", "Mission stops at bounded repair and budget limits"]
  };
}

export function buildMissionPlanFromDraft({ missionId, projectId, planDraft }) {
  validateMissionPlanDraft(planDraft, { assertValidationCommand: assertAllowedAgentCommand });
  const agents = missionPlanRoles(planDraft).map((role, index) => agentDefinition(missionId, role, index));
  const byRole = Object.fromEntries(agents.map((agent) => [agent.role, agent.agentRunId]));
  const draftTasks = missionPlanTasks(planDraft);
  const taskIds = new Map(draftTasks.map((task) => [task.taskId, id("mission-task", `${missionId}-${task.taskId}`)]));
  const tasks = draftTasks.map((task) => ({
    taskId: taskIds.get(task.taskId), missionId, projectId, title: task.title, description: task.description,
    assignedAgentRunId: byRole[task.assignedRole], assignedRole: task.assignedRole,
    status: task.dependencies.length === 0 ? "ready" : "waiting", dependencies: task.dependencies.map((dependency) => taskIds.get(dependency)),
    acceptanceCriteria: [...task.acceptanceCriteria], attempt: 1, maximumAttempts: task.kind === "qa" ? 3 : 2,
    workspace: null, artifacts: [], filesTouched: [], commandsExecuted: [], blockers: [], reviewState: "pending", kind: task.kind,
    validationCommands: ["qa", "integration"].includes(task.kind) ? [...planDraft.validationStrategy] : [], createdAt: null, startedAt: null, completedAt: null, updatedAt: null
  }));
  return {
    summary: planDraft.summary,
    agents,
    tasks,
    integrationOrder: planDraft.integrationOrder.map((taskId) => taskIds.get(taskId)),
    validationStrategy: [...planDraft.validationStrategy],
    expectedArtifacts: ["integrated source tree", "target validation evidence", "mission event stream"],
    risks: [...planDraft.risks],
    approvalRequirements: [...planDraft.approvalRequirements]
  };
}

function progress(tasks) {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.status === "complete").length;
  return { totalTasks: total, completedTasks: completed, percent: total === 0 ? 0 : Math.round((completed / total) * 100) };
}

export function createMission({ ownerOutcome, projectId, repositoryPath, baseRevision = "HEAD", autonomyLevel = "balanced", concurrencyLimit = DEFAULT_CONCURRENCY, budgetUsd = 5, validationCommands = ["npm test", "npm run build"], planningEvidence = null, plan, root = process.cwd(), now = new Date() }) {
  if (typeof ownerOutcome !== "string" || ownerOutcome.trim().length < 3) throw new Error("mission owner outcome is required");
  if (!projectId) throw new Error("mission projectId is required");
  if (!repositoryPath) throw new Error("mission base repository is required");
  if (!new Set(["supervised", "balanced", "autonomous"]).has(autonomyLevel)) throw new Error("mission autonomy level is invalid");
  if (!Number.isInteger(concurrencyLimit) || concurrencyLimit < 1 || concurrencyLimit > 8) throw new Error("mission concurrency limit must be between 1 and 8");
  if (!Number.isFinite(budgetUsd) || budgetUsd < 0 || budgetUsd > 50) throw new Error("mission budget must be between USD $0 and $50");
  const timestamp = isoTimestamp(now);
  const missionId = id("mission", `${now.toISOString().replace(/[^0-9]/g, "").slice(0, 14)}-${randomUUID().slice(0, 8)}`);
  const planningCostUsd = Number(planningEvidence?.costUsd || 0);
  if (planningCostUsd > budgetUsd) throw new Error("mission planning cost exceeds the mission budget");
  validationCommands.forEach(assertAllowedAgentCommand);
  const missionPlan = plan ?? (planningEvidence?.planDraft
    ? buildMissionPlanFromDraft({ missionId, projectId, planDraft: planningEvidence.planDraft })
    : buildDefaultMissionPlan({ missionId, ownerOutcome: ownerOutcome.trim(), projectId, validationCommands }));
  for (const agent of missionPlan.agents) if (!SOFTWARE_ROLES.has(agent.role)) throw new Error(`unsupported mission role: ${agent.role}`);
  const integration = createMissionIntegrationWorkspace({ missionId, repositoryPath, baseRevision });
  const mission = {
    missionId, ownerOutcome: ownerOutcome.trim(), projectId, status: "planned", autonomyLevel, baseRepository: integration.repository,
    baseRevision: integration.baseRevision, integrationWorkspace: integration, team: missionPlan.agents.map((agent) => agent.agentRunId),
    tasks: missionPlan.tasks.map((task) => task.taskId), dependencies: Object.fromEntries(missionPlan.tasks.map((task) => [task.taskId, task.dependencies])),
    budget: { limitUsd: budgetUsd, spentUsd: planningCostUsd, remainingUsd: Number((budgetUsd - planningCostUsd).toFixed(6)) }, concurrencyLimit,
    progress: progress(missionPlan.tasks), eventsPath: missionPaths(missionId).events, artifacts: [], preview: { ready: false, url: null, entryFile: null },
    validationStrategy: missionPlan.validationStrategy, integrationOrder: missionPlan.integrationOrder, risks: missionPlan.risks || [], approvalRequirements: missionPlan.approvalRequirements || ["Exact owner approval is required for every protected external action"],
    finalValidation: { attempt: 1, maximumAttempts: 2 },
    planning: planningEvidence ? { mode: "model", model: planningEvidence.model, usage: planningEvidence.usage, costUsd: planningCostUsd, usageAuditPath: planningEvidence.usageAuditPath } : { mode: "deterministic_fallback", reason: "approved model planner unavailable" },
    policy: autonomyLevel === "supervised"
      ? { localExecution: "manual_start", protectedExternalActions: "exact_owner_approval" }
      : autonomyLevel === "autonomous"
        ? { localExecution: "automatic", protectedExternalActions: "exact_owner_approval", safeRepair: "automatic" }
        : { localExecution: "automatic", protectedExternalActions: "exact_owner_approval", safeRepair: "bounded" },
    blockers: [], ownerDecisions: [], protectedExternalActionsExecuted: false,
    createdAt: timestamp, updatedAt: timestamp, completedAt: null
  };
  writeMission(mission, root);
  appendMissionEvent({ missionId, type: "mission.created", payload: { ownerOutcome: mission.ownerOutcome, projectId, autonomyLevel }, now, root });
  appendMissionEvent({ missionId, type: "mission.planning", payload: { planner: mission.planning.mode, model: mission.planning.model || null, usageAuditPath: mission.planning.usageAuditPath || null }, now, root });
  for (const agent of missionPlan.agents) {
    writeAgentRun(agent, root);
    appendMissionEvent({ missionId, type: "agent.spawned", agentRunId: agent.agentRunId, payload: { role: agent.role, displayName: agent.displayName, provider: agent.provider, model: agent.model }, now, root });
  }
  for (const rawTask of missionPlan.tasks) {
    const task = { ...rawTask, createdAt: timestamp, updatedAt: timestamp };
    writeMissionTask(task, root);
    appendMissionEvent({ missionId, type: "task.created", agentRunId: task.assignedAgentRunId, taskId: task.taskId, payload: { title: task.title, dependencies: task.dependencies }, now, root });
    if (task.status === "ready") appendMissionEvent({ missionId, type: "task.ready", agentRunId: task.assignedAgentRunId, taskId: task.taskId, payload: {}, now, root });
  }
  appendMissionEvent({ missionId, type: "mission.planned", payload: { agentCount: mission.team.length, taskCount: mission.tasks.length, integrationOrder: missionPlan.integrationOrder }, now, root });
  return missionDetail(missionId, root);
}

function updateMissionRecord(mission, updates, root, now) {
  const next = { ...mission, ...updates, updatedAt: isoTimestamp(now) };
  writeMission(next, root);
  return next;
}

function updateAgent(agent, updates, root, now) {
  const next = { ...agent, ...updates, lastActivityAt: isoTimestamp(now), updatedAt: isoTimestamp(now) };
  writeAgentRun(next, root);
  return next;
}

function updateTask(task, updates, root, now) {
  const next = { ...task, ...updates, updatedAt: isoTimestamp(now) };
  writeMissionTask(next, root);
  return next;
}

function taskReady(task, byId) {
  return task.status === "waiting" && task.dependencies.every((dependency) => byId.get(dependency)?.status === "complete");
}

function createEmit({ missionId, agentRunId, taskId, workspaceId, root }) {
  return (type, payload, now) => appendMissionEvent({ missionId, type, agentRunId, taskId, workspaceId, payload, now, root });
}

function isAbortError(error, signal) {
  return Boolean(signal?.aborted || error?.name === "AbortError" || error?.code === "ABORT_ERR");
}

function throwIfAborted(signal) {
  if (!signal?.aborted) return;
  const error = signal.reason instanceof Error ? signal.reason : new Error(String(signal.reason || "mission execution cancelled"));
  error.name = "AbortError";
  error.code = "ABORT_ERR";
  throw error;
}

async function executeMissionTask({ mission, task, agent, provider, root, now, signal = null }) {
  throwIfAborted(signal);
  const workspace = createTaskWorkspace({ missionId: mission.missionId, taskId: `${task.taskId}-attempt-${task.attempt}`, repositoryPath: mission.baseRepository, integrationWorkspace: mission.integrationWorkspace });
  const emit = createEmit({ missionId: mission.missionId, agentRunId: agent.agentRunId, taskId: task.taskId, workspaceId: workspace.workspaceId, root });
  const startedAt = isoTimestamp(now());
  task = updateTask(task, { status: task.kind === "review" ? "reviewing" : "working", workspace, startedAt, blockers: [] }, root, now());
  agent = updateAgent(agent, { status: task.kind === "review" || task.kind === "qa" ? "reviewing" : "working", currentTaskId: task.taskId, workspacePath: workspace.path, branch: workspace.branch, startedAt: agent.startedAt || startedAt, failure: null }, root, now());
  emit("agent.status_changed", { status: agent.status }, now());
  emit(task.kind === "review" ? "review.started" : "task.started", { title: task.title, attempt: task.attempt }, now());
  let result;
  try {
    emit("dependency.bootstrap.started", { workspacePath: workspace.path }, now());
    const bootstrap = await bootstrapMissionWorkspace({ workspacePath: workspace.path, signal });
    throwIfAborted(signal);
    workspace.bootstrap = bootstrap;
    task = updateTask(task, { workspace }, root, now());
    emit("dependency.bootstrap.completed", { manager: bootstrap.manager, status: bootstrap.status, lifecycleScriptsAllowed: bootstrap.lifecycleScriptsAllowed }, now());
    result = await runAgentToolLoop({ agent, task, workspace, provider, emit, budgetRemainingUsd: mission.budget.remainingUsd, now, signal });
    throwIfAborted(signal);
    if (task.kind === "coding" && result.outcome === "complete" && result.filesChanged.length === 0) {
      result.outcome = "failed";
      result.defects.push({ title: `No implementation produced for ${task.title}`, description: "The coding agent completed without changing any target-project file.", ownerRole: "Fixer" });
    }
    if (task.kind === "review" && result.outcome === "complete" && !result.toolsUsed.includes("git_diff")) {
      result.outcome = "failed";
      result.defects.push({ title: `Review evidence missing for ${task.title}`, description: "The reviewer did not inspect the integrated Git diff.", ownerRole: "Fixer" });
    }
    if (task.kind === "qa") {
      const evidenceByCommand = new Map();
      for (const evidence of result.testResults) if (evidence?.command) evidenceByCommand.set(evidence.command, evidence);
      for (const evidence of result.commandsExecuted) if (evidence?.command && !evidenceByCommand.has(evidence.command)) evidenceByCommand.set(evidence.command, { command: evidence.command, passed: evidence.passed, output: "Validation command executed by the QA agent." });
      for (const command of task.validationCommands) {
        let evidence = evidenceByCommand.get(command);
        if (!evidence) {
          emit("test.started", { command }, now());
          const validation = await executeAgentTool({ workspacePath: workspace.path, tool: "run_tests", input: { command }, allowedTools: agent.allowedTools, signal });
          evidence = { command, passed: validation.passed, output: (validation.stderr || validation.stdout || "").slice(-4000) };
          evidenceByCommand.set(command, evidence);
          result.commandsExecuted.push({ command, passed: validation.passed, status: validation.status });
          emit(validation.passed ? "test.passed" : "test.failed", { command, output: evidence.output }, now());
        }
        if (!evidence.passed) {
          result.outcome = "failed";
          if (!result.defects.some((defect) => defect.title === `Target validation failed: ${command}`)) result.defects.push({ title: `Target validation failed: ${command}`, description: evidence.output || "Target validation failed", ownerRole: "Fixer" });
        }
      }
      result.testResults = task.validationCommands.map((command) => evidenceByCommand.get(command));
    }
    throwIfAborted(signal);
    const commit = commitTaskWorkspace({ workspace, taskId: task.taskId });
    return { task, agent, workspace, result, commit };
  } catch (error) {
    if (isAbortError(error, signal)) throw error;
    if (!workspace.bootstrap) emit("dependency.bootstrap.failed", { error: error.message }, now());
    return { task, agent, workspace, result: { outcome: "failed", summary: error.message, defects: [{ title: "Agent execution failed", description: error.message, ownerRole: "Fixer" }], filesChanged: [], commandsExecuted: [], testResults: [], toolsUsed: [], tokenUsage: error.tokenUsage || { input: 0, output: 0 }, costUsd: Number(error.costUsd || 0) }, commit: { changed: false, commit: null, files: [] }, error };
  }
}

function ensureFixer({ mission, agents, root, now }) {
  let fixer = agents.find((agent) => agent.role === "Fixer");
  if (fixer) return fixer;
  fixer = agentDefinition(mission.missionId, "Fixer", agents.length, { now });
  writeAgentRun(fixer, root);
  mission.team.push(fixer.agentRunId);
  appendMissionEvent({ missionId: mission.missionId, type: "agent.spawned", agentRunId: fixer.agentRunId, payload: { role: fixer.role, displayName: fixer.displayName, provider: fixer.provider, model: fixer.model }, now, root });
  return fixer;
}

function createRepairTask({ mission, failedTask, defect, fixer, root, now }) {
  const timestamp = isoTimestamp(now);
  const taskId = id("mission-task", `${mission.missionId}-repair-${slugify(failedTask.taskId)}-${failedTask.attempt}-${randomUUID().slice(0, 6)}`);
  const repair = {
    taskId, missionId: mission.missionId, title: defect.title || `Repair ${failedTask.title}`, description: defect.description || failedTask.blockers.join("; "),
    assignedAgentRunId: fixer.agentRunId, assignedRole: fixer.role, status: "ready", dependencies: [...failedTask.dependencies],
    acceptanceCriteria: [`Resolve the recorded defect from ${failedTask.taskId}`, "Do not weaken tests or safety boundaries"], attempt: 1, maximumAttempts: 2,
    workspace: null, artifacts: [], filesTouched: [], commandsExecuted: [], blockers: [], reviewState: "repair_pending", kind: "repair", validationCommands: [],
    createdAt: timestamp, startedAt: null, completedAt: null, updatedAt: timestamp
  };
  writeMissionTask(repair, root);
  appendMissionEvent({ missionId: mission.missionId, type: "repair.created", agentRunId: fixer.agentRunId, taskId: repair.taskId, payload: { sourceTaskId: failedTask.taskId, defect }, now, root });
  return repair;
}

function createHandoffs({ mission, completedTask, tasks, root, now }) {
  const created = [];
  for (const destination of tasks.filter((task) => task.dependencies.includes(completedTask.taskId))) {
    const record = {
      handoffId: id("handoff", `${mission.missionId}-${completedTask.taskId}-${destination.taskId}`), missionId: mission.missionId,
      sourceAgentRunId: completedTask.assignedAgentRunId, destinationAgentRunId: destination.assignedAgentRunId, taskId: destination.taskId,
      reason: `${completedTask.title} completed; dependency evidence is ready for ${destination.title}.`, artifacts: completedTask.artifacts,
      requiredAction: destination.description, createdAt: isoTimestamp(now)
    };
    writeHandoff(record, root);
    appendMissionEvent({ missionId: mission.missionId, type: "handoff.created", agentRunId: record.sourceAgentRunId, taskId: destination.taskId, artifactIds: record.artifacts, payload: record, now, root });
    created.push(record);
  }
  return created;
}

function scheduleFinalValidationRetry({ mission, blockers, root, now }) {
  const agents = listMissionAgents(mission.missionId, root);
  const tasks = listMissionTasks(mission.missionId, root);
  const fixer = ensureFixer({ mission, agents, root, now });
  const integrationTask = tasks.find((task) => task.kind === "integration") || tasks.at(-1);
  const repair = createRepairTask({
    mission,
    failedTask: integrationTask,
    defect: { title: `Repair final integration validation attempt ${mission.finalValidation.attempt}`, description: blockers.join("\n"), ownerRole: "Fixer" },
    fixer,
    root,
    now
  });
  const qa = agents.find((agent) => agent.role === "QA Engineer");
  if (!qa) throw new Error("final integration repair requires a QA Engineer AgentRun");
  const timestamp = isoTimestamp(now);
  const qaTaskId = id("mission-task", `${mission.missionId}-final-revalidation-${mission.finalValidation.attempt + 1}`);
  const qaTask = {
    taskId: qaTaskId, missionId: mission.missionId, projectId: mission.projectId, title: `Revalidate repaired integration attempt ${mission.finalValidation.attempt + 1}`,
    description: "Run the complete declared validation strategy after the bounded final-integration repair.", assignedAgentRunId: qa.agentRunId, assignedRole: qa.role,
    status: "waiting", dependencies: [repair.taskId], acceptanceCriteria: ["Every declared validation command has passing evidence"], attempt: 1, maximumAttempts: 2,
    workspace: null, artifacts: [], filesTouched: [], commandsExecuted: [], blockers: [], reviewState: "pending", kind: "qa", validationCommands: [...mission.validationStrategy],
    createdAt: timestamp, startedAt: null, completedAt: null, updatedAt: timestamp
  };
  writeMissionTask(qaTask, root);
  appendMissionEvent({ missionId: mission.missionId, type: "task.created", agentRunId: qa.agentRunId, taskId: qaTask.taskId, payload: { title: qaTask.title, dependencies: qaTask.dependencies, finalRevalidation: true }, now, root });
  mission.tasks.push(repair.taskId, qaTask.taskId);
  mission.dependencies = { ...mission.dependencies, [repair.taskId]: repair.dependencies, [qaTask.taskId]: qaTask.dependencies };
  mission.team = [...new Set(mission.team)];
  mission.finalValidation = { ...mission.finalValidation, attempt: mission.finalValidation.attempt + 1 };
  mission.status = "running";
  mission.blockers = blockers;
  writeMission(mission, root);
  appendMissionEvent({ missionId: mission.missionId, type: "final_validation.repair_created", agentRunId: fixer.agentRunId, taskId: repair.taskId, payload: { blockers, revalidationTaskId: qaTask.taskId, attempt: mission.finalValidation.attempt }, now, root });
  return mission;
}

async function runMissionExecution({ missionId, provider, root = process.cwd(), now = () => new Date(), signal = null }) {
  throwIfAborted(signal);
  let mission = readMission(missionId, root);
  if (["completed", "cancelled", "failed"].includes(mission.status)) return missionDetail(missionId, root);
  if (mission.status === "blocked") {
    const resumablePattern = /(?:budget|approval).*(?:exhausted|blocked|remaining|cap|breaker)|(?:exhausted|blocked).*(?:budget|approval)/i;
    const blockedTasks = listMissionTasks(missionId, root).filter((task) => task.status === "blocked" && task.blockers.some((blocker) => resumablePattern.test(blocker)));
    if (blockedTasks.length === 0) return missionDetail(missionId, root);
    const agents = listMissionAgents(missionId, root);
    for (const task of blockedTasks) {
      updateTask(task, { status: "ready", attempt: task.attempt + 1, workspace: null, blockers: [], completedAt: null }, root, now());
      const agent = agents.find((candidate) => candidate.agentRunId === task.assignedAgentRunId);
      if (agent) updateAgent(agent, { status: "waiting", currentTaskId: null, completedAt: null, failure: null }, root, now());
    }
    mission = updateMissionRecord(mission, { status: "running", blockers: [] }, root, now());
    appendMissionEvent({ missionId, type: "mission.resumed", payload: { requeuedTaskIds: blockedTasks.map((task) => task.taskId), reason: "fresh bounded provider approval or budget capacity" }, now: now(), root });
  }
  mission = updateMissionRecord(mission, { status: "running", blockers: [] }, root, now());
  const commander = listMissionAgents(missionId, root).find((agent) => agent.role === "Commander");
  if (commander) updateAgent(commander, { status: "working", startedAt: commander.startedAt || isoTimestamp(now()) }, root, now());
  appendMissionEvent({ missionId, type: "mission.running", payload: { concurrencyLimit: mission.concurrencyLimit }, now: now(), root });
  let safetyCounter = 0;
  while (safetyCounter++ < 100) {
    throwIfAborted(signal);
    mission = readMission(missionId, root);
    if (mission.status === "cancelled") return missionDetail(missionId, root);
    let tasks = listMissionTasks(missionId, root);
    let agents = listMissionAgents(missionId, root);
    const byId = new Map(tasks.map((task) => [task.taskId, task]));
    for (const task of tasks.filter((candidate) => taskReady(candidate, byId))) {
      updateTask(task, { status: "ready" }, root, now());
      appendMissionEvent({ missionId, type: "task.ready", agentRunId: task.assignedAgentRunId, taskId: task.taskId, payload: {}, now: now(), root });
    }
    tasks = listMissionTasks(missionId, root);
    const claimedAgents = new Set();
    const ready = [];
    for (const candidate of tasks.filter((task) => task.status === "ready")) {
      if (claimedAgents.has(candidate.assignedAgentRunId)) continue;
      claimedAgents.add(candidate.assignedAgentRunId);
      ready.push(candidate);
      if (ready.length >= mission.concurrencyLimit) break;
    }
    if (ready.length === 0) {
      if (tasks.every((task) => task.status === "complete")) break;
      const terminalFailure = tasks.find((task) => task.status === "failed" || task.status === "blocked");
      mission = updateMissionRecord(mission, { status: terminalFailure ? "failed" : "blocked", blockers: terminalFailure ? terminalFailure.blockers : ["No runnable tasks remain in the dependency graph"] }, root, now());
      appendMissionEvent({ missionId, type: terminalFailure ? "mission.failed" : "mission.blocked", payload: { blockers: mission.blockers }, now: now(), root });
      return missionDetail(missionId, root);
    }
    const taskBudgetAllowance = mission.budget.remainingUsd / ready.length;
    const settledExecutions = await Promise.allSettled(ready.map((task) => executeMissionTask({ mission: { ...mission, budget: { ...mission.budget, remainingUsd: taskBudgetAllowance } }, task, agent: agents.find((agent) => agent.agentRunId === task.assignedAgentRunId), provider, root, now, signal })));
    throwIfAborted(signal);
    const rejected = settledExecutions.find((entry) => entry.status === "rejected");
    if (rejected) throw rejected.reason;
    const executions = settledExecutions.map((entry) => entry.value);
    for (const execution of executions) {
      mission = readMission(missionId, root);
      tasks = listMissionTasks(missionId, root);
      agents = listMissionAgents(missionId, root);
      let task = tasks.find((item) => item.taskId === execution.task.taskId);
      let agent = agents.find((item) => item.agentRunId === execution.agent.agentRunId);
      const spent = Number((mission.budget.spentUsd + execution.result.costUsd).toFixed(6));
      mission = updateMissionRecord(mission, { budget: { ...mission.budget, spentUsd: spent, remainingUsd: Math.max(0, Number((mission.budget.limitUsd - spent).toFixed(6))) } }, root, now());
      agent = updateAgent(agent, { tokenUsage: { input: agent.tokenUsage.input + execution.result.tokenUsage.input, output: agent.tokenUsage.output + execution.result.tokenUsage.output }, costUsd: Number((agent.costUsd + execution.result.costUsd).toFixed(6)) }, root, now());
      if (["mission_budget_exhausted", "blocked_budget", "approval_exhausted"].includes(execution.error?.code)) {
        const reason = execution.error.message;
        updateTask(task, { status: "blocked", blockers: [reason], completedAt: isoTimestamp(now()) }, root, now());
        updateAgent(agent, { status: "blocked", currentTaskId: null, completedAt: isoTimestamp(now()), failure: { message: reason, taskId: task.taskId } }, root, now());
        mission = updateMissionRecord(mission, { status: "blocked", blockers: [reason], progress: progress(listMissionTasks(missionId, root)) }, root, now());
        appendMissionEvent({ missionId, type: "budget.exhausted", agentRunId: agent.agentRunId, taskId: task.taskId, payload: { reason, spentUsd: mission.budget.spentUsd, limitUsd: mission.budget.limitUsd }, now: now(), root });
        appendMissionEvent({ missionId, type: "mission.blocked", payload: { blockers: mission.blockers }, now: now(), root });
        return missionDetail(missionId, root);
      }
      if (execution.result.outcome === "complete") {
        const integration = integrateTaskCommit({ integrationWorkspace: mission.integrationWorkspace, commit: execution.commit.commit });
        if (integration.conflict) {
          execution.result.outcome = "failed";
          execution.result.defects = [{ title: "Integration conflict", description: integration.error, ownerRole: "Fixer" }];
          appendMissionEvent({ missionId, type: "review.failed", agentRunId: agent.agentRunId, taskId: task.taskId, payload: { reason: integration.error }, now: now(), root });
        } else {
          const artifacts = [...new Set([...(task.artifacts || []), ...(integration.files || execution.commit.files || [])])];
          task = updateTask(task, { status: "complete", artifacts, filesTouched: [...new Set([...task.filesTouched, ...execution.result.filesChanged, ...execution.commit.files])], commandsExecuted: [...task.commandsExecuted, ...execution.result.commandsExecuted], reviewState: task.kind === "review" ? "passed" : task.reviewState, completedAt: isoTimestamp(now()) }, root, now());
          agent = updateAgent(agent, { status: "complete", currentTaskId: null, completedAt: isoTimestamp(now()), failure: null }, root, now());
          appendMissionEvent({ missionId, type: task.kind === "review" ? "review.passed" : "task.completed", agentRunId: agent.agentRunId, taskId: task.taskId, workspaceId: execution.workspace.workspaceId, artifactIds: task.artifacts, payload: { summary: execution.result.summary, files: task.filesTouched, commit: integration.commit }, now: now(), root });
          appendMissionEvent({ missionId, type: "agent.completed", agentRunId: agent.agentRunId, taskId: task.taskId, payload: { costUsd: agent.costUsd }, now: now(), root });
          createHandoffs({ mission, completedTask: task, tasks, root, now: now() });
          continue;
        }
      }
      const defects = execution.result.defects.length > 0 ? execution.result.defects : [{ title: `Repair ${task.title}`, description: execution.result.summary, ownerRole: "Fixer" }];
      if (task.attempt >= task.maximumAttempts) {
        task = updateTask(task, { status: "failed", blockers: defects.map((defect) => defect.description), commandsExecuted: [...task.commandsExecuted, ...execution.result.commandsExecuted], completedAt: isoTimestamp(now()) }, root, now());
        updateAgent(agent, { status: "failed", currentTaskId: null, completedAt: isoTimestamp(now()), failure: { message: task.blockers.join("; "), taskId: task.taskId } }, root, now());
        appendMissionEvent({ missionId, type: "task.failed", agentRunId: agent.agentRunId, taskId: task.taskId, payload: { blockers: task.blockers, attempts: task.attempt }, now: now(), root });
        continue;
      }
      const fixer = ensureFixer({ mission, agents, root, now: now() });
      const repairTasks = defects.map((defect) => createRepairTask({ mission, failedTask: task, defect, fixer, root, now: now() }));
      mission.tasks.push(...repairTasks.map((repair) => repair.taskId));
      mission.dependencies = { ...mission.dependencies, ...Object.fromEntries(repairTasks.map((repair) => [repair.taskId, repair.dependencies])) };
      mission.team = [...new Set(mission.team)];
      writeMission(mission, root);
      task = updateTask(task, { status: "waiting", dependencies: [...new Set([...task.dependencies, ...repairTasks.map((repair) => repair.taskId)])], attempt: task.attempt + 1, blockers: defects.map((defect) => defect.description), reviewState: "repair_required" }, root, now());
      updateAgent(agent, { status: "waiting", currentTaskId: null, failure: null }, root, now());
      appendMissionEvent({ missionId, type: task.kind === "qa" ? "review.failed" : "task.failed", agentRunId: agent.agentRunId, taskId: task.taskId, payload: { defects, repairTaskIds: repairTasks.map((repair) => repair.taskId), willRetry: true }, now: now(), root });
    }
    const refreshedTasks = listMissionTasks(missionId, root);
    mission = readMission(missionId, root);
    updateMissionRecord(mission, { progress: progress(refreshedTasks) }, root, now());
  }
  mission = readMission(missionId, root);
  const finalValidation = [];
  appendMissionEvent({ missionId, type: "dependency.bootstrap.started", workspaceId: mission.integrationWorkspace.workspaceId, payload: { finalIntegration: true }, now: now(), root });
  try {
    const bootstrap = await bootstrapMissionWorkspace({ workspacePath: mission.integrationWorkspace.path, signal });
    throwIfAborted(signal);
    mission.integrationWorkspace = { ...mission.integrationWorkspace, bootstrap };
    writeMission(mission, root);
    appendMissionEvent({ missionId, type: "dependency.bootstrap.completed", workspaceId: mission.integrationWorkspace.workspaceId, payload: { finalIntegration: true, manager: bootstrap.manager, status: bootstrap.status, lifecycleScriptsAllowed: bootstrap.lifecycleScriptsAllowed }, now: now(), root });
  } catch (error) {
    if (isAbortError(error, signal)) throw error;
    finalValidation.push({ command: "dependency bootstrap", passed: false, status: null, output: error.message });
    appendMissionEvent({ missionId, type: "dependency.bootstrap.failed", workspaceId: mission.integrationWorkspace.workspaceId, payload: { finalIntegration: true, error: error.message }, now: now(), root });
  }
  for (const command of mission.validationStrategy) {
    appendMissionEvent({ missionId, type: "test.started", workspaceId: mission.integrationWorkspace.workspaceId, payload: { command, final: true }, now: now(), root });
    const result = await executeAgentTool({ workspacePath: mission.integrationWorkspace.path, tool: "run_tests", input: { command }, signal });
    throwIfAborted(signal);
    finalValidation.push({ command, passed: result.passed, status: result.status, output: (result.stderr || result.stdout || "").slice(-4000) });
    appendMissionEvent({ missionId, type: result.passed ? "test.passed" : "test.failed", workspaceId: mission.integrationWorkspace.workspaceId, payload: { command, final: true, output: finalValidation.at(-1).output }, now: now(), root });
  }
  const secretScan = scanSecrets({ root: mission.integrationWorkspace.path });
  if (finalValidation.some((result) => !result.passed) || !secretScan.ok) {
    const blockers = [...finalValidation.filter((result) => !result.passed).map((result) => `Final validation failed: ${result.command}\n${result.output}`), ...(!secretScan.ok ? [`Secret scan found ${secretScan.findings.length} finding(s)`] : [])];
    if (mission.finalValidation.attempt < mission.finalValidation.maximumAttempts) {
      scheduleFinalValidationRetry({ mission, blockers, root, now: now() });
      return runMissionExecution({ missionId, provider, root, now, signal });
    }
    mission = updateMissionRecord(mission, { status: "failed", blockers, progress: progress(listMissionTasks(missionId, root)) }, root, now());
    appendMissionEvent({ missionId, type: "mission.failed", payload: { blockers }, now: now(), root });
    return missionDetail(missionId, root);
  }
  const artifactPath = `${missionPaths(missionId).artifacts}/final-result.json`;
  const previewEntryFile = ["dist/index.html", "public/index.html", "index.html"].find((entry) => existsSync(`${mission.integrationWorkspace.path}/${entry}`)) || null;
  const preview = previewEntryFile
    ? { ready: true, url: `/api/v1/missions/${missionId}/preview/${previewEntryFile}`, entryFile: previewEntryFile }
    : { ready: false, url: null, entryFile: null };
  const artifact = { artifactId: id("artifact", `${missionId}-final-result`), missionId, kind: "integrated_repository", workspacePath: mission.integrationWorkspace.path, branch: mission.integrationWorkspace.branch, revision: executionRevision(mission.integrationWorkspace.path), validation: finalValidation, secretScanPassed: true, preview, createdAt: isoTimestamp(now()) };
  writeJson(artifactPath, artifact, root);
  mission = updateMissionRecord(mission, { status: "completed", blockers: [], artifacts: [artifact.artifactId], preview, progress: progress(listMissionTasks(missionId, root)), completedAt: isoTimestamp(now()) }, root, now());
  if (preview.ready) appendMissionEvent({ missionId, type: "preview.ready", artifactIds: [artifact.artifactId], payload: preview, now: now(), root });
  const completedCommander = listMissionAgents(missionId, root).find((agent) => agent.role === "Commander");
  if (completedCommander) {
    updateAgent(completedCommander, { status: "complete", currentTaskId: null, completedAt: isoTimestamp(now()) }, root, now());
    appendMissionEvent({ missionId, type: "agent.completed", agentRunId: completedCommander.agentRunId, payload: { role: "Commander", costUsd: completedCommander.costUsd }, now: now(), root });
  }
  appendMissionEvent({ missionId, type: "mission.completed", artifactIds: [artifact.artifactId], payload: { branch: artifact.branch, revision: artifact.revision, validation: finalValidation.map(({ command, passed }) => ({ command, passed })) }, now: now(), root });
  return missionDetail(missionId, root);
}

function executionRevision(workspacePath) {
  return gitRevision(workspacePath);
}

function finalizeMissionCancellation({ missionId, reason, root = process.cwd(), now = new Date() }) {
  let mission = readMission(missionId, root);
  if (["completed", "cancelled"].includes(mission.status)) return missionDetail(missionId, root);
  mission = updateMissionRecord(mission, { status: "cancelled", blockers: [String(reason || "Cancelled by owner")] }, root, now);
  for (const task of listMissionTasks(missionId, root).filter((item) => !["complete", "failed"].includes(item.status))) updateTask(task, { status: "cancelled", blockers: mission.blockers }, root, now);
  for (const agent of listMissionAgents(missionId, root).filter((item) => !["complete", "failed"].includes(item.status))) updateAgent(agent, { status: "blocked", currentTaskId: null, failure: { message: mission.blockers[0] } }, root, now);
  cancelMissionWorkspaces({ repositoryPath: mission.baseRepository, missionId });
  appendMissionEvent({ missionId, type: "mission.cancelled", payload: { reason: mission.blockers[0] }, now, root });
  return missionDetail(missionId, root);
}

export async function runMission(options) {
  try {
    return await runMissionExecution(options);
  } catch (error) {
    if (!isAbortError(error, options.signal)) throw error;
    return finalizeMissionCancellation({ missionId: options.missionId, reason: options.signal?.reason?.message || options.signal?.reason || "Cancelled by owner", root: options.root, now: options.now?.() || new Date() });
  }
}

export function cancelMission(options) {
  return finalizeMissionCancellation(options);
}

export { listMissions, missionDetail };
