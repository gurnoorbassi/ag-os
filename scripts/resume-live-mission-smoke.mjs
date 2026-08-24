import { existsSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { buildApprovalLockRecord, revokeApprovalLock, writeApprovalLockWithAudit } from "./lib/runtime/approval-lock-runtime.mjs";
import { createAnthropicAgentProvider } from "./lib/runtime/anthropic-agent-provider.mjs";
import { evaluateAnthropicWorkerReadiness } from "./lib/runtime/anthropic-worker-readiness.mjs";
import { writeJson } from "./lib/runtime/common.mjs";
import { runMission } from "./lib/runtime/mission-runtime.mjs";

if (process.env.AG_OS_LIVE_MISSION_SMOKE_APPROVED !== "true") throw new Error("live mission smoke resume requires the approving owner session");
for (const name of ["AG_OS_LIVE_MISSION_SMOKE_ROOT", "ANTHROPIC_API_KEY", "ANTHROPIC_MODEL", "ANTHROPIC_INPUT_COST_PER_MILLION_USD", "ANTHROPIC_OUTPUT_COST_PER_MILLION_USD"]) {
  if (!process.env[name]) throw new Error(`live mission smoke resume requires ${name}`);
}
const smokeRoot = path.resolve(process.env.AG_OS_LIVE_MISSION_SMOKE_ROOT);
const resumeSequence = String(process.env.AG_OS_LIVE_MISSION_SMOKE_RESUME_SEQUENCE || "1").replace(/[^0-9]/g, "") || "1";
const recordsRoot = path.join(smokeRoot, "records");
const missionDirectory = path.join(recordsRoot, ".codex", "missions");
const missionIds = existsSync(missionDirectory) ? readdirSync(missionDirectory, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name) : [];
if (missionIds.length !== 1) throw new Error(`live smoke resume requires exactly one persisted Mission, found ${missionIds.length}`);
const missionId = missionIds[0];
const now = new Date();
const approval = {
  ...buildApprovalLockRecord({
    slug: `pr175-live-smoke-worker-resume-${resumeSequence}`,
    ownerId: "owner-gurnoor-bassi",
    requestedBy: "pr-175-live-smoke-resume",
    approvedBy: "owner-gurnoor-bassi",
    commandCategory: "build",
    requestedAction: `Resume only blocked AgentRuns in ${missionId}`,
    approvalKind: "standing",
    actionClass: "anthropic_work_product_generation",
    inclusionCriteria: [`Only persisted Mission ${missionId}`, "Only blocked local AgentRuns and final validation", "At most 20 additional Anthropic turns"],
    maxUses: 20,
    usageAuditRequired: true,
    revocableImmediately: true,
    target: "anthropic:messages-api",
    scope: `Resume the already-started PR 175 smoke Mission ${missionId}; no second Mission, deployment, publishing, protected external action, credentials, production data, or customer data.`,
    riskLevel: "R1",
    dataClass: "internal",
    approvalRequiredFor: ["paid_actions"],
    approvedActions: ["anthropic_work_product_generation"],
    prohibitedActions: ["new_mission", "deployment", "publishing", "protected_external_actions", "credential_access", "production_data", "customer_data"],
    evidence: [{ type: "owner_instruction", reference: "PR 175 request dated 2026-08-24 authorizing one live Anthropic smoke mission", verified: true }],
    approvalText: `Resume the same bounded smoke Mission ${missionId} after its call breaker; do not create another Mission.`,
    expiresAt: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
    now
  }),
  budget: { required: true, maxUsd: 5, usageLedgerRef: ".codex/costs/" }
};
writeApprovalLockWithAudit({ approval, runId: `pr175-live-smoke-worker-resume-${resumeSequence}`, now, root: recordsRoot });
const runtimeEnv = {
  ...process.env,
  AG_OS_AI_WORKER_ENABLED: "true",
  AG_OS_AI_WORKER_APPROVAL_ID: approval.approvalId,
  AG_OS_ANTHROPIC_DAILY_CALL_LIMIT: String(60 + Number(resumeSequence) * 20)
};
const readiness = evaluateAnthropicWorkerReadiness({ root: recordsRoot, env: runtimeEnv });
if (!readiness.ready) throw new Error(`live smoke resume readiness failed: ${readiness.blockers.join("; ")}`);
let mission;
try {
  const provider = createAnthropicAgentProvider({
    apiKey: runtimeEnv.ANTHROPIC_API_KEY,
    model: readiness.model,
    approvalId: approval.approvalId,
    approvalMaxUsd: approval.budget.maxUsd,
    approvalUsesRemaining: 20,
    inputCostPerMillionUsd: readiness.inputCostPerMillionUsd,
    outputCostPerMillionUsd: readiness.outputCostPerMillionUsd,
    root: recordsRoot,
    env: runtimeEnv
  });
  mission = await runMission({ missionId, provider, root: recordsRoot });
} finally {
  writeJson(`.codex/approvals/${approval.approvalId}.json`, revokeApprovalLock({ approval, reason: "The resumed PR 175 smoke authorization ended." }), recordsRoot);
}
const paidAgents = mission.agents.filter((agent) => agent.costUsd > 0);
const taskWorkspaces = mission.tasks.filter((task) => task.workspace);
const summary = {
  proofVersion: 2,
  generatedAt: new Date().toISOString(),
  smokeRoot,
  missionId,
  status: mission.status,
  resumedSameMission: mission.events.filter((event) => event.type === "mission.created").length === 1 && mission.events.some((event) => event.type === "mission.resumed"),
  planning: mission.planning,
  actualAgentRuns: paidAgents.map((agent) => ({ agentRunId: agent.agentRunId, role: agent.role, status: agent.status, costUsd: agent.costUsd, tokenUsage: agent.tokenUsage })),
  tasks: mission.tasks.map((task) => ({ taskId: task.taskId, role: task.assignedRole, kind: task.kind, status: task.status, attempt: task.attempt, commands: task.commandsExecuted.map((item) => item.command) })),
  isolatedWorktreeCount: new Set(taskWorkspaces.map((task) => task.workspace.path)).size,
  dependencyBootstrapManagers: [...new Set(taskWorkspaces.map((task) => task.workspace.bootstrap?.manager).filter(Boolean))],
  toolCallCount: mission.events.filter((event) => event.type === "tool.completed").length,
  eventCount: mission.events.length,
  persistedEventsPath: mission.eventsPath,
  integration: { branch: mission.integrationWorkspace.branch, revision: mission.artifactRecords?.[0]?.revision || null },
  finalValidation: mission.artifactRecords?.[0]?.validation?.map(({ command, passed, status }) => ({ command, passed, status })) || [],
  protectedExternalActionsExecuted: mission.protectedExternalActionsExecuted,
  approvalsRevokedAfterProof: true,
  deploymentExecuted: false
};
const summaryPath = path.join(smokeRoot, "smoke-summary-resumed.json");
writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
if (mission.status !== "completed") throw new Error(`resumed live smoke mission ended ${mission.status}: ${JSON.stringify(mission.blockers)}`);
if (!summary.resumedSameMission) throw new Error("smoke resume did not preserve the original Mission identity");
if (paidAgents.length < 4) throw new Error(`live smoke used only ${paidAgents.length} paid AgentRuns`);
if (summary.isolatedWorktreeCount !== taskWorkspaces.length) throw new Error("live smoke task worktrees were not isolated");
if (!summary.dependencyBootstrapManagers.includes("npm")) throw new Error("live smoke did not bootstrap npm dependencies");
if (summary.finalValidation.length < 1 || summary.finalValidation.some((item) => !item.passed)) throw new Error("live smoke final validation did not pass");
if (!existsSync(path.join(recordsRoot, mission.eventsPath))) throw new Error("live smoke event stream was not persisted");
if (summary.protectedExternalActionsExecuted !== false) throw new Error("live smoke crossed a protected external action boundary");
console.log(JSON.stringify({ ok: true, summaryPath, ...summary }));
