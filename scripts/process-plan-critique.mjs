import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { isoTimestamp, slugify, writeJson } from "./lib/runtime/common.mjs";

const SCRIPT_ID = "scripts/process-plan-critique.mjs";
const DEFAULT_PER_TASK_MAX_USD = 5;

const MANDATORY_GATE_CONTROLS = [
  { key: "live service or connector", patterns: ["live service", "live connector", "connector", "n8n", "netlify"] },
  { key: "credentials", patterns: ["credential"] },
  { key: "deployment", patterns: ["deploy"] },
  { key: "domain or DNS", patterns: ["domain", "dns"] },
  { key: "paid actions", patterns: ["paid"] },
  { key: "production or customer data", patterns: ["production data", "customer data"] },
  { key: "posting, outreach, or phone/voice", patterns: ["posting", "outreach", "phone", "voice"] },
  { key: "protected product projects", patterns: ["lead gen", "ai receptionist"] },
  { key: "Constitution changes", patterns: ["constitution"] }
];

const LIVE_ACTION_PATTERNS = [
  /\bdeploy\b/i,
  /\bconnect\b[^.]{0,80}\b(?:n8n|netlify|postgres|database|email|sms|crm|api|phone|voice)\b/i,
  /\bactivate\b[^.]{0,80}\b(?:n8n|netlify|workflow|phone|voice)\b/i,
  /\bpost\b[^.]{0,80}\b(?:content|video|message|social)\b/i,
  /\bsend\b[^.]{0,80}\b(?:email|sms|message|outreach)\b/i,
  /\bcall\b[^.]{0,80}\b(?:customer|lead|client)\b/i,
  /\buse\b[^.]{0,80}\bcredentials?\b/i,
  /\bcharge\b[^.]{0,80}\bpayment\b/i
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
  return JSON.parse(readFileSync(resolveInputPath(filePath, root), "utf8"));
}

function readJsonIfExists(filePath, root) {
  if (!filePath) {
    return null;
  }
  const absolute = resolveInputPath(filePath, root);
  if (!existsSync(absolute)) {
    return null;
  }
  return readJsonFromPath(filePath, root);
}

function readDirSorted(absoluteDir) {
  return [...new Set(readdirSync(absoluteDir))].sort((left, right) => left.localeCompare(right));
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
        return { archetype: record, archetypeFile: normalizeReference(preferredFile, root) };
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
        return { archetype: record, archetypeFile: candidatePath };
      }
    }
  }

  throw new Error(`active archetype record not found for ${archetypeId}`);
}

function listJsonRecords(relativeDir, root) {
  const absoluteDir = path.join(root, relativeDir);
  if (!existsSync(absoluteDir)) {
    return [];
  }
  return readdirSync(absoluteDir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => path.join(relativeDir, name).replaceAll("\\", "/"));
}

function listLessonReferences(root) {
  return [
    ...listJsonRecords(".codex/memory/lessons", root).filter((lessonPath) => path.basename(lessonPath).startsWith("lesson-")),
    ...listJsonRecords(".codex/memory/lessons/candidates", root).filter((lessonPath) => path.basename(lessonPath).startsWith("lesson-"))
  ];
}

function allText(values) {
  return values
    .flatMap((value) => Array.isArray(value) ? value : [value])
    .filter((value) => typeof value === "string")
    .join(" ")
    .toLowerCase();
}

function planReviewText(plan) {
  return allText([
    plan.summary,
    plan.expectedOutput,
    plan.tools,
    (plan.tasks ?? []).map((task) => task.description)
  ]);
}

function includesAny(text, patterns) {
  return patterns.some((pattern) => text.includes(pattern));
}

function hasAnyOverlap(leftItems, rightItems) {
  const leftText = allText(leftItems);
  return rightItems.some((item) => {
    const itemText = String(item).toLowerCase();
    return itemText.length > 0 && (leftText.includes(itemText) || itemText.split(/\W+/).filter(Boolean).some((word) => word.length > 5 && leftText.includes(word)));
  });
}

function createFinding({ findings, severity, category, message, evidence, requiredFix, optionalImprovement }) {
  const base = slugify(`${category}-${findings.length + 1}`);
  findings.push({
    findingId: `finding-${base}`,
    severity,
    category,
    message,
    evidence,
    ...(requiredFix ? { requiredFix } : {}),
    ...(optionalImprovement ? { optionalImprovement } : {})
  });
}

