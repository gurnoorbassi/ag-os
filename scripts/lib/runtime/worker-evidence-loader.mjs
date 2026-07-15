import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

function readAllowedJson({ recordPath, allowedPrefix, root }) {
  const normalized = String(recordPath || "").replaceAll("\\", "/");
  if (!normalized.startsWith(allowedPrefix) || normalized.split("/").includes("..")) return null;
  const absolute = path.resolve(root, normalized);
  const allowedRoot = path.resolve(root, allowedPrefix);
  if (!absolute.startsWith(allowedRoot)) return null;
  try { return JSON.parse(readFileSync(absolute, "utf8")); } catch { return null; }
}

export function loadWorkerEvidence({ plan, root = process.cwd() }) {
  const relevantMemory = plan?.basis?.relevantMemory || {};
  const lessons = (relevantMemory.acceptedLessonPaths || [])
    .map((recordPath) => ({ recordPath, record: readAllowedJson({ recordPath, allowedPrefix: ".codex/memory/accepted/", root }) }))
    .filter(({ record }) => record?.status === "accepted" && record.runtimeUse?.grantsPermission !== true)
    .map(({ recordPath, record }) => ({
      lessonId: record.lessonId,
      title: record.title,
      lesson: record.lesson,
      whenToUse: record.whenToUse,
      whenNotToUse: record.whenNotToUse,
      recordPath,
      grantsPermission: false
    }));
  const examples = (relevantMemory.exampleScorePaths || [])
    .map((recordPath) => ({ recordPath, record: readAllowedJson({ recordPath, allowedPrefix: ".codex/quality-scores/", root }) }))
    .filter(({ record }) => record?.reviewStatus === "pass" && Number(record.overallScore) >= 8)
    .map(({ recordPath, record }) => ({
      scoreId: record.scoreId,
      scoreType: record.scoreType,
      outputType: record.outputType,
      overallScore: record.overallScore,
      strengths: record.strengths || [],
      evidence: record.evidence || [],
      recordPath,
      grantsPermission: false
    }));
  return {
    strategy: relevantMemory.strategy || "none",
    lessons,
    examples,
    candidatesLoadedAsTruth: false,
    grantsPermission: false
  };
}
