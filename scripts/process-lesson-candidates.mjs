import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { DEFAULT_OWNER_ID, isoTimestamp, slugify, writeJson } from "./lib/runtime/common.mjs";

const SCRIPT_ID = "scripts/process-lesson-candidates.mjs";
const BLOCKED_RELAXATION_PATTERNS = [
  /\bskip\b[^.]{0,80}\bapproval\b/i,
  /\bbypass\b[^.]{0,80}\bapproval\b/i,
  /\bignore\b[^.]{0,80}\bcost\b/i,
  /\brelax\b[^.]{0,80}\bsecurity\b/i,
  /\bdisable\b[^.]{0,80}\bvalidation\b/i,
  /\bdeploy\b[^.]{0,80}\bwithout\b[^.]{0,80}\bapproval\b/i,
  /\bpost\b[^.]{0,80}\bwithout\b[^.]{0,80}\bapproval\b/i,
  /\buse\b[^.]{0,80}\bcredentials\b[^.]{0,80}\bwithout\b[^.]{0,80}\bapproval\b/i,
  /\blower\b[^.]{0,80}\bcost\b[^.]{0,80}\blimit/i
];

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

function resolveInputPath(filePath, root) {
  if (!filePath) {
    throw new Error("quality score path is required");
  }
  return path.isAbsolute(filePath) ? filePath : path.join(root, filePath);
}

function normalizeReference(filePath, root) {
  if (!filePath) {
    return null;
  }

  const absolute = path.resolve(resolveInputPath(filePath, root));
  const relative = path.relative(root, absolute);
  if (!relative.startsWith("..") && !path.isAbsolute(relative)) {
    return relative.replaceAll("\\", "/");
  }
  return absolute.replaceAll("\\", "/");
}

function readJsonFromPath(filePath, root) {
  return JSON.parse(readFileSync(resolveInputPath(filePath, root), "utf8"));
}

function textForSafetyCheck(record) {
  return [
    record.title,
    record.lesson,
    record.whyThisMatters,
    record.whenToUse,
    record.whenNotToUse,
    record.notes
  ].filter(Boolean).join(" ");
}

export function assertLessonCandidateIsSafe(record) {
  const text = textForSafetyCheck(record);
  if (BLOCKED_RELAXATION_PATTERNS.some((pattern) => pattern.test(text))) {
    throw new Error("lesson candidate must not relax security, approval, or cost rules");
  }
}

function sourceReferences({ qualityScore, qualityScorePath, planPath, auditPath, costLedgerPath, validationResultPath, root }) {
  return [
    qualityScorePath ? normalizeReference(qualityScorePath, root) : null,
    qualityScore.sourcePlanPath ?? null,
    planPath ? normalizeReference(planPath, root) : null,
    auditPath ? normalizeReference(auditPath, root) : null,
    costLedgerPath ? normalizeReference(costLedgerPath, root) : null,
    validationResultPath ? normalizeReference(validationResultPath, root) : null
  ].filter(Boolean).filter((item, index, items) => items.indexOf(item) === index);
}

function lowDimensions(qualityScore) {
  return Object.entries(qualityScore.dimensions ?? {})
    .filter(([, value]) => typeof value === "number" && value < 8)
    .map(([dimension, value]) => ({ dimension, value }));
}

function candidateRecord({
  index,
  slugBase,
  qualityScore,
  title,
  lesson,
  whyThisMatters,
  whenToUse,
  whenNotToUse,
  confidence,
  sources,
  now
}) {
  const timestamp = isoTimestamp(now);
  const record = {
    "$schema": "../../../../schemas/lesson.schema.json",
    lessonId: `lesson-${slugBase}-${String(index).padStart(2, "0")}`,
    title,
    lesson,
    sources,
    scope: "agent_shared",
    confidence,
    status: "candidate",
    owner: DEFAULT_OWNER_ID,
    projectId: qualityScore.projectId,
    appliesTo: [
      qualityScore.archetypeId,
      qualityScore.scoreType,
      "quality-score-lesson-loop"
    ].filter(Boolean),
    sourceScoreId: qualityScore.scoreId,
    generatedBy: SCRIPT_ID,
    whyThisMatters,
    whenToUse,
    whenNotToUse,
    notes: "Candidate only. Not accepted truth until owner-reviewed and promoted through the memory learning policy.",
    createdAt: timestamp,
    updatedAt: timestamp
  };
  assertLessonCandidateIsSafe(record);
  return record;
}

