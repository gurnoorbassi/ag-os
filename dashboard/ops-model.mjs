export function clampPercent(value) {
  return Math.max(0, Math.min(100, Number.isFinite(Number(value)) ? Number(value) : 0));
}

export function budgetView(status = {}, readModel = {}) {
  const costs = readModel.costs || {};
  const monthlyMaxUsd = Number(status.anthropicBudget?.limits?.monthlyMaxUsd ?? costs.limits?.monthlyMaxUsd ?? 0);
  const monthlyActualUsd = Number(status.anthropicBudget?.monthlyActualUsd ?? costs.totalRecordedActualUsd ?? 0);
  return {
    monthlyMaxUsd,
    monthlyActualUsd,
    percent: monthlyMaxUsd > 0 ? clampPercent((monthlyActualUsd / monthlyMaxUsd) * 100) : 0,
    callsToday: Number(status.anthropicBudget?.dailyCallCount || 0),
    dailyCallLimit: Number(status.anthropicBudget?.dailyCallLimit || 0),
    perTaskMaxUsd: Number(status.anthropicBudget?.limits?.perTaskMaxUsd ?? costs.limits?.perTaskMaxUsd ?? 0),
    breakerArmed: status.anthropicBudget?.breakerArmed !== false
  };
}

export function jobGlyph(status) {
  if (["done", "complete", "completed"].includes(status)) return "●";
  if (status === "running") return "◐";
  if (status === "waiting_approval") return "▲";
  if (["failed", "blocked", "budget_blocked", "cancelled", "needs_revision"].includes(status)) return "■";
  return "○";
}

export function jobTone(status) {
  if (["done", "complete", "completed"].includes(status)) return "ok";
  if (status === "running") return "active";
  if (status === "waiting_approval") return "warn";
  if (["failed", "blocked", "budget_blocked", "cancelled", "needs_revision"].includes(status)) return "bad";
  return "idle";
}
