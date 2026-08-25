import { createHash } from "node:crypto";
import { finalizePaidCallBudgetReservation, reservePaidCallBudget } from "./anthropic-budget-guard.mjs";
import { dedupeResearchResults, normalizedEvidenceFromPage, RESEARCH_WORKER_ROLES, runDeterministicResearchWorker } from "./opportunity-research.mjs";
import { writeAuditEventRecord } from "./audit-writer.mjs";

export const DEFAULT_DISCOVERY_LIMITS = Object.freeze({
  maxBroadSearchQueries: 8,
  maxSearchResultsConsidered: 60,
  maxPagesFetched: 20,
  maxPagesForSynthesis: 12,
  maxCandidateOpportunities: 10,
  maxDeepResearchOpportunities: 3,
  maxMeaningfulCyclesPerDay: 3,
  minimumCycleIntervalMinutes: 480,
  duplicateDominanceRatio: 0.75
});

const MAXIMUMS = Object.freeze({
  maxBroadSearchQueries: 12,
  maxSearchResultsConsidered: 100,
  maxPagesFetched: 30,
  maxPagesForSynthesis: 16,
  maxCandidateOpportunities: 15,
  maxDeepResearchOpportunities: 5,
  maxMeaningfulCyclesPerDay: 4,
  minimumCycleIntervalMinutes: 1440
});

function clean(value, maximum = 300) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maximum);
}

export function boundedDiscoveryLimits(input = {}) {
  const limits = { ...DEFAULT_DISCOVERY_LIMITS, ...input };
  for (const [key, maximum] of Object.entries(MAXIMUMS)) {
    const value = Number(limits[key]);
    if (!Number.isInteger(value) || value < 1 || value > maximum) throw new Error(`${key} must be an integer from 1 to ${maximum}`);
    limits[key] = value;
  }
  const ratio = Number(limits.duplicateDominanceRatio);
  if (!Number.isFinite(ratio) || ratio < 0.5 || ratio > 1) throw new Error("duplicateDominanceRatio must be between 0.5 and 1");
  limits.duplicateDominanceRatio = ratio;
  return limits;
}

export function chooseResearchThemes({ objective, theses = [], seeds = [], watches = [] }) {
  const themes = [objective, ...theses, ...seeds.map((seed) => `${seed.type}: ${seed.value}`), ...watches.map((watch) => watch.problemHypothesis || watch.title)]
    .map((item) => clean(item, 180)).filter(Boolean);
  return [...new Set(themes.map((item) => item.toLowerCase()))].sort();
}

export function buildDiscoveryQueries({ objective, theses = [], seeds = [], watches = [], limits = DEFAULT_DISCOVERY_LIMITS }) {
  const bounded = boundedDiscoveryLimits(limits);
  const themes = chooseResearchThemes({ objective, theses, seeds, watches });
  const suffixes = ["pricing services", "customer complaints reviews", "hiring jobs", "business announcement AI automation"];
  const queries = [];
  for (const theme of themes) {
    const direct = seeds.some((seed) => clean(`${seed.type}: ${seed.value}`, 180).toLowerCase() === theme);
    queries.push(direct ? theme.replace(/^[a-z_]+:\s*/, "") : `${theme} ${suffixes[queries.length % suffixes.length]}`);
    if (queries.length >= bounded.maxBroadSearchQueries) break;
  }
  return [...new Set(queries.map((item) => clean(item, 300)).filter(Boolean))].slice(0, bounded.maxBroadSearchQueries);
}

function safeSeedUrls(seeds) {
  return seeds.filter((seed) => seed.type === "url").map((seed) => ({ url: seed.value, title: seed.value, summary: "Owner-seeded public URL" }));
}

