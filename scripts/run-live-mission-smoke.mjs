import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { buildApprovalLockRecord, revokeApprovalLock, writeApprovalLockWithAudit } from "./lib/runtime/approval-lock-runtime.mjs";
import { createAnthropicAgentProvider } from "./lib/runtime/anthropic-agent-provider.mjs";
import { finalizeAnthropicBudgetReservation } from "./lib/runtime/anthropic-budget-guard.mjs";
import { createAnthropicMissionPlan } from "./lib/runtime/anthropic-mission-planner.mjs";
import { evaluateAnthropicPlannerReadiness } from "./lib/runtime/anthropic-planner-readiness.mjs";
import { evaluateAnthropicWorkerReadiness } from "./lib/runtime/anthropic-worker-readiness.mjs";
import { writeJson } from "./lib/runtime/common.mjs";
import { createMission, runMission } from "./lib/runtime/mission-runtime.mjs";
import { missionPlanTasks } from "./lib/runtime/mission-plan.mjs";

if (process.env.AG_OS_LIVE_MISSION_SMOKE_APPROVED !== "true") throw new Error("live mission smoke requires AG_OS_LIVE_MISSION_SMOKE_APPROVED=true from the approving owner session");
for (const name of ["ANTHROPIC_API_KEY", "ANTHROPIC_MODEL", "ANTHROPIC_INPUT_COST_PER_MILLION_USD", "ANTHROPIC_OUTPUT_COST_PER_MILLION_USD"]) {
  if (!process.env[name]) throw new Error(`live mission smoke requires ${name}`);
}

const smokeRoot = process.env.AG_OS_LIVE_MISSION_SMOKE_ROOT
  ? path.resolve(process.env.AG_OS_LIVE_MISSION_SMOKE_ROOT)
  : mkdtempSync(path.join(tmpdir(), "ag-os-live-mission-smoke-"));
const repositoryPath = path.join(smokeRoot, "dependency-project");
const recordsRoot = path.join(smokeRoot, "records");
mkdirSync(repositoryPath, { recursive: true });
mkdirSync(recordsRoot, { recursive: true });

function write(relativePath, content) {
  const target = path.join(repositoryPath, relativePath);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, content, "utf8");
}

function git(...args) {
  return execFileSync("git", args, { cwd: repositoryPath, encoding: "utf8" }).trim();
}

write("package.json", `${JSON.stringify({
  name: "ag-os-live-mission-smoke",
  private: true,
  type: "module",
  packageManager: "npm@10.9.2",
  dependencies: { "text-normalizer": "file:vendor/text-normalizer" },
  scripts: { test: "node --test tests/greeting.test.mjs", build: "node scripts/build.mjs" }
}, null, 2)}\n`);
write("package-lock.json", `${JSON.stringify({
  name: "ag-os-live-mission-smoke",
  lockfileVersion: 3,
  requires: true,
  packages: {
    "": { name: "ag-os-live-mission-smoke", dependencies: { "text-normalizer": "file:vendor/text-normalizer" } },
    "node_modules/text-normalizer": { resolved: "vendor/text-normalizer", link: true },
    "vendor/text-normalizer": { name: "text-normalizer", version: "1.0.0" }
  }
}, null, 2)}\n`);
write(".gitignore", "node_modules/\ndist/\n");
write("vendor/text-normalizer/package.json", `${JSON.stringify({ name: "text-normalizer", version: "1.0.0", type: "module", exports: "./index.mjs" }, null, 2)}\n`);
write("vendor/text-normalizer/index.mjs", "export function normalizeName(value) { return String(value ?? \"\").trim().replace(/\\s+/g, \" \" ); }\n");
write("tests/greeting.test.mjs", "import assert from \"node:assert/strict\";\nimport test from \"node:test\";\nimport { formatGreeting } from \"../src/greeting.mjs\";\ntest(\"formats a normalized greeting through the installed local dependency\", () => { assert.equal(formatGreeting(\"  Ada   Lovelace  \"), \"Hello, Ada Lovelace!\"); assert.throws(() => formatGreeting(\"   \"), /name/i); });\n");
write("scripts/build.mjs", "import { mkdirSync, readFileSync, writeFileSync } from \"node:fs\";\nconst source = readFileSync(\"src/greeting.mjs\", \"utf8\");\nif (!source.includes(\"text-normalizer\") || !source.includes(\"formatGreeting\")) throw new Error(\"greeting module does not use the locked dependency\");\nmkdirSync(\"dist\", { recursive: true });\nwriteFileSync(\"dist/build-proof.txt\", \"validated\\n\");\n");
write("README.md", "# Greeting library\n\nImplementation pending.\n");
git("init");
git("config", "user.email", "mission-smoke@example.test");
git("config", "user.name", "Mission Smoke");
git("add", "-A");
git("commit", "-m", "dependency-based smoke fixture");

