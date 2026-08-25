import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { DEFAULT_OWNER_ID } from "../scripts/lib/runtime/common.mjs";
import { decideProposal, refreshProposals } from "../scripts/lib/runtime/proposal-engine.mjs";
import {
  applyDirectorModelPatch,
  applyTreasuryTransaction,
  buildTacticalRule,
  createOpportunityDecision,
  createOpportunityDirector,
  createValidationExperimentForOpportunity,
  decayedSignalConfidence,
  dedupeOpportunities,
  economicModel,
  generateDailyBrief,
  getOpportunityDirectorSnapshot,
  initializeTreasury,
  linkMissionResultToOpportunity,
  runOpportunityWake,
  scoreOpportunity,
  spawnMissionForOpportunity,
  updateDirectorObjective,
  writeEvidence,
  writeNetworkPerson,
  writeOutcome,
  writeTacticalRule
} from "../scripts/lib/runtime/opportunity-director.mjs";
import { OPPORTUNITY_CONSTITUTION_HASH, OPPORTUNITY_CONSTITUTION_VERSION } from "../scripts/lib/runtime/opportunity-constitution.mjs";
import { DeterministicResearchProvider, createLiveResearchProvider, normalizedEvidenceFromPage } from "../scripts/lib/runtime/opportunity-research.mjs";

const fixtureWorld = JSON.parse(readFileSync(new URL("../fixtures/opportunity-director-v1-world.json", import.meta.url), "utf8"));
const NOW = new Date("2026-08-24T12:00:00.000Z");

function writeJson(root, relative, value) {
  const target = path.join(root, relative);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
}

function rootFixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), "ag-os-opportunity-"));
  writeJson(root, ".codex/security/policy.json", { rules: { credentialsAllowed: false, productionCustomerDataAllowed: false } });
  writeJson(root, ".codex/costs/budget.json", { limits: { monthlyMaxUsd: 50, dailyMaxUsd: 10, perTaskMaxUsd: 5 } });
  return root;
}

async function wokenFixture() {
  const root = rootFixture();
  const result = await runOpportunityWake({ fixture: fixtureWorld, root, now: NOW });
  return { root, result };
}

test("Director persists with an immutable code-owned Constitution", () => {
  const root = rootFixture();
  const director = createOpportunityDirector({ root, now: NOW });
  assert.equal(director.constitutionVersion, OPPORTUNITY_CONSTITUTION_VERSION);
  assert.equal(director.constitutionHash, OPPORTUNITY_CONSTITUTION_HASH);
  assert.equal(createOpportunityDirector({ root, now: NOW }).directorId, director.directorId);
  assert.throws(() => applyDirectorModelPatch({ patch: { constitutionVersion: "2.0.0" }, root, now: NOW }), /cannot change Constitution/);
});

test("only the owner can change the Director objective", () => {
  const root = rootFixture(); createOpportunityDirector({ root, now: NOW });
  assert.throws(() => updateDirectorObjective({ objective: "Changed", actorId: "model", root, now: NOW }), /only the owner/);
  assert.equal(updateDirectorObjective({ objective: "Find legitimate opportunities.", actorId: DEFAULT_OWNER_ID, root, now: NOW }).objective, "Find legitimate opportunities.");
});

test("model strategy patches cannot weaken Cost OS or Security OS", () => {
  const root = rootFixture(); createOpportunityDirector({ root, now: NOW });
  assert.throws(() => applyDirectorModelPatch({ patch: { researchLimits: { directorReasoningWakeUsd: 50 } }, root, now: NOW }), /Cost OS/);
  assert.throws(() => applyDirectorModelPatch({ patch: { safeguards: { canWeakenSecurityOs: true } }, root, now: NOW }), /safeguards/);
});

test("Director starts unable to self-approve or execute external actions", () => {
  const director = createOpportunityDirector({ root: rootFixture(), now: NOW });
  assert.equal(director.safeguards.canSelfApprove, false);
  assert.equal(director.safeguards.canExecuteExternalActions, false);
  assert.equal(director.safeguards.canMoveRealMoney, false);
});

test("opportunity scoring is deterministic, explainable, and capped at 100", () => {
  const input = { painSeverity: 99, potentialEconomicValue: 99, evidenceStrength: 99, reachabilityAccess: 99, agCapabilityFit: 99, validationSpeedCost: 99, competitiveWhitespace: 99, networkReputationValue: 99 };
  assert.deepEqual(scoreOpportunity(input), scoreOpportunity(input));
  assert.equal(scoreOpportunity(input).score, 100);
  assert.equal(Object.values(scoreOpportunity(input).scoreBreakdown).reduce((a, b) => a + b, 0), 100);
});