function perTaskBudget(root) {
  const budget = readJsonIfExists(".codex/costs/budget.json", root);
  return budget?.limits?.perTaskMaxUsd ?? DEFAULT_PER_TASK_MAX_USD;
}

function collectEvidence({ planPath, commandIntakePath, archetypeFile, qualityScorePath, ownerPreferencesPath, lessonReferences, root }) {
  return [
    normalizeReference(planPath, root),
    commandIntakePath ? normalizeReference(commandIntakePath, root) : null,
    archetypeFile,
    qualityScorePath ? normalizeReference(qualityScorePath, root) : null,
    ownerPreferencesPath ? normalizeReference(ownerPreferencesPath, root) : null,
    ...lessonReferences
  ].filter(Boolean).filter((item, index, items) => items.indexOf(item) === index);
}

function checkArchetypeMatch({ plan, archetypeId, commandIntake, qualityScore, planReference, findings }) {
  const commandArchetypeId = commandIntake?.productContext?.archetypeId ?? commandIntake?.understanding?.productArchetype;
  if (commandArchetypeId && commandArchetypeId !== archetypeId) {
    createFinding({
      findings,
      severity: "high",
      category: "archetype_match",
      message: `Plan cites ${archetypeId}, but command intake expects ${commandArchetypeId}.`,
      evidence: [planReference],
      requiredFix: "Revise the plan to cite the same archetype selected during command intake, or document an owner-approved reclassification."
    });
  }

  if (qualityScore?.archetypeId && qualityScore.archetypeId !== archetypeId) {
    createFinding({
      findings,
      severity: "high",
      category: "archetype_match",
      message: `Plan cites ${archetypeId}, but quality score cites ${qualityScore.archetypeId}.`,
      evidence: [planReference],
      requiredFix: "Regenerate the quality score from the same plan and archetype before build-mode promotion."
    });
  }

  if (qualityScore?.planId && plan.planId && qualityScore.planId !== plan.planId) {
    createFinding({
      findings,
      severity: "high",
      category: "quality_score",
      message: `Quality score belongs to ${qualityScore.planId}, not ${plan.planId}.`,
      evidence: [planReference],
      requiredFix: "Use a quality score generated from the same source plan."
    });
  }
}

function checkArchetypeUse({ plan, archetype, planReference, findings }) {
  const basis = plan.basis ?? {};
  const qualityItems = [
    ...(archetype.minimumQualityBar ?? []),
    ...(archetype.qualityChecklist ?? [])
  ];

  if (!hasAnyOverlap(basis.qualityBar ?? [], qualityItems)) {
    createFinding({
      findings,
      severity: "high",
      category: "quality_checklist",
      message: "Plan does not carry the selected archetype quality checklist into its quality bar.",
      evidence: [planReference],
      requiredFix: "Add the archetype minimum quality bar and checklist items to the plan basis before owner review."
    });
  }

  if (!hasAnyOverlap(basis.appliedKnownPitfalls ?? [], archetype.knownPitfalls ?? [])) {
    createFinding({
      findings,
      severity: "medium",
      category: "known_pitfalls",
      message: "Plan does not show how known archetype pitfalls were considered.",
      evidence: [planReference],
      requiredFix: "Add planning warnings for the selected archetype known pitfalls."
    });
  }
}

function checkMandatoryGates({ plan, planReference, findings }) {
  const gateText = allText([
    (plan.approvalGates ?? []).map((gate) => gate.reason),
    plan.basis?.appliedApprovalGates ?? []
  ]);
  const missing = MANDATORY_GATE_CONTROLS.filter((control) => !includesAny(gateText, control.patterns));
  if (missing.length > 0) {
    createFinding({
      findings,
      severity: "high",
      category: "approval_gates",
      message: `Plan is missing mandatory approval gate coverage for: ${missing.map((control) => control.key).join(", ")}.`,
      evidence: [planReference],
      requiredFix: "Add every mandatory approval gate before owner review or build-mode promotion."
    });
  }
}

function checkStopConditions({ plan, planReference, findings }) {
  const stopText = allText([
    plan.stopConditions ?? [],
    plan.basis?.appliedStopConditions ?? [],
    plan.basis?.appliedWhatNotToOverbuildEarly ?? []
  ]);
  const missing = MANDATORY_GATE_CONTROLS.filter((control) => !includesAny(stopText, control.patterns));
  if (missing.length > 0) {
    createFinding({
      findings,
      severity: "high",
      category: "stop_conditions",
      message: `Plan is missing stop condition coverage for: ${missing.map((control) => control.key).join(", ")}.`,
      evidence: [planReference],
      requiredFix: "Add every universal stop condition before owner review or build-mode promotion."
    });
  }
}

