import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { writeLessonCandidateRecords } from "../../process-lesson-candidates.mjs";
import { writeQualityScoreRecord } from "../../process-quality-score.mjs";
import { isoTimestamp, writeJson } from "./common.mjs";

export const JOB_COMPLETION_POLICY_VERSION = 1;
export const JOB_COMPLETION_POLICY_ACTIVATED_AT = "2026-07-09T20:06:25.029Z";
const SCRIPT_ID = "scripts/lib/runtime/job-completion-processor.mjs";

function derivedCommandRecordPath(job) {
  return `.codex/commands/${job.commandId}.json`;
}

export function writeJobCompletionArtifacts({
  job,
  plan,
  planRecordPath,
  commandRecordPath,
  executionRecordPath,
  root = process.cwd(),
  now = new Date()
}) {
  if (!job?.jobId) {
    throw new Error("job with jobId is required for completion evidence");
  }
  if (!plan?.planId || plan.jobId !== job.jobId) {
    throw new Error("completion plan must exist and match the completed job");
  }
  if (!planRecordPath) {
    throw new Error("planRecordPath is required before a job can be completed");
  }

  const absolutePlanPath = path.isAbsolute(planRecordPath)
    ? planRecordPath
    : path.join(root, planRecordPath);
  if (!existsSync(absolutePlanPath)) {
    throw new Error(`completion plan record does not exist: ${planRecordPath}`);
  }

  const inferredCommandPath = commandRecordPath || derivedCommandRecordPath(job);
  const absoluteCommandPath = path.isAbsolute(inferredCommandPath)
    ? inferredCommandPath
    : path.join(root, inferredCommandPath);
  const usableCommandPath = existsSync(absoluteCommandPath) ? inferredCommandPath : undefined;

  const qualityScore = writeQualityScoreRecord({
    planPath: planRecordPath,
    commandIntakePath: usableCommandPath,
    root,
    now
  });
  const lessons = writeLessonCandidateRecords({
    qualityScore: qualityScore.record,
    qualityScorePath: qualityScore.filePath,
    planPath: planRecordPath,
    validationResultPath: executionRecordPath,
    root,
    now
  });

  if (lessons.written.length === 0) {
    throw new Error("job completion must produce at least one lesson candidate");
  }

  const lessonCandidatePaths = lessons.written.map((item) => item.filePath.replaceAll("\\", "/"));
  const completedScore = {
    ...qualityScore.record,
    lessonCandidates: lessons.records.map((record) => record.lessonId),
    updatedAt: isoTimestamp(now)
  };
  writeJson(qualityScore.filePath, completedScore, root);

  return {
    qualityScorePath: qualityScore.filePath.replaceAll("\\", "/"),
    lessonCandidatePaths,
    qualityScore: completedScore,
    lessonCandidates: lessons.records,
    completionEvidence: {
      policyVersion: JOB_COMPLETION_POLICY_VERSION,
      qualityScorePath: qualityScore.filePath.replaceAll("\\", "/"),
      lessonCandidatePaths,
      generatedBy: SCRIPT_ID
    }
  };
}
