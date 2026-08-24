import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { allowedToolsForRole, executeAgentTool, resolveAgentPath, runAgentToolLoop } from "../scripts/lib/runtime/agent-runner.mjs";
import { buildDefaultMissionPlan, cancelMission, createMission, runMission } from "../scripts/lib/runtime/mission-runtime.mjs";
import { createAnthropicAgentProvider } from "../scripts/lib/runtime/anthropic-agent-provider.mjs";
import { finalizeAnthropicBudgetReservation } from "../scripts/lib/runtime/anthropic-budget-guard.mjs";
import { createAnthropicMissionPlan, DEFAULT_MISSION_PLANNER_TIMEOUT_MS } from "../scripts/lib/runtime/anthropic-mission-planner.mjs";
import { detectWorkspacePackageManager } from "../scripts/lib/runtime/mission-bootstrap.mjs";
import { missionPlanTasks, validateMissionPlanDraft } from "../scripts/lib/runtime/mission-plan.mjs";
import { readMissionEvents } from "../scripts/lib/runtime/mission-store.mjs";

function write(root, relativePath, content) {
  const target = path.join(root, relativePath);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, content, "utf8");
}

function git(root, ...args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

function fixture({ requireFinalRepair = true } = {}) {
  const base = mkdtempSync(path.join(tmpdir(), "ag-os-mission-"));
  const repository = path.join(base, "target");
  const records = path.join(base, "records");
  mkdirSync(repository, { recursive: true });
  mkdirSync(records, { recursive: true });
  write(repository, "package.json", `${JSON.stringify({
    name: "lead-crm-fixture",
    type: "module",
    packageManager: "npm@10.9.2",
    dependencies: { "lead-normalizer": "file:vendor/lead-normalizer" },
    scripts: { test: "node --test tests/lead.test.mjs", build: "node scripts/build.mjs", slowtest: "node --test tests/slow.test.mjs" }
  }, null, 2)}\n`);
  write(repository, "package-lock.json", `${JSON.stringify({
    name: "lead-crm-fixture", lockfileVersion: 3, requires: true,
    packages: {
      "": { name: "lead-crm-fixture", dependencies: { "lead-normalizer": "file:vendor/lead-normalizer" } },
      "node_modules/lead-normalizer": { resolved: "vendor/lead-normalizer", link: true },
      "vendor/lead-normalizer": { name: "lead-normalizer", version: "1.0.0" }
    }
  }, null, 2)}\n`);
  write(repository, ".gitignore", "node_modules/\n");
  write(repository, "vendor/lead-normalizer/package.json", `${JSON.stringify({ name: "lead-normalizer", version: "1.0.0", type: "module", exports: "./index.mjs" }, null, 2)}\n`);
  write(repository, "vendor/lead-normalizer/index.mjs", "export const normalizeLeadName = (value) => String(value).trim();\n");
  write(repository, "tests/lead.test.mjs", `import assert from "node:assert/strict";\nimport test from "node:test";\nimport { createLead } from "../src/server.mjs";\ntest("lead validation", () => { assert.throws(() => createLead("  "), /name/i); assert.deepEqual(createLead("Ada"), { name: "Ada", status: "new" }); });\n`);
  write(repository, "tests/slow.test.mjs", `import test from "node:test";\ntest("slow cancellable command", async () => { await new Promise((resolve) => setTimeout(resolve, 20000)); });\n`);
  write(repository, "scripts/build.mjs", `import { existsSync } from "node:fs";\nimport path from "node:path";\nif (!existsSync("public/index.html") || !existsSync("src/server.mjs")) throw new Error("build inputs missing");\n${requireFinalRepair ? 'if (path.basename(process.cwd()) === "integration" && !existsSync("final-ready.txt")) throw new Error("final integration repair required");' : "void path;"}\n`);
  write(repository, "README.md", "# Lead CRM fixture\n");
  git(repository, "init");
  git(repository, "config", "user.email", "mission@example.test");
  git(repository, "config", "user.name", "Mission Test");
  git(repository, "add", "-A");
  git(repository, "commit", "-m", "fixture");
  return { base, repository, records };
}

function readyFixture() {
  const result = fixture({ requireFinalRepair: false });
  write(result.repository, "src/server.mjs", "import { normalizeLeadName } from \"lead-normalizer\";\nexport function createLead(name) { const normalized = normalizeLeadName(name); if (!normalized) throw new Error(\"name is required\"); return { name: normalized, status: \"new\" }; }\n");
  write(result.repository, "public/index.html", "<!doctype html><title>Ready CRM</title>\n");
  git(result.repository, "add", "-A");
  git(result.repository, "commit", "-m", "ready fixture");
  return result;
}

class ScriptedProvider {
  constructor() {
    this.active = 0;
    this.maximumActive = 0;
  }

  async nextAction({ agent, task, transcript }) {
    this.active += 1;
    this.maximumActive = Math.max(this.maximumActive, this.active);
    await new Promise((resolve) => setTimeout(resolve, 4));
    this.active -= 1;
    const first = transcript.length === 0;
    let action;
    if (!first) action = { tool: "complete", input: { outcome: "complete", summary: `${agent.role} completed real bounded work.`, defects: [] } };
    else if (agent.role === "Architect") action = { tool: "write_file", input: { path: "docs/architecture.md", content: "# Lead CRM architecture\n\nFrontend calls a validated local domain function.\n" } };
    else if (agent.role === "UI Designer") action = { tool: "write_file", input: { path: "docs/ui-contract.md", content: "# Responsive CRM UI\n\nMobile-first lead form and status list.\n" } };
    else if (agent.role === "Frontend Engineer") action = { tool: "write_file", input: { path: "public/index.html", content: "<!doctype html><meta name=viewport content='width=device-width'><title>Lead CRM</title><main><h1>Lead CRM</h1><form><label>Name <input required></label><button>Add lead</button></form></main>" } };
    else if (agent.role === "Backend Engineer") action = { tool: "write_file", input: { path: "src/server.mjs", content: "import { normalizeLeadName } from \"lead-normalizer\";\nexport function createLead(name) { return { name: normalizeLeadName(name), status: \"new\" }; }\n" } };
    else if (agent.role === "Fixer" && task.title.startsWith("Repair final integration")) action = { tool: "write_file", input: { path: "final-ready.txt", content: "bounded final validation repair\n" } };
    else if (agent.role === "Fixer") action = { tool: "edit_file", input: { path: "src/server.mjs", search: "export function createLead(name) { return { name: normalizeLeadName(name), status: \"new\" }; }", replace: "export function createLead(name) { const normalized = normalizeLeadName(name); if (!normalized) throw new Error(\"name is required\"); return { name: normalized, status: \"new\" }; }" } };
    else if (agent.role === "Integration Agent") action = { tool: "run_tests", input: { command: "npm test" } };
    else if (["Code Reviewer", "Security Reviewer"].includes(agent.role)) action = { tool: "git_diff", input: {} };
    else action = { tool: "complete", input: { outcome: "complete", summary: `${agent.role} inspected the integrated repository.`, defects: [] } };
    return { action, usage: { input: 20, output: 10 }, costUsd: 0.001 };
  }
}

test("mission runtime builds a lead CRM, repairs failed QA, and preserves truthful evidence", async () => {
  const { repository, records } = fixture();
  const provider = new ScriptedProvider();
  const created = createMission({
    ownerOutcome: "Build a simple responsive lead CRM with a local API and validation",
    projectId: "fixture-lead-crm",
    repositoryPath: repository,
    validationCommands: ["npm test", "npm run build"],
    concurrencyLimit: 3,
    budgetUsd: 1,
    root: records
  });
  assert.equal(created.status, "planned");
  assert.ok(created.agents.some((agent) => agent.role === "Commander"));
  assert.ok(created.tasks.some((task) => task.dependencies.length > 1));
  const createdDesign = created.tasks.find((task) => task.assignedRole === "UI Designer");
  const createdFrontend = created.tasks.find((task) => task.assignedRole === "Frontend Engineer");
  assert.ok(createdFrontend.dependencies.includes(createdDesign.taskId), "frontend must consume the UI design contract");

  const completed = await runMission({ missionId: created.missionId, provider, root: records });
  assert.equal(completed.status, "completed", JSON.stringify({ blockers: completed.blockers, tasks: completed.tasks.map((task) => ({ title: task.title, status: task.status, attempt: task.attempt, blockers: task.blockers })) }, null, 2));
  assert.equal(completed.progress.percent, 100);
  assert.equal(completed.protectedExternalActionsExecuted, false);
  assert.ok(completed.agents.some((agent) => agent.role === "Fixer" && agent.status === "complete"), JSON.stringify({ agents: completed.agents.map(({ role, status }) => ({ role, status })), tests: completed.events.filter((event) => event.type.startsWith("test.")).map((event) => ({ type: event.type, payload: event.payload })) }, null, 2));
  assert.equal(completed.agents.find((agent) => agent.role === "Commander").status, "complete");
  assert.ok(completed.tasks.some((task) => task.kind === "repair" && task.status === "complete"));
  assert.equal(completed.tasks.find((task) => task.title === "Validate target project").attempt, 2);
  for (const qaTask of completed.tasks.filter((task) => task.kind === "qa")) assert.deepEqual([...new Set(qaTask.commandsExecuted.map((command) => command.command))].sort(), ["npm run build", "npm test"]);
  assert.ok(completed.handoffs.length > 0);
  assert.ok(completed.events.some((event) => event.type === "test.failed"));
  assert.ok(completed.events.some((event) => event.type === "repair.created"));
  assert.ok(completed.events.some((event) => event.type === "final_validation.repair_created"));
  assert.equal(completed.finalValidation.attempt, 2);
  assert.ok(completed.events.some((event) => event.type === "mission.completed"));
  assert.ok(completed.events.some((event) => event.type === "preview.ready"));
  assert.equal(completed.preview.entryFile, "public/index.html");
  assert.deepEqual(completed.events.map((event) => event.sequence), completed.events.map((_, index) => index + 1));
  const workspaces = new Set(completed.tasks.filter((task) => task.workspace).map((task) => task.workspace.path));
  assert.equal(workspaces.size, completed.tasks.filter((task) => task.workspace).length);
  assert.ok(completed.tasks.filter((task) => task.workspace).every((task) => task.workspace.bootstrap?.manager === "npm"));
  assert.ok(completed.tasks.filter((task) => task.workspace).every((task) => existsSync(path.join(task.workspace.path, "node_modules", "lead-normalizer", "index.mjs"))), "fresh worktrees should receive local locked dependencies");
  assert.ok(completed.events.some((event) => event.type === "dependency.bootstrap.completed" && event.payload.manager === "npm"));
  assert.match(readFileSync(path.join(completed.integrationWorkspace.path, "src/server.mjs"), "utf8"), /name is required/);
  assert.ok(completed.artifactRecords[0].revision);
});

test("deterministic fallback preserves real UI and database collaboration edges", () => {
  const plan = buildDefaultMissionPlan({ missionId: "mission-graph", projectId: "graph", ownerOutcome: "Build a responsive UI with backend API and database schema", validationCommands: ["npm test"] });
  const design = plan.tasks.find((task) => task.assignedRole === "UI Designer");
  const frontend = plan.tasks.find((task) => task.assignedRole === "Frontend Engineer");
  const database = plan.tasks.find((task) => task.assignedRole === "Database Engineer");
  const backend = plan.tasks.find((task) => task.assignedRole === "Backend Engineer");
  assert.ok(frontend.dependencies.includes(design.taskId));
  assert.ok(backend.dependencies.includes(database.taskId));
});

test("workspace package manager detection honors declarations and lockfiles", () => {
  const root = mkdtempSync(path.join(tmpdir(), "ag-os-package-managers-"));
  const yarn = path.join(root, "yarn");
  const pnpm = path.join(root, "pnpm");
  const conflict = path.join(root, "conflict");
  write(yarn, "package.json", `${JSON.stringify({ packageManager: "yarn@4.6.0", dependencies: { fixture: "1.0.0" } })}\n`);
  write(yarn, "yarn.lock", "# fixture\n");
  write(pnpm, "package.json", `${JSON.stringify({ dependencies: { fixture: "1.0.0" } })}\n`);
  write(pnpm, "pnpm-lock.yaml", "lockfileVersion: '9.0'\n");
  write(conflict, "package.json", `${JSON.stringify({ packageManager: "npm@10.9.2", dependencies: { fixture: "1.0.0" } })}\n`);
  write(conflict, "yarn.lock", "# fixture\n");
  assert.equal(detectWorkspacePackageManager(yarn).manager, "yarn");
  assert.equal(detectWorkspacePackageManager(yarn).version, "4.6.0");
  assert.equal(detectWorkspacePackageManager(pnpm).manager, "pnpm");
  assert.throws(() => detectWorkspacePackageManager(conflict), /conflicts with yarn lockfile/);
});

test("agent tools block path escape, secrets, shell operators, and write outside workspace", async () => {
  const { repository } = fixture();
  assert.throws(() => resolveAgentPath(repository, "../escape.txt", { allowMissing: true }), /escapes/);
  await assert.rejects(executeAgentTool({ workspacePath: repository, tool: "write_file", input: { path: ".env", content: "TOKEN=x" } }), /secret-bearing/);
  await assert.rejects(executeAgentTool({ workspacePath: repository, tool: "run_command", input: { command: "npm test; whoami" } }), /shell operators/);
  await assert.rejects(executeAgentTool({ workspacePath: repository, tool: "write_file", input: { path: "safe.txt", content: "sk-" + "abcdefghijklmnopqrstuvwxyz123456" } }), /secret material/);
});

test("AgentRun role policies deny reviewer edits in both the loop and executor", async () => {
  const { repository } = fixture({ requireFinalRepair: false });
  const reviewerTools = allowedToolsForRole("Code Reviewer");
  assert.equal(reviewerTools.includes("write_file"), false);
  assert.equal(allowedToolsForRole("QA Engineer").includes("edit_file"), false);
  assert.equal(allowedToolsForRole("Security Reviewer").includes("apply_patch"), false);
  assert.deepEqual(allowedToolsForRole("Commander"), []);
  assert.ok(allowedToolsForRole("Backend Engineer").includes("write_file"));
  await assert.rejects(executeAgentTool({ workspacePath: repository, tool: "write_file", input: { path: "denied.txt", content: "no" }, allowedTools: reviewerTools }), /not allowed/);
  await assert.rejects(runAgentToolLoop({
    agent: { role: "QA Engineer", allowedTools: allowedToolsForRole("QA Engineer") }, task: { title: "Attempt denied edit" }, workspace: { path: repository },
    provider: { nextAction: async () => ({ action: { tool: "write_file", input: { path: "denied.txt", content: "no" } }, costUsd: 0, usage: {} }) }, emit: () => {}
  }), /not allowed/);
  assert.equal(existsSync(path.join(repository, "denied.txt")), false);
});

function missionRoles(...additional) {
  const fields = {
    "Product Manager": "productManager", Architect: "architect", "UI Designer": "uiDesigner", "Frontend Engineer": "frontendEngineer",
    "Backend Engineer": "backendEngineer", "Database Engineer": "databaseEngineer", "Security Reviewer": "securityReviewer", Fixer: "fixer"
  };
  const selected = Object.fromEntries(Object.values(fields).map((key) => [key, false]));
  for (const role of additional) {
    const field = fields[role];
    if (field) selected[field] = true;
    else selected[role] = true;
  }
  return { commander: "Commander", qa: "QA Engineer", codeReviewer: "Code Reviewer", integration: "Integration Agent", additional: selected };
}

function groupedTasks(tasks) {
  const codeReview = tasks.find((task) => task.assignedRole === "Code Reviewer");
  const qa = tasks.find((task) => task.assignedRole === "QA Engineer");
  const integration = tasks.find((task) => task.assignedRole === "Integration Agent");
  const work = tasks.filter((task) => ![codeReview, qa, integration].includes(task));
  return { primary: work[0], additional: work.slice(1), codeReview, qa, integration };
}

function missionNativePlan(overrides = {}) {
  return {
    summary: "Build a dependency-backed CRM through a mission-native graph.",
    requiredRoles: missionRoles("Backend Engineer"),
    tasks: groupedTasks([
      { taskId: "backend", title: "Build backend", description: "Build the backend.", assignedRole: "Backend Engineer", dependencies: [], acceptanceCriteria: ["Backend works"], kind: "coding" },
      { taskId: "review", title: "Review", description: "Review the integrated diff.", assignedRole: "Code Reviewer", dependencies: ["backend"], acceptanceCriteria: ["No blocking defect"], kind: "review" },
      { taskId: "qa", title: "Validate", description: "Run all validation.", assignedRole: "QA Engineer", dependencies: ["review"], acceptanceCriteria: ["All commands pass"], kind: "qa" },
      { taskId: "integration", title: "Integrate", description: "Seal integration.", assignedRole: "Integration Agent", dependencies: ["qa"], acceptanceCriteria: ["Integrated"], kind: "integration" }
    ]),
    validationStrategy: ["npm test", "npm run build"],
    integrationOrder: ["backend", "review", "qa", "integration"],
    risks: ["Local validation may reveal defects"],
    approvalRequirements: ["Protected external actions require exact owner approval"],
    ...overrides
  };
}

test("mission-native plans reject unknown dependencies, cycles, unsupported roles, and malformed order", () => {
  const valid = missionNativePlan();
  const missingQa = { ...valid.requiredRoles };
  delete missingQa.qa;
  assert.equal(validateMissionPlanDraft(valid), valid);
  assert.throws(() => validateMissionPlanDraft(missionNativePlan({ tasks: groupedTasks(missionPlanTasks(missionNativePlan()).map((task) => task.taskId === "review" ? { ...task, dependencies: ["missing"] } : task)) })), /unknown dependency/);
  assert.throws(() => validateMissionPlanDraft(missionNativePlan({ tasks: groupedTasks(missionPlanTasks(missionNativePlan()).map((task) => task.taskId === "backend" ? { ...task, dependencies: ["integration"] } : task)) })), /cycle/);
  assert.throws(() => validateMissionPlanDraft(missionNativePlan({ requiredRoles: missionRoles("Backend Engineer", "wizard") })), /unsupported field/);
  assert.throws(() => validateMissionPlanDraft(missionNativePlan({ requiredRoles: missingQa })), /missing qa/);
  assert.throws(() => validateMissionPlanDraft(missionNativePlan({ integrationOrder: ["review", "backend", "qa", "integration"] })), /before dependency/);
});

test("scheduler never runs two ready tasks on the same AgentRun concurrently", async () => {
  const { repository, records } = fixture({ requireFinalRepair: false });
  const planDraft = {
    summary: "Build two independent files with one bounded backend AgentRun.",
    requiredRoles: missionRoles("Backend Engineer"),
    tasks: groupedTasks([
      { taskId: "server", title: "Build server", description: "Create the server module.", assignedRole: "Backend Engineer", dependencies: [], acceptanceCriteria: ["Server exists"], kind: "coding" },
      { taskId: "page", title: "Build page", description: "Create the public page.", assignedRole: "Backend Engineer", dependencies: [], acceptanceCriteria: ["Page exists"], kind: "coding" },
      { taskId: "review", title: "Review", description: "Inspect the integrated diff.", assignedRole: "Code Reviewer", dependencies: ["server", "page"], acceptanceCriteria: ["Diff reviewed"], kind: "review" },
      { taskId: "qa", title: "QA", description: "Run all validation.", assignedRole: "QA Engineer", dependencies: ["review"], acceptanceCriteria: ["Validation passes"], kind: "qa" },
      { taskId: "integration", title: "Integrate", description: "Run integration validation.", assignedRole: "Integration Agent", dependencies: ["qa"], acceptanceCriteria: ["Tests pass"], kind: "integration" }
    ]),
    validationStrategy: ["npm test", "npm run build"], integrationOrder: ["server", "page", "review", "qa", "integration"], risks: [], approvalRequirements: []
  };
  const activeByAgent = new Map();
  let maximumForOneAgent = 0;
  const provider = { nextAction: async ({ agent, task, transcript }) => {
    activeByAgent.set(agent.agentRunId, (activeByAgent.get(agent.agentRunId) || 0) + 1);
    maximumForOneAgent = Math.max(maximumForOneAgent, activeByAgent.get(agent.agentRunId));
    await new Promise((resolve) => setTimeout(resolve, 15));
    activeByAgent.set(agent.agentRunId, activeByAgent.get(agent.agentRunId) - 1);
    if (transcript.length > 0) return { action: { tool: "complete", input: { outcome: "complete", summary: "done", defects: [] } }, costUsd: 0, usage: {} };
    if (task.title === "Build server") return { action: { tool: "write_file", input: { path: "src/server.mjs", content: "import { normalizeLeadName } from \"lead-normalizer\";\nexport function createLead(name) { const normalized = normalizeLeadName(name); if (!normalized) throw new Error(\"name is required\"); return { name: normalized, status: \"new\" }; }\n" } }, costUsd: 0, usage: {} };
    if (task.title === "Build page") return { action: { tool: "write_file", input: { path: "public/index.html", content: "<!doctype html><title>CRM</title>" } }, costUsd: 0, usage: {} };
    if (agent.role === "Code Reviewer") return { action: { tool: "git_diff", input: {} }, costUsd: 0, usage: {} };
    return { action: { tool: "run_tests", input: { command: "npm test" } }, costUsd: 0, usage: {} };
  } };
  const created = createMission({ ownerOutcome: "Build a small CRM", projectId: "same-agent", repositoryPath: repository, planningEvidence: { planDraft, model: "fixture", usage: {}, costUsd: 0 }, root: records });
  assert.deepEqual(created.tasks.filter((task) => task.assignedRole === "Backend Engineer").map((task) => task.title).sort(), ["Build page", "Build server"]);
  const completed = await runMission({ missionId: created.missionId, provider, root: records });
  assert.equal(completed.status, "completed", JSON.stringify(completed.blockers));
  assert.equal(maximumForOneAgent, 1);
});

test("scheduler preserves concurrency for independent tasks on different AgentRuns", async () => {
  const { repository, records } = fixture({ requireFinalRepair: false });
  const planDraft = {
    summary: "Build independent frontend and backend work concurrently.",
    requiredRoles: missionRoles("Frontend Engineer", "Backend Engineer"),
    tasks: groupedTasks([
      { taskId: "frontend", title: "Build frontend", description: "Create the public page.", assignedRole: "Frontend Engineer", dependencies: [], acceptanceCriteria: ["Page exists"], kind: "coding" },
      { taskId: "backend", title: "Build backend", description: "Create the server module.", assignedRole: "Backend Engineer", dependencies: [], acceptanceCriteria: ["Server exists"], kind: "coding" },
      { taskId: "review", title: "Review", description: "Inspect the integrated diff.", assignedRole: "Code Reviewer", dependencies: ["frontend", "backend"], acceptanceCriteria: ["Diff reviewed"], kind: "review" },
      { taskId: "qa", title: "QA", description: "Run all validation.", assignedRole: "QA Engineer", dependencies: ["review"], acceptanceCriteria: ["Validation passes"], kind: "qa" },
      { taskId: "integration", title: "Integrate", description: "Run integration validation.", assignedRole: "Integration Agent", dependencies: ["qa"], acceptanceCriteria: ["Tests pass"], kind: "integration" }
    ]),
    validationStrategy: ["npm test", "npm run build"], integrationOrder: ["frontend", "backend", "review", "qa", "integration"], risks: [], approvalRequirements: []
  };
  let concurrentFirstTurns = 0;
  let releaseFirstTurns;
  const firstTurnsReady = new Promise((resolve) => { releaseFirstTurns = resolve; });
  const provider = { nextAction: async ({ agent, transcript }) => {
    if (transcript.length === 0 && ["Frontend Engineer", "Backend Engineer"].includes(agent.role)) {
      concurrentFirstTurns += 1;
      if (concurrentFirstTurns === 2) releaseFirstTurns();
      await Promise.race([firstTurnsReady, new Promise((_, reject) => setTimeout(() => reject(new Error("independent AgentRuns did not overlap")), 3000))]);
      return agent.role === "Frontend Engineer"
        ? { action: { tool: "write_file", input: { path: "public/index.html", content: "<!doctype html><title>CRM</title>" } }, costUsd: 0, usage: {} }
        : { action: { tool: "write_file", input: { path: "src/server.mjs", content: "import { normalizeLeadName } from \"lead-normalizer\";\nexport function createLead(name) { const normalized = normalizeLeadName(name); if (!normalized) throw new Error(\"name is required\"); return { name: normalized, status: \"new\" }; }\n" } }, costUsd: 0, usage: {} };
    }
    if (transcript.length > 0) return { action: { tool: "complete", input: { outcome: "complete", summary: "done", defects: [] } }, costUsd: 0, usage: {} };
    if (agent.role === "Code Reviewer") return { action: { tool: "git_diff", input: {} }, costUsd: 0, usage: {} };
    return { action: { tool: "run_tests", input: { command: "npm test" } }, costUsd: 0, usage: {} };
  } };
  const created = createMission({ ownerOutcome: "Build independent CRM surfaces", projectId: "distinct-agent", repositoryPath: repository, planningEvidence: { planDraft, model: "fixture", usage: {}, costUsd: 0 }, root: records });
  const completed = await runMission({ missionId: created.missionId, provider, root: records });
  assert.equal(completed.status, "completed", JSON.stringify(completed.blockers));
  assert.equal(concurrentFirstTurns, 2);
});

test("QA executes every declared validation command and deduplicates agent evidence", async () => {
  const { repository, records } = readyFixture();
  const planDraft = {
    summary: "Run deterministic QA.", requiredRoles: missionRoles("Product Manager"),
    tasks: groupedTasks([
      { taskId: "scope", title: "Confirm scope", description: "Confirm the validation scope.", assignedRole: "Product Manager", dependencies: [], acceptanceCriteria: ["Scope confirmed"], kind: "planning" },
      { taskId: "review", title: "Review", description: "Inspect the current diff.", assignedRole: "Code Reviewer", dependencies: ["scope"], acceptanceCriteria: ["Diff reviewed"], kind: "review" },
      { taskId: "qa", title: "QA all commands", description: "Validate everything.", assignedRole: "QA Engineer", dependencies: ["review"], acceptanceCriteria: ["All declared commands pass"], kind: "qa" },
      { taskId: "integration", title: "Integrate", description: "Confirm integration.", assignedRole: "Integration Agent", dependencies: ["qa"], acceptanceCriteria: ["Integration passes"], kind: "integration" }
    ]),
    validationStrategy: ["npm test", "npm run build"], integrationOrder: ["scope", "review", "qa", "integration"], risks: [], approvalRequirements: []
  };
  const provider = { nextAction: async ({ agent, transcript }) => transcript.length > 0
    ? { action: { tool: "complete", input: { outcome: "complete", summary: "QA evidence recorded", defects: [] } }, costUsd: 0, usage: {} }
    : agent.role === "Product Manager"
      ? { action: { tool: "complete", input: { outcome: "complete", summary: "Scope confirmed", defects: [] } }, costUsd: 0, usage: {} }
      : agent.role === "Code Reviewer"
      ? { action: { tool: "git_diff", input: {} }, costUsd: 0, usage: {} }
      : { action: { tool: "run_tests", input: { command: "npm test" } }, costUsd: 0, usage: {} } };
  const created = createMission({ ownerOutcome: "Validate the ready CRM", projectId: "qa-fixture", repositoryPath: repository, planningEvidence: { planDraft, model: "fixture", usage: {}, costUsd: 0 }, root: records });
  const completed = await runMission({ missionId: created.missionId, provider, root: records });
  assert.equal(completed.status, "completed", JSON.stringify(completed.blockers));
  const qaTask = completed.tasks.find((task) => task.title === "QA all commands");
  assert.deepEqual(qaTask.commandsExecuted.map((item) => item.command).sort(), ["npm run build", "npm test"]);
});

test("mission cancellation persists terminal state and removes its worktrees", () => {
  const { repository, records } = fixture();
  const created = createMission({ ownerOutcome: "Build a small dashboard", projectId: "fixture", repositoryPath: repository, root: records });
  const cancelled = cancelMission({ missionId: created.missionId, reason: "Owner stopped the mission", root: records });
  assert.equal(cancelled.status, "cancelled");
  assert.ok(cancelled.tasks.every((task) => task.status === "cancelled"));
  assert.ok(cancelled.events.some((event) => event.type === "mission.cancelled"));
});

test("long mission commands stay asynchronous and cancellation stops work without late mutations", async () => {
  const { repository, records } = fixture({ requireFinalRepair: false });
  const planDraft = {
    summary: "Run one long cancellable QA command.", requiredRoles: missionRoles("Product Manager"),
    tasks: groupedTasks([
      { taskId: "scope", title: "Confirm scope", description: "Confirm the cancellation scope.", assignedRole: "Product Manager", dependencies: [], acceptanceCriteria: ["Scope confirmed"], kind: "planning" },
      { taskId: "review", title: "Review", description: "Inspect the current diff.", assignedRole: "Code Reviewer", dependencies: ["scope"], acceptanceCriteria: ["Diff reviewed"], kind: "review" },
      { taskId: "qa", title: "Long QA", description: "Run the cancellable test.", assignedRole: "QA Engineer", dependencies: [], acceptanceCriteria: ["Command completes or cancellation stops it"], kind: "qa" },
      { taskId: "integration", title: "Integrate", description: "Confirm integration.", assignedRole: "Integration Agent", dependencies: ["review", "qa"], acceptanceCriteria: ["Integration passes"], kind: "integration" }
    ]),
    validationStrategy: ["npm run slowtest"], integrationOrder: ["scope", "review", "qa", "integration"], risks: [], approvalRequirements: []
  };
  const provider = { nextAction: async ({ agent, transcript }) => transcript.length > 0
    ? { action: { tool: "complete", input: { outcome: "complete", summary: "done", defects: [] } }, costUsd: 0, usage: {} }
    : agent.role === "Product Manager"
      ? { action: { tool: "complete", input: { outcome: "complete", summary: "Scope confirmed", defects: [] } }, costUsd: 0, usage: {} }
      : agent.role === "Code Reviewer"
      ? { action: { tool: "git_diff", input: {} }, costUsd: 0, usage: {} }
      : { action: { tool: "run_tests", input: { command: "npm run slowtest" } }, costUsd: 0, usage: {} } };
  const created = createMission({ ownerOutcome: "Prove cancellable QA", projectId: "cancel-fixture", repositoryPath: repository, planningEvidence: { planDraft, model: "fixture", usage: {}, costUsd: 0 }, root: records });
  const controller = new AbortController();
  let eventLoopResponsive = false;
  setTimeout(() => { eventLoopResponsive = true; }, 25);
  const startedAt = Date.now();
  const running = runMission({ missionId: created.missionId, provider, root: records, signal: controller.signal });
  const deadline = Date.now() + 5000;
  while (!readMissionEvents(created.missionId, records).some((event) => event.type === "command.started") && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 20));
  assert.ok(readMissionEvents(created.missionId, records).some((event) => event.type === "command.started"), "long command should have started");
  assert.equal(eventLoopResponsive, true, "the coordinator event loop should remain responsive while the command runs");
  controller.abort(new Error("Owner cancelled the long smoke test"));
  const cancelled = await running;
  assert.equal(cancelled.status, "cancelled");
  assert.ok(Date.now() - startedAt < 7000, "cancellation should not wait for the 20 second command");
  assert.equal(cancelled.events.at(-1).type, "mission.cancelled");
  assert.ok(cancelled.tasks.every((task) => ["complete", "failed", "cancelled"].includes(task.status)));
  assert.ok(cancelled.tasks.filter((task) => task.workspace).every((task) => !existsSync(task.workspace.path)), "cancelled worktrees should be removed after child termination");
  const eventCount = cancelled.events.length;
  await new Promise((resolve) => setTimeout(resolve, 250));
  assert.equal(readMissionEvents(created.missionId, records).length, eventCount, "no task may append events after cancellation becomes terminal");
});

