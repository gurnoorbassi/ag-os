import { createHash, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { DEFAULT_OWNER_ID, isoTimestamp, listDirectJson, readJson, slugify, writeJson } from "./common.mjs";
import { createMission } from "./mission-runtime.mjs";
import {
  OPPORTUNITY_CONSTITUTION_HASH,
  OPPORTUNITY_CONSTITUTION_VERSION,
  assertConstitutionReference,
  assertTacticalRuleBoundary
} from "./opportunity-constitution.mjs";
import { normalizedEvidenceFromPage, runDeterministicResearchWorker } from "./opportunity-research.mjs";
import { DEFAULT_DISCOVERY_LIMITS, discoveryInputHash, executePublicDiscovery } from "./opportunity-discovery.mjs";

export const OPPORTUNITY_TYPES = Object.freeze([
  "revenue_client", "business_problem", "strategic_relationship", "partnership", "market", "product",
  "business_build", "distribution", "reputation_content", "technology_shift", "internal_ag_bottleneck"
]);

export const OPPORTUNITY_STATUSES = Object.freeze([
  "discovered", "researching", "qualified", "watching", "validation_ready", "validating", "active",
  "won", "lost", "killed", "archived"
]);

export const OPPORTUNITY_SCORE_MAXIMA = Object.freeze({
  painSeverity: 20,
  potentialEconomicValue: 20,
  evidenceStrength: 15,
  reachabilityAccess: 15,
  agCapabilityFit: 10,
  validationSpeedCost: 10,
  competitiveWhitespace: 5,
  networkReputationValue: 5
});

export const DEFAULT_RESEARCH_LIMITS = Object.freeze({
  directorReasoningWakeUsd: 0.15,
  researchRunUsd: 0.5,
  deepInvestigationUsd: 1.5
});

const ROOT = ".codex/opportunity";
const PATHS = Object.freeze({
  director: `${ROOT}/director.json`,
  evidence: `${ROOT}/evidence`,
  opportunities: `${ROOT}/opportunities`,
  researchRuns: `${ROOT}/research-runs`,
  signals: `${ROOT}/signals`,
  people: `${ROOT}/people`,
  experiments: `${ROOT}/experiments`,
  outcomes: `${ROOT}/outcomes`,
  rules: `${ROOT}/tactical-rules`,
  decisions: `${ROOT}/decisions`,
  wakes: `${ROOT}/wakes`,
  briefs: `${ROOT}/briefs`,
  treasury: `${ROOT}/treasury`,
  missionLinks: `${ROOT}/mission-links`,
  seeds: `${ROOT}/seeds`
});

function bounded(value, maximum, label) {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number)) throw new Error(`${label} must be a finite number`);
  return Math.max(0, Math.min(maximum, number));
}

function money(value) {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number) || number < 0) throw new Error("money values must be finite and non-negative");
  return Number(number.toFixed(6));
}

function signedMoney(value) {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number)) throw new Error("signed money values must be finite");
  return Number(number.toFixed(6));
}

function recordList(directory, root) {
  return listDirectJson(directory, { root }).map((recordPath) => ({ recordPath, record: readJson(recordPath, root) }));
}

function writeRecord(directory, id, record, root) {
  const filePath = `${directory}/${slugify(id)}.json`;
  writeJson(filePath, record, root);
  return { filePath, record };
}

