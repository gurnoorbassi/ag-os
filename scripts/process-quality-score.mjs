import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { isoTimestamp, slugify, writeJson } from "./lib/runtime/common.mjs";

const SCRIPT_ID = "scripts/process-quality-score.mjs";
const DIMENSION_KEYS = [
  "completeness",
  "craft",
  "maintainability",
  "ux",
  "security",
  "performance",
  "ownerAcceptance",
  "archetypeFit",
  "costDiscipline"
];

const OUTPUT_TYPE_BY_ARCHETYPE_CATEGORY = {
  website: "website",
  web_app: "app",
  crm: "crm",
  lead_generation: "app",
  social_media_system: "social_media_system",
  ai_tool: "app",
  presentation: "presentation",
  dashboard: "dashboard",
  automation: "automation",
  training_platform: "app",
  document: "docs",
  other: "docs"
};

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
    throw new Error("plan path is required");
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
  const absolutePath = resolveInputPath(filePath, root);
  return JSON.parse(readFileSync(absolutePath, "utf8"));
}

function extractArchetypeId(plan) {
  const archetypeId = plan?.basis?.productArchetype ?? plan?.basis?.archetypeId;
  if (typeof archetypeId !== "string" || !/^archetype-[a-z0-9-]+$/.test(archetypeId)) {
    throw new Error("plan must cite a product archetype using a canonical archetype-* id");
  }
  return archetypeId;
}

function findArchetype({ archetypeId, plan, root }) {
  const preferredFile = plan?.basis?.archetypeFile;
  if (typeof preferredFile === "string" && preferredFile.length > 0) {
    const preferredPath = resolveInputPath(preferredFile, root);
    if (existsSync(preferredPath)) {
      const record = readJsonFromPath(preferredFile, root);
      if (record.archetypeId === archetypeId && record.status === "active") {
        return {
          archetype: record,
          archetypeFile: normalizeReference(preferredFile, root)
        };
      }
    }
  }

  const archetypeDir = path.join(root, ".codex/archetypes");
  if (existsSync(archetypeDir)) {
    for (const name of readDirSorted(archetypeDir)) {
      if (!name.endsWith(".json")) {
        continue;
      }
      const candidatePath = `.codex/archetypes/${name}`;
      const record = readJsonFromPath(candidatePath, root);
      if (record.archetypeId === archetypeId && record.status === "active") {
        return {
          archetype: record,
          archetypeFile: candidatePath
        };
      }
    }
  }

  throw new Error(`active archetype record not found for ${archetypeId}`);
}

function readDirSorted(absoluteDir) {
  return [...new Set(readdirSync(absoluteDir))].sort((left, right) => left.localeCompare(right));
}

function hasText(values, patterns) {
  const text = values
    .flatMap((value) => Array.isArray(value) ? value : [value])
    .filter((value) => typeof value === "string")
    .join(" ")
    .toLowerCase();
  return patterns.some((pattern) => text.includes(pattern));
}

function clampScore(value) {
  return Math.max(0, Math.min(10, Math.round(value)));
}

function averageScores(dimensions) {
  const total = DIMENSION_KEYS.reduce((sum, key) => sum + dimensions[key], 0);
  return Math.round((total / DIMENSION_KEYS.length) * 10) / 10;
}

function reviewStatus({ overallScore, dimensions }) {
  if (overallScore >= 8 && Object.values(dimensions).every((value) => value >= 7)) {
    return "pass";
  }
  if (overallScore >= 6) {
    return "review";
  }
  return "fail";
}

function dimensionScores({ plan, archetype, evidenceReferences }) {
  const tasks = Array.isArray(plan.tasks) ? plan.tasks : [];
  const gates = Array.isArray(plan.approvalGates) ? plan.approvalGates : [];
  const stops = Array.isArray(plan.stopConditions) ? plan.stopConditions : [];
  const basis = plan.basis ?? {};
  const safety = plan.safety ?? {};
  const qualityBar = Array.isArray(basis.qualityBar) ? basis.qualityBar : [];

  const appliedContentCount = [
    basis.appliedPhases,
    basis.appliedWhatToBuildFirst,
    basis.appliedApprovalGates,
    basis.appliedStopConditions,
    basis.appliedKnownPitfalls
  ].filter((items) => Array.isArray(items) && items.length > 0).length;

  const liveControlsPresent = gates.length > 0 &&
    stops.length > 0 &&
    Object.values(safety).every((value) => value === false) &&
    hasText([...gates.map((gate) => gate.reason), ...stops], ["credential", "live", "production", "customer", "paid", "deploy"]);

  const costEstimate = typeof plan.estimatedCostUsd === "number" ? plan.estimatedCostUsd : 0;
  const checklistCoverage = Math.min(
    10,
    5 + Math.min(5, qualityBar.length + (Array.isArray(archetype.qualityChecklist) ? archetype.qualityChecklist.length : 0))
  );

  return {
    completeness: clampScore(5 + Math.min(5, tasks.length / 2 + appliedContentCount)),
    craft: clampScore(6 + (plan.summary ? 1 : 0) + (plan.expectedOutput ? 1 : 0) + (qualityBar.length > 0 ? 1 : 0)),
    maintainability: clampScore(6 + (tasks.every((task) => task.owner && task.status) ? 1 : 0) + (basis.stackChoice ? 1 : 0) + (appliedContentCount > 2 ? 1 : 0)),
    ux: clampScore(checklistCoverage - (evidenceReferences.length === 0 ? 1 : 0)),
    security: liveControlsPresent ? 10 : 5,
    performance: evidenceReferences.length > 0 ? 8 : 7,
    ownerAcceptance: gates.every((gate) => gate.approvalRequired === true) && gates.length > 0 ? 8 : 5,
    archetypeFit: basis.productArchetype === archetype.archetypeId && appliedContentCount > 0 ? 10 : 6,
    costDiscipline: costEstimate === 0 ? 10 : (costEstimate <= 5 ? 8 : 4)
  };
}