test("agent loop stops before executing a tool action that exceeds the mission budget", async () => {
  const { repository } = fixture();
  let executed = false;
  const provider = { nextAction: async () => ({ action: { tool: "write_file", input: { path: "forbidden.txt", content: "no" } }, costUsd: 2, usage: {} }) };
  await assert.rejects(runAgentToolLoop({
    agent: { role: "Backend Engineer" }, task: { title: "Budget proof" }, workspace: { path: repository }, provider,
    emit: () => { executed = true; }, budgetRemainingUsd: 1
  }), /budget exhausted/);
  assert.equal(executed, false);
  assert.equal((await executeAgentTool({ workspacePath: repository, tool: "git_diff" })).status.includes("forbidden.txt"), false);
});

test("Anthropic mission planner returns and audits the mission-native graph without keyword reduction", async () => {
  assert.equal(DEFAULT_MISSION_PLANNER_TIMEOUT_MS, 180_000);
  const root = mkdtempSync(path.join(tmpdir(), "ag-os-mission-planner-"));
  write(root, ".codex/costs/budget.json", `${JSON.stringify({ limits: { monthlyMaxUsd: 50, dailyMaxUsd: 10, perTaskMaxUsd: 5 } })}\n`);
  const expected = missionNativePlan();
  const planned = await createAnthropicMissionPlan({
    ownerOutcome: "Build a dependency-backed CRM",
    projectId: "planner-fixture",
    validationCommands: ["npm test", "npm run build"],
    apiKey: "fixture-key",
    model: "fixture-model",
    approvalId: "approval-fixture-planner",
    approvalMaxUsd: 5,
    inputCostPerMillionUsd: 3,
    outputCostPerMillionUsd: 15,
    root,
    fetchImpl: async (_url, request) => {
      const body = JSON.parse(request.body);
      assert.equal(body.output_config.format.schema.properties.tasks.properties.primary.$ref, "#/$defs/missionTask");
      assert.ok(body.output_config.format.schema.$defs.missionTask.properties.assignedRole);
      assert.ok(body.output_config.format.schema.$defs.missionTask.properties.dependencies);
      return { ok: true, json: async () => ({ model: "fixture-model", stop_reason: "end_turn", usage: { input_tokens: 100, output_tokens: 200 }, content: [{ type: "text", text: JSON.stringify(expected) }] }) };
    }
  });
  assert.deepEqual(planned.planDraft, expected);
  assert.equal(planned.costUsd, 0.0033);
  finalizeAnthropicBudgetReservation({ reservation: planned.budgetReservation, consumed: true, actualCostUsd: planned.costUsd, root });
  assert.ok(planned.usageAuditPath.endsWith(".json"));
});