function checkCost({ plan, root, planReference, findings }) {
  const maxUsd = perTaskBudget(root);
  const estimate = typeof plan.estimatedCostUsd === "number" ? plan.estimatedCostUsd : 0;
  if (estimate > maxUsd) {
    createFinding({
      findings,
      severity: "high",
      category: "cost_discipline",
      message: `Plan estimated cost is $${estimate}, above the $${maxUsd} per-task Cost OS limit.`,
      evidence: [planReference],
      requiredFix: `Reduce the plan to $${maxUsd} or less, or stop for explicit owner budget approval.`
    });
  }
}

function checkAssumptions({ plan, commandIntake, planReference, findings }) {
  const planAssumptions = plan.basis?.assumptions ?? [];
  const commandAssumptions = commandIntake?.understanding?.assumptions ?? [];
  if (planAssumptions.length === 0 && commandAssumptions.length === 0) {
    createFinding({
      findings,
      severity: "medium",
      category: "assumptions",
      message: "Plan assumptions are not explicit.",
      evidence: [planReference],
      requiredFix: "Add explicit assumptions before the plan reaches the owner or build-mode promotion."
    });
  }

  const criticalUnknowns = commandIntake?.understanding?.criticalUnknowns ?? [];
  if (criticalUnknowns.length > 3) {
    createFinding({
      findings,
      severity: "medium",
      category: "critical_questions",
      message: `Command intake lists ${criticalUnknowns.length} critical questions; AG OS allows at most 3.`,
      evidence: [planReference],
      requiredFix: "Reduce critical questions to the top 3 blockers."
    });
  }
}

function checkLiveActionImplications({ plan, planReference, findings }) {
  const text = planReviewText(plan);
  const gateText = allText([
    (plan.approvalGates ?? []).map((gate) => gate.reason),
    plan.stopConditions ?? []
  ]);
  const impliesLiveAction = LIVE_ACTION_PATTERNS.some((pattern) => pattern.test(text));
  const approvalControlsPresent = includesAny(gateText, ["approval", "owner approval"]);
  if (impliesLiveAction && !approvalControlsPresent) {
    createFinding({
      findings,
      severity: "high",
      category: "live_action_implication",
      message: "Plan language implies live action but does not show an approval gate.",
      evidence: [planReference],
      requiredFix: "Rewrite the plan as plan-only or add the required owner approval gate and stop condition."
    });
  } else if (impliesLiveAction) {
    createFinding({
      findings,
      severity: "high",
      category: "live_action_implication",
      message: "Plan language implies live action; the critic requires explicit plan-only wording before owner review.",
      evidence: [planReference],
      requiredFix: "Remove live execution wording or restate it as a future gated action."
    });
  }
}

function checkQualityScore({ qualityScore, planReference, findings }) {
  if (!qualityScore) {
    createFinding({
      findings,
      severity: "low",
      category: "quality_score",
      message: "No quality score was provided for the critic run.",
      evidence: [planReference],
      optionalImprovement: "Generate a plan-quality score before build-mode promotion."
    });
    return;
  }

  if (qualityScore.reviewStatus && qualityScore.reviewStatus !== "pass") {
    createFinding({
      findings,
      severity: "medium",
      category: "quality_score",
      message: `Quality score review status is ${qualityScore.reviewStatus}.`,
      evidence: [planReference],
      requiredFix: "Resolve quality score recommendations before build-mode promotion."
    });
  }
}

function reviewStatusFor(findings) {
  if (findings.some((finding) => ["high", "critical"].includes(finding.severity))) {
    return "fail";
  }
  if (findings.some((finding) => finding.severity === "medium")) {
    return "review";
  }
  return "pass";
}