function recommendationsFor({ dimensions, archetype }) {
  const recommendations = [];
  for (const [dimension, score] of Object.entries(dimensions)) {
    if (score < 8) {
      recommendations.push(`Improve ${dimension} evidence before promotion beyond plan-only work.`);
    }
  }

  if (Array.isArray(archetype.uxExpectations) && dimensions.ux < 8) {
    recommendations.push("Carry archetype UX expectations into the next plan artifact before build mode.");
  }

  if (recommendations.length === 0) {
    recommendations.push("Keep using archetype-backed phases, gates, and quality checklist items for future plan-only work.");
  }

  return [...new Set(recommendations)];
}

export function buildQualityScoreRecord({
  planPath,
  commandIntakePath,
  evidencePath,
  root = process.cwd(),
  now = new Date()
}) {
  const plan = readJsonFromPath(planPath, root);
  const archetypeId = extractArchetypeId(plan);
  const { archetype, archetypeFile } = findArchetype({ archetypeId, plan, root });
  const timestamp = isoTimestamp(now);
  const dateSlug = timestamp.slice(0, 10).replaceAll("-", "");
  const scoreSlug = slugify(`${dateSlug}-${String(plan.planId || "plan").replace(/^plan-/, "")}`);
  const evidenceReferences = [normalizeReference(planPath, root)];
  if (commandIntakePath) {
    evidenceReferences.push(normalizeReference(commandIntakePath, root));
  }
  if (evidencePath) {
    evidenceReferences.push(normalizeReference(evidencePath, root));
  }

  const dimensions = dimensionScores({
    plan,
    archetype,
    evidenceReferences: evidencePath ? [evidencePath] : []
  });
  const overallScore = averageScores(dimensions);
  const status = reviewStatus({ overallScore, dimensions });

  return {
    "$schema": "../../schemas/quality-score.schema.json",
    scoreId: `quality-score-${scoreSlug}`,
    status: "candidate",
    scoreType: evidencePath ? "product_quality_score" : "plan_quality_score",
    projectId: plan.projectId || "project-unregistered",
    planId: plan.planId,
    sourcePlanPath: normalizeReference(planPath, root),
    outputType: OUTPUT_TYPE_BY_ARCHETYPE_CATEGORY[archetype.category] || "docs",
    archetypeId,
    archetypeFile,
    checklistItemsEvaluated: [
      ...(archetype.minimumQualityBar || []),
      ...(archetype.qualityChecklist || [])
    ],
    dimensions,
    overallScore,
    meetsBar: status === "pass",
    reviewStatus: status,
    improvementRecommendations: recommendationsFor({ dimensions, archetype }),
    lessonCandidates: [],
    evidence: [...new Set(evidenceReferences)],
    generatedBy: SCRIPT_ID,
    limitations: evidencePath
      ? ["Score is limited to the provided source-controlled evidence references."]
      : ["No product output was provided; this is a plan quality only score and does not represent owner acceptance or product quality."],
    notes: "Candidate score only. It does not authorize execution, deployment, live connector use, or accepted lessons.",
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

export function writeQualityScoreRecord({
  planPath,
  commandIntakePath,
  evidencePath,
  outputPath,
  root = process.cwd(),
  now = new Date()
}) {
  const record = buildQualityScoreRecord({
    planPath,
    commandIntakePath,
    evidencePath,
    root,
    now
  });
  const targetPath = outputPath || `.codex/quality-scores/${record.scoreId}.json`;
  const absoluteTarget = path.isAbsolute(targetPath) ? targetPath : path.join(root, targetPath);
  if (path.isAbsolute(targetPath)) {
    mkdirSync(path.dirname(absoluteTarget), { recursive: true });
    writeFileSync(absoluteTarget, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  } else {
    writeJson(targetPath, record, root);
  }
  return { filePath: path.isAbsolute(targetPath) ? absoluteTarget : targetPath, record };
}

function runCli() {
  const args = parseArgs(process.argv.slice(2));
  if (args.status && args.status !== "candidate") {
    throw new Error("quality score processor can only create candidate scores");
  }
  const result = writeQualityScoreRecord({
    planPath: args.plan,
    commandIntakePath: args.command,
    evidencePath: args.evidence,
    outputPath: args.out,
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
