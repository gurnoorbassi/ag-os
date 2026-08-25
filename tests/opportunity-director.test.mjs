import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
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
  confirmNetworkRelationship,
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
  writeOwnerDiscoverySeed,
  writeOutcome,
  writeTacticalRule
} from "../scripts/lib/runtime/opportunity-director.mjs";
import { OPPORTUNITY_CONSTITUTION_HASH, OPPORTUNITY_CONSTITUTION_VERSION } from "../scripts/lib/runtime/opportunity-constitution.mjs";
import { DeterministicResearchProvider, createLiveResearchProvider, normalizedEvidenceFromPage } from "../scripts/lib/runtime/opportunity-research.mjs";
import { evaluateOpportunitySchedule, runOpportunityDirectorSchedulerTick } from "../scripts/lib/runtime/opportunity-scheduler.mjs";
import { createAnthropicOpportunitySynthesizer } from "../scripts/lib/runtime/anthropic-opportunity-synthesizer.mjs";
import { evaluateOpportunityLiveReadiness } from "../scripts/lib/runtime/opportunity-live-readiness.mjs";

const fixtureWorld = JSON.parse(readFileSync(new URL("../fixtures/opportunity-director-v1-world.json", import.meta.url), "utf8"));
const NOW = new Date("2026-08-24T12:00:00.000Z");

function mockLiveProvider({ pages = fixtureWorld.pages.slice(0, 2).map((page) => ({ ...page, sourceType: "public_web" })), searchCostUsd = 0, failSearch = false, failFetch = false } = {}) {
  const calls = [];
  return {
    name: "mock_public_search", mode: "live_read_only", readOnly: true, paid: searchCostUsd > 0, calls,
    estimatedCostUsd: (operation) => operation === "search" ? searchCostUsd : 0,
    search: async (query) => { calls.push({ operation: "search", query }); if (failSearch) throw new Error("mock search failed"); return pages.map((page) => ({ url: page.url, title: page.title, summary: page.summary })); },
    fetchPublicPage: async (url) => { calls.push({ operation: "fetch", url }); if (failFetch) throw new Error("mock fetch failed"); return structuredClone(pages.find((page) => page.url === url)); }
  };
}

function synthesisCandidate(evidence) {
  return {
    type: "business_problem", title: "Evidence-backed service problem", organization: "Example Co", summary: "Public sources describe an operational service problem.",
    problemHypothesis: "Example Co may benefit from a bounded automation validation.", evidenceIds: evidence.map((item) => item.evidenceId), observedClaims: evidence.flatMap((item) => item.relevantClaims.map((claim) => claim.statement)),
    assumptions: ["Public evidence may not imply purchasing intent."], scoreInputs: { painSeverity: 10, potentialEconomicValue: 10, evidenceStrength: 15, reachabilityAccess: 5, agCapabilityFit: 8, validationSpeedCost: 8, competitiveWhitespace: 2, networkReputationValue: 1 }, confidence: 60,
    economicModel: { lowValueUsd: 0, baseValueUsd: 1000, highValueUsd: 3000, probabilityProblemReal: 0.5, probabilityReachable: 0.2, probabilityValidationSucceeds: 0.3, estimatedValidationSpendUsd: 0, ownerHours: 1, assumptions: ["Preliminary public-evidence estimate."] },
    cheapestValidation: "Research another independent public source.", validationActionClass: "read_only_research", estimatedValidationCost: 0, estimatedDaysToSignal: 1,
    stopConditions: ["Stop if no independent source appears."], recommendedNextAction: "Watch pending another independent source."
  };
}

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