test("Anthropic mission planner preserves bounded provider schema errors", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "ag-os-mission-planner-error-"));
  write(root, ".codex/costs/budget.json", `${JSON.stringify({ limits: { monthlyMaxUsd: 50, dailyMaxUsd: 10, perTaskMaxUsd: 5 } })}\n`);
  await assert.rejects(createAnthropicMissionPlan({
    ownerOutcome: "Build a fixture", projectId: "planner-error", validationCommands: ["npm test"], apiKey: "fixture-key", model: "fixture-model",
    approvalId: "approval-fixture-planner-error", approvalMaxUsd: 5, inputCostPerMillionUsd: 3, outputCostPerMillionUsd: 15, root,
    fetchImpl: async () => ({ ok: false, status: 400, text: async () => "schema validation failed\nwithout credential material" })
  }), /HTTP 400: schema validation failed without credential material/);
});

test("Anthropic mission provider reserves Cost OS budget and audits an approved tool turn", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "ag-os-provider-"));
  write(root, ".codex/costs/budget.json", `${JSON.stringify({ limits: { monthlyMaxUsd: 50, dailyMaxUsd: 10, perTaskMaxUsd: 5 } })}\n`);
  const provider = createAnthropicAgentProvider({
    apiKey: "fixture-key",
    model: "fixture-model",
    approvalId: "approval-fixture-worker",
    approvalMaxUsd: 5,
    approvalUsesRemaining: 1,
    inputCostPerMillionUsd: 3,
    outputCostPerMillionUsd: 15,
    root,
    fetchImpl: async (_url, request) => {
      const body = JSON.parse(request.body);
      assert.equal(body.tool_choice.type, "any");
      assert.equal(body.tools.some((tool) => tool.name === "write_file"), false);
      assert.ok(body.tools.some((tool) => tool.name === "git_diff"));
      assert.doesNotMatch(request.headers["x-api-key"], /fixture-model/);
      return { ok: true, json: async () => ({ model: "fixture-model", stop_reason: "tool_use", usage: { input_tokens: 100, output_tokens: 50 }, content: [{ type: "tool_use", name: "git_diff", input: {} }] }) };
    }
  });
  const response = await provider.nextAction({
    agent: { agentRunId: "agent-run-fixture", role: "Code Reviewer", allowedTools: allowedToolsForRole("Code Reviewer") },
    task: { missionId: "mission-fixture", projectId: "project-fixture", taskId: "task-fixture", title: "Review", description: "Review the diff", acceptanceCriteria: ["No blocking defect"], attempt: 1 },
    workspace: { workspaceId: "workspace-fixture", branch: "codex/fixture" }, transcript: [], budgetRemainingUsd: 1, step: 1
  });
  assert.equal(response.action.tool, "git_diff");
  assert.equal(response.costUsd, 0.00105);
  const costs = readdirSync(path.join(root, ".codex/costs")).filter((name) => name.startsWith("cost-ledger-anthropic-call-"));
  assert.equal(costs.length, 1);
  assert.equal(JSON.parse(readFileSync(path.join(root, ".codex/costs", costs[0]), "utf8")).status, "archived");
  assert.equal(readdirSync(path.join(root, ".codex/audit")).filter((name) => name.endsWith(".json")).length, 1);
  await assert.rejects(provider.nextAction({ agent: {}, task: {}, workspace: {}, transcript: [], budgetRemainingUsd: 1, step: 2 }), /no uses remaining/);
});

