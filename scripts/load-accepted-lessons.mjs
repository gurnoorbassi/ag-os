import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ACCEPTED_DIRS = [
  ".codex/memory/accepted",
  ".codex/memory/lessons"
];
const CANDIDATE_DIR = ".codex/memory/lessons/candidates";
const REJECTED_DIR = ".codex/memory/rejected";
const QUALITY_SCORE_DIR = ".codex/quality-scores";

function readJson(relativePath, root) {
  return JSON.parse(readFileSync(path.join(root, relativePath), "utf8"));
}

function listJson(relativeDir, root) {
  const absoluteDir = path.join(root, relativeDir);
  if (!existsSync(absoluteDir)) {
    return [];
  }

  return readdirSync(absoluteDir)
    .filter((name) => name.endsWith(".json"))
    .filter((name) => !name.endsWith(".template.json"))
    .map((name) => path.join(relativeDir, name).replaceAll("\\", "/"));
}

function byUpdatedAt(left, right) {
  return String(right.updatedAt ?? right.createdAt ?? "").localeCompare(String(left.updatedAt ?? left.createdAt ?? ""));
}

function runtimeUseForLesson(lesson) {
  const existing = lesson.runtimeUse ?? {};
  return {
    allowedForPlanning: existing.allowedForPlanning !== false,
    allowedForCritic: existing.allowedForCritic !== false,
    allowedForBuilder: existing.allowedForBuilder !== false,
    allowedForWorkers: existing.allowedForWorkers !== false,
    grantsPermission: false,
    liveActionsAllowed: false,
    approvalBypassAllowed: false
  };
}

function summarizeLesson(record, recordPath) {
  return {
    ...record,
    recordPath,
    runtimeUse: runtimeUseForLesson(record)
  };
}

function rankAcceptedLesson(lesson, { projectId, archetypeId, outputType, workerType }) {
  let score = 0;
  const reasons = [];
  const appliesTo = new Set(lesson.appliesTo ?? []);

  if (projectId && lesson.projectId === projectId) {
    score += 8;
    reasons.push("same_project");
  }
  if (projectId && appliesTo.has(projectId)) {
    score += 6;
    reasons.push("project_applies_to");
  }
  if (archetypeId && appliesTo.has(archetypeId)) {
    score += 6;
    reasons.push("same_archetype");
  }
  if (outputType && appliesTo.has(outputType)) {
    score += 3;
    reasons.push("same_output_type");
  }
  if (workerType && (appliesTo.has(workerType) || appliesTo.has(`worker:${workerType}`))) {
    score += 2;
    reasons.push("same_worker");
  }
  if (appliesTo.has("any") || appliesTo.has("all")) {
    score += 1;
    reasons.push("globally_applicable");
  }
  const hasSpecificMatch = score > 0;
  if (hasSpecificMatch && ["company", "agent_shared"].includes(lesson.scope)) {
    score += 1;
    reasons.push("shared_scope");
  }
  if (hasSpecificMatch && lesson.confidence === "high") {
    score += 1;
    reasons.push("high_confidence");
  }

  return { score, reasons };
}

function rankQualityExample(example, { projectId, archetypeId, outputType }) {
  let score = 0;
  const reasons = [];
  if (projectId && example.projectId === projectId) {
    score += 8;
    reasons.push("same_project");
  }
  if (archetypeId && example.archetypeId === archetypeId) {
    score += 6;
    reasons.push("same_archetype");
  }
  if (outputType && example.outputType === outputType) {
    score += 3;
    reasons.push("same_output_type");
  }
  if (score > 0 && example.meetsBar === true && example.reviewStatus === "pass") {
    score += 2;
    reasons.push("meets_quality_bar");
  }
  return { score, reasons };
}

export function retrieveRelevantMemory({
  root = process.cwd(),
  projectId,
  archetypeId,
  outputType,
  workerType = "worker",
  lessonLimit = 5,
  exampleLimit = 3
} = {}) {
  const accepted = loadAcceptedLessons({ root });
  const lessons = accepted.lessons
    .map((lesson) => ({ lesson, relevance: rankAcceptedLesson(lesson, { projectId, archetypeId, outputType, workerType }) }))
    .filter(({ relevance }) => relevance.score > 0)
    .sort((left, right) => right.relevance.score - left.relevance.score || byUpdatedAt(left.lesson, right.lesson))
    .slice(0, lessonLimit)
    .map(({ lesson, relevance }) => ({
      lessonId: lesson.lessonId,
      title: lesson.title,
      recordPath: lesson.recordPath,
      scope: lesson.scope,
      confidence: lesson.confidence,
      relevanceScore: relevance.score,
      relevanceReasons: relevance.reasons,
      runtimeUse: lesson.runtimeUse
    }));

  const examples = listJson(QUALITY_SCORE_DIR, root)
    .map((recordPath) => ({ recordPath, record: readJson(recordPath, root) }))
    .filter(({ record }) => record.meetsBar === true && record.reviewStatus === "pass")
    .map(({ recordPath, record }) => ({ recordPath, record, relevance: rankQualityExample(record, { projectId, archetypeId, outputType }) }))
    .filter(({ relevance }) => relevance.score > 0)
    .sort((left, right) => right.relevance.score - left.relevance.score || Number(right.record.overallScore ?? 0) - Number(left.record.overallScore ?? 0) || byUpdatedAt(left.record, right.record))
    .slice(0, exampleLimit)
    .map(({ recordPath, record, relevance }) => ({
      scoreId: record.scoreId,
      recordPath,
      sourcePlanPath: record.sourcePlanPath,
      projectId: record.projectId,
      archetypeId: record.archetypeId,
      outputType: record.outputType,
      overallScore: record.overallScore,
      status: record.status,
      relevanceScore: relevance.score,
      relevanceReasons: relevance.reasons,
      exampleGrantsPermission: false
    }));

  return {
    strategy: "project_archetype_output_similarity_v1",
    query: { projectId: projectId ?? null, archetypeId: archetypeId ?? null, outputType: outputType ?? null, workerType },
    lessons,
    examples,
    acceptedLessonsOnly: true,
    candidatesLoadedAsTruth: false,
    rejectedLoadedAsTruth: false,
    examplesGrantPermission: false,
    memoryGrantsPermission: false
  };
}