export function buildPlanCritiqueRecord({
  planPath,
  commandIntakePath,
  qualityScorePath,
  ownerPreferencesPath = ".codex/owners/preferences/owner-preferences.json",
  root = process.cwd(),
  now = new Date()
}) {
  const plan = readJsonFromPath(planPath, root);
  const archetypeId = extractArchetypeId(plan);
  const { archetype, archetypeFile } = findArchetype({ archetypeId, plan, root });
  const commandIntake = readJsonIfExists(commandIntakePath, root);
  const qualityScore = readJsonIfExists(qualityScorePath, root);
  const ownerPreferences = readJsonIfExists(ownerPreferencesPath, root);
  const lessonReferences = listLessonReferences(root);
  const timestamp = isoTimestamp(now);
  const dateSlug = timestamp.slice(0, 10).replaceAll("-", "");
  const critiqueSlug = slugify(`${dateSlug}-${String(plan.planId || "plan").replace(/^plan-/, "")}`);
  const planReference = normalizeReference(planPath, root);
  const findings = [];

  checkArchetypeMatch({ plan, archetypeId, commandIntake, qualityScore, planReference, findings });
  checkArchetypeUse({ plan, archetype, planReference, findings });
  checkMandatoryGates({ plan, planReference, findings });
  checkStopConditions({ plan, planReference, findings });
  checkCost({ plan, root, planReference, findings });
  checkAssumptions({ plan, commandIntake, planReference, findings });
  checkLiveActionImplications({ plan, planReference, findings });
  checkQualityScore({ qualityScore, planReference, findings });

  if (ownerPreferences?.preferences?.length > 0) {
    createFinding({
      findings,
      severity: "info",
      category: "owner_preferences",
      message: `Critic loaded ${ownerPreferences.preferences.length} owner preference statement(s) as review context.`,
      evidence: [normalizeReference(ownerPreferencesPath, root)],
      optionalImprovement: "Keep owner preferences explicit and source-controlled."
    });
  }

  if (lessonReferences.length > 0) {
    createFinding({
      findings,
      severity: "info",
      category: "lessons",
      message: `Critic loaded ${lessonReferences.length} accepted or candidate lesson reference(s) as advisory context.`,
      evidence: lessonReferences.slice(0, 5),
      optionalImprovement: "Use candidate lessons only as review input until owner promotion."
    });
  }

  const reviewStatus = reviewStatusFor(findings);
  const requiredFixes = [...new Set(findings.map((finding) => finding.requiredFix).filter(Boolean))];
  const optionalImprovements = [...new Set([
    ...findings.map((finding) => finding.optionalImprovement).filter(Boolean),
    reviewStatus === "pass"
      ? "Keep the critic output advisory; it does not authorize live actions or build-mode promotion by itself."
      : "Re-run the critic after planner revision or owner override."
  ])];
  const evidence = collectEvidence({
    planPath,
    commandIntakePath,
    archetypeFile,
    qualityScorePath,
    ownerPreferencesPath: ownerPreferences ? ownerPreferencesPath : null,
    lessonReferences,
    root
  });

  return {
    "$schema": "../../schemas/plan-critique.schema.json",
    critiqueId: `critique-${critiqueSlug}`,
    sourcePlanId: plan.planId,
    sourcePlanPath: planReference,
    ...(commandIntakePath ? { sourceCommandIntakePath: normalizeReference(commandIntakePath, root) } : {}),
    ...(qualityScore ? { qualityScoreId: qualityScore.scoreId, qualityScorePath: normalizeReference(qualityScorePath, root) } : {}),
    archetypeId,
    archetypeFile,
    reviewerType: "critic_worker",
    authority: "advisory_only",
    reviewStatus,
    blocksBuildMode: requiredFixes.length > 0,
    findings,
    requiredFixes,
    optionalImprovements,
    evidence,
    generatedBy: SCRIPT_ID,
    limitations: [
      "Critic output is advisory and cannot approve live actions.",
      "Critic cannot bypass approval gates, create accepted lessons, or create permanent memory.",
      "Critic does not edit the source plan directly."
    ],
    createdAt: timestamp
  };
}

export function writePlanCritiqueRecord({
  planPath,
  commandIntakePath,
  qualityScorePath,
  ownerPreferencesPath,
  outputPath,
  root = process.cwd(),
  now = new Date()
}) {
  const record = buildPlanCritiqueRecord({
    planPath,
    commandIntakePath,
    qualityScorePath,
    ownerPreferencesPath,
    root,
    now
  });
  const targetPath = outputPath || `.codex/critiques/${record.critiqueId}.json`;
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
  const result = writePlanCritiqueRecord({
    planPath: args.plan,
    commandIntakePath: args.command,
    qualityScorePath: args["quality-score"],
    ownerPreferencesPath: args["owner-preferences"],
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