function stableHash(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function stableOpportunityKey(record) {
  return [record.type, record.organization || record.market, record.problemHypothesis]
    .map((value) => slugify(value || "unspecified"))
    .join(":");
}

function nextId(prefix, now, seed = randomUUID().slice(0, 8)) {
  return `${prefix}-${now.toISOString().replace(/[^0-9]/g, "").slice(0, 14)}-${slugify(seed)}`;
}

function activeCostLimits(root) {
  const budgetPath = ".codex/costs/budget.json";
  if (!existsSync(path.join(root, budgetPath))) return { monthlyMaxUsd: 0, dailyMaxUsd: 0, perTaskMaxUsd: 0 };
  return readJson(budgetPath, root).limits;
}

function securityBoundaryPresent(root) {
  const policyPath = ".codex/security/policy.json";
  if (!existsSync(path.join(root, policyPath))) throw new Error("Security OS policy is required");
  const policy = readJson(policyPath, root);
  if (policy.rules?.credentialsAllowed !== false || policy.rules?.productionCustomerDataAllowed !== false) {
    throw new Error("Opportunity Director requires fail-closed credentials and production-data policy");
  }
  return true;
}

export function createOpportunityDirector({
  objective = "Find and develop high-value legitimate opportunities for AG Digitalz.",
  root = process.cwd(),
  now = new Date()
} = {}) {
  securityBoundaryPresent(root);
  const timestamp = isoTimestamp(now);
  const existing = existsSync(path.join(root, PATHS.director)) ? readJson(PATHS.director, root) : null;
  if (existing) {
    const current = assertConstitutionReference(existing);
    const normalized = {
      ...current,
      strategyVersion: current.strategyVersion === "1.0.0" ? "1.1.0" : current.strategyVersion,
      discoveryLimits: current.discoveryLimits || DEFAULT_DISCOVERY_LIMITS,
      scheduler: current.scheduler || {
        enabled: true,
        status: "idle",
        maximumMeaningfulCyclesPerDay: DEFAULT_DISCOVERY_LIMITS.maxMeaningfulCyclesPerDay,
        minimumCycleIntervalMinutes: DEFAULT_DISCOVERY_LIMITS.minimumCycleIntervalMinutes
      }
    };
    if (JSON.stringify(normalized) !== JSON.stringify(current)) writeJson(PATHS.director, normalized, root);
    return normalized;
  }
  const record = {
    directorId: "opportunity-director-ag-digitalz-v1",
    name: "Opportunity Director",
    status: "active",
    objective: String(objective).trim(),
    objectiveControlledBy: DEFAULT_OWNER_ID,
    constitutionVersion: OPPORTUNITY_CONSTITUTION_VERSION,
    constitutionHash: OPPORTUNITY_CONSTITUTION_HASH,
    strategyVersion: "1.1.0",
    createdAt: timestamp,
    updatedAt: timestamp,
    lastWakeAt: null,
    lastReasoningWakeAt: null,
    wakeCount: 0,
    currentFocus: "Waiting for evidence-backed signals",
    currentTheses: [],
    scoreWeights: OPPORTUNITY_SCORE_MAXIMA,
    researchLimits: DEFAULT_RESEARCH_LIMITS,
    discoveryLimits: DEFAULT_DISCOVERY_LIMITS,
    modelConfig: { provider: "deterministic_fixture", liveProviderEnabled: false, maximumReasoningCyclesPerWake: 1 },
    scheduler: { enabled: true, status: "idle", maximumMeaningfulCyclesPerDay: DEFAULT_DISCOVERY_LIMITS.maxMeaningfulCyclesPerDay, minimumCycleIntervalMinutes: DEFAULT_DISCOVERY_LIMITS.minimumCycleIntervalMinutes },
    treasuryId: "opportunity-treasury-v1",
    lastInputHash: null,
    safeguards: {
      canChangeConstitution: false,
      canWeakenCostOs: false,
      canWeakenSecurityOs: false,
      canSelfApprove: false,
      canExecuteExternalActions: false,
      canMoveRealMoney: false
    }
  };
  writeJson(PATHS.director, record, root);
  initializeTreasury({ treasuryId: record.treasuryId, root, now });
  return record;
}

export function updateDirectorObjective({ objective, actorId, root = process.cwd(), now = new Date() }) {
  if (actorId !== DEFAULT_OWNER_ID) throw new Error("only the owner can change the Opportunity Director objective");
  const current = assertConstitutionReference(readJson(PATHS.director, root));
  const updated = { ...current, objective: String(objective || "").trim(), updatedAt: isoTimestamp(now) };
  if (!updated.objective) throw new Error("objective is required");
  assertConstitutionReference(updated);
  writeJson(PATHS.director, updated, root);
  return updated;
}

export function applyDirectorModelPatch({ patch, root = process.cwd(), now = new Date() }) {
  const forbidden = new Set(["constitutionVersion", "constitutionHash", "objective", "objectiveControlledBy", "safeguards", "researchLimits"]);
  if (Object.keys(patch || {}).some((key) => forbidden.has(key))) throw new Error("model output cannot change Constitution, owner objective, safeguards, or Cost OS subordinate limits");
  const current = assertConstitutionReference(readJson(PATHS.director, root));
  const allowed = ["currentFocus", "currentTheses", "strategyVersion"];
  const updates = Object.fromEntries(Object.entries(patch || {}).filter(([key]) => allowed.includes(key)));
  const updated = { ...current, ...updates, updatedAt: isoTimestamp(now) };
  assertConstitutionReference(updated);
  writeJson(PATHS.director, updated, root);
  return updated;
}

export function scoreOpportunity(inputs = {}) {
  const breakdown = Object.fromEntries(Object.entries(OPPORTUNITY_SCORE_MAXIMA).map(([key, maximum]) => [key, bounded(inputs[key], maximum, key)]));
  const total = Number(Object.values(breakdown).reduce((sum, value) => sum + value, 0).toFixed(2));
  return { score: Math.min(100, total), scoreBreakdown: breakdown, deterministic: true, maximum: 100 };
}

export function economicModel({ lowValueUsd = 0, baseValueUsd = 0, highValueUsd = 0, probabilityProblemReal = 0, probabilityReachable = 0, probabilityValidationSucceeds = 0, estimatedValidationSpendUsd = 0, ownerHours = 0, assumptions = [] } = {}) {
  const low = money(lowValueUsd);
  const base = money(baseValueUsd);
  const high = money(highValueUsd);
  if (!(low <= base && base <= high)) throw new Error("economic range must satisfy low <= base <= high");
  if (!Array.isArray(assumptions) || assumptions.length === 0) throw new Error("economic estimates require explicit assumptions");
  const pProblem = bounded(probabilityProblemReal, 1, "probabilityProblemReal");
  const pReachable = bounded(probabilityReachable, 1, "probabilityReachable");
  const pValidate = bounded(probabilityValidationSucceeds, 1, "probabilityValidationSucceeds");
  const spend = money(estimatedValidationSpendUsd);
  const hours = money(ownerHours);
  const expectedValueUsd = Number((base * pProblem * pReachable * pValidate - spend).toFixed(2));
  return {
    lowValueUsd: low,
    baseValueUsd: base,
    highValueUsd: high,
    probabilityProblemReal: pProblem,
    probabilityReachable: pReachable,
    probabilityValidationSucceeds: pValidate,
    estimatedValidationSpendUsd: spend,
    ownerHours: hours,
    expectedValueUsd,
    expectedValuePerValidationDollar: spend > 0 ? Number((expectedValueUsd / spend).toFixed(2)) : null,
    expectedValuePerOwnerHour: hours > 0 ? Number((expectedValueUsd / hours).toFixed(2)) : null,
    assumptions: assumptions.map(String),
    classification: "estimate_not_fact"
  };
}

export function writeEvidence({ evidence, root = process.cwd() }) {
  if (!evidence?.evidenceId || !evidence?.contentHash || !Array.isArray(evidence.relevantClaims)) throw new Error("valid normalized evidence is required");
  if (evidence.relevantClaims.some((claim) => claim.kind !== "observed")) throw new Error("verified evidence may contain observed factual claims only");
  return writeRecord(PATHS.evidence, evidence.evidenceId, evidence, root);
}

export function writeOpportunity({ opportunity, root = process.cwd() }) {
  if (!OPPORTUNITY_TYPES.includes(opportunity?.type)) throw new Error("opportunity type is invalid");
  if (!OPPORTUNITY_STATUSES.includes(opportunity?.status)) throw new Error("opportunity status is invalid");
  if (!opportunity.opportunityId || !opportunity.title || !opportunity.problemHypothesis) throw new Error("opportunity identity, title, and hypothesis are required");
  if (!Array.isArray(opportunity.observations) || opportunity.observations.some((item) => item.kind !== "observed" || !item.evidenceId)) {
    throw new Error("opportunity observations must be evidence-backed observed claims");
  }
  if (!Array.isArray(opportunity.assumptions) || opportunity.assumptions.some((item) => item.kind !== "hypothesis" && item.kind !== "estimate")) {
    throw new Error("opportunity assumptions must stay explicitly classified as hypotheses or estimates");
  }
  const scored = scoreOpportunity(opportunity.scoreBreakdown || {});
  const record = { ...opportunity, score: scored.score, scoreBreakdown: scored.scoreBreakdown };
  return writeRecord(PATHS.opportunities, record.opportunityId, record, root);
}

export function dedupeOpportunities(opportunities) {
  const merged = new Map();
  for (const opportunity of opportunities) {
    const key = stableOpportunityKey(opportunity);
    const prior = merged.get(key);
    if (!prior) { merged.set(key, structuredClone(opportunity)); continue; }
    const evidenceIds = [...new Set([...(prior.evidenceIds || []), ...(opportunity.evidenceIds || [])])];
    const observations = [...prior.observations];
    for (const observation of opportunity.observations || []) if (!observations.some((item) => item.statement === observation.statement && item.evidenceId === observation.evidenceId)) observations.push(observation);
    merged.set(key, {
      ...prior,
      evidenceIds,
      observations,
      confidence: Math.max(prior.confidence, opportunity.confidence),
      updatedAt: [prior.updatedAt, opportunity.updatedAt].sort().at(-1),
      deduplicatedFrom: [...new Set([...(prior.deduplicatedFrom || [prior.opportunityId]), opportunity.opportunityId])]
    });
  }
  return [...merged.values()];
}

export function decayedSignalConfidence(signal, now = new Date()) {
  const base = bounded(signal?.confidence, 100, "signal confidence");
  const observed = Date.parse(signal?.observedAt || "");
  const expiry = Date.parse(signal?.expiresAt || "");
  if (!Number.isFinite(observed) || !Number.isFinite(expiry) || expiry <= observed) throw new Error("signal requires a valid observedAt and expiresAt range");
  if (now.getTime() >= expiry) return 0;
  if (now.getTime() <= observed) return base;
  const remaining = (expiry - now.getTime()) / (expiry - observed);
  return Number((base * remaining).toFixed(2));
}

export function writeSignal({ signal, root = process.cwd() }) {
  if (!signal?.signalId || !signal.type || !signal.entity || !Array.isArray(signal.evidenceIds) || signal.evidenceIds.length === 0) throw new Error("signal identity, entity, and evidence are required");
  decayedSignalConfidence(signal, new Date(signal.observedAt));
  return writeRecord(PATHS.signals, signal.signalId, signal, root);
}

export function writeNetworkPerson({ person, root = process.cwd() }) {
  const states = ["unknown", "identified", "contacted", "known", "warm", "trusted"];
  const sources = ["owner_entered", "public_professional", "introduction"];
  if (!person?.personId || !person.name || !states.includes(person.relationshipState) || !sources.includes(person.connectionSource)) throw new Error("network person record is invalid");
  if (["known", "warm", "trusted"].includes(person.relationshipState) && person.ownerConfirmed !== true) throw new Error("known, warm, and trusted relationships require owner confirmation");
  if (person.connectionSource === "introduction" && person.ownerConfirmed !== true) throw new Error("introduction paths require owner confirmation");
  if ((person.warmPathPersonIds || []).length > 0 && person.ownerConfirmed !== true) throw new Error("warm paths cannot be fabricated");
  return writeRecord(PATHS.people, person.personId, { ...person, sensitivePersonalData: false }, root);
}

export function confirmNetworkRelationship({ personId, relationshipState, introductionPersonIds = [], actorId, root = process.cwd(), now = new Date() }) {
  if (actorId !== DEFAULT_OWNER_ID) throw new Error("only the owner can confirm network relationships");
  if (!["contacted", "known", "warm", "trusted"].includes(relationshipState)) throw new Error("relationship confirmation state is invalid");
  const filePath = `${PATHS.people}/${slugify(personId)}.json`;
  const person = readJson(filePath, root);
  const updated = {
    ...person,
    relationshipState,
    ownerConfirmed: true,
    connectionSource: introductionPersonIds.length ? "introduction" : person.connectionSource,
    warmPathPersonIds: [...new Set(introductionPersonIds)],
    updatedAt: isoTimestamp(now)
  };
  writeNetworkPerson({ person: updated, root });
  return updated;
}

export function writeOwnerDiscoverySeed({ seed, actorId, root = process.cwd(), now = new Date() }) {
  if (actorId !== DEFAULT_OWNER_ID) throw new Error("only the owner can seed Opportunity Director discovery");
  const types = ["company", "person", "industry", "problem", "url", "observation", "idea"];
  if (!types.includes(seed?.type)) throw new Error("owner discovery seed type is invalid");
  const value = String(seed.value || "").trim();
  if (value.length < 2 || value.length > 500) throw new Error("owner discovery seed must be 2 to 500 characters");
  if (seed.type === "url") {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) throw new Error("owner discovery URL must be public HTTPS");
  }
  const seedId = seed.seedId || nextId("opportunity-seed", now, `${seed.type}-${stableHash(value).slice(0, 10)}`);
  const record = { seedId, type: seed.type, value, status: "active", ownerId: actorId, createdAt: isoTimestamp(now), updatedAt: isoTimestamp(now), privateCustomerDataUsed: false };
  return writeRecord(PATHS.seeds, seedId, record, root).record;
}

