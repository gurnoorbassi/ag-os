import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { executeAgentTool, resolveAgentPath, runAgentToolLoop } from "../scripts/lib/runtime/agent-runner.mjs";
import { cancelMission, createMission, runMission } from "../scripts/lib/runtime/mission-runtime.mjs";
import { createAnthropicAgentProvider } from "../scripts/lib/runtime/anthropic-agent-provider.mjs";

function write(root, relativePath, content) {
  const target = path.join(root, relativePath);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, content, "utf8");
}

function git(root, ...args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

function fixture() {
  const base = mkdtempSync(path.join(tmpdir(), "ag-os-mission-"));
  const repository = path.join(base, "target");
  const records = path.join(base, "records");
  mkdirSync(repository, { recursive: true });
  mkdirSync(records, { recursive: true });
  write(repository, "package.json", `${JSON.stringify({
    name: "lead-crm-fixture",
    type: "module",
    scripts: { test: "node --test tests/*.test.mjs", build: "node scripts/build.mjs" }
  }, null, 2)}\n`);
  write(repository, "tests/lead.test.mjs", `import assert from "node:assert/strict";\nimport test from "node:test";\nimport { createLead } from "../src/server.mjs";\ntest("lead validation", () => { assert.throws(() => createLead("  "), /name/i); assert.deepEqual(createLead("Ada"), { name: "Ada", status: "new" }); });\n`);
  write(repository, "scripts/build.mjs", `import { existsSync } from "node:fs";\nif (!existsSync("public/index.html") || !existsSync("src/server.mjs")) throw new Error("build inputs missing");\n`);
  write(repository, "README.md", "# Lead CRM fixture\n");
  git(repository, "init");
  git(repository, "config", "user.email", "mission@example.test");
  git(repository, "config", "user.name", "Mission Test");
  git(repository, "add", "-A");
  git(repository, "commit", "-m", "fixture");
  return { base, repository, records };
}

class ScriptedProvider {
  constructor() {
    this.active = 0;
    this.maximumActive = 0;
  }

  async nextAction({ agent, transcript }) {
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
    else if (agent.role === "Backend Engineer") action = { tool: "write_file", input: { path: "src/server.mjs", content: "export function createLead(name) { return { name, status: \"new\" }; }\n" } };
    else if (agent.role === "Fixer") action = { tool: "edit_file", input: { path: "src/server.mjs", search: "export function createLead(name) { return { name, status: \"new\" }; }", replace: "export function createLead(name) { if (!String(name).trim()) throw new Error(\"name is required\"); return { name, status: \"new\" }; }" } };
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

  const completed = await runMission({ missionId: created.missionId, provider, root: records });
  assert.equal(completed.status, "completed", JSON.stringify({ blockers: completed.blockers, tasks: completed.tasks.map((task) => ({ title: task.title, status: task.status, attempt: task.attempt, blockers: task.blockers })) }, null, 2));
  assert.equal(completed.progress.percent, 100);
  assert.equal(completed.protectedExternalActionsExecuted, false);
  assert.ok(completed.agents.some((agent) => agent.role === "Fixer" && agent.status === "complete"), JSON.stringify({ agents: completed.agents.map(({ role, status }) => ({ role, status })), tests: completed.events.filter((event) => event.type.startsWith("test.")).map((event) => ({ type: event.type, payload: event.payload })) }, null, 2));
  assert.equal(completed.agents.find((agent) => agent.role === "Commander").status, "complete");
  assert.ok(completed.tasks.some((task) => task.kind === "repair" && task.status === "complete"));
  assert.equal(completed.tasks.find((task) => task.kind === "qa").attempt, 2);
  assert.ok(completed.handoffs.length > 0);
  assert.ok(completed.events.some((event) => event.type === "test.failed"));
  assert.ok(completed.events.some((event) => event.type === "repair.created"));
  assert.ok(completed.events.some((event) => event.type === "mission.completed"));
  assert.ok(completed.events.some((event) => event.type === "preview.ready"));
  assert.equal(completed.preview.entryFile, "public/index.html");
  assert.deepEqual(completed.events.map((event) => event.sequence), completed.events.map((_, index) => index + 1));
  assert.ok(provider.maximumActive >= 2, "independent task agents should overlap");
  const workspaces = new Set(completed.tasks.filter((task) => task.workspace).map((task) => task.workspace.path));
  assert.equal(workspaces.size, completed.tasks.filter((task) => task.workspace).length);
  assert.match(readFileSync(path.join(completed.integrationWorkspace.path, "src/server.mjs"), "utf8"), /name is required/);
  assert.ok(completed.artifactRecords[0].revision);
});

test("agent tools block path escape, secrets, shell operators, and write outside workspace", async () => {
  const { repository } = fixture();
  assert.throws(() => resolveAgentPath(repository, "../escape.txt", { allowMissing: true }), /escapes/);
  assert.throws(() => executeAgentTool({ workspacePath: repository, tool: "write_file", input: { path: ".env", content: "TOKEN=x" } }), /secret-bearing/);
  assert.throws(() => executeAgentTool({ workspacePath: repository, tool: "run_command", input: { command: "npm test; whoami" } }), /shell operators/);
  assert.throws(() => executeAgentTool({ workspacePath: repository, tool: "write_file", input: { path: "safe.txt", content: "sk-" + "abcdefghijklmnopqrstuvwxyz123456" } }), /secret material/);
});

test("mission cancellation persists terminal state and removes its worktrees", () => {
  const { repository, records } = fixture();
  const created = createMission({ ownerOutcome: "Build a small dashboard", projectId: "fixture", repositoryPath: repository, root: records });
  const cancelled = cancelMission({ missionId: created.missionId, reason: "Owner stopped the mission", root: records });
  assert.equal(cancelled.status, "cancelled");
  assert.ok(cancelled.tasks.every((task) => task.status === "cancelled"));
  assert.ok(cancelled.events.some((event) => event.type === "mission.cancelled"));
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
  assert.equal(executeAgentTool({ workspacePath: repository, tool: "git_diff" }).status.includes("forbidden.txt"), false);
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
      assert.ok(body.tools.some((tool) => tool.name === "write_file"));
      assert.doesNotMatch(request.headers["x-api-key"], /fixture-model/);
      return { ok: true, json: async () => ({ model: "fixture-model", stop_reason: "tool_use", usage: { input_tokens: 100, output_tokens: 50 }, content: [{ type: "tool_use", name: "git_diff", input: {} }] }) };
    }
  });
  const response = await provider.nextAction({
    agent: { agentRunId: "agent-run-fixture", role: "Code Reviewer" },
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
  const input = { agent: { agentRunId: "agent" }, task: { missionId: "mission", projectId: "project", taskId: "task", title: "Review", description: "Review", acceptanceCriteria: [], attempt: 1 }, workspace: { workspaceId: "workspace", branch: "codex/test" }, transcript: [], budgetRemainingUsd: 1, step: 1 };
  const first = provider.nextAction(input);
  await requestEntered;
  await assert.rejects(provider.nextAction({ ...input, step: 2 }), /no uses remaining/);
  releaseRequest();
  assert.equal((await first).action.tool, "git_diff");
});
