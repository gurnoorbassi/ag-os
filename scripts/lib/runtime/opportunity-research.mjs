import { createHash } from "node:crypto";

const MAX_PUBLIC_PAGE_BYTES = 1_000_000;
const MAX_PUBLIC_TEXT_CHARS = 100_000;
const PRIVATE_HOST = /^(?:localhost|127(?:\.\d+){3}|10(?:\.\d+){3}|192\.168(?:\.\d+){2}|169\.254(?:\.\d+){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d+){2}|\[?::1\]?)$/i;
const SENSITIVE_TEXT = /(?:\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|\b\+?\d[\d ().-]{8,}\d\b|\b(?:customer|account)[ _-]?id\s*[:=])/i;

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
    this.paid = false;
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

function publicHttpsUrl(value) {
  const url = new URL(String(value || ""));
  if (url.protocol !== "https:" || url.username || url.password || PRIVATE_HOST.test(url.hostname)) throw new Error("public research URLs must use public HTTPS origins");
  return url;
}

function boundedText(value, maximum) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maximum);
}

function decodeHtml(value) {
  return String(value || "").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">");
}

function pageFromHtml(url, html) {
  const bounded = String(html || "").slice(0, MAX_PUBLIC_PAGE_BYTES);
  const title = decodeHtml(bounded.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || new URL(url).hostname);
  const withoutNoise = bounded.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ").replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ");
  const text = boundedText(decodeHtml(withoutNoise.replace(/<[^>]+>/g, " ")), MAX_PUBLIC_TEXT_CHARS);
  const claims = text.split(/(?<=[.!?])\s+/).map((item) => boundedText(item, 300)).filter((item) => item.length >= 30).slice(0, 8);
  if (claims.length === 0) throw new Error("public page contained no bounded factual text");
  return { url, title: boundedText(title, 300), summary: boundedText(text, 800), claims, sourceType: "public_web", publisher: new URL(url).hostname, credibility: 0.6, independenceGroup: new URL(url).hostname, freshness: "live_fetch" };
}

async function fetchWithTimeout(fetchImpl, url, options, timeoutMs, signal) {
  const controller = new AbortController();
  const onAbort = () => controller.abort(signal.reason);
  signal?.addEventListener("abort", onAbort, { once: true });
  const timer = setTimeout(() => controller.abort(new Error(`public research request timed out after ${timeoutMs}ms`)), timeoutMs);
  timer.unref?.();
  try {
    return await fetchImpl(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) throw new Error(signal?.aborted ? "public research request aborted" : `public research request timed out after ${timeoutMs}ms`);
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

export function dedupeResearchResults(results = [], maximum = Infinity) {
  const seen = new Set();
  const output = [];
  for (const result of results) {
    let url;
    try { url = publicHttpsUrl(result?.url).href.replace(/#.*$/, ""); } catch { continue; }
    const key = url.replace(/\/$/, "").toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push({ ...result, url });
    if (output.length >= maximum) break;
  }
  return output;
}

export function createLiveResearchProvider({ endpoint, credential, fetchImpl = globalThis.fetch, timeoutMs = 15_000, costPerSearchUsd = 0 } = {}) {
  if (!endpoint || !credential) throw new Error("live research provider is unconfigured and fails closed");
  const searchEndpoint = publicHttpsUrl(endpoint);
  if (typeof fetchImpl !== "function") throw new Error("live research provider requires a fetch transport");
  const searchCost = Number(costPerSearchUsd);
  if (!Number.isFinite(searchCost) || searchCost < 0) throw new Error("research provider search cost must be non-negative");
  return Object.freeze({
    name: "brave_search",
    mode: "live_read_only",
    readOnly: true,
    configured: true,
    paid: searchCost > 0,
    estimatedCostUsd: (operation) => operation === "search" ? searchCost : 0,
    search: async (query, { signal } = {}) => {
      const url = new URL(searchEndpoint);
      url.searchParams.set("q", boundedText(query, 300));
      url.searchParams.set("count", "20");
      const response = await fetchWithTimeout(fetchImpl, url, { method: "GET", headers: { Accept: "application/json", "X-Subscription-Token": credential } }, timeoutMs, signal);
      if (!response.ok) throw new Error(`public search provider failed with HTTP ${response.status}`);
      const payload = await response.json();
      return dedupeResearchResults((payload.web?.results || []).map((item) => ({ url: item.url, title: boundedText(item.title, 300), summary: boundedText(item.description, 800), sourceType: "public_search_result", publisher: (() => { try { return new URL(item.url).hostname; } catch { return "unknown"; } })() })));
    },
    fetchPublicPage: async (url, { signal } = {}) => {
      const target = publicHttpsUrl(url);
      const response = await fetchWithTimeout(fetchImpl, target, { method: "GET", redirect: "error", headers: { Accept: "text/html,application/xhtml+xml" } }, timeoutMs, signal);
      if (!response.ok) throw new Error(`public page fetch failed with HTTP ${response.status}`);
      const length = Number(response.headers?.get?.("content-length") || 0);
      if (length > MAX_PUBLIC_PAGE_BYTES) throw new Error("public page exceeds the bounded fetch size");
      return pageFromHtml(target.href, await response.text());
    }
  });
}

export function normalizedEvidenceFromPage(page, { evidenceId, now = new Date() } = {}) {
  if (!page?.url || !page?.title || !Array.isArray(page.claims) || page.claims.length === 0) {
    throw new Error("public research page must provide URL, title, and factual claims");
  }
  const summary = String(page.summary || "").trim();
  if (!summary || summary.length > 800) throw new Error("evidence summary must be concise and no more than 800 characters");
  if (SENSITIVE_TEXT.test(summary) || page.claims.some((claim) => SENSITIVE_TEXT.test(String(claim)))) throw new Error("public evidence contains private or sensitive data and cannot be persisted");
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
    capturedAt: timestamp,
    fetchedAt: timestamp,
    freshness: page.freshness || "current_fixture",
    shortFactualSummary: summary,
    relevantClaims: page.claims.map((claim) => ({ kind: "observed", statement: String(claim) })),
    credibility: Math.max(0, Math.min(1, Number(page.credibility ?? 0.7))),
    independenceGroup: page.independenceGroup || new URL(page.url).hostname,
    contentHash,
    status: page.sourceType === "public_web" ? "verified_public" : "verified_fixture",
    provenance: page.sourceType === "public_web" ? "live_public_research" : "fixture",
    providerMode: page.sourceType === "public_web" ? "live_read_only" : "deterministic_fixture",
    liveProviderUsed: page.sourceType === "public_web",
    privateCustomerDataUsed: false,
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