export function initializeTreasury({ treasuryId = "opportunity-treasury-v1", startingCapital = 0, root = process.cwd(), now = new Date() } = {}) {
  const filePath = `${PATHS.treasury}/${slugify(treasuryId)}.json`;
  if (existsSync(path.join(root, filePath))) return readJson(filePath, root);
  const capital = money(startingCapital);
  const record = {
    treasuryId,
    currency: "USD",
    startingCapital: capital,
    availableCapital: capital,
    reservedCapital: 0,
    spentCapital: 0,
    revenueAttributed: 0,
    netContribution: 0,
    executionMode: "simulation_only",
    realMoneyMovementAdapter: null,
    transactions: [],
    createdAt: isoTimestamp(now),
    updatedAt: isoTimestamp(now)
  };
  writeJson(filePath, record, root);
  return record;
}

export function applyTreasuryTransaction({ transaction, root = process.cwd(), now = new Date() }) {
  const director = assertConstitutionReference(readJson(PATHS.director, root));
  const filePath = `${PATHS.treasury}/${slugify(director.treasuryId)}.json`;
  const treasury = readJson(filePath, root);
  const types = ["proposal", "reservation", "spend", "refund", "revenue", "writeoff"];
  if (!types.includes(transaction?.type)) throw new Error("treasury transaction type is invalid");
  if (transaction.realMoneyMoved === true || transaction.executionMode && transaction.executionMode !== "simulation_only") throw new Error("Opportunity Director V1 treasury cannot move real money");
  const amount = money(transaction.amountUsd);
  const next = structuredClone(treasury);
  if (transaction.type === "reservation") {
    if (next.availableCapital < amount) throw new Error("treasury cannot go negative");
    next.availableCapital -= amount; next.reservedCapital += amount;
  } else if (transaction.type === "spend") {
    if (next.reservedCapital < amount) throw new Error("treasury cannot spend unreserved capital or go negative");
    next.reservedCapital -= amount; next.spentCapital += amount;
  } else if (transaction.type === "refund") {
    if (next.spentCapital < amount) throw new Error("refund exceeds simulated spend");
    next.spentCapital -= amount; next.availableCapital += amount;
  } else if (transaction.type === "revenue") {
    if (transaction.ownerConfirmed !== true || !(transaction.evidenceIds || []).length) throw new Error("revenue requires owner confirmation and evidence");
    next.revenueAttributed += amount; next.availableCapital += amount;
  } else if (transaction.type === "writeoff") {
    if (next.reservedCapital < amount) throw new Error("writeoff exceeds reserved capital");
    next.reservedCapital -= amount; next.spentCapital += amount;
  }
  next.availableCapital = money(next.availableCapital);
  next.reservedCapital = money(next.reservedCapital);
  next.spentCapital = money(next.spentCapital);
  next.revenueAttributed = money(next.revenueAttributed);
  next.netContribution = signedMoney(next.revenueAttributed - next.spentCapital);
  next.transactions.push({
    transactionId: transaction.transactionId || nextId("treasury-transaction", now),
    ...transaction,
    amountUsd: amount,
    executionMode: "simulation_only",
    realMoneyMoved: false,
    createdAt: isoTimestamp(now)
  });
  next.updatedAt = isoTimestamp(now);
  writeJson(filePath, next, root);
  return next;
}

export function writeExperiment({ experiment, root = process.cwd() }) {
  if (!experiment?.experimentId || !experiment.opportunityId || !experiment.hypothesis || !experiment.successMetric || !experiment.stopConditions?.length) throw new Error("experiment requires hypothesis, metric, and stop conditions");
  const protectedActions = ["outreach", "publish", "paid_ad", "contract", "account_creation", "external_change"];
  const requiresOwnerApproval = protectedActions.includes(experiment.actionClass);
  return writeRecord(PATHS.experiments, experiment.experimentId, {
    ...experiment,
    budgetCap: money(experiment.budgetCap),
    cost: money(experiment.cost || 0),
    requiresOwnerApproval,
    mayExecuteWithoutOwnerDecision: !requiresOwnerApproval && experiment.actionClass === "read_only_research",
    externalActionExecuted: false
  }, root);
}