test("Treasury net contribution is signed while capital balances remain non-negative", () => {
  const root = rootFixture(); initializeTreasury({ root, startingCapital: 40, now: NOW }); createOpportunityDirector({ root, now: NOW });
  applyTreasuryTransaction({ transaction: { type: "reservation", amountUsd: 40 }, root, now: NOW });
  const treasury = applyTreasuryTransaction({ transaction: { type: "spend", amountUsd: 40 }, root, now: NOW });
  assert.equal(treasury.netContribution, -40);
  assert.equal(treasury.availableCapital, 0);
  assert.equal(treasury.reservedCapital, 0);
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
  const requests = [];
  const live = createLiveResearchProvider({ endpoint: "https://api.search.brave.com/res/v1/web/search", credential: "configured-in-memory", fetchImpl: async (url, options) => {
    requests.push({ url: String(url), headers: options.headers });
    if (String(url).includes("api.search.brave.com")) return { ok: true, json: async () => ({ web: { results: [{ url: "https://public.example.test/page", title: "Public result", description: "A public company page." }] } }) };
    return { ok: true, headers: { get: () => null }, text: async () => "<title>Public page</title><p>This public company describes a recurring operational problem affecting its service delivery.</p>" };
  } });
  assert.equal((await live.search("test")).length, 1);
  assert.equal((await live.fetchPublicPage("https://public.example.test/page")).claims.length, 1);
  assert.equal(Object.hasOwn(live, "credential"), false);
  assert.equal(requests[1].headers["X-Subscription-Token"], undefined, "search credentials must never be sent to fetched public pages");
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

test("protected validation action classes cannot be mislabeled as read-only", async () => {
  const { root } = await wokenFixture();
  const opportunityPath = ".codex/opportunity/opportunities/opportunity-company-b-quote-follow-up.json";
  const opportunity = JSON.parse(readFileSync(path.join(root, opportunityPath), "utf8"));
  writeFileSync(path.join(root, opportunityPath), `${JSON.stringify({ ...opportunity, validationActionClass: "outreach" }, null, 2)}\n`);
  const experiment = createValidationExperimentForOpportunity({ opportunityId: opportunity.opportunityId, root, now: NOW });
  assert.equal(experiment.actionClass, "outreach");
  assert.equal(experiment.requiresOwnerApproval, true);
  assert.equal(experiment.mayExecuteWithoutOwnerDecision, false);
  writeFileSync(path.join(root, opportunityPath), `${JSON.stringify({ ...opportunity, validationActionClass: "external_change" }, null, 2)}\n`);
  assert.equal(createValidationExperimentForOpportunity({ opportunityId: opportunity.opportunityId, root, now: NOW }).requiresOwnerApproval, true);
});

test("snapshot truth flags derive only from persisted execution evidence", async () => {
  const { root } = await wokenFixture();
  const fixtureSnapshot = getOpportunityDirectorSnapshot({ root, now: NOW });
  assert.equal(fixtureSnapshot.truth.liveProviderUsed, false);
  const wakePath = path.join(root, ".codex/opportunity/wakes/live-proof.json");
  mkdirSync(path.dirname(wakePath), { recursive: true });
  writeFileSync(wakePath, `${JSON.stringify({ wakeId: "live-proof", completedAt: NOW.toISOString(), liveProviderUsed: true, externalActionExecuted: false })}\n`);
  const liveSnapshot = getOpportunityDirectorSnapshot({ root, now: NOW });
  assert.equal(liveSnapshot.truth.liveProviderUsed, true);
  assert.equal(liveSnapshot.truth.externalActionExecuted, false);
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
  assert.throws(() => writeOutcome({ outcome: { opportunityId: "x", type: "contacted" }, root, now: NOW }), /owner confirmation/);
  assert.equal(writeOutcome({ outcome: { opportunityId: "x", type: "contacted", ownerConfirmed: true, evidenceIds: ["owner-note"] }, root, now: NOW }).record.type, "contacted");
  assert.equal(writeOutcome({ outcome: { opportunityId: "x", type: "replied", ownerConfirmed: true, evidenceIds: ["owner-note"] }, root, now: NOW }).record.type, "replied");
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

test("mocked live discovery obeys query, result, page, candidate, and deep-research caps", async () => {
  const root = rootFixture(); createOpportunityDirector({ root, now: NOW });
  for (const [index, value] of ["dealership", "contractor", "dentist"].entries()) writeOwnerDiscoverySeed({ seed: { type: "industry", value, seedId: `seed-${index}` }, actorId: DEFAULT_OWNER_ID, root, now: NOW });
  const provider = mockLiveProvider();
  const result = await runOpportunityWake({ trigger: "owner_manual", researchProvider: provider, discoveryLimits: { maxBroadSearchQueries: 2, maxSearchResultsConsidered: 2, maxPagesFetched: 1, maxPagesForSynthesis: 1, maxCandidateOpportunities: 1, maxDeepResearchOpportunities: 1, maxMeaningfulCyclesPerDay: 3, minimumCycleIntervalMinutes: 480, duplicateDominanceRatio: 0.75 }, root, now: NOW });
  assert.ok(result.wake.queries.length <= 2);
  assert.equal(result.wake.queries.length, provider.calls.filter((call) => call.operation === "search").length);
  assert.equal(result.wake.resultsConsidered, 2);
  assert.equal(result.wake.pagesFetched, 1);
  assert.ok(result.opportunities.length <= 1);
  assert.equal(result.researchRuns.length, 7);
  assert.equal(result.wake.externalActionExecuted, false);
});

test("candidate and deep-research limits are enforced independently", async () => {
  const root = rootFixture(); createOpportunityDirector({ root, now: NOW });
  const result = await runOpportunityWake({
    trigger: "owner_manual", researchProvider: mockLiveProvider(), root, now: NOW,
    discoveryLimits: { maxCandidateOpportunities: 5, maxDeepResearchOpportunities: 2 },
    reasoningProvider: {
      name: "mock_synthesizer",
      synthesize: async ({ evidence }) => {
        assert.equal(JSON.parse(readFileSync(path.join(root, ".codex/opportunity/director.json"), "utf8")).scheduler.status, "synthesizing");
        return {
          model: "mock", costUsd: 0,
          candidates: Array.from({ length: 5 }, (_, index) => ({
          ...synthesisCandidate(evidence),
          title: `Evidence-backed problem ${index}`,
          organization: `Example Co ${index}`,
          problemHypothesis: `Example Co ${index} may benefit from a bounded validation.`
          }))
        };
      }
    }
  });
  assert.equal(result.opportunities.length, 5);
  assert.equal(result.researchRuns.length, 14, "only two candidates receive seven-role deep research");
});

test("owner-seeded discovery uses the same evidence pipeline and merges duplicate opportunities across wakes", async () => {
  const root = rootFixture(); createOpportunityDirector({ root, now: NOW });
  writeOwnerDiscoverySeed({ seed: { type: "company", value: "Example Dealership" }, actorId: DEFAULT_OWNER_ID, root, now: NOW });
  const provider = mockLiveProvider();
  const first = await runOpportunityWake({ trigger: "owner_manual", researchProvider: provider, root, now: NOW });
  const second = await runOpportunityWake({ trigger: "owner_manual", researchProvider: provider, root, now: new Date("2026-08-25T12:00:00.000Z") });
  assert.ok(first.wake.queries.some((query) => query.toLowerCase().includes("example dealership")));
  assert.equal(first.opportunities.length, 2);
  assert.equal(second.opportunities.length, 0, "unchanged source content must not create a duplicate candidate");
  assert.equal(getOpportunityDirectorSnapshot({ root, now: NOW }).opportunities.length, 2);
});

test("paid public research reserves and finalizes through global Cost OS", async () => {
  const root = rootFixture(); createOpportunityDirector({ root, now: NOW });
  const result = await runOpportunityWake({ trigger: "owner_manual", researchProvider: mockLiveProvider({ searchCostUsd: 0.02 }), researchApproval: { approvalId: "approval-mocked-public-research", maxUsd: 0.1 }, discoveryLimits: { maxBroadSearchQueries: 1 }, root, now: NOW });
  assert.equal(result.wake.researchCost, 0.02);
  const costFiles = readdirSync(path.join(root, ".codex", "costs")).filter((name) => name.startsWith("cost-ledger-paid-call-opportunity-search"));
  assert.equal(costFiles.length, 1);
  assert.equal(JSON.parse(readFileSync(path.join(root, ".codex", "costs", costFiles[0]), "utf8")).entries[0].costType, "actual");
});

test("live readiness requires exact paid approval and never returns credentials or the full approval", () => {
  const root = rootFixture();
  const approvalId = "approval-20260824-public-research";
  writeJson(root, `.codex/approvals/${approvalId}.json`, {
    approvalId, status: "approved", approvalKind: "standing", maxUses: 2,
    target: "public-research:brave-search", approvedActions: ["public_opportunity_research"],
    budget: { required: true, maxUsd: 0.25 }, expiresAt: "2026-08-25T12:00:00.000Z"
  });
  const credential = "test-secret-never-returned";
  const ready = evaluateOpportunityLiveReadiness({ root, now: NOW, env: {
    AG_OS_OPPORTUNITY_DISCOVERY_ENABLED: "true",
    AG_OS_OPPORTUNITY_SEARCH_ENDPOINT: "https://api.search.brave.com/res/v1/web/search",
    AG_OS_OPPORTUNITY_SEARCH_KEY: credential,
    AG_OS_OPPORTUNITY_SEARCH_COST_USD: "0.01",
    AG_OS_OPPORTUNITY_RESEARCH_APPROVAL_ID: approvalId,
    AG_OS_OPPORTUNITY_ANTHROPIC_ENABLED: "false"
  } });
  assert.equal(ready.ready, true);
  assert.equal(ready.approvalBudgetMaxUsd, 0.25);
  assert.equal(Object.hasOwn(ready, "approval"), false);
  assert.equal(JSON.stringify(ready).includes(credential), false);
  const blocked = evaluateOpportunityLiveReadiness({ root, now: NOW, env: {
    AG_OS_OPPORTUNITY_DISCOVERY_ENABLED: "true",
    AG_OS_OPPORTUNITY_SEARCH_ENDPOINT: "https://api.search.brave.com/res/v1/web/search",
    AG_OS_OPPORTUNITY_SEARCH_KEY: credential,
    AG_OS_OPPORTUNITY_SEARCH_COST_USD: "0.01",
    AG_OS_OPPORTUNITY_ANTHROPIC_ENABLED: "false"
  } });
  assert.equal(blocked.ready, false);
  assert.ok(blocked.blockers.some((item) => item.includes("exact approval")));
});

test("Opportunity synthesis requires its own exact Anthropic approval scope", () => {
  const root = rootFixture();
  const approvalId = "approval-20260824-opportunity-synthesis";
  const approval = {
    approvalId, status: "approved", approvalKind: "standing", maxUses: 2,
    target: "anthropic:messages-api", approvalRequiredFor: ["paid_actions"],
    approvedActions: ["anthropic_work_product_generation"], budget: { required: true, maxUsd: 0.15 },
    expiresAt: "2026-08-25T12:00:00.000Z"
  };
  writeJson(root, `.codex/approvals/${approvalId}.json`, approval);
  const env = {
    AG_OS_OPPORTUNITY_DISCOVERY_ENABLED: "true", AG_OS_OPPORTUNITY_SEARCH_ENDPOINT: "https://api.search.brave.com/res/v1/web/search", AG_OS_OPPORTUNITY_SEARCH_KEY: "test-only", AG_OS_OPPORTUNITY_SEARCH_COST_USD: "0",
    AG_OS_OPPORTUNITY_ANTHROPIC_ENABLED: "true", AG_OS_OPPORTUNITY_ANTHROPIC_APPROVAL_ID: approvalId,
    ANTHROPIC_API_KEY: "test-only", ANTHROPIC_MODEL: "fixture-model", ANTHROPIC_INPUT_COST_PER_MILLION_USD: "3", ANTHROPIC_OUTPUT_COST_PER_MILLION_USD: "15"
  };
  const wrongScope = evaluateOpportunityLiveReadiness({ root, env, now: NOW });
  assert.equal(wrongScope.ready, false);
  assert.ok(wrongScope.blockers.some((item) => item.includes("scope does not match")));
  writeJson(root, `.codex/approvals/${approvalId}.json`, { ...approval, approvedActions: ["anthropic_opportunity_synthesis"] });
  const ready = evaluateOpportunityLiveReadiness({ root, env, now: NOW });
  assert.equal(ready.ready, true);
  assert.equal(ready.anthropicReady, true);
  assert.equal(ready.anthropic.approvalBudgetMaxUsd, 0.15);
});

test("provider failure and timeout remain bounded and persist no invented opportunity", async () => {
  const failedRoot = rootFixture(); createOpportunityDirector({ root: failedRoot, now: NOW });
  const failed = await runOpportunityWake({ trigger: "owner_manual", researchProvider: mockLiveProvider({ failSearch: true }), root: failedRoot, now: NOW });
  assert.equal(failed.opportunities.length, 0);
  assert.equal(failed.wake.status, "skipped_no_change");
  const timed = createLiveResearchProvider({ endpoint: "https://api.search.brave.com/res/v1/web/search", credential: "memory-only", timeoutMs: 10, fetchImpl: async (_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true })) });
  await assert.rejects(() => timed.search("bounded timeout"), /timed out/);
});

test("source normalization rejects sensitive data and repeated same-publisher pages do not claim independence", async () => {
  assert.throws(() => normalizedEvidenceFromPage({ url: "https://public.example.test", title: "Bad", summary: "Customer id: 12345", claims: ["Contact private.person@example.test for the account."] }, { now: NOW }), /sensitive/);
  const root = rootFixture(); createOpportunityDirector({ root, now: NOW });
  const result = await runOpportunityWake({ trigger: "owner_manual", researchProvider: mockLiveProvider(), root, now: NOW });
  assert.equal(result.opportunities[0].scoreBreakdown.evidenceStrength, 5);
  assert.equal(getOpportunityDirectorSnapshot({ root, now: NOW }).truth.privateCustomerDataUsed, false);
});

test("duplicate-dominant search results stop additional queries while preserving unique evidence", async () => {
  const root = rootFixture(); createOpportunityDirector({ root, now: NOW });
  for (const value of ["one", "two", "three", "four", "five", "six"]) writeOwnerDiscoverySeed({ seed: { type: "industry", value }, actorId: DEFAULT_OWNER_ID, root, now: NOW });
  const provider = mockLiveProvider({ pages: [{ ...fixtureWorld.pages[0], sourceType: "public_web" }] });
  const result = await runOpportunityWake({ trigger: "owner_manual", researchProvider: provider, root, now: NOW });
  const searchCalls = provider.calls.filter((call) => call.operation === "search").length;
  assert.equal(result.discovery.stoppedForDuplicateDominance, true);
  assert.ok(searchCalls < 8);
  assert.equal(result.wake.queries.length, searchCalls);
  assert.equal(result.wake.pagesFetched, 1);
});

test("scheduler no-change ticks cost zero and due or stale-watch ticks run one bounded cycle", async () => {
  const root = rootFixture(); createOpportunityDirector({ root, now: NOW });
  const provider = mockLiveProvider();
  await runOpportunityWake({ trigger: "owner_manual", researchProvider: provider, root, now: NOW });
  const cheap = await runOpportunityDirectorSchedulerTick({ root, now: new Date("2026-08-24T13:00:00.000Z") });
  assert.equal(cheap.schedule.reason, "no_material_change");
  assert.equal(cheap.costUsd, 0);
  assert.equal(cheap.wake.modelCalls, 0);
  const due = await runOpportunityDirectorSchedulerTick({ root, provider, now: new Date("2026-08-24T21:00:00.000Z") });
  assert.equal(due.schedule.due, true);
  assert.equal(due.schedule.reason, "stale_watch");
  assert.ok(provider.calls.some((call) => call.operation === "search"));
});

test("owner confirmation is required before public people become known, warm, trusted, or introduction paths", () => {
  const root = rootFixture();
  writeNetworkPerson({ person: { personId: "person-public", name: "Public Person", organization: "Public Co", publicRole: "Operator", publicSourceUrls: ["https://public.example.test/person"], relationshipState: "identified", connectionSource: "public_professional", whyRelevant: "Public role is relevant", relatedOpportunityIds: [], ownerNotes: "", lastInteractionAt: null, nextFollowupAt: null, warmPathPersonIds: [], createdAt: NOW.toISOString(), updatedAt: NOW.toISOString() }, root });
  assert.throws(() => confirmNetworkRelationship({ personId: "person-public", relationshipState: "warm", actorId: "model", root, now: NOW }), /only the owner/);
  const confirmed = confirmNetworkRelationship({ personId: "person-public", relationshipState: "warm", introductionPersonIds: ["person-owner-known"], actorId: DEFAULT_OWNER_ID, root, now: NOW });
  assert.equal(confirmed.relationshipState, "warm");
  assert.equal(confirmed.connectionSource, "introduction");
});

test("schedule evaluation detects owner seeds, stale watches, and the daily cycle cap deterministically", () => {
  const snapshot = { recentWakes: [], opportunities: [] };
  assert.equal(evaluateOpportunitySchedule({ snapshot, seeds: [{ status: "active", createdAt: NOW.toISOString() }], now: NOW }).reason, "owner_seed");
  const capped = { recentWakes: [0, 1, 2].map((index) => ({ status: "complete", liveProviderUsed: true, queries: [`query-${index}`], pagesFetched: 1, completedAt: `2026-08-24T0${index}:00:00.000Z` })), opportunities: [] };
  assert.equal(evaluateOpportunitySchedule({ snapshot: capped, now: NOW }).reason, "daily_cycle_cap");
});

test("duplicate or no-new-evidence live cycles still throttle automatic research", () => {
  const recent = { recentWakes: [{ status: "skipped_no_change", liveProviderUsed: true, queries: ["public query"], pagesFetched: 1, completedAt: "2026-08-24T11:00:00.000Z" }], opportunities: [{ status: "watching", evidenceFreshAt: "2026-08-01T00:00:00.000Z" }] };
  assert.equal(evaluateOpportunitySchedule({ snapshot: recent, now: NOW }).reason, "no_material_change");
  const capped = { recentWakes: [0, 1, 2].map((index) => ({ status: "skipped_no_change", liveProviderUsed: true, queries: [`query-${index}`], pagesFetched: 1, completedAt: `2026-08-24T0${index}:00:00.000Z` })), opportunities: [] };
  assert.equal(evaluateOpportunitySchedule({ snapshot: capped, now: NOW }).reason, "daily_cycle_cap");
});

test("bounded synthesis cannot promote unsupported observed claims", async () => {
  const root = rootFixture(); createOpportunityDirector({ root, now: NOW });
  await assert.rejects(() => runOpportunityWake({
    trigger: "owner_manual", researchProvider: mockLiveProvider(), root, now: NOW,
    reasoningProvider: { name: "mock_synthesizer", synthesize: async ({ evidence }) => ({ model: "mock", costUsd: 0, candidates: [{ ...synthesisCandidate(evidence), observedClaims: ["This claim was not in any normalized source."] }] }) }
  }), /unsupported observed claim/);
  assert.equal(getOpportunityDirectorSnapshot({ root, now: NOW }).opportunities.length, 0);
});

test("Anthropic opportunity synthesis uses one reserved Cost OS call and records actual cost", async () => {
  const root = rootFixture();
  const evidence = [normalizedEvidenceFromPage({ ...fixtureWorld.pages[0], sourceType: "public_web" }, { now: NOW })];
  let requests = 0;
  const synthesizer = createAnthropicOpportunitySynthesizer({
    apiKey: "test-only", model: "fixture-model", approvalId: "approval-opportunity-synthesis", approvalMaxUsd: 0.15,
    inputCostPerMillionUsd: 3, outputCostPerMillionUsd: 15, root,
    fetchImpl: async (_url, request) => {
      requests += 1;
      const body = JSON.parse(request.body);
      assert.equal(body.output_config.format.name, "opportunity_candidates");
      return { ok: true, json: async () => ({ model: "fixture-model", stop_reason: "end_turn", usage: { input_tokens: 100, output_tokens: 50 }, content: [{ type: "text", text: JSON.stringify({ candidates: [synthesisCandidate(evidence)] }) }] }) };
    }
  });
  const result = await synthesizer.synthesize({ objective: "Find a bounded opportunity", evidence, maxCandidates: 1 });
  assert.equal(requests, 1);
  assert.equal(result.candidates.length, 1);
  assert.equal(result.costUsd, 0.00105);
  const ledgerName = readdirSync(path.join(root, ".codex", "costs")).find((name) => name.startsWith("cost-ledger-anthropic-call-opportunity-synthesis"));
  const ledger = JSON.parse(readFileSync(path.join(root, ".codex", "costs", ledgerName), "utf8"));
  assert.equal(ledger.entries[0].costType, "actual");
  assert.equal(ledger.summary.actualTaskCostUsd, 0.00105);
});

test("accepted truncated Opportunity synthesis calls consume conservative estimated cost", async () => {
  const root = rootFixture();
  const evidence = [normalizedEvidenceFromPage({ ...fixtureWorld.pages[0], sourceType: "public_web" }, { now: NOW })];
  const synthesizer = createAnthropicOpportunitySynthesizer({
    apiKey: "test-only", model: "fixture-model", approvalId: "approval-opportunity-truncated", approvalMaxUsd: 0.15,
    inputCostPerMillionUsd: 3, outputCostPerMillionUsd: 15, root,
    fetchImpl: async () => ({ ok: true, json: async () => ({ model: "fixture-model", stop_reason: "max_tokens", usage: { input_tokens: 20, output_tokens: 3000 }, content: [] }) })
  });
  await assert.rejects(() => synthesizer.synthesize({ objective: "Find a bounded opportunity", evidence, maxCandidates: 1 }), /max_tokens/);
  const ledgerName = readdirSync(path.join(root, ".codex", "costs")).find((name) => name.startsWith("cost-ledger-anthropic-call-opportunity-synthesis"));
  const ledger = JSON.parse(readFileSync(path.join(root, ".codex", "costs", ledgerName), "utf8"));
  assert.equal(ledger.entries[0].costType, "actual");
  assert.equal(ledger.summary.billingReconciled, false);
  assert.equal(ledger.entries[0].amountUsd, ledger.summary.estimatedTaskCostUsd);
});