async function providerCall({ provider, operation, execute, job, approval, root, now }) {
  const estimate = Number(provider.estimatedCostUsd?.(operation) || 0);
  if (!(estimate > 0)) return { value: await execute(), costUsd: 0 };
  const reservation = reservePaidCallBudget({ kind: `opportunity-${operation}`, job, estimatedCostUsd: estimate, approvalId: approval?.approvalId, approvalMaxUsd: approval?.maxUsd, root, now });
  try {
    const value = await execute();
    const actual = Number(provider.actualCostUsd?.(operation, value));
    const costUsd = Number.isFinite(actual) ? actual : estimate;
    finalizePaidCallBudgetReservation({ reservation, consumed: true, actualCostUsd: costUsd, root, now });
    writeAuditEventRecord({ runId: `${reservation.recordPath.split("/").at(-1).replace(/\.json$/, "")}-public-research-use`, eventType: "standing_approval_used", summary: `Scoped approval ${approval.approvalId} used for one read-only public research ${operation} call.`, scope: "public_opportunity_research", source: "connector_metadata", relatedArtifacts: [{ type: "approval", reference: approval.approvalId }, { type: "other", reference: reservation.recordPath }], riskLevel: "R1", liveServiceTouched: true, notes: `Read-only ${provider.name || provider.mode}; recorded cost USD ${costUsd}; no outreach, publishing, account change, private data, or protected external action.`, root, now });
    return { value, costUsd };
  } catch (error) {
    finalizePaidCallBudgetReservation({ reservation, consumed: true, root, now });
    writeAuditEventRecord({ runId: `${reservation.recordPath.split("/").at(-1).replace(/\.json$/, "")}-public-research-use`, eventType: "standing_approval_used", summary: `Scoped approval ${approval.approvalId} consumed for one attempted read-only public research ${operation} call.`, scope: "public_opportunity_research", source: "connector_metadata", relatedArtifacts: [{ type: "approval", reference: approval.approvalId }, { type: "other", reference: reservation.recordPath }], riskLevel: "R1", liveServiceTouched: true, notes: `Conservative estimated cost recorded after provider failure; no protected external action.`, root, now });
    throw error;
  }
}

function evidenceCatalog(evidence) {
  return new Map(evidence.map((item) => [item.evidenceId, item]));
}

function validateCandidate(candidate, catalog) {
  if (!candidate?.title || !candidate.type || !candidate.problemHypothesis) throw new Error("synthesis candidate is missing identity or hypothesis");
  const evidenceIds = [...new Set(candidate.evidenceIds || [])];
  if (evidenceIds.length === 0 || evidenceIds.some((id) => !catalog.has(id))) throw new Error("synthesis candidate cites unknown evidence");
  const allowedClaims = new Set(evidenceIds.flatMap((id) => catalog.get(id).relevantClaims.map((claim) => claim.statement)));
  if ((candidate.observedClaims || []).some((claim) => !allowedClaims.has(claim))) throw new Error("synthesis candidate contains an unsupported observed claim");
  const allowedUrls = new Set(evidenceIds.map((id) => catalog.get(id).sourceUrl));
  for (const person of candidate.people || []) {
    if (!person.name || !person.organization || !person.publicRole || !person.whyRelevant) throw new Error("network discovery requires a public professional identity and relevance");
    if (!(person.evidenceIds || []).length || person.evidenceIds.some((id) => !evidenceIds.includes(id))) throw new Error("network discovery cites unknown evidence");
    if (!(person.sourceUrls || []).length || person.sourceUrls.some((url) => !allowedUrls.has(url))) throw new Error("network discovery cites an unverified public source URL");
  }
  const independentSources = new Set(evidenceIds.map((id) => catalog.get(id).independenceGroup || catalog.get(id).publisher)).size;
  return { ...candidate, evidenceIds, observedClaims: candidate.observedClaims || [], scoreInputs: { ...(candidate.scoreInputs || {}), evidenceStrength: Math.min(Number(candidate.scoreInputs?.evidenceStrength || 0), independentSources * 5) } };
}

