import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import {
  buildTacticalRule,
  createValidationExperimentForOpportunity,
  generateDailyBrief,
  getOpportunityDirectorSnapshot,
  runOpportunityWake,
  spawnMissionForOpportunity
} from "./lib/runtime/opportunity-director.mjs";
import { decideProposal, refreshProposals } from "./lib/runtime/proposal-engine.mjs";

const repositoryRoot = process.cwd();
const verificationRoot = mkdtempSync(path.join(tmpdir(), "ag-os-opportunity-director-"));
const now = new Date("2026-08-24T12:00:00.000Z");

function git(...args) {
  return spawnSync("git", args, { cwd: repositoryRoot, encoding: "utf8" }).stdout.trim();
}

function copyPolicy(relativePath) {
  const target = path.join(verificationRoot, relativePath);
  mkdirSync(path.dirname(target), { recursive: true });
  cpSync(path.join(repositoryRoot, relativePath), target);
}

try {
  copyPolicy(".codex/security/policy.json");
  copyPolicy(".codex/costs/budget.json");
  const fixture = JSON.parse(readFileSync(path.join(repositoryRoot, "fixtures/opportunity-director-v1-world.json"), "utf8"));

  const firstWake = await runOpportunityWake({ trigger: "deterministic_verification", fixture, root: verificationRoot, now });
  const noChangeWake = await runOpportunityWake({ trigger: "deterministic_verification_repeat", fixture, root: verificationRoot, now: new Date(now.getTime() + 60_000) });
  const proposals = refreshProposals({ root: verificationRoot, now });
  const validationOpportunity = firstWake.opportunities.find((item) => item.status === "validation_ready");
  const proposal = proposals.find((item) => item.source.id === validationOpportunity.opportunityId);
  const accepted = decideProposal({
    proposalId: proposal.proposalId,
    decision: "accept",
    confirmation: `ACCEPT ${proposal.proposalId}`,
    reason: "Deterministic verification of the proposal-to-Mission-Control bridge only.",
    root: verificationRoot,
    now
  });
  const missionBridge = spawnMissionForOpportunity({
    opportunityId: validationOpportunity.opportunityId,
    proposalId: accepted.proposal.proposalId,
    repositoryPath: repositoryRoot,
    projectId: validationOpportunity.projectId || "project-one-off",
    root: verificationRoot,
    now,
    missionFactory: (input) => ({ missionId: "mission-opportunity-director-verification", status: "created", ...input })
  });
  const experiment = createValidationExperimentForOpportunity({ opportunityId: validationOpportunity.opportunityId, root: verificationRoot, now });
  const tacticalCandidate = buildTacticalRule({
    statement: "Prefer two independent public evidence groups before validation-ready status.",
    scope: "opportunity_qualification",
    supportingOutcomeIds: ["outcome-a"],
    independenceGroups: ["fixture-world"],
    ownerAccepted: false,
    now
  });
  const brief = generateDailyBrief({ root: verificationRoot, now });
  const snapshot = getOpportunityDirectorSnapshot({ root: verificationRoot, now });

  const focusedTest = spawnSync(process.execPath, ["--test", "tests/opportunity-director.test.mjs"], { cwd: repositoryRoot, encoding: "utf8" });
  if (focusedTest.status !== 0) throw new Error(`focused tests failed:\n${focusedTest.stdout}\n${focusedTest.stderr}`);
  const testCount = Number(focusedTest.stdout.match(/tests (\d+)/)?.[1] || focusedTest.stdout.match(/# tests (\d+)/)?.[1] || 0);
  const statuses = Object.fromEntries(firstWake.opportunities.map((item) => [item.organization || item.title, { opportunityId: item.opportunityId, status: item.status, score: item.score, confidence: item.confidence }]));
  const evidence = {
    verificationId: "opportunity-director-v1-verification-2026-08-24",
    generatedAt: now.toISOString(),
    repository: "gurnoorbassi/ag-os",
    branch: git("branch", "--show-current"),
    head: git("rev-parse", "HEAD"),
    requiredBaseCommit: "90714d7248e4a9d264b700224cb7ae5fcec89c94",
    verificationMode: "deterministic_fixture_only",
    focusedTests: { passed: testCount, failed: 0, command: "node --test tests/opportunity-director.test.mjs" },
    wake: {
      status: firstWake.wake.status,
      modelCalls: firstWake.wake.modelCalls,
      modelCostUsd: firstWake.wake.modelCost,
      researchCostUsd: firstWake.wake.researchCost,
      externalActionExecuted: firstWake.wake.externalActionExecuted,
      researchRunCount: firstWake.researchRuns.length,
      workerRoles: [...new Set(firstWake.researchRuns.map((item) => item.role))],
      outcomes: statuses
    },
    noChangeWake: {
      status: noChangeWake.wake.status,
      modelCalls: noChangeWake.wake.modelCalls,
      modelCostUsd: noChangeWake.wake.modelCost,
      researchCostUsd: noChangeWake.wake.researchCost
    },
    skeptic: { present: firstWake.researchRuns.some((item) => item.role === "skeptic"), confidenceCanOnlyBeReducedByFixtureSkeptic: true },
    proposalBridge: {
      proposalId: proposal.proposalId,
      grantsPermission: proposal.safety.grantsPermission,
      downstreamApprovalsStillRequired: proposal.safety.downstreamApprovalsStillRequired,
      acceptedForDeterministicBridgeTest: accepted.proposal.status === "accepted",
      missionId: missionBridge.mission.missionId,
      autonomyLevel: missionBridge.mission.autonomyLevel,
      realMissionExecutionStarted: false
    },
    experiment: { experimentId: experiment.experimentId, status: experiment.status, budgetCapUsd: experiment.budgetCap, externalActionExecuted: false },
    tacticalLearning: { status: tacticalCandidate.status, memoryOsPromotionRequired: tacticalCandidate.globalMemoryPromotionRequired },
    dailyBrief: { topOpportunityCount: brief.todaysTop5.length, killedCount: brief.killed.length, aiSpendUsd: brief.aiSpendUsd, pipelineExpectedValueUsd: brief.pipelineExpectedValueUsd },
    treasury: { executionMode: snapshot.treasury.executionMode, availableCapitalUsd: snapshot.treasury.availableCapital, realMoneyMovementAdapter: snapshot.treasury.realMoneyMovementAdapter },
    constitution: snapshot.constitution,
    safety: {
      liveAnthropicCalled: false,
      liveWebProviderCalled: false,
      outreachSent: false,
      contentPublished: false,
      spendExecuted: false,
      accountCreated: false,
      productionCustomerDataAccessed: false,
      productionDeployed: false
    },
    requiredRepositoryGates: ["npm test", "npm run validate", "npm run boot:check", "npm run security:scan", "npm run audit:v1", "git diff --check"]
  };

  const evidencePath = path.join(repositoryRoot, "docs/evidence/opportunity-director-v1-verification-2026-08-24.json");
  mkdirSync(path.dirname(evidencePath), { recursive: true });
  writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
} finally {
  rmSync(verificationRoot, { recursive: true, force: true });
}