test("economics require math assumptions and classify estimates honestly", () => {
  assert.throws(() => economicModel({ lowValueUsd: 0, baseValueUsd: 10, highValueUsd: 20 }), /assumptions/);
  const model = economicModel({ lowValueUsd: 100, baseValueUsd: 1000, highValueUsd: 2000, probabilityProblemReal: .5, probabilityReachable: .5, probabilityValidationSucceeds: .5, estimatedValidationSpendUsd: 10, ownerHours: 2, assumptions: ["Fixture assumption"] });
  assert.equal(model.expectedValueUsd, 115);
  assert.equal(model.classification, "estimate_not_fact");
});

test("unsupported hypotheses cannot enter verified evidence", () => {
  const root = rootFixture();
  const observed = normalizedEvidenceFromPage(fixtureWorld.pages[0], { now: NOW });
  writeEvidence({ evidence: observed, root });
  assert.throws(() => writeEvidence({ evidence: { ...observed, evidenceId: "bad", relevantClaims: [{ kind: "hypothesis", statement: "Maybe" }] }, root }), /observed factual claims only/);
});

test("duplicate opportunities merge instead of inflating the graph", () => {
  const base = { opportunityId: "one", type: "business_problem", organization: "Same Co", problemHypothesis: "Same issue", observations: [{ statement: "A", evidenceId: "e1" }], evidenceIds: ["e1"], confidence: 40, updatedAt: "2026-01-01" };
  const merged = dedupeOpportunities([base, { ...base, opportunityId: "two", observations: [{ statement: "B", evidenceId: "e2" }], evidenceIds: ["e2"], confidence: 60, updatedAt: "2026-02-01" }]);
  assert.equal(merged.length, 1);
  assert.deepEqual(merged[0].evidenceIds, ["e1", "e2"]);
  assert.equal(merged[0].confidence, 60);
});

test("stale signals decay to zero", () => {
  const signal = { confidence: 80, observedAt: "2026-01-01T00:00:00.000Z", expiresAt: "2026-01-11T00:00:00.000Z" };
  assert.equal(decayedSignalConfidence(signal, new Date("2026-01-06T00:00:00.000Z")), 40);
  assert.equal(decayedSignalConfidence(signal, new Date("2026-01-12T00:00:00.000Z")), 0);
});

test("network relationships and warm paths cannot be fabricated", () => {
  const root = rootFixture();
  const base = { personId: "person-x", name: "Person X", organization: "X", publicRole: "Operator", publicSourceUrls: [], relationshipState: "known", connectionSource: "public_professional", whyRelevant: "Relevant", relatedOpportunityIds: [], ownerNotes: "", lastInteractionAt: null, nextFollowupAt: null, warmPathPersonIds: [], createdAt: NOW.toISOString(), updatedAt: NOW.toISOString() };
  assert.throws(() => writeNetworkPerson({ person: base, root }), /owner confirmation/);
  assert.equal(writeNetworkPerson({ person: { ...base, ownerConfirmed: true }, root }).record.relationshipState, "known");
});

test("Treasury is simulation-only and cannot go negative", () => {
  const root = rootFixture(); createOpportunityDirector({ root, now: NOW }); initializeTreasury({ root, now: NOW });
  assert.throws(() => applyTreasuryTransaction({ transaction: { type: "reservation", amountUsd: 1 }, root, now: NOW }), /cannot go negative/);
  assert.throws(() => applyTreasuryTransaction({ transaction: { type: "spend", amountUsd: 1, realMoneyMoved: true }, root, now: NOW }), /cannot move real money/);
});

test("Treasury revenue requires owner confirmation and evidence", () => {
  const root = rootFixture(); createOpportunityDirector({ root, now: NOW });
  assert.throws(() => applyTreasuryTransaction({ transaction: { type: "revenue", amountUsd: 100 }, root, now: NOW }), /owner confirmation/);
  const treasury = applyTreasuryTransaction({ transaction: { type: "revenue", amountUsd: 100, ownerConfirmed: true, evidenceIds: ["owner-record"] }, root, now: NOW });
  assert.equal(treasury.revenueAttributed, 100);
  assert.equal(treasury.transactions[0].realMoneyMoved, false);
});