test("Anthropic mission provider cannot overbook one approval use across parallel turns", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "ag-os-provider-concurrency-"));
  write(root, ".codex/costs/budget.json", `${JSON.stringify({ limits: { monthlyMaxUsd: 50, dailyMaxUsd: 10, perTaskMaxUsd: 5 } })}\n`);
  let releaseRequest;
  let markRequestEntered;
  const requestEntered = new Promise((resolve) => { markRequestEntered = resolve; });
  const requestReleased = new Promise((resolve) => { releaseRequest = resolve; });
  const provider = createAnthropicAgentProvider({
    apiKey: "fixture-key", model: "fixture-model", approvalId: "approval-one-use", approvalMaxUsd: 5, approvalUsesRemaining: 1,
    inputCostPerMillionUsd: 3, outputCostPerMillionUsd: 15, root,
    fetchImpl: async () => {
      markRequestEntered();
      await requestReleased;
      return { ok: true, json: async () => ({ model: "fixture-model", stop_reason: "tool_use", usage: { input_tokens: 10, output_tokens: 5 }, content: [{ type: "tool_use", name: "git_diff", input: {} }] }) };
    }
  });
  const input = { agent: { agentRunId: "agent", role: "Code Reviewer", allowedTools: allowedToolsForRole("Code Reviewer") }, task: { missionId: "mission", projectId: "project", taskId: "task", title: "Review", description: "Review", acceptanceCriteria: [], attempt: 1 }, workspace: { workspaceId: "workspace", branch: "codex/test" }, transcript: [], budgetRemainingUsd: 1, step: 1 };
  const first = provider.nextAction(input);
  await requestEntered;
  await assert.rejects(provider.nextAction({ ...input, step: 2 }), /no uses remaining/);
  releaseRequest();
  assert.equal((await first).action.tool, "git_diff");
});