export function writeOutcome({ outcome, root = process.cwd(), now = new Date() }) {
  const types = ["no_signal", "positive_signal", "contacted", "replied", "conversation", "meeting", "proposal", "won", "lost", "revenue", "introduction", "relationship_formed", "experiment_success", "experiment_failure", "invalid_hypothesis"];
  if (!types.includes(outcome?.type) || !outcome.opportunityId) throw new Error("opportunity outcome is invalid");
  const factual = ["contacted", "replied", "conversation", "meeting", "proposal", "won", "revenue", "introduction", "relationship_formed"];
  if (factual.includes(outcome.type) && (outcome.ownerConfirmed !== true || !(outcome.evidenceIds || []).length)) throw new Error(`${outcome.type} requires owner confirmation and evidence`);
  const record = {
    outcomeId: outcome.outcomeId || nextId("opportunity-outcome", now),
    experimentId: null,
    valueUsd: outcome.valueUsd == null ? null : money(outcome.valueUsd),
    evidenceIds: [],
    ownerConfirmed: false,
    ...outcome,
    createdAt: outcome.createdAt || isoTimestamp(now)
  };
  return writeRecord(PATHS.outcomes, record.outcomeId, record, root);
}

export function buildTacticalRule({ statement, scope, supportingOutcomeIds = [], contradictingOutcomeIds = [], ownerAccepted = false, independenceGroups = [], now = new Date() }) {
  assertTacticalRuleBoundary(statement);
  const enoughEvidence = new Set(independenceGroups).size >= 2 && supportingOutcomeIds.length >= 2;
  return {
    ruleId: nextId("opportunity-rule", now, statement),
    statement: String(statement).trim(),
    scope,
    status: ownerAccepted || enoughEvidence ? "active" : "candidate",
    supportingOutcomeIds: [...new Set(supportingOutcomeIds)],
    contradictingOutcomeIds: [...new Set(contradictingOutcomeIds)],
    confidence: ownerAccepted ? 90 : enoughEvidence ? 70 : Math.min(49, supportingOutcomeIds.length * 20),
    activationReason: ownerAccepted ? "explicit_owner_acceptance" : enoughEvidence ? "multiple_independent_outcomes" : "insufficient_evidence_candidate",
    canOverrideConstitution: false,
    canOverrideSecurity: false,
    canOverrideCost: false,
    canOverrideApprovals: false,
    globalMemoryPromotionRequired: true,
    createdAt: isoTimestamp(now),
    lastEvaluatedAt: isoTimestamp(now),
    expiresOrReviewAt: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString()
  };
}

export function writeTacticalRule({ rule, root = process.cwd() }) {
  assertTacticalRuleBoundary(rule?.statement);
  return writeRecord(PATHS.rules, rule.ruleId, rule, root);
}

export function createOpportunityDecision({ wakeId, decisionType, subjectId, summary, evidenceIds = [], alternativesConsidered = [], chosenAction, reasonSummary, scoreBefore = null, scoreAfter = null, confidence, estimatedCost = 0, actualCost = null, root = process.cwd(), now = new Date() }) {
  if (!wakeId || !decisionType || !subjectId || !summary || !chosenAction || !reasonSummary) throw new Error("decision journal record is incomplete");
  const record = {
    decisionId: nextId("opportunity-decision", now, `${decisionType}-${subjectId}`), wakeId, decisionType, subjectId, summary,
    evidenceIds, alternativesConsidered, chosenAction, reasonSummary, scoreBefore, scoreAfter,
    confidence: bounded(confidence, 100, "decision confidence"), estimatedCost: money(estimatedCost), actualCost: actualCost == null ? null : money(actualCost),
    createdAt: isoTimestamp(now), privateChainOfThoughtStored: false
  };
  return writeRecord(PATHS.decisions, record.decisionId, record, root).record;
}

function opportunityFromEntity({ entity, evidence, researchRuns, now }) {
  const observations = evidence.flatMap((item) => item.relevantClaims.map((claim) => ({ ...claim, evidenceId: item.evidenceId })));
  const score = scoreOpportunity(entity.scoreInputs);
  const skeptic = researchRuns.find((run) => run.role === "skeptic");
  const confidenceBeforeSkeptic = bounded(entity.confidence ?? 50, 100, "confidence");
  const skepticDowngrade = bounded(entity.skepticDowngrade ?? skeptic?.estimates?.confidenceDowngrade ?? 0, 100, "skeptic downgrade");
  const confidence = Math.max(0, confidenceBeforeSkeptic - skepticDowngrade);
  let status = entity.forceKill || score.score < 40 ? "killed" : score.score >= 70 && evidence.length >= 2 && entity.cheapestValidation ? "validation_ready" : "watching";
  if (entity.status && OPPORTUNITY_STATUSES.includes(entity.status)) status = entity.status;
  return {
    opportunityId: entity.opportunityId || `opportunity-${slugify(entity.title)}`,
    projectId: entity.projectId || "project-one-off",
    type: entity.type,
    title: entity.title,
    summary: entity.summary,
    status,
    organization: entity.organization || null,
    market: entity.market || null,
    problemHypothesis: entity.problemHypothesis,
    observations,
    hypotheses: entity.assumptions || [],
    assumptions: (entity.assumptions || []).map((statement) => ({ kind: "hypothesis", statement })),
    signals: entity.signals || [],
    evidenceIds: evidence.map((item) => item.evidenceId),
    score: score.score,
    scoreBreakdown: score.scoreBreakdown,
    confidence,
    confidenceBeforeSkeptic,
    skepticDowngrade,
    economicModel: economicModel(entity.economicModel),
    reachability: entity.reachability || "unknown",
    strategicFit: entity.strategicFit || "unassessed",
    networkValue: bounded(entity.networkValue, 5, "networkValue"),
    reputationValue: bounded(entity.reputationValue, 5, "reputationValue"),
    potentialScale: entity.potentialScale || "unassessed",
    networkLeverage: entity.networkLeverage || "unassessed",
    repeatability: entity.repeatability || "unassessed",
    distributionLeverage: entity.distributionLeverage || "unassessed",
    learningValue: entity.learningValue || "unassessed",
    cheapestValidation: entity.cheapestValidation || null,
    validationActionClass: entity.validationActionClass || "read_only_research",
    softwareValidationRequested: entity.softwareValidationRequested === true,
    validationCommands: entity.validationCommands || ["npm test"],
    estimatedValidationCost: money(entity.estimatedValidationCost || 0),
    estimatedDaysToSignal: Number(entity.estimatedDaysToSignal || 0),
    stopConditions: entity.stopConditions || [],
    recommendedNextAction: status === "killed" ? "Do not pursue without materially new evidence." : entity.recommendedNextAction,
    relatedPeople: entity.people?.map((person) => person.personId) || [],
    relatedOpportunities: [],
    researchRunIds: researchRuns.map((run) => run.researchRunId),
    researchSpendUsd: money(researchRuns.reduce((sum, run) => sum + Number(run.costUsd || 0), 0) + Number(entity.allocatedResearchCostUsd || 0)),
    provenance: evidence.some((item) => item.provenance === "live_public_research") ? "live_public_research" : "fixture",
    sourceUrls: [...new Set(evidence.map((item) => item.sourceUrl))],
    evidenceFreshAt: evidence.map((item) => item.fetchedAt || item.capturedAt).filter(Boolean).sort().at(-1) || isoTimestamp(now),
    createdAt: isoTimestamp(now),
    updatedAt: isoTimestamp(now)
  };
}