export function buildLessonCandidateRecords({
  qualityScore,
  qualityScorePath,
  planPath,
  auditPath,
  costLedgerPath,
  validationResultPath,
  root = process.cwd(),
  now = new Date(),
  status = "candidate"
}) {
  if (status !== "candidate") {
    throw new Error("lesson candidate processor can only create candidate records");
  }
  if (!qualityScore?.scoreId) {
    throw new Error("quality score with scoreId is required");
  }

  const sources = sourceReferences({
    qualityScore,
    qualityScorePath,
    planPath,
    auditPath,
    costLedgerPath,
    validationResultPath,
    root
  });
  if (sources.length === 0) {
    throw new Error("lesson candidates require at least one source reference");
  }

  const slugBase = slugify(qualityScore.scoreId.replace(/^quality-score-/, ""));
  const records = [];
  const low = lowDimensions(qualityScore);

  if (low.length > 0) {
    const dimensions = low.map((item) => `${item.dimension} (${item.value}/10)`).join(", ");
    records.push(candidateRecord({
      index: records.length + 1,
      slugBase,
      qualityScore,
      title: `Improve low quality dimensions for ${qualityScore.archetypeId}`,
      lesson: `When a ${qualityScore.scoreType} has below-bar dimensions, keep the work in plan-only review and strengthen the weak dimensions before build mode. Current weak dimensions: ${dimensions}.`,
      whyThisMatters: "Quality OS should turn weak score evidence into specific planning work instead of treating a score as a pass.",
      whenToUse: "Use when a quality score has one or more dimensions below 8/10.",
      whenNotToUse: "Do not use as authority to approve execution, deployment, live connectors, or paid work.",
      confidence: "medium",
      sources,
      now
    }));
  }

  const recommendations = Array.isArray(qualityScore.improvementRecommendations)
    ? qualityScore.improvementRecommendations
    : [];
  if (recommendations.length > 0 && records.length < 3) {
    records.push(candidateRecord({
      index: records.length + 1,
      slugBase,
      qualityScore,
      title: `Preserve recommendations from ${qualityScore.scoreId}`,
      lesson: `Quality score recommendations should become candidate planning reminders, not automatic memory truth. First recommendation: ${recommendations[0]}`,
      whyThisMatters: "Recommendations are useful only when source-linked and owner-reviewable.",
      whenToUse: "Use when a source-controlled quality score includes concrete improvement recommendations.",
      whenNotToUse: "Do not use when the recommendation is vague, unsourced, sensitive, or conflicts with AG OS safety gates.",
      confidence: "medium",
      sources,
      now
    }));
  }

  if (qualityScore.meetsBar === true && qualityScore.dimensions?.archetypeFit >= 8 && records.length < 3) {
    records.push(candidateRecord({
      index: records.length + 1,
      slugBase,
      qualityScore,
      title: `Reuse archetype-backed scoring for ${qualityScore.outputType}`,
      lesson: `Plans that cite an active archetype and carry its checklist, gates, pitfalls, and stop conditions can be scored without using live services. Keep the score as candidate evidence until owner promotion.`,
      whyThisMatters: "This creates compounding planning intelligence while preserving owner authority and offline safety.",
      whenToUse: "Use for future plan-only dry runs that cite an active product archetype and remain within Cost OS limits.",
      whenNotToUse: "Do not use for product output scoring unless actual output evidence is provided.",
      confidence: "high",
      sources,
      now
    }));
  }

  return records.slice(0, 3);
}

export function writeLessonCandidateRecords({
  qualityScorePath,
  qualityScore,
  planPath,
  auditPath,
  costLedgerPath,
  validationResultPath,
  outputDir = ".codex/memory/lessons/candidates",
  root = process.cwd(),
  now = new Date(),
  status = "candidate"
}) {
  const sourceQualityScore = qualityScore ?? readJsonFromPath(qualityScorePath, root);
  const records = buildLessonCandidateRecords({
    qualityScore: sourceQualityScore,
    qualityScorePath,
    planPath,
    auditPath,
    costLedgerPath,
    validationResultPath,
    root,
    now,
    status
  });
  const written = records.map((record) => {
    const relativePath = `${outputDir.replaceAll("\\", "/").replace(/\/$/, "")}/${record.lessonId}.json`;
    if (path.isAbsolute(outputDir)) {
      const filePath = path.join(outputDir, `${record.lessonId}.json`);
      mkdirSync(path.dirname(filePath), { recursive: true });
      writeFileSync(filePath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
      return { filePath, record };
    }
    writeJson(relativePath, record, root);
    return { filePath: relativePath, record };
  });
  return { records, written };
}

function runCli() {
  const args = parseArgs(process.argv.slice(2));
  const result = writeLessonCandidateRecords({
    qualityScorePath: args["quality-score"],
    planPath: args.plan,
    auditPath: args.audit,
    costLedgerPath: args.cost,
    validationResultPath: args.validation,
    outputDir: args["out-dir"] || ".codex/memory/lessons/candidates",
    status: args.status || "candidate",
    now: args.now ? new Date(args.now) : new Date()
  });
  console.log(JSON.stringify(result, null, 2));
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
