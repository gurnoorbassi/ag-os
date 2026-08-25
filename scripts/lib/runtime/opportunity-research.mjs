import { createHash } from "node:crypto";

export const RESEARCH_WORKER_ROLES = Object.freeze([
  "market_researcher",
  "customer_problem_researcher",
  "competitor_researcher",
  "economics_analyst",
  "network_mapper",
  "distribution_researcher",
  "skeptic"
]);

function clone(value) {
  return structuredClone(value);
}

export class DeterministicResearchProvider {
  constructor(fixture) {
    this.fixture = clone(fixture || { pages: [], searches: {} });
    this.mode = "deterministic_fixture";
    this.readOnly = true;
    this.calls = [];
  }

  async search(query) {
    const normalized = String(query || "").trim().toLowerCase();
    this.calls.push({ method: "search", query: normalized });
    const configured = this.fixture.searches?.[normalized];
    const results = configured || (this.fixture.pages || []).filter((page) =>
      [page.title, page.summary, ...(page.claims || [])].join(" ").toLowerCase().includes(normalized)
    );
    return clone(results);
  }

  async fetchPublicPage(url) {
    const normalized = String(url || "").trim();
    this.calls.push({ method: "fetchPublicPage", url: normalized });
    const result = (this.fixture.pages || []).find((page) => page.url === normalized);
    if (!result) throw new Error(`fixture page not found: ${normalized}`);
    return clone(result);
  }
}

export function createLiveResearchProvider({ endpoint, credential } = {}) {
  if (!endpoint || !credential) throw new Error("live research provider is unconfigured and fails closed");
  return Object.freeze({
    mode: "live_read_only",
    readOnly: true,
    configured: true,
    search: async () => { throw new Error("live research execution is disabled in Opportunity Director V1 verification"); },
    fetchPublicPage: async () => { throw new Error("live research execution is disabled in Opportunity Director V1 verification"); }
  });
}

export function normalizedEvidenceFromPage(page, { evidenceId, now = new Date() } = {}) {
  if (!page?.url || !page?.title || !Array.isArray(page.claims) || page.claims.length === 0) {
    throw new Error("public research page must provide URL, title, and factual claims");
  }
  const summary = String(page.summary || "").trim();
  if (!summary || summary.length > 800) throw new Error("evidence summary must be concise and no more than 800 characters");
  const timestamp = now.toISOString();
  const contentHash = createHash("sha256").update(JSON.stringify({ url: page.url, title: page.title, claims: page.claims, summary })).digest("hex");
  return {
    evidenceId: evidenceId || `evidence-${contentHash.slice(0, 16)}`,
    sourceType: page.sourceType || "public_web_fixture",
    sourceUrl: page.url,
    internalSourceReference: null,
    sourceTitle: page.title,
    publisher: page.publisher || new URL(page.url).hostname,
    observedAt: page.observedAt || timestamp,
    fetchedAt: timestamp,
    freshness: page.freshness || "current_fixture",
    shortFactualSummary: summary,
    relevantClaims: page.claims.map((claim) => ({ kind: "observed", statement: String(claim) })),
    credibility: Math.max(0, Math.min(1, Number(page.credibility ?? 0.7))),
    independenceGroup: page.independenceGroup || new URL(page.url).hostname,
    contentHash,
    status: "verified_fixture",
    containsCopiedPage: false
  };
}

export function runDeterministicResearchWorker({ role, entity, evidence = [], fixtureOutput = null, now = new Date() }) {
  if (!RESEARCH_WORKER_ROLES.includes(role)) throw new Error(`unsupported research worker role: ${role}`);
  const observations = evidence.flatMap((item) => item.relevantClaims || []).filter((claim) => claim.kind === "observed").map((claim) => claim.statement);
  const output = fixtureOutput || {};
  return {
    researchRunId: `research-${role}-${String(entity || "unknown").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    role,
    entity,
    status: "complete",
    readOnly: true,
    observations,
    hypotheses: (output.hypotheses || []).map((statement) => ({ kind: "hypothesis", statement })),
    estimates: output.estimates || {},
    findings: output.findings || [],
    evidenceIds: evidence.map((item) => item.evidenceId),
    confidence: Math.max(0, Math.min(100, Number(output.confidence ?? (observations.length ? 60 : 20)))),
    costUsd: Number(output.costUsd || 0),
    externalActionExecuted: false,
    privateDataUsed: false,
    createdAt: now.toISOString(),
    completedAt: now.toISOString()
  };
}
