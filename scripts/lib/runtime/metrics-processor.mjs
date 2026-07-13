import path from "node:path";
import process from "node:process";
import { listDirectJson, readJson } from "./common.mjs";

function round(value, places = 2) {
  const factor = 10 ** places;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

function average(values) {
  return values.length === 0 ? 0 : round(values.reduce((sum, value) => sum + Number(value), 0) / values.length);
}

function records(relativeDir, root, prefix) {
  return listDirectJson(relativeDir, { root })
    .filter((recordPath) => !prefix || path.basename(recordPath).startsWith(prefix))
    .map((recordPath) => ({ ...readJson(recordPath, root), recordPath }));
}

function concurrentPlanningMetrics({ plans, registeredProjectIds }) {
  const windowMs = 5 * 60 * 1000;
  const eligible = plans
    .filter((plan) => registeredProjectIds.has(plan.projectId))
    .filter((plan) => !Number.isNaN(Date.parse(plan.createdAt)))
    .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));
  const pairs = [];
  const projects = new Set();

  for (let leftIndex = 0; leftIndex < eligible.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < eligible.length; rightIndex += 1) {
      const left = eligible[leftIndex];
      const right = eligible[rightIndex];
      const deltaMs = Date.parse(right.createdAt) - Date.parse(left.createdAt);
      if (deltaMs > windowMs) {
        break;
      }
      if (left.projectId === right.projectId) {
        continue;
      }
      pairs.push({
        firstPlanId: left.planId,
        firstProjectId: left.projectId,
        secondPlanId: right.planId,
        secondProjectId: right.projectId,
        deltaSeconds: round(deltaMs / 1000)
      });
      projects.add(left.projectId);
      projects.add(right.projectId);
    }
  }

  return {
    evidenceType: "registered_project_plans_within_five_minutes",
    concurrentProjectPairCount: pairs.length,
    projectsInConcurrentBatches: [...projects].sort(),
    concurrentPlanningProven: projects.size >= 2,
    latestPairs: pairs.slice(-5)
  };
}

export function computeOperationalMetrics({ root = process.cwd() } = {}) {
  const costs = records(".codex/costs", root, "cost-ledger-");
  const scores = records(".codex/quality-scores", root, "quality-score-")
    .filter((score) => typeof score.overallScore === "number")
    .sort((left, right) => String(left.updatedAt ?? left.createdAt ?? "").localeCompare(String(right.updatedAt ?? right.createdAt ?? "")));
  const critiques = records(".codex/critiques", root, "critique-");
  const jobs = records(".codex/jobs", root, "job-");
  const plans = records(".codex/plans", root, "plan-");
  const acceptedLessons = [
    ...records(".codex/memory/accepted", root, "lesson-"),
    ...records(".codex/memory/lessons", root, "lesson-")
  ].filter((lesson) => lesson.status === "accepted");
  const skills = records(".codex/skills", root, "skill-");
  const projectRegistry = readJson(".codex/projects/registry.json", root);
  const registeredProjectIds = new Set((projectRegistry.projects ?? []).map((project) => project.projectId));
  const acceptedLessonIds = new Set(acceptedLessons.map((lesson) => lesson.lessonId));

  const estimatedUsd = costs.reduce((sum, ledger) => sum + Number(ledger.summary?.estimatedTaskCostUsd ?? 0), 0);
  const actualUsd = costs.reduce((sum, ledger) => sum + Number(ledger.summary?.actualTaskCostUsd ?? 0), 0);
  const qualityValues = scores.map((score) => score.overallScore);
  const recentValues = qualityValues.slice(-5);
  const priorValues = qualityValues.slice(-10, -5);
  const critiquesWithRequiredFixes = critiques.filter((critique) => (critique.requiredFixes ?? []).length > 0);
  const eligiblePlans = plans.filter((plan) => plan.basis?.productArchetype);
  const plansUsingLessons = eligiblePlans.filter((plan) =>
    (plan.basis?.appliedLessons ?? []).some((lessonId) => acceptedLessonIds.has(lessonId))
  );
  const plansUsingExamples = eligiblePlans.filter((plan) => (plan.basis?.relevantMemory?.exampleScorePaths ?? []).length > 0);
  const plansUsingSkills = eligiblePlans.filter((plan) => (plan.basis?.appliedSkills ?? []).length > 0);
  const scaledOperations = concurrentPlanningMetrics({ plans, registeredProjectIds });

  return {
    status: "computed_from_source_records",
    generatedFromLiveSystems: false,
    cost: {
      ledgerCount: costs.length,
      estimatedUsd: round(estimatedUsd),
      actualUsd: round(actualUsd),
      varianceUsd: round(actualUsd - estimatedUsd),
      variancePercent: estimatedUsd === 0 ? 0 : round(((actualUsd - estimatedUsd) / estimatedUsd) * 100)
    },
    quality: {
      scoreCount: scores.length,
      averageScore: average(qualityValues),
      passCount: scores.filter((score) => score.meetsBar === true && score.reviewStatus === "pass").length,
      recentAverage: average(recentValues),
      priorAverage: average(priorValues),
      trendDelta: priorValues.length === 0 ? 0 : round(average(recentValues) - average(priorValues))
    },
    rework: {
      critiqueCount: critiques.length,
      critiquesRequiringFixes: critiquesWithRequiredFixes.length,
      requiredFixCount: critiques.reduce((sum, critique) => sum + (critique.requiredFixes ?? []).length, 0),
      failedJobCount: jobs.filter((job) => job.status === "failed").length,
      reworkSignalRatePercent: critiques.length === 0 ? 0 : round((critiquesWithRequiredFixes.length / critiques.length) * 100)
    },
    lessonReuse: {
      acceptedLessonCount: acceptedLessons.length,
      eligiblePlanCount: eligiblePlans.length,
      plansUsingAcceptedLessons: plansUsingLessons.length,
      plansUsingQualityExamples: plansUsingExamples.length,
      plansUsingSkills: plansUsingSkills.length,
      lessonReuseRatePercent: eligiblePlans.length === 0 ? 0 : round((plansUsingLessons.length / eligiblePlans.length) * 100),
      exampleReuseRatePercent: eligiblePlans.length === 0 ? 0 : round((plansUsingExamples.length / eligiblePlans.length) * 100),
      skillReuseRatePercent: eligiblePlans.length === 0 ? 0 : round((plansUsingSkills.length / eligiblePlans.length) * 100),
      skillApplicationsRecorded: skills.reduce((sum, skill) => sum + Number(skill.evidence?.timesApplied ?? 0), 0)
    },
    scaledOperations,
    limitations: [
      "Metrics are computed only from source-controlled AG OS records.",
      "Rework rate is a deterministic signal from required critique fixes, not time tracking.",
      "Zero accepted lessons produces a truthful zero lesson-reuse rate.",
      "Concurrent planning proves distinct registered projects progressed through planning in one operating batch; it does not claim simultaneous worker execution.",
      "Metrics do not grant approval or authorize live operations."
    ]
  };
}