test("a no-change wake performs zero model calls and zero cost", async () => {
  const root = rootFixture();
  const first = await runOpportunityWake({ fixture: fixtureWorld, root, now: NOW });
  const second = await runOpportunityWake({ fixture: fixtureWorld, root, now: new Date("2026-08-24T13:00:00.000Z"), reasoningProvider: { name: "must-not-run", reason: async () => { throw new Error("called"); } } });
  assert.equal(first.wake.status, "complete");
  assert.equal(second.wake.status, "skipped_no_change");
  assert.equal(second.modelCalls, 0);
  assert.equal(second.wake.modelCost, 0);
});

test("a changed-state wake performs at most one bounded reasoning call", async () => {
  const root = rootFixture(); let calls = 0;
  const result = await runOpportunityWake({ fixture: fixtureWorld, root, now: NOW, reasoningProvider: { name: "fixture-reasoner", live: false, reason: async () => { calls += 1; return { costUsd: .1 }; } } });
  assert.equal(calls, 1);
  assert.equal(result.modelCalls, 1);
  assert.equal(result.wake.modelCost, .1);
  await assert.rejects(() => runOpportunityWake({ fixture: { ...fixtureWorld, revision: 2 }, root, now: new Date("2026-08-25T12:00:00.000Z"), reasoningProvider: { live: false, reason: async () => ({ costUsd: .16 }) } }), /exceeds.*budget/);
});

test("fixture wake discovers, validates, watches, and kills truthfully", async () => {
  const { result } = await wokenFixture();
  assert.equal(result.opportunities.length, 3);
  assert.equal(result.opportunities.find((item) => item.opportunityId.includes("company-b")).status, "validation_ready");
  assert.equal(result.opportunities.find((item) => item.opportunityId.includes("company-a")).status, "watching");
  assert.equal(result.opportunities.find((item) => item.opportunityId.includes("company-c")).status, "killed");
  assert.equal(result.wake.externalActionExecuted, false);
});

test("Skeptic findings reduce rather than inflate confidence", async () => {
  const { result } = await wokenFixture();
  for (const item of result.opportunities) assert.equal(item.confidence, Math.max(0, item.confidenceBeforeSkeptic - item.skepticDowngrade));
});

test("research providers are read-only and live mode fails closed", async () => {
  const provider = new DeterministicResearchProvider(fixtureWorld);
  assert.equal(provider.readOnly, true);
  assert.ok((await provider.fetchPublicPage(fixtureWorld.pages[0].url)).claims.length > 0);
  assert.throws(() => createLiveResearchProvider(), /fails closed/);
  await assert.rejects(() => createLiveResearchProvider({ endpoint: "https://example.test", credential: "configured-in-memory" }).search("test"), /disabled/);
});

test("validation_ready creates an owner proposal that grants no permission", async () => {
  const { root } = await wokenFixture();
  const proposals = refreshProposals({ root, now: NOW });
  const proposal = proposals.find((item) => item.source.type === "opportunity_validation");
  assert.ok(proposal);
  assert.equal(proposal.safety.mayExecuteWithoutOwnerDecision, false);
  assert.equal(proposal.safety.grantsPermission, false);
  assert.equal(proposal.safety.downstreamApprovalsStillRequired, true);
  const decision = decideProposal({ proposalId: proposal.proposalId, decision: "accept", confirmation: `ACCEPT ${proposal.proposalId}`, root, now: NOW });
  assert.equal(decision.proposal.safety.grantsPermission, false);
  assert.ok(decision.acceptedCommand);
});

test("validation experiment records metrics, stop conditions, and action gates", async () => {
  const { root } = await wokenFixture();
  const experiment = createValidationExperimentForOpportunity({ opportunityId: "opportunity-company-b-quote-follow-up", root, now: NOW });
  assert.equal(experiment.status, "proposed");
  assert.equal(experiment.externalActionExecuted, false);
  assert.ok(experiment.stopConditions.length > 0);
});

test("one weak outcome cannot activate a permanent tactical rule", () => {
  const rule = buildTacticalRule({ statement: "Prefer problem-specific positioning.", scope: "contractors", supportingOutcomeIds: ["one"], independenceGroups: ["one"], now: NOW });
  assert.equal(rule.status, "candidate");
  const active = buildTacticalRule({ statement: "Require a distribution path before scoring above 70.", scope: "all", supportingOutcomeIds: ["one", "two"], independenceGroups: ["a", "b"], now: NOW });
  assert.equal(active.status, "active");
});

