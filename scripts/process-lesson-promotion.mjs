import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { isoTimestamp, slugify, writeJson } from "./lib/runtime/common.mjs";

const ACCEPTED_DIRS = [
  ".codex/memory/accepted",
  ".codex/memory/lessons"
];
const FORBIDDEN_LESSON_PATTERNS = [
  /skip\s+(?:owner\s+)?approval/i,
  /bypass\s+(?:approval|security|cost|constitution|gate)/i,
  /ignore\s+(?:cost|security|approval|constitution)/i,
  /approval\s+(?:is\s+)?(?:not|required\s+)?(?:no\s+longer\s+required|optional)/i,
  /store\s+(?:tokens?|passwords?|credentials?|secrets?)/i,
  /live\s+(?:posting|deployment|connector|oauth|analytics|workflow)\s+is\s+allowed/i
];

function readJsonFromPath(filePath, root) {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(root, filePath);
  return JSON.parse(readFileSync(absolutePath, "utf8"));
}

function normalizeReference(filePath, root) {
  const absolutePath = path.resolve(path.isAbsolute(filePath) ? filePath : path.join(root, filePath));
  const relative = path.relative(root, absolutePath);
  if (!relative.startsWith("..") && !path.isAbsolute(relative)) {
    return relative.replaceAll("\\", "/");
  }
  return absolutePath.replaceAll("\\", "/");
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

function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function sameScope(left, right) {
  return left.scope === right.scope;
}

function overlappingAppliesTo(left, right) {
  const leftItems = new Set(left.appliesTo ?? []);
  const rightItems = new Set(right.appliesTo ?? []);
  if (leftItems.size === 0 || rightItems.size === 0) {
    return true;
  }
  return [...leftItems].some((item) => rightItems.has(item));
}

function promotionRuntimeUse() {
  return {
    allowedForPlanning: true,
    allowedForCritic: true,
    allowedForBuilder: true,
    allowedForWorkers: true,
    grantsPermission: false,
    liveActionsAllowed: false,
    approvalBypassAllowed: false
  };
}

function acceptedLessonNotes(candidateNotes) {
  const retained = typeof candidateNotes === "string" && !/candidate|not accepted (?:permanent )?truth/i.test(candidateNotes)
    ? candidateNotes.trim()
    : "";
  return [
    retained,
    "Accepted lesson is runtime-readable advisory knowledge only. It grants no permission for live actions."
  ].filter(Boolean).join(" ");
}

export function assertLessonTextIsSafe(lesson) {
  const text = [
    lesson.title,
    lesson.lesson,
    lesson.whyThisMatters,
    lesson.whenToUse,
    lesson.whenNotToUse,
    lesson.notes
  ].filter(Boolean).join(" ");

  for (const pattern of FORBIDDEN_LESSON_PATTERNS) {
    const match = text.match(pattern);
    if (!match) continue;
    const prefix = text.slice(Math.max(0, match.index - 160), match.index).toLowerCase();
    const explicitlyProhibited = /(?:do not|don't|never|must not|cannot|can't|may not)\b[^.!?]{0,150}$/.test(prefix);
    if (explicitlyProhibited) continue;
    throw new Error("lesson must not relax security, approval, cost, or live-action rules");
  }
}

export function detectLessonConflicts({ candidatePath, candidate, root = process.cwd(), now = new Date() }) {
  const sourceCandidate = candidate ?? readJsonFromPath(candidatePath, root);
  const candidateTitle = normalizeText(sourceCandidate.title);
  const candidateLesson = normalizeText(sourceCandidate.lesson);
  const conflicts = [];

  for (const acceptedPath of ACCEPTED_DIRS.flatMap((dir) => listJson(dir, root))) {
    const accepted = readJsonFromPath(acceptedPath, root);
    if (accepted.status !== "accepted") {
      continue;
    }
    if (!sameScope(sourceCandidate, accepted) || !overlappingAppliesTo(sourceCandidate, accepted)) {
      continue;
    }

    const sameTitle = normalizeText(accepted.title) === candidateTitle;
    const differentLesson = normalizeText(accepted.lesson) !== candidateLesson;
    if (!sameTitle || !differentLesson) {
      continue;
    }

    conflicts.push({
      "$schema": "../../../schemas/lesson-promotion.schema.json",
      recordType: "lesson_conflict",
      promotionId: `lesson-conflict-${slugify(`${sourceCandidate.lessonId}-${accepted.lessonId}`)}`,
      candidateLessonId: sourceCandidate.lessonId,
      existingLessonId: accepted.lessonId,
      status: "blocked",
      scope: sourceCandidate.scope,
      reason: "Candidate lesson title matches an accepted lesson in the same scope but the lesson body differs.",
      evidence: [
        normalizeReference(candidatePath ?? "candidate-inline", root),
        acceptedPath
      ],
      requiredAction: "Owner or AG OS reviewer must resolve the conflict before promotion.",
      createdAt: isoTimestamp(now),
      updatedAt: isoTimestamp(now)
    });
  }

  return conflicts;
}

export function assertOwnerApproval({ approvalId, approvedBy, evidence, candidateLessonId, root = process.cwd(), now = new Date() }) {
  if (!approvalId || !approvedBy || !Array.isArray(evidence) || evidence.length === 0) {
    throw new Error("owner approval is required before promoting a lesson candidate");
  }
  const approvalPath = path.join(root, ".codex", "approvals", `${approvalId}.json`);
  if (!existsSync(approvalPath)) throw new Error(`owner approval record does not exist: ${approvalId}`);
  const approval = readJsonFromPath(approvalPath, root);
  if (approval.approvalId !== approvalId) throw new Error("owner approval record ID does not match the requested approval");
  if (approval.status !== "approved") throw new Error("owner approval is not active");
  const expiresAt = Date.parse(approval.expiresAt);
  if (!Number.isFinite(expiresAt) || expiresAt <= now.getTime()) throw new Error("owner approval is expired or has an invalid expiration");
  if (approval.approvedBy !== approvedBy || approval.ownerId !== approvedBy) throw new Error("owner approval identity does not match the promotion request");
  const ownerPath = path.join(root, ".codex", "owners", `${approvedBy}.json`);
  if (!existsSync(ownerPath)) throw new Error(`approved owner record does not exist: ${approvedBy}`);
  const owner = readJsonFromPath(ownerPath, root);
  if (owner.id !== approvedBy || owner.status !== "active" || owner.authorityLevel !== "final") {
    throw new Error("approvedBy must match the active final owner record");
  }
  if (!approval.approvalRequiredFor?.includes("lesson_promotion") || !approval.approvedActions?.includes("promote_named_lesson")) {
    throw new Error("owner approval does not authorize lesson promotion");
  }
  const approvalScope = [approval.requestedAction, approval.target, approval.scope, approval.approvalText].filter(Boolean).join(" ");
  if (!candidateLessonId || !approvalScope.includes(candidateLessonId)) {
    throw new Error("owner approval does not name this lesson candidate");
  }
  if (!approval.evidence?.some((item) => item?.verified === true)) throw new Error("owner approval has no verified evidence");
  for (const evidencePath of evidence) {
    if (typeof evidencePath !== "string" || !evidencePath.trim()) throw new Error("lesson promotion evidence paths must be non-empty strings");
    const absoluteEvidence = path.resolve(root, evidencePath);
    const relativeEvidence = path.relative(root, absoluteEvidence);
    if (relativeEvidence.startsWith("..") || path.isAbsolute(relativeEvidence) || !existsSync(absoluteEvidence)) {
      throw new Error(`lesson promotion evidence path does not exist inside AG OS: ${evidencePath}`);
    }
  }
  return approval;
}

export function promoteLessonCandidate({
  candidatePath,
  root = process.cwd(),
  approvalId,
  approvedBy,
  evidence = [],
  now = new Date(),
  writeRecord = true
}) {
  if (!candidatePath) {
    throw new Error("candidatePath is required");
  }
  const candidate = readJsonFromPath(candidatePath, root);
  if (candidate.status !== "candidate") {
    throw new Error("only candidate lessons can be promoted");
  }
  assertOwnerApproval({ approvalId, approvedBy, evidence, candidateLessonId: candidate.lessonId, root, now });

  const conflicts = detectLessonConflicts({ candidatePath, candidate, root, now });
  if (conflicts.length > 0) {
    throw new Error(`conflicting accepted lesson blocks promotion: ${conflicts[0].existingLessonId}`);
  }

  assertLessonTextIsSafe(candidate);

  const timestamp = isoTimestamp(now);
  const relativeCandidatePath = normalizeReference(candidatePath, root);
  const record = {
    ...candidate,
    "$schema": "../../../schemas/lesson.schema.json",
    status: "accepted",
    promotion: {
      ...(candidate.promotion ?? {}),
      approvalId,
      approvedBy,
      approvedAt: timestamp,
      evidence,
      sourceCandidatePath: relativeCandidatePath
    },
    runtimeUse: promotionRuntimeUse(),
    updatedAt: timestamp,
    notes: acceptedLessonNotes(candidate.notes)
  };
  const filePath = `.codex/memory/accepted/${record.lessonId}.json`;
  if (writeRecord) {
    writeJson(filePath, record, root);
  }
  return { filePath, record };
}

export function rejectLessonCandidate({
  candidatePath,
  root = process.cwd(),
  rejectedBy,
  reason,
  now = new Date(),
  writeRecord = true
}) {
  if (!candidatePath) {
    throw new Error("candidatePath is required");
  }
  if (!rejectedBy || !reason) {
    throw new Error("rejectedBy and reason are required to reject a lesson candidate");
  }

  const candidate = readJsonFromPath(candidatePath, root);
  if (candidate.status !== "candidate") {
    throw new Error("only candidate lessons can be rejected");
  }

  const timestamp = isoTimestamp(now);
  const record = {
    ...candidate,
    "$schema": "../../../schemas/lesson.schema.json",
    status: "rejected",
    rejection: {
      rejectedBy,
      rejectedAt: timestamp,
      reason,
      sourceCandidatePath: normalizeReference(candidatePath, root)
    },
    runtimeUse: {
      allowedForPlanning: false,
      allowedForCritic: false,
      allowedForBuilder: false,
      allowedForWorkers: false,
      grantsPermission: false,
      liveActionsAllowed: false,
      approvalBypassAllowed: false
    },
    updatedAt: timestamp
  };
  const filePath = `.codex/memory/rejected/${record.lessonId}.json`;
  if (writeRecord) {
    writeJson(filePath, record, root);
  }
  return { filePath, record };
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
  const command = args.command || args.action;
  if (command === "promote") {
    const result = promoteLessonCandidate({
      candidatePath: args.candidate,
      approvalId: args.approval,
      approvedBy: args["approved-by"],
      evidence: args.evidence ? String(args.evidence).split(",").filter(Boolean) : []
    });
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (command === "reject") {
    const result = rejectLessonCandidate({
      candidatePath: args.candidate,
      rejectedBy: args["rejected-by"],
      reason: args.reason
    });
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (command === "conflicts") {
    const conflicts = detectLessonConflicts({ candidatePath: args.candidate });
    console.log(JSON.stringify({ conflicts }, null, 2));
    return;
  }
  throw new Error("command must be promote, reject, or conflicts");
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