writeJson(".codex/costs/budget.json", { limits: { monthlyMaxUsd: 5, dailyMaxUsd: 5, perTaskMaxUsd: 5 } }, recordsRoot);
const now = new Date();
const expiresAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
const commonApproval = {
  ownerId: "owner-gurnoor-bassi",
  requestedBy: "pr-175-live-smoke",
  approvedBy: "owner-gurnoor-bassi",
  commandCategory: "build",
  target: "anthropic:messages-api",
  scope: "One isolated dependency-project smoke mission for PR 175; no deployment, publishing, protected external action, credentials, production data, or customer data.",
  riskLevel: "R1",
  dataClass: "internal",
  approvalRequiredFor: ["paid_actions"],
  prohibitedActions: ["deployment", "publishing", "protected_external_actions", "credential_access", "production_data", "customer_data"],
  evidence: [{ type: "owner_instruction", reference: "PR 175 request dated 2026-08-24 authorizing one live Anthropic smoke mission", verified: true }],
  approvalText: "Run exactly one paid Anthropic Mission Control smoke proof for PR 175 in an isolated small Git project, with no deployment or protected external action.",
  expiresAt,
  now
};
const plannerApproval = {
  ...buildApprovalLockRecord({ ...commonApproval, slug: "pr175-live-smoke-planner", requestedAction: "Generate one mission-native smoke plan", approvedActions: ["anthropic_plan_generation"] }),
  budget: { required: true, maxUsd: 5, usageLedgerRef: ".codex/costs/" }
};
const workerApproval = {
  ...buildApprovalLockRecord({
    ...commonApproval,
    slug: "pr175-live-smoke-worker",
    requestedAction: "Execute bounded local AgentRun turns for one smoke mission",
    approvalKind: "standing",
    actionClass: "anthropic_work_product_generation",
    inclusionCriteria: ["Only the one generated PR 175 smoke mission", "Only bounded local tools in isolated Git worktrees"],
    maxUses: 40,
    usageAuditRequired: true,
    revocableImmediately: true,
    approvedActions: ["anthropic_work_product_generation"]
  }),
  budget: { required: true, maxUsd: 5, usageLedgerRef: ".codex/costs/" }
};
writeApprovalLockWithAudit({ approval: plannerApproval, runId: "pr175-live-smoke-planner", now, root: recordsRoot });
writeApprovalLockWithAudit({ approval: workerApproval, runId: "pr175-live-smoke-worker", now, root: recordsRoot });

const runtimeEnv = {
  ...process.env,
  AG_OS_AI_PLANNER_ENABLED: "true",
  AG_OS_AI_WORKER_ENABLED: "true",
  AG_OS_AI_PLANNER_APPROVAL_ID: plannerApproval.approvalId,
  AG_OS_AI_WORKER_APPROVAL_ID: workerApproval.approvalId,
  AG_OS_ANTHROPIC_DAILY_CALL_LIMIT: "40"
};
const plannerReadiness = evaluateAnthropicPlannerReadiness({ root: recordsRoot, env: runtimeEnv });
const workerReadiness = evaluateAnthropicWorkerReadiness({ root: recordsRoot, env: runtimeEnv });
if (!plannerReadiness.ready || !workerReadiness.ready) throw new Error(`live smoke readiness failed: ${[...plannerReadiness.blockers, ...workerReadiness.blockers].join("; ")}`);