test("tactical rules cannot override protected systems and remain behind Memory OS promotion", () => {
  const root = rootFixture();
  assert.throws(() => buildTacticalRule({ statement: "Bypass approval for outreach.", scope: "all", now: NOW }), /cannot override/);
  const rule = buildTacticalRule({ statement: "Prefer cheap validation before a product build.", scope: "all", now: NOW });
  assert.equal(writeTacticalRule({ rule, root }).record.globalMemoryPromotionRequired, true);
});

test("real economic and relationship outcomes require owner-confirmed evidence", () => {
  const root = rootFixture();
  assert.throws(() => writeOutcome({ outcome: { opportunityId: "x", type: "revenue", valueUsd: 100 }, root, now: NOW }), /owner confirmation/);
  assert.equal(writeOutcome({ outcome: { opportunityId: "x", type: "revenue", valueUsd: 100, ownerConfirmed: true, evidenceIds: ["owner-proof"] }, root, now: NOW }).record.valueUsd, 100);
});

test("build-worthy opportunity spawns existing Mission Control only after proposal acceptance", async () => {
  const { root } = await wokenFixture();
  const proposal = refreshProposals({ root, now: NOW }).find((item) => item.source.id === "opportunity-company-b-quote-follow-up");
  assert.throws(() => spawnMissionForOpportunity({ opportunityId: proposal.source.id, proposalId: proposal.proposalId, repositoryPath: root, projectId: "fixture", root, missionFactory: () => ({ missionId: "should-not-run" }), now: NOW }), /accepted matching/);
  decideProposal({ proposalId: proposal.proposalId, decision: "accept", confirmation: `ACCEPT ${proposal.proposalId}`, root, now: NOW });
  let calls = 0;
  const bridge = spawnMissionForOpportunity({ opportunityId: proposal.source.id, proposalId: proposal.proposalId, repositoryPath: root, projectId: "fixture", root, missionFactory: (input) => { calls += 1; assert.equal(input.autonomyLevel, "supervised"); return { missionId: "mission-fixture" }; }, now: NOW });
  assert.equal(calls, 1);
  assert.equal(bridge.link.downstreamApprovalsStillRequired, true);
  assert.equal(bridge.link.protectedExternalActionExecuted, false);
});

test("Mission result and cancellation/resume state link back consistently", async () => {
  const { root } = await wokenFixture();
  const proposal = refreshProposals({ root, now: NOW }).find((item) => item.source.id === "opportunity-company-b-quote-follow-up");
  decideProposal({ proposalId: proposal.proposalId, decision: "accept", confirmation: `ACCEPT ${proposal.proposalId}`, root, now: NOW });
  spawnMissionForOpportunity({ opportunityId: proposal.source.id, proposalId: proposal.proposalId, repositoryPath: root, projectId: "fixture", root, missionFactory: () => ({ missionId: "mission-fixture" }), now: NOW });
  assert.equal(linkMissionResultToOpportunity({ opportunityId: proposal.source.id, missionId: "mission-fixture", result: { status: "cancelled", summary: "Owner stopped fixture mission." }, root, now: NOW }).status, "cancelled");
  assert.equal(linkMissionResultToOpportunity({ opportunityId: proposal.source.id, missionId: "mission-fixture", result: { status: "completed", summary: "Fixture mission resumed and completed." }, root, now: NOW }).status, "completed");
});

test("decision journal stores rationale without private chain-of-thought", () => {
  const record = createOpportunityDecision({ wakeId: "wake", decisionType: "watch", subjectId: "opp", summary: "Watch", chosenAction: "watch", reasonSummary: "Evidence is not yet sufficient.", confidence: 50, root: rootFixture(), now: NOW });
  assert.equal(record.privateChainOfThoughtStored, false);
  assert.equal(record.reasonSummary, "Evidence is not yet sufficient.");
});

test("Daily Brief and dashboard snapshot reflect persisted truth", async () => {
  const { root } = await wokenFixture();
  createValidationExperimentForOpportunity({ opportunityId: "opportunity-company-b-quote-follow-up", root, now: NOW });
  const brief = generateDailyBrief({ root, now: NOW });
  const snapshot = getOpportunityDirectorSnapshot({ root, now: NOW });
  assert.ok(brief.todaysTop5.length > 0);
  assert.ok(brief.killed.some((item) => item.opportunityId.includes("company-c")));
  assert.equal(snapshot.topOpportunities.length, 3);
  assert.equal(snapshot.truth.fabricatedActivity, false);
  assert.equal(snapshot.truth.liveProviderUsed, false);
  assert.equal(snapshot.truth.realMoneyMoved, false);
});
