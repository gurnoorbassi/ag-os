import { DEFAULT_DISCOVERY_LIMITS, boundedDiscoveryLimits } from "./opportunity-discovery.mjs";
import { getOpportunityDirectorSnapshot, runOpportunityWake } from "./opportunity-director.mjs";

export function evaluateOpportunitySchedule({ snapshot, seeds = [], now = new Date(), manual = false, limits = DEFAULT_DISCOVERY_LIMITS }) {
  const bounded = boundedDiscoveryLimits(limits);
  const day = now.toISOString().slice(0, 10);
  const isPublicResearchCycle = (wake) => wake.liveProviderUsed === true
    && ["complete", "skipped_no_change"].includes(wake.status)
    && ((wake.queries || []).length > 0 || Number(wake.pagesFetched || 0) > 0);
  const meaningful = (snapshot.recentWakes || []).filter((wake) => isPublicResearchCycle(wake) && String(wake.completedAt || "").startsWith(day));
  if (meaningful.length >= bounded.maxMeaningfulCyclesPerDay) return { due: false, reason: "daily_cycle_cap", meaningfulCyclesToday: meaningful.length };
  const last = (snapshot.recentWakes || []).find(isPublicResearchCycle)?.completedAt || null;
  const lastMs = Date.parse(last || "");
  const intervalMs = bounded.minimumCycleIntervalMinutes * 60_000;
  const activeSeedDue = seeds.some((seed) => seed.status === "active" && (!Number.isFinite(lastMs) || Date.parse(seed.updatedAt || seed.createdAt) > lastMs));
  const staleWatchDue = (snapshot.opportunities || []).some((item) => item.status === "watching" && (!Number.isFinite(Date.parse(item.evidenceFreshAt || item.updatedAt)) || now.getTime() - Date.parse(item.evidenceFreshAt || item.updatedAt) >= intervalMs));
  const cadenceDue = !Number.isFinite(lastMs) || now.getTime() - lastMs >= intervalMs;
  if (manual) return { due: true, reason: "owner_manual", meaningfulCyclesToday: meaningful.length };
  if (activeSeedDue) return { due: true, reason: "owner_seed", meaningfulCyclesToday: meaningful.length };
  if (!cadenceDue) return { due: false, reason: "no_material_change", meaningfulCyclesToday: meaningful.length };
  if (staleWatchDue) return { due: true, reason: "stale_watch", meaningfulCyclesToday: meaningful.length };
  if (cadenceDue) return { due: true, reason: "discovery_cadence", meaningfulCyclesToday: meaningful.length };
  return { due: false, reason: "no_material_change", meaningfulCyclesToday: meaningful.length };
}

export async function runOpportunityDirectorSchedulerTick({ root, provider = null, synthesisProvider = null, researchApproval = null, now = new Date(), manual = false, signal = null }) {
  const snapshot = getOpportunityDirectorSnapshot({ root, now });
  const seeds = snapshot.seeds || [];
  const limits = snapshot.director.discoveryLimits || DEFAULT_DISCOVERY_LIMITS;
  const decision = evaluateOpportunitySchedule({ snapshot, seeds, now, manual, limits });
  if (!decision.due) {
    const result = await runOpportunityWake({ trigger: "scheduled_tick", root, now });
    return { ...result, schedule: decision, costUsd: 0 };
  }
  if (!provider) {
    const result = await runOpportunityWake({ trigger: manual ? "owner_manual" : "scheduled_tick", root, now });
    return { ...result, schedule: { ...decision, due: false, reason: "live_provider_unconfigured" }, costUsd: 0, blocked: true };
  }
  const result = await runOpportunityWake({ trigger: manual ? "owner_manual" : "scheduled_discovery", root, now, researchProvider: provider, reasoningProvider: synthesisProvider, researchApproval, discoveryLimits: limits, signal });
  return { ...result, schedule: decision, costUsd: Number((Number(result.wake.modelCost || 0) + Number(result.wake.researchCost || 0)).toFixed(6)) };
}
