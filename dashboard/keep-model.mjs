export function packetStage(status) {
  if (["queued", "planning", "plan_ready"].includes(status)) return "planning";
  if (status === "running") return "forge";
  if (status === "waiting_approval") return "gate";
  if (status === "done") return "archive";
  if (["failed", "blocked", "budget_blocked", "cancelled", "needs_revision"].includes(status)) return "blocked";
  return "idle";
}

export function budgetPercent(actualUsd, monthlyMaxUsd) {
  const actual = Number(actualUsd || 0);
  const maximum = Number(monthlyMaxUsd || 0);
  if (!Number.isFinite(actual) || !Number.isFinite(maximum) || maximum <= 0) return 0;
  return Math.max(0, Math.min(100, (actual / maximum) * 100));
}

export function waitingApprovalJobs(jobs = []) {
  return jobs.filter((job) => job.status === "waiting_approval");
}

export function gateControlsForJob(job) {
  return job?.status === "waiting_approval" ? ["approve", "reject"] : [];
}