function deterministicCandidates(evidence, maximum) {
  const groups = new Map();
  for (const item of evidence) {
    const group = item.independenceGroup || item.publisher;
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(item);
  }
  return [...groups.entries()].slice(0, maximum).map(([organization, items]) => ({
    type: "business_problem",
    title: `${organization} public signal`,
    organization,
    summary: items.map((item) => item.shortFactualSummary).join(" ").slice(0, 800),
    problemHypothesis: `Public evidence suggests ${organization} may have a business problem worth bounded validation.`,
    evidenceIds: items.map((item) => item.evidenceId),
    observedClaims: items.flatMap((item) => item.relevantClaims.map((claim) => claim.statement)),
    assumptions: ["A public signal may not represent a budgeted or reachable business problem."],
    scoreInputs: { painSeverity: 10, potentialEconomicValue: 9, evidenceStrength: 5, reachabilityAccess: 3, agCapabilityFit: 5, validationSpeedCost: 7, competitiveWhitespace: 2, networkReputationValue: 1 },
    confidence: Math.min(70, 30 + items.length * 10),
    economicModel: { lowValueUsd: 0, baseValueUsd: 500, highValueUsd: 2500, probabilityProblemReal: 0.4, probabilityReachable: 0.2, probabilityValidationSucceeds: 0.3, estimatedValidationSpendUsd: 0, ownerHours: 1, assumptions: ["Value and probabilities are preliminary estimates derived from public evidence only."] },
    cheapestValidation: "Run another bounded read-only public research pass.",
    validationActionClass: "read_only_research",
    estimatedValidationCost: 0,
    estimatedDaysToSignal: 1,
    stopConditions: ["Stop if no independent evidence appears.", "Stop at the configured source and cost caps."],
    recommendedNextAction: "Watch or research deeper using public sources only."
  }));
}