async function runPublicDiscoveryWake({ trigger, director, researchProvider, synthesisProvider, researchApproval, discoveryLimits, root, now, signal }) {
  const timestamp = isoTimestamp(now);
  const seeds = recordList(PATHS.seeds, root).map(({ record }) => record).filter((item) => item.status === "active");
  const existingOpportunities = recordList(PATHS.opportunities, root).map(({ record }) => record);
  const existingEvidence = recordList(PATHS.evidence, root).map(({ record }) => record);
  const inputHash = discoveryInputHash({ objective: director.objective, theses: director.currentTheses, seeds: seeds.map(({ type, value }) => ({ type, value })), watches: existingOpportunities.filter((item) => item.status === "watching").map(({ opportunityId, updatedAt }) => ({ opportunityId, updatedAt })) });
  const wakeId = nextId("opportunity-wake", now, `${trigger}-${inputHash.slice(0, 8)}`);
  writeRecord(PATHS.wakes, wakeId, {
    wakeId, startedAt: timestamp, trigger, inputsChanged: [inputHash], providerMode: researchProvider.mode, provider: researchProvider.name || researchProvider.mode,
    queries: [], pagesFetched: 0, modelUsed: null, modelCalls: 0, modelCost: 0, researchCost: 0, decisions: [], opportunitiesCreated: [], opportunitiesKilled: [], proposalsCreated: [], researchRunsStarted: [],
    status: "researching", liveProviderUsed: researchProvider.mode === "live_read_only", externalActionExecuted: false, privateCustomerDataUsed: false, completedAt: null
  }, root);
  writeJson(PATHS.director, { ...director, scheduler: { ...(director.scheduler || {}), status: "researching" }, updatedAt: timestamp }, root);
  try {
    const discovery = await executePublicDiscovery({
      director,
      provider: researchProvider,
      synthesisProvider,
      existingOpportunities,
      existingEvidence,
      seeds,
      limits: discoveryLimits || director.discoveryLimits || DEFAULT_DISCOVERY_LIMITS,
      approval: researchApproval,
      root,
      now,
      signal,
      onStage: (status) => writeJson(PATHS.director, { ...director, scheduler: { ...(director.scheduler || {}), status }, updatedAt: isoTimestamp(now) }, root)
    });
    for (const evidence of discovery.evidence) writeEvidence({ evidence, root });
    for (const run of discovery.researchRuns) writeRecord(PATHS.researchRuns, `${run.researchRunId}-${wakeId}`, { ...run, researchRunId: `${run.researchRunId}-${wakeId}`, providerMode: discovery.mode, liveProviderUsed: discovery.liveProviderUsed }, root);
    const allocatedResearchCostUsd = discovery.candidates.length ? (discovery.providerCostUsd + discovery.modelCostUsd) / discovery.candidates.length : 0;
    const candidateOpportunities = discovery.candidates.map((candidate) => {
      const evidence = candidate.evidenceIds.map((id) => discovery.evidence.find((item) => item.evidenceId === id)).filter(Boolean);
      const runs = discovery.researchRuns.filter((run) => run.entity === (candidate.organization || candidate.title));
      const opportunity = opportunityFromEntity({ entity: { ...candidate, allocatedResearchCostUsd }, evidence, researchRuns: runs, now });
      for (const person of candidate.people || []) {
        writeNetworkPerson({ person: {
          personId: `person-${slugify(`${person.name}-${person.organization}`)}`, name: person.name, organization: person.organization, publicRole: person.publicRole,
          publicSourceUrls: [...new Set(person.sourceUrls)], relationshipState: "identified", connectionSource: "public_professional", whyRelevant: person.whyRelevant,
          relatedOpportunityIds: [opportunity.opportunityId], ownerNotes: "", lastInteractionAt: null, nextFollowupAt: null, warmPathPersonIds: [], ownerConfirmed: false,
          createdAt: isoTimestamp(now), updatedAt: isoTimestamp(now)
        }, root });
      }
      return opportunity;
    });
    const opportunities = dedupeOpportunities([...existingOpportunities, ...candidateOpportunities]);
    const decisions = [];
    for (const opportunity of opportunities) {
      writeOpportunity({ opportunity, root });
      if (!candidateOpportunities.some((item) => stableOpportunityKey(item) === stableOpportunityKey(opportunity))) continue;
      const decisionType = opportunity.status === "killed" ? "kill" : opportunity.status === "validation_ready" ? "prepare_validation" : "watch";
      decisions.push(createOpportunityDecision({
        wakeId, decisionType, subjectId: opportunity.opportunityId, summary: `${opportunity.title} moved to ${opportunity.status}.`, evidenceIds: opportunity.evidenceIds,
        alternativesConsidered: ["research_deeper", "watch", "kill", "prepare_validation"], chosenAction: opportunity.status,
        reasonSummary: opportunity.status === "killed" ? "Public evidence, access, economics, or skeptic findings did not justify more work." : "Normalized public evidence, explicit assumptions, deterministic scoring, and skeptic findings support this state.",
        scoreBefore: null, scoreAfter: opportunity.score, confidence: opportunity.confidence, estimatedCost: opportunity.estimatedValidationCost, actualCost: opportunity.researchSpendUsd, root, now
      }));
    }
    const wake = {
      wakeId, startedAt: timestamp, trigger, inputsChanged: [inputHash], providerMode: discovery.mode, provider: discovery.provider,
      queries: discovery.queries, resultsConsidered: discovery.resultsConsidered, pagesFetched: discovery.pagesFetched, duplicateRatio: discovery.duplicateRatio,
      modelUsed: discovery.model, modelCalls: discovery.model ? 1 : 0, modelCost: discovery.modelCostUsd, researchCost: discovery.providerCostUsd,
      decisions: decisions.map((item) => item.decisionId), opportunitiesCreated: candidateOpportunities.map((item) => item.opportunityId), opportunitiesKilled: candidateOpportunities.filter((item) => item.status === "killed").map((item) => item.opportunityId),
      proposalsCreated: candidateOpportunities.filter((item) => item.status === "validation_ready").map((item) => `proposal-opportunity-validation-${slugify(item.opportunityId)}`),
      researchRunsStarted: discovery.researchRuns.map((item) => `${item.researchRunId}-${wakeId}`), failures: discovery.failures,
      status: discovery.evidence.length === 0 ? "skipped_no_change" : "complete", liveProviderUsed: discovery.liveProviderUsed, externalActionExecuted: false, privateCustomerDataUsed: false, completedAt: isoTimestamp(now)
    };
    writeRecord(PATHS.wakes, wakeId, wake, root);
    const ranked = opportunities.filter((item) => item.status !== "killed").sort((a, b) => b.score - a.score);
    writeJson(PATHS.director, {
      ...director, lastWakeAt: timestamp, lastReasoningWakeAt: wake.modelCalls ? timestamp : director.lastReasoningWakeAt, wakeCount: director.wakeCount + 1,
      currentFocus: ranked[0]?.title || director.currentFocus, currentTheses: ranked.slice(0, 5).map((item) => item.problemHypothesis), lastInputHash: inputHash,
      scheduler: { ...(director.scheduler || {}), status: "idle", lastMeaningfulCycleAt: discovery.evidence.length ? timestamp : director.scheduler?.lastMeaningfulCycleAt || null }, updatedAt: timestamp
    }, root);
    generateDailyBrief({ root, now });
    return { wake, opportunities: candidateOpportunities, researchRuns: discovery.researchRuns, decisions, modelCalls: wake.modelCalls, discovery };
  } catch (error) {
    writeRecord(PATHS.wakes, wakeId, {
      wakeId, startedAt: timestamp, trigger, inputsChanged: [inputHash], providerMode: researchProvider.mode, provider: researchProvider.name || researchProvider.mode,
      queries: [], pagesFetched: 0, modelUsed: null, modelCalls: 0, modelCost: 0, researchCost: 0, decisions: [], opportunitiesCreated: [], opportunitiesKilled: [], proposalsCreated: [], researchRunsStarted: [],
      status: "blocked", blockers: [String(error.message)], liveProviderUsed: researchProvider.mode === "live_read_only", externalActionExecuted: false, privateCustomerDataUsed: false, completedAt: isoTimestamp(now)
    }, root);
    writeJson(PATHS.director, { ...director, lastWakeAt: timestamp, wakeCount: director.wakeCount + 1, scheduler: { ...(director.scheduler || {}), status: "blocked" }, updatedAt: timestamp }, root);
    throw error;
  }
}

