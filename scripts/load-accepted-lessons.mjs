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

export function buildAcceptedLessonRuntimeBriefing({ root = process.cwd(), workerType = "worker", scopes, appliesTo } = {}) {
  const loaded = loadAcceptedLessons({ root, scopes, appliesTo });
  return {
    briefingType: "accepted_lessons_runtime_briefing",
    workerType,
    acceptedLessonCount: loaded.acceptedCount,
    candidateLessonCount: loaded.candidateCount,
    rejectedLessonCount: loaded.rejectedCount,
    candidatesLoadedAsTruth: false,
    rejectedLoadedAsTruth: false,
    memoryGrantsPermission: false,
    lessons: loaded.lessons.map((lesson) => ({
      lessonId: lesson.lessonId,
      title: lesson.title,
      scope: lesson.scope,
      confidence: lesson.confidence,
      recordPath: lesson.recordPath,
      sources: lesson.sources,
      appliesTo: lesson.appliesTo ?? [],
      runtimeUse: lesson.runtimeUse
    })),
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
    appliesTo: args["applies-to"] ? String(args["applies-to"]).split(",").filter(Boolean) : undefined
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