const ownerOutcome = "In this small dependency-based Git project, implement src/greeting.mjs with one exported formatGreeting(name) function that uses the existing text-normalizer dependency, rejects a blank normalized name with an error mentioning name, and returns Hello, <normalized name>!. Update README.md with one short usage example. Do not alter tests, the local dependency, package manifests, or build script. Plan one Backend Engineer implementation task followed by Code Reviewer, QA Engineer, and Integration Agent tasks; run npm test and npm run build. No deployment or protected external action.";
let finalMission = null;
let planning = null;
try {
  planning = await createAnthropicMissionPlan({
    ownerOutcome,
    projectId: "project-pr175-live-smoke",
    validationCommands: ["npm test", "npm run build"],
    apiKey: runtimeEnv.ANTHROPIC_API_KEY,
    model: plannerReadiness.model,
    approvalId: plannerApproval.approvalId,
    approvalMaxUsd: plannerApproval.budget.maxUsd,
    inputCostPerMillionUsd: plannerReadiness.inputCostPerMillionUsd,
    outputCostPerMillionUsd: plannerReadiness.outputCostPerMillionUsd,
    root: recordsRoot,
    env: runtimeEnv
  });
  finalizeAnthropicBudgetReservation({ reservation: planning.budgetReservation, consumed: true, actualCostUsd: planning.costUsd, root: recordsRoot });
  const mission = createMission({
    ownerOutcome,
    projectId: "project-pr175-live-smoke",
    repositoryPath,
    validationCommands: ["npm test", "npm run build"],
    concurrencyLimit: 3,
    budgetUsd: 5,
    planningEvidence: { planDraft: planning.planDraft, model: planning.model, usage: planning.usage, costUsd: planning.costUsd, usageAuditPath: planning.usageAuditPath },
    root: recordsRoot
  });
  const provider = createAnthropicAgentProvider({
    apiKey: runtimeEnv.ANTHROPIC_API_KEY,
    model: workerReadiness.model,
    approvalId: workerApproval.approvalId,
    approvalMaxUsd: workerApproval.budget.maxUsd,
    approvalUsesRemaining: 40,
    inputCostPerMillionUsd: workerReadiness.inputCostPerMillionUsd,
    outputCostPerMillionUsd: workerReadiness.outputCostPerMillionUsd,
    root: recordsRoot,
    env: runtimeEnv
  });
  finalMission = await runMission({ missionId: mission.missionId, provider, root: recordsRoot });
} finally {
  writeJson(`.codex/approvals/${plannerApproval.approvalId}.json`, revokeApprovalLock({ approval: plannerApproval, reason: "The single PR 175 live smoke authorization ended." }), recordsRoot);
  writeJson(`.codex/approvals/${workerApproval.approvalId}.json`, revokeApprovalLock({ approval: workerApproval, reason: "The single PR 175 live smoke authorization ended." }), recordsRoot);
}

if (!finalMission) throw new Error("live smoke did not create a mission result");
const paidAgents = finalMission.agents.filter((agent) => agent.costUsd > 0);
const toolEvents = finalMission.events.filter((event) => event.type === "tool.completed");
const taskWorkspaces = finalMission.tasks.filter((task) => task.workspace);
const summary = {
  proofVersion: 1,
  generatedAt: new Date().toISOString(),
  smokeRoot,
  missionId: finalMission.missionId,
  status: finalMission.status,
  planning: { mode: finalMission.planning.mode, model: finalMission.planning.model, costUsd: finalMission.planning.costUsd, taskCount: missionPlanTasks(planning.planDraft).length },
  actualAgentRuns: paidAgents.map((agent) => ({ agentRunId: agent.agentRunId, role: agent.role, status: agent.status, costUsd: agent.costUsd, tokenUsage: agent.tokenUsage })),
  tasks: finalMission.tasks.map((task) => ({ taskId: task.taskId, role: task.assignedRole, kind: task.kind, status: task.status, attempt: task.attempt, tools: task.commandsExecuted.map((item) => item.command) })),
  isolatedWorktreeCount: new Set(taskWorkspaces.map((task) => task.workspace.path)).size,
  dependencyBootstrapManagers: [...new Set(taskWorkspaces.map((task) => task.workspace.bootstrap?.manager).filter(Boolean))],
  toolCallCount: toolEvents.length,
  eventCount: finalMission.events.length,
  persistedEventsPath: finalMission.eventsPath,
  integration: { branch: finalMission.integrationWorkspace.branch, revision: finalMission.artifactRecords?.[0]?.revision || null },
  finalValidation: finalMission.artifactRecords?.[0]?.validation?.map(({ command, passed, status }) => ({ command, passed, status })) || [],
  protectedExternalActionsExecuted: finalMission.protectedExternalActionsExecuted,
  approvalsRevokedAfterProof: true,
  deploymentExecuted: false
};
const summaryPath = path.join(smokeRoot, "smoke-summary.json");
writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
if (finalMission.status !== "completed") throw new Error(`live smoke mission ended ${finalMission.status}: ${JSON.stringify(finalMission.blockers)}`);
if (paidAgents.length < 4) throw new Error(`live smoke used only ${paidAgents.length} paid AgentRuns`);
if (toolEvents.length === 0) throw new Error("live smoke persisted no real tool calls");
if (summary.isolatedWorktreeCount !== taskWorkspaces.length) throw new Error("live smoke task worktrees were not isolated");
if (!summary.dependencyBootstrapManagers.includes("npm")) throw new Error("live smoke did not bootstrap npm dependencies");
if (summary.finalValidation.length < 1 || summary.finalValidation.some((item) => !item.passed)) throw new Error("live smoke final validation did not pass");
if (!existsSync(path.join(recordsRoot, finalMission.eventsPath))) throw new Error("live smoke event stream was not persisted");
if (summary.protectedExternalActionsExecuted !== false) throw new Error("live smoke crossed a protected external action boundary");
console.log(JSON.stringify({ ok: true, summaryPath, ...summary }));