export async function runOpportunityWake({ trigger = "scheduled_tick", fixture = null, root = process.cwd(), now = new Date(), reasoningProvider = null, researchProvider = null, researchApproval = null, discoveryLimits = null, signal = null } = {}) {
  securityBoundaryPresent(root);
  const director = createOpportunityDirector({ root, now });
  if (director.status !== "active") throw new Error("Opportunity Director is paused");
  if (!fixture && researchProvider) return runPublicDiscoveryWake({ trigger, director, researchProvider, synthesisProvider: reasoningProvider, researchApproval, discoveryLimits, root, now, signal });
  const inputDescriptor = fixture ? { worldId: fixture.worldId, revision: fixture.revision, entities: fixture.entities } : { worldId: "no-input", revision: 0, entities: [] };
  const inputHash = stableHash(inputDescriptor);
  const wakeId = nextId("opportunity-wake", now, `${trigger}-${inputHash.slice(0, 8)}`);
  const timestamp = isoTimestamp(now);
  const noChange = director.lastInputHash === inputHash || !fixture || !(fixture.entities || []).length;
  if (noChange) {
    const wake = {
      wakeId, startedAt: timestamp, trigger, inputsChanged: [], modelUsed: null, modelCalls: 0, modelCost: 0, researchCost: 0,
      decisions: ["wake.skipped_no_change"], opportunitiesCreated: [], opportunitiesKilled: [], proposalsCreated: [], researchRunsStarted: [],
      status: "skipped_no_change", externalActionExecuted: false, completedAt: timestamp
    };
    writeRecord(PATHS.wakes, wakeId, wake, root);
    writeJson(PATHS.director, { ...director, lastWakeAt: timestamp, wakeCount: director.wakeCount + 1, updatedAt: timestamp }, root);
    return { wake, opportunities: [], researchRuns: [], modelCalls: 0 };
  }

  const costLimits = activeCostLimits(root);
  const wakeLimit = Math.min(director.researchLimits.directorReasoningWakeUsd, Number(costLimits.perTaskMaxUsd || 0));
  let reasoningCost = 0;
  let modelCalls = 0;
  if (reasoningProvider) {
    if (reasoningProvider.live === true) throw new Error("live reasoning is not authorized for Opportunity Director V1 verification");
    const result = await reasoningProvider.reason({ objective: director.objective, fixture: structuredClone(fixture) });
    modelCalls = 1;
    reasoningCost = money(result?.costUsd || 0);
    if (reasoningCost > wakeLimit) throw new Error("Opportunity Director reasoning exceeds its Cost OS subordinate wake budget");
  }

  const researchRuns = [];
  const rawOpportunities = [];
  const decisions = [];
  for (const entity of fixture.entities) {
    const evidence = (entity.evidenceUrls || []).map((url, index) => {
      const page = (fixture.pages || []).find((item) => item.url === url);
      if (!page) throw new Error(`fixture evidence page missing: ${url}`);
      const record = normalizedEvidenceFromPage(page, { evidenceId: `evidence-${slugify(entity.entityId)}-${index + 1}`, now });
      writeEvidence({ evidence: record, root });
      return record;
    });
    const entityRuns = Object.entries(entity.workerOutputs || {}).map(([role, output]) => {
      const run = runDeterministicResearchWorker({ role, entity: entity.organization || entity.market || entity.title, evidence, fixtureOutput: output, now });
      if (run.costUsd > director.researchLimits.researchRunUsd || run.costUsd > Number(costLimits.perTaskMaxUsd || 0)) throw new Error("research run exceeds Cost OS subordinate budget");
      writeRecord(PATHS.researchRuns, run.researchRunId, run, root);
      researchRuns.push(run);
      return run;
    });
    for (const signal of entity.signals || []) writeSignal({ signal, root });
    for (const person of entity.people || []) writeNetworkPerson({ person, root });
    rawOpportunities.push(opportunityFromEntity({ entity, evidence, researchRuns: entityRuns, now }));
  }

  const opportunities = dedupeOpportunities(rawOpportunities);
  for (const opportunity of opportunities) {
    writeOpportunity({ opportunity, root });
    const decisionType = opportunity.status === "killed" ? "kill" : opportunity.status === "validation_ready" ? "prepare_validation" : "watch";
    decisions.push(createOpportunityDecision({
      wakeId, decisionType, subjectId: opportunity.opportunityId,
      summary: `${opportunity.title} moved to ${opportunity.status}.`, evidenceIds: opportunity.evidenceIds,
      alternativesConsidered: ["research_deeper", "watch", "kill", "prepare_validation"], chosenAction: opportunity.status,
      reasonSummary: opportunity.status === "killed" ? "Weak evidence, access, economics, or competitive position did not justify more work." : "Deterministic scoring, evidence, economics, reachability, and skeptic findings support this state.",
      scoreBefore: null, scoreAfter: opportunity.score, confidence: opportunity.confidence,
      estimatedCost: opportunity.estimatedValidationCost, actualCost: opportunity.researchSpendUsd, root, now
    }));
  }
  const researchCost = money(researchRuns.reduce((sum, run) => sum + Number(run.costUsd || 0), 0));
  if (researchCost > director.researchLimits.deepInvestigationUsd * Math.max(1, opportunities.length)) throw new Error("wake research exceeds bounded deep-investigation allowance");
  const wake = {
    wakeId, startedAt: timestamp, trigger, inputsChanged: [inputHash], modelUsed: reasoningProvider ? reasoningProvider.name || "deterministic_reasoner" : null,
    modelCalls, modelCost: reasoningCost, researchCost, decisions: decisions.map((item) => item.decisionId),
    opportunitiesCreated: opportunities.map((item) => item.opportunityId),
    opportunitiesKilled: opportunities.filter((item) => item.status === "killed").map((item) => item.opportunityId),
    proposalsCreated: opportunities.filter((item) => item.status === "validation_ready").map((item) => `proposal-opportunity-validation-${slugify(item.opportunityId)}`),
    researchRunsStarted: researchRuns.map((item) => item.researchRunId), status: "complete", externalActionExecuted: false,
    completedAt: timestamp
  };
  writeRecord(PATHS.wakes, wakeId, wake, root);
  writeJson(PATHS.director, {
    ...director, lastWakeAt: timestamp, lastReasoningWakeAt: modelCalls ? timestamp : director.lastReasoningWakeAt,
    wakeCount: director.wakeCount + 1, currentFocus: opportunities.sort((a, b) => b.score - a.score)[0]?.title || director.currentFocus,
    currentTheses: opportunities.filter((item) => item.status !== "killed").slice(0, 5).map((item) => item.problemHypothesis),
    lastInputHash: inputHash, updatedAt: timestamp
  }, root);
  return { wake, opportunities, researchRuns, decisions, modelCalls };
}