export function loadAcceptedLessons({ root = process.cwd(), scopes, appliesTo } = {}) {
  const allowedScopes = scopes ? new Set(scopes) : null;
  const appliesToFilter = appliesTo ? new Set(appliesTo) : null;
  const acceptedPaths = [...new Set(ACCEPTED_DIRS.flatMap((dir) => listJson(dir, root)))];
  const candidatePaths = listJson(CANDIDATE_DIR, root);
  const rejectedPaths = listJson(REJECTED_DIR, root);

  const lessons = acceptedPaths
    .map((recordPath) => ({ recordPath, record: readJson(recordPath, root) }))
    .filter(({ record }) => record.status === "accepted")
    .filter(({ record }) => !allowedScopes || allowedScopes.has(record.scope))
    .filter(({ record }) => {
      if (!appliesToFilter) {
        return true;
      }
      return (record.appliesTo ?? []).some((item) => appliesToFilter.has(item));
    })
    .map(({ record, recordPath }) => summarizeLesson(record, recordPath))
    .sort(byUpdatedAt);

  return {
    lessons,
    acceptedCount: lessons.length,
    candidateCount: candidatePaths.length,
    rejectedCount: rejectedPaths.length,
    candidatesLoadedAsTruth: false,
    rejectedLoadedAsTruth: false,
    memoryGrantsPermission: false
  };
}

export function buildAcceptedLessonRuntimeBriefing({
  root = process.cwd(),
  workerType = "worker",
  scopes,
  appliesTo,
  projectId,
  archetypeId,
  outputType
} = {}) {
  const loaded = loadAcceptedLessons({ root, scopes, appliesTo });
  const relevant = projectId || archetypeId || outputType
    ? retrieveRelevantMemory({ root, workerType, projectId, archetypeId, outputType })
    : null;
  return {
    briefingType: "accepted_lessons_runtime_briefing",
    workerType,
    acceptedLessonCount: loaded.acceptedCount,
    candidateLessonCount: loaded.candidateCount,
    rejectedLessonCount: loaded.rejectedCount,
    candidatesLoadedAsTruth: false,
    rejectedLoadedAsTruth: false,
    memoryGrantsPermission: false,
    lessons: (relevant ? relevant.lessons : loaded.lessons).map((lesson) => ({
      lessonId: lesson.lessonId,
      title: lesson.title,
      scope: lesson.scope,
      confidence: lesson.confidence,
      recordPath: lesson.recordPath,
      ...(lesson.sources ? { sources: lesson.sources } : {}),
      ...(lesson.appliesTo ? { appliesTo: lesson.appliesTo } : {}),
      ...(lesson.relevanceScore ? { relevanceScore: lesson.relevanceScore, relevanceReasons: lesson.relevanceReasons } : {}),
      runtimeUse: lesson.runtimeUse
    })),
    relevantExamples: relevant?.examples ?? [],
    retrievalStrategy: relevant?.strategy ?? "accepted_lessons_all_v1",
    limitations: [
      "Accepted lessons are advisory operating knowledge.",
      "Accepted lessons do not grant permission for live actions.",
      "Candidate and rejected lessons are not loaded as truth."
    ]
  };
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) {
      continue;
    }
    const key = item.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      options[key] = true;
      continue;
    }
    options[key] = value;
    index += 1;
  }
  return options;
}

function runCli() {
  const args = parseArgs(process.argv.slice(2));
  const briefing = buildAcceptedLessonRuntimeBriefing({
    workerType: args.worker || "worker",
    scopes: args.scopes ? String(args.scopes).split(",").filter(Boolean) : undefined,
    appliesTo: args["applies-to"] ? String(args["applies-to"]).split(",").filter(Boolean) : undefined,
    projectId: args.project,
    archetypeId: args.archetype,
    outputType: args.output
  });
  console.log(JSON.stringify(briefing, null, 2));
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  try {
    runCli();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
