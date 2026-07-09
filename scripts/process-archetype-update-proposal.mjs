import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { isoTimestamp, slugify, writeJson } from "./lib/runtime/common.mjs";

const ALLOWED_SECTIONS = new Set([
  "professionalExpectations",
  "minimumQualityBar",
  "commonModules",
  "uxExpectations",
  "knownPitfalls",
  "approvalGates",
  "qualityChecklist",
  "whatToBuildFirst",
  "whatNotToOverbuildEarly",
  "stopConditions"
]);
const UNSAFE_PATTERNS = [
  /skip\s+(?:owner\s+)?approval/i,
  /bypass\s+(?:approval|security|cost|constitution|gate)/i,
  /deploy\s+without\s+approval/i,
  /post\s+without\s+approval/i,
  /store\s+(?:tokens?|passwords?|credentials?|secrets?)/i
];

function readJson(filePath, root) {
  const absolute = path.isAbsolute(filePath) ? filePath : path.join(root, filePath);
  return JSON.parse(readFileSync(absolute, "utf8"));
}

function findArchetype(archetypeId, root) {
  const directory = path.join(root, ".codex/archetypes");
  if (!existsSync(directory)) {
    return null;
  }
  for (const name of readdirSync(directory).filter((item) => item.endsWith(".json")).sort()) {
    const recordPath = `.codex/archetypes/${name}`;
    const record = readJson(recordPath, root);
    if (record.archetypeId === archetypeId && record.status === "active") {
      return { record, recordPath };
    }
  }
  return null;
}

function normalizeReference(filePath, root) {
  const absolute = path.resolve(path.isAbsolute(filePath) ? filePath : path.join(root, filePath));
  const relative = path.relative(root, absolute);
  return !relative.startsWith("..") && !path.isAbsolute(relative)
    ? relative.replaceAll("\\", "/")
    : absolute.replaceAll("\\", "/");
}

export function buildArchetypeUpdateProposal({
  acceptedLessonPath,
  archetypeId,
  targetSection,
  proposedAddition,
  root = process.cwd(),
  now = new Date()
}) {
  if (!acceptedLessonPath || !archetypeId || !targetSection) {
    throw new Error("acceptedLessonPath, archetypeId, and targetSection are required");
  }
  if (!ALLOWED_SECTIONS.has(targetSection)) {
    throw new Error(`unsupported archetype target section: ${targetSection}`);
  }

  const lesson = readJson(acceptedLessonPath, root);
  if (lesson.status !== "accepted") {
    throw new Error("only accepted lessons can create archetype update proposals");
  }
  if (!(lesson.appliesTo ?? []).includes(archetypeId)) {
    throw new Error(`accepted lesson does not apply to ${archetypeId}`);
  }

  const archetype = findArchetype(archetypeId, root);
  if (!archetype) {
    throw new Error(`active archetype not found: ${archetypeId}`);
  }

  const addition = String(proposedAddition || lesson.lesson || "").trim();
  if (!addition) {
    throw new Error("proposed archetype addition is required");
  }
  if (UNSAFE_PATTERNS.some((pattern) => pattern.test(addition))) {
    throw new Error("archetype proposal must not weaken approval, security, credential, or live-action gates");
  }

  const timestamp = isoTimestamp(now);
  const proposalId = `archetype-update-${slugify(`${lesson.lessonId}-${archetypeId}-${targetSection}`)}`;
  return {
    "$schema": "../../../schemas/archetype-update-proposal.schema.json",
    proposalId,
    status: "draft",
    acceptedLessonId: lesson.lessonId,
    acceptedLessonPath: normalizeReference(acceptedLessonPath, root),
    archetypeId,
    archetypePath: archetype.recordPath,
    targetSection,
    proposedAddition: addition,
    rationale: `Promote accepted lesson ${lesson.lessonId} into the ${archetypeId} ${targetSection} through a reviewed pull request.`,
    evidence: [...new Set([normalizeReference(acceptedLessonPath, root), ...(lesson.sources ?? [])])],
    requiresReviewedPr: true,
    autoApplyAllowed: false,
    grantsPermission: false,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

export function writeArchetypeUpdateProposal(options) {
  const record = buildArchetypeUpdateProposal(options);
  const filePath = `.codex/memory/archetype-updates/${record.proposalId}.json`;
  writeJson(filePath, record, options.root ?? process.cwd());
  return { filePath, record };
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    if (!argv[index].startsWith("--")) continue;
    options[argv[index].slice(2)] = argv[index + 1];
    index += 1;
  }
  return options;
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const result = writeArchetypeUpdateProposal({
      acceptedLessonPath: args.lesson,
      archetypeId: args.archetype,
      targetSection: args.section,
      proposedAddition: args.addition
    });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