export function createValidationExperimentForOpportunity({ opportunityId, root = process.cwd(), now = new Date() }) {
  const opportunity = readJson(`${PATHS.opportunities}/${slugify(opportunityId)}.json`, root);
  if (opportunity.status !== "validation_ready") throw new Error("opportunity must be validation_ready");
  return writeExperiment({ experiment: {
    experimentId: `experiment-${slugify(opportunityId)}-validation-v1`, opportunityId,
    hypothesis: opportunity.problemHypothesis, method: opportunity.cheapestValidation,
    successMetric: "Observe the fixture-defined real-world signal without treating outreach or build completion as proof.", baseline: "No validated signal yet",
    target: "At least one owner-confirmed or source-backed validation signal", budgetCap: opportunity.estimatedValidationCost,
    ownerTimeEstimate: opportunity.economicModel.ownerHours, startAt: null, stopAt: null,
    stopConditions: opportunity.stopConditions, actionClass: opportunity.validationActionClass, status: "proposed", result: null,
    evidenceIds: opportunity.evidenceIds, cost: 0, outcome: null, createdAt: isoTimestamp(now), updatedAt: isoTimestamp(now)
  }, root }).record;
}

export function applyOpportunityOwnerAction({ opportunityId, action, confirmation, root = process.cwd(), now = new Date() }) {
  const allowed = ["research_deeper", "watch", "kill", "prepare_validation", "spawn_build_mission"];
  if (!allowed.includes(action)) throw new Error("opportunity owner action is invalid");
  if (confirmation !== `${action.toUpperCase()} ${opportunityId}`) throw new Error(`confirmation must equal ${action.toUpperCase()} ${opportunityId}`);
  const recordPath = `${PATHS.opportunities}/${slugify(opportunityId)}.json`;
  const opportunity = readJson(recordPath, root);
  if (action === "spawn_build_mission") {
    return {
      status: "blocked_owner_proposal_required",
      opportunityId,
      action,
      requiredNextStep: "Accept the matching opportunity_validation proposal, then use the Mission Control bridge. Downstream approvals remain required.",
      missionCreated: false,
      permissionGranted: false
    };
  }
  if (action === "research_deeper") {
    const experiment = writeExperiment({ experiment: {
      experimentId: `experiment-${slugify(opportunityId)}-deeper-research-${now.toISOString().slice(0, 10)}`,
      opportunityId, hypothesis: opportunity.problemHypothesis,
      method: `Run a bounded read-only research pass using existing evidence and the USD $${DEFAULT_RESEARCH_LIMITS.deepInvestigationUsd.toFixed(2)} subordinate ceiling.`,
      successMetric: "Materially improve or reduce confidence with new independent evidence.", baseline: `${opportunity.confidence}% confidence`,
      target: "At least one new independent evidence group or a kill decision", budgetCap: DEFAULT_RESEARCH_LIMITS.deepInvestigationUsd,
      ownerTimeEstimate: 0, startAt: null, stopAt: null, stopConditions: ["Stop at the configured cost ceiling.", "Stop when no new evidence is found."],
      actionClass: "read_only_research", status: "proposed", result: null, evidenceIds: opportunity.evidenceIds,
      cost: 0, outcome: null, createdAt: isoTimestamp(now), updatedAt: isoTimestamp(now)
    }, root }).record;
    return { status: "research_proposed", opportunityId, action, experiment, externalActionExecuted: false, permissionGranted: false };
  }
  const nextStatus = action === "watch" ? "watching" : action === "kill" ? "killed" : "validation_ready";
  if (nextStatus === "validation_ready" && (!(opportunity.evidenceIds || []).length || !opportunity.cheapestValidation)) throw new Error("validation_ready requires evidence and a cheapest validation");
  const updated = { ...opportunity, status: nextStatus, updatedAt: isoTimestamp(now), lastOwnerAction: { action, actorId: DEFAULT_OWNER_ID, at: isoTimestamp(now) } };
  writeJson(recordPath, updated, root);
  return { status: nextStatus, opportunity: updated, externalActionExecuted: false, permissionGranted: false };
}

export function spawnMissionForOpportunity({ opportunityId, proposalId, repositoryPath, projectId, root = process.cwd(), missionFactory = createMission, now = new Date() }) {
  const opportunity = readJson(`${PATHS.opportunities}/${slugify(opportunityId)}.json`, root);
  const proposal = readJson(`.codex/proposals/${slugify(proposalId)}.json`, root);
  if (proposal.status !== "accepted" || proposal.source?.type !== "opportunity_validation" || proposal.source?.id !== opportunityId) throw new Error("an accepted matching opportunity validation proposal is required");
  if (proposal.safety?.grantsPermission !== false || proposal.safety?.downstreamApprovalsStillRequired !== true) throw new Error("opportunity proposal must not grant downstream permission");
  if (!proposal.opportunity?.softwareValidationRequested) throw new Error("only approved software validation may spawn Mission Control");
  const mission = missionFactory({
    ownerOutcome: proposal.proposedCommand,
    projectId,
    repositoryPath,
    autonomyLevel: "supervised",
    budgetUsd: Math.min(5, Number(opportunity.estimatedValidationCost || 0)),
    validationCommands: proposal.opportunity.validationCommands || ["npm test"],
    root,
    now
  });
  const link = {
    missionLinkId: `mission-link-${slugify(opportunityId)}-${slugify(mission.missionId)}`,
    opportunityId, proposalId, missionId: mission.missionId, status: "spawned", result: null,
    downstreamApprovalsStillRequired: true, protectedExternalActionExecuted: false,
    createdAt: isoTimestamp(now), updatedAt: isoTimestamp(now)
  };
  writeRecord(PATHS.missionLinks, link.missionLinkId, link, root);
  return { mission, link };
}

export function linkMissionResultToOpportunity({ opportunityId, missionId, result, root = process.cwd(), now = new Date() }) {
  const linkEntry = recordList(PATHS.missionLinks, root).find(({ record }) => record.opportunityId === opportunityId && record.missionId === missionId);
  if (!linkEntry) throw new Error("opportunity Mission Control link not found");
  const status = ["completed", "cancelled", "failed", "blocked"].includes(result?.status) ? result.status : "blocked";
  const updated = { ...linkEntry.record, status, result: { status, summary: String(result?.summary || "No mission summary recorded."), artifactIds: result?.artifactIds || [] }, updatedAt: isoTimestamp(now) };
  writeJson(linkEntry.recordPath, updated, root);
  return updated;
}