export async function executePublicDiscovery({ director, provider, synthesisProvider = null, existingOpportunities = [], existingEvidence = [], seeds = [], limits = DEFAULT_DISCOVERY_LIMITS, approval = null, root, now = new Date(), signal = null, onStage = null }) {
  if (!provider?.readOnly || typeof provider.search !== "function" || typeof provider.fetchPublicPage !== "function") throw new Error("public discovery requires a configured read-only research provider");
  const bounded = boundedDiscoveryLimits(limits);
  const queries = buildDiscoveryQueries({ objective: director.objective, theses: director.currentTheses, seeds, watches: existingOpportunities.filter((item) => item.status === "watching"), limits: bounded });
  const job = { jobId: `opportunity-discovery-${now.toISOString().replace(/[^0-9]/g, "").slice(0, 14)}`, projectId: "project-opportunity-director" };
  const rawResults = [...safeSeedUrls(seeds)];
  const executedQueries = [];
  let providerCostUsd = 0;
  const failures = [];
  for (const query of queries) {
    if (signal?.aborted) throw signal.reason || new Error("opportunity discovery aborted");
    executedQueries.push(query);
    try {
      if (providerCostUsd + Number(provider.estimatedCostUsd?.("search") || 0) > Number(director.researchLimits.deepInvestigationUsd)) throw new Error("public research provider cost exceeds the Director subordinate limit");
      const call = await providerCall({ provider, operation: "search", execute: () => provider.search(query, { signal }), job, approval, root, now });
      rawResults.push(...call.value);
      providerCostUsd += call.costUsd;
    } catch (error) {
      if (error.code === "blocked_budget") throw error;
      failures.push({ operation: "search", query, error: clean(error.message, 300) });
      if (/subordinate limit/.test(error.message)) break;
    }
    const interimUniqueCount = dedupeResearchResults(rawResults, bounded.maxSearchResultsConsidered).length;
    const interimDuplicateRatio = rawResults.length ? 1 - interimUniqueCount / rawResults.length : 0;
    if (rawResults.length >= 4 && interimDuplicateRatio >= bounded.duplicateDominanceRatio) break;
    if (rawResults.length >= bounded.maxSearchResultsConsidered) break;
  }
  const results = dedupeResearchResults(rawResults, bounded.maxSearchResultsConsidered);
  const duplicateRatio = rawResults.length ? 1 - results.length / rawResults.length : 0;
  const pages = [];
  for (const result of results.slice(0, bounded.maxPagesFetched)) {
    if (signal?.aborted) throw signal.reason || new Error("opportunity discovery aborted");
    try {
      if (providerCostUsd + Number(provider.estimatedCostUsd?.("fetch") || 0) > Number(director.researchLimits.deepInvestigationUsd)) throw new Error("public research provider cost exceeds the Director subordinate limit");
      const call = await providerCall({ provider, operation: "fetch", execute: () => provider.fetchPublicPage(result.url, { signal }), job, approval, root, now });
      pages.push(call.value);
      providerCostUsd += call.costUsd;
    } catch (error) {
      if (error.code === "blocked_budget") throw error;
      failures.push({ operation: "fetch", url: result.url, error: clean(error.message, 300) });
      if (/subordinate limit/.test(error.message)) break;
    }
  }
  const evidence = pages.map((page) => normalizedEvidenceFromPage(page, { now }));
  const existingHashes = new Set(existingEvidence.map((item) => item.contentHash));
  const uniqueEvidence = [...new Map(evidence.map((item) => [item.contentHash, item])).values()].filter((item) => !existingHashes.has(item.contentHash));
  const catalog = evidenceCatalog(uniqueEvidence);
  let modelCostUsd = 0;
  let model = null;
  let candidates;
  if (synthesisProvider && uniqueEvidence.length > 0) {
    onStage?.("synthesizing");
    const synthesis = await synthesisProvider.synthesize({ objective: director.objective, evidence: uniqueEvidence.slice(0, bounded.maxPagesForSynthesis), existingOpportunities, maxCandidates: bounded.maxCandidateOpportunities, signal });
    candidates = (synthesis.candidates || []).map((candidate) => validateCandidate(candidate, catalog)).slice(0, bounded.maxCandidateOpportunities);
    modelCostUsd = Number(synthesis.costUsd || 0);
    if (modelCostUsd > Number(director.researchLimits.directorReasoningWakeUsd)) throw new Error("Opportunity Director synthesis exceeds its subordinate reasoning limit");
    model = synthesis.model || synthesisProvider.name || "configured_synthesis";
  } else {
    candidates = deterministicCandidates(uniqueEvidence, bounded.maxCandidateOpportunities);
  }
  const deepCandidates = candidates.slice(0, bounded.maxDeepResearchOpportunities);
  const researchRuns = deepCandidates.flatMap((candidate) => RESEARCH_WORKER_ROLES.map((role) => runDeterministicResearchWorker({
    role,
    entity: candidate.organization || candidate.title,
    evidence: candidate.evidenceIds.map((id) => catalog.get(id)),
    fixtureOutput: { hypotheses: candidate.assumptions || [], estimates: role === "skeptic" ? { confidenceDowngrade: 10 } : {}, findings: [], confidence: candidate.confidence },
    now
  })));
  return {
    mode: provider.mode,
    provider: provider.name || provider.mode,
    queries: executedQueries,
    resultsConsidered: results.length,
    pagesFetched: pages.length,
    evidence: uniqueEvidence,
    candidates,
    researchRuns,
    providerCostUsd: Number(providerCostUsd.toFixed(6)),
    modelCostUsd: Number(modelCostUsd.toFixed(6)),
    model,
    duplicateRatio,
    stoppedForDuplicateDominance: duplicateRatio >= bounded.duplicateDominanceRatio,
    failures,
    limits: bounded,
    liveProviderUsed: provider.mode === "live_read_only",
    externalActionExecuted: false,
    privateCustomerDataUsed: false
  };
}

export function discoveryInputHash(input) {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}