export function generateDailyBrief({ root = process.cwd(), now = new Date() } = {}) {
  const director = createOpportunityDirector({ root, now });
  const opportunities = recordList(PATHS.opportunities, root).map(({ record }) => record).sort((a, b) => b.score - a.score);
  const people = recordList(PATHS.people, root).map(({ record }) => record);
  const experiments = recordList(PATHS.experiments, root).map(({ record }) => record);
  const rules = recordList(PATHS.rules, root).map(({ record }) => record);
  const wakes = recordList(PATHS.wakes, root).map(({ record }) => record).sort((a, b) => String(b.completedAt).localeCompare(String(a.completedAt)));
  const outcomes = recordList(PATHS.outcomes, root).map(({ record }) => record);
  const treasury = initializeTreasury({ treasuryId: director.treasuryId, root, now });
  const brief = {
    briefId: `daily-brief-${now.toISOString().slice(0, 10)}`,
    generatedAt: isoTimestamp(now),
    todaysTop5: opportunities.filter((item) => item.status !== "killed").slice(0, 5).map((item) => ({
      opportunityId: item.opportunityId, title: item.title, score: item.score, confidence: item.confidence,
      whyNow: item.summary, economicRange: { low: item.economicModel.lowValueUsd, base: item.economicModel.baseValueUsd, high: item.economicModel.highValueUsd },
      evidenceCount: item.evidenceIds.length, cheapestNextTest: item.cheapestValidation, costUsd: item.estimatedValidationCost,
      ownerHours: item.economicModel.ownerHours, nextDecision: item.recommendedNextAction
    })),
    peopleWorthKnowing: people.map((item) => ({ personId: item.personId, name: item.name, organization: item.organization, whyRelevant: item.whyRelevant, relationshipState: item.relationshipState })),
    whatChanged: wakes[0]?.decisions || [],
    activeExperiments: experiments.filter((item) => ["proposed", "active"].includes(item.status)),
    ownerActionRequired: opportunities.filter((item) => item.status === "validation_ready").map((item) => item.opportunityId),
    killed: opportunities.filter((item) => item.status === "killed").map((item) => ({ opportunityId: item.opportunityId, title: item.title, reason: item.recommendedNextAction })),
    learned: rules,
    aiSpendUsd: money(wakes.reduce((sum, item) => sum + Number(item.modelCost || 0) + Number(item.researchCost || 0), 0)),
    treasury,
    pipelineExpectedValueUsd: Number(opportunities.filter((item) => item.status !== "killed").reduce((sum, item) => sum + Number(item.economicModel.expectedValueUsd || 0), 0).toFixed(2)),
    revenueAttributedUsd: outcomes.filter((item) => item.type === "revenue" && item.ownerConfirmed).reduce((sum, item) => sum + Number(item.valueUsd || 0), 0),
    deterministic: true
  };
  writeRecord(PATHS.briefs, brief.briefId, brief, root);
  return brief;
}

export function getOpportunityDirectorSnapshot({ root = process.cwd(), now = new Date() } = {}) {
  const director = createOpportunityDirector({ root, now });
  const opportunities = recordList(PATHS.opportunities, root).map(({ record }) => record).sort((a, b) => b.score - a.score);
  const people = recordList(PATHS.people, root).map(({ record }) => record);
  const experiments = recordList(PATHS.experiments, root).map(({ record }) => record);
  const rules = recordList(PATHS.rules, root).map(({ record }) => record);
  const wakes = recordList(PATHS.wakes, root).map(({ record }) => record).sort((a, b) => String(b.completedAt).localeCompare(String(a.completedAt)));
  const decisions = recordList(PATHS.decisions, root).map(({ record }) => record).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const missionLinks = recordList(PATHS.missionLinks, root).map(({ record }) => record);
  const seeds = recordList(PATHS.seeds, root).map(({ record }) => record).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  const evidence = recordList(PATHS.evidence, root).map(({ record }) => record);
  const researchRuns = recordList(PATHS.researchRuns, root).map(({ record }) => record);
  const outcomes = recordList(PATHS.outcomes, root).map(({ record }) => record);
  const treasury = initializeTreasury({ treasuryId: director.treasuryId, root, now });
  const costs = wakes.reduce((sum, item) => sum + Number(item.modelCost || 0) + Number(item.researchCost || 0), 0);
  const liveWake = wakes.find((item) => item.liveProviderUsed === true && item.status === "complete") || null;
  const displayOpportunities = opportunities.map((item) => {
    const freshAt = item.evidenceFreshAt || item.updatedAt;
    const ageDays = Number.isFinite(Date.parse(freshAt)) ? Math.max(0, Math.floor((now.getTime() - Date.parse(freshAt)) / 86_400_000)) : null;
    return { ...item, ageDays, freshness: ageDays == null ? "unknown" : ageDays <= 2 ? "fresh" : ageDays <= 14 ? "aging" : "stale" };
  });
  return {
    director,
    constitution: { version: OPPORTUNITY_CONSTITUTION_VERSION, hash: OPPORTUNITY_CONSTITUTION_HASH, immutable: true },
    statusLabel: director.scheduler?.status === "researching" ? "Researching" : director.scheduler?.status === "synthesizing" ? "Synthesizing" : director.scheduler?.status === "blocked" ? "Blocked" : "Idle",
    discoveryStatus: director.scheduler?.status || "idle",
    lastRealResearch: liveWake ? { time: liveWake.completedAt, provider: liveWake.provider, queries: liveWake.queries?.length || 0, pages: liveWake.pagesFetched || 0, costUsd: money(Number(liveWake.modelCost || 0) + Number(liveWake.researchCost || 0)) } : null,
    aiSpendUsd: money(costs),
    costLimitUsd: activeCostLimits(root).monthlyMaxUsd,
    treasury,
    topOpportunities: displayOpportunities.slice(0, 8),
    opportunities: displayOpportunities,
    people,
    experiments,
    outcomes,
    learned: rules,
    activity: decisions.slice(0, 50),
    killed: opportunities.filter((item) => item.status === "killed"),
    ownerDecisionsRequired: opportunities.filter((item) => item.status === "validation_ready"),
    missionLinks,
    seeds,
    recentWakes: wakes.slice(0, 12),
    truth: {
      externalActionExecuted: [...wakes, ...experiments, ...missionLinks, ...outcomes].some((item) => item.externalActionExecuted === true),
      realMoneyMoved: treasury.transactions.some((item) => item.realMoneyMoved === true),
      privateCustomerDataUsed: [...wakes, ...researchRuns, ...evidence].some((item) => item.privateCustomerDataUsed === true || item.privateDataUsed === true),
      liveProviderUsed: [...wakes, ...researchRuns, ...evidence].some((item) => item.liveProviderUsed === true || item.providerMode === "live_read_only" || item.provenance === "live_public_research"),
      fabricatedActivity: false
    }
  };
}

export { PATHS as OPPORTUNITY_PATHS };
