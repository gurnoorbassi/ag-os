import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { isoTimestamp, normalizeRunId, slugify, writeJson } from "./common.mjs";
import { loadWorkerEvidence } from "./worker-evidence-loader.mjs";

function cleanLine(value) {
  return String(value ?? "").replaceAll("\r", " ").replaceAll("\n", " ").trim();
}

function workProductMarkdown({ job, plan, command, adapter, evidence, now }) {
  const tasks = (plan.tasks ?? []).map((task, index) => `${index + 1}. ${cleanLine(task.description)} — owner: ${cleanLine(task.owner)}`);
  const qualityBar = plan.basis?.qualityBar ?? [];
  return [
    `# Work product: ${cleanLine(plan.expectedOutput || job.expectedOutput)}`,
    "",
    `Generated: ${isoTimestamp(now)}`,
    `Project: ${job.projectId}`,
    `Job: ${job.jobId}`,
    `Adapter: ${adapter.adapterId}`,
    "",
    "## Owner outcome",
    "",
    cleanLine(command.rawCommand || command.normalizedCommand),
    "",
    "## Executed work package",
    "",
    cleanLine(plan.summary),
    "",
    ...tasks,
    "",
    "## Acceptance checklist",
    "",
    ...(qualityBar.length > 0 ? qualityBar.map((item) => `- [ ] ${cleanLine(item)}`) : ["- [ ] Owner reviews the generated work product against the requested outcome."]),
    "",
    "## Reused evidence",
    "",
    ...(evidence.lessons.length > 0
      ? evidence.lessons.map((lesson) => `- Accepted lesson ${lesson.lessonId}: ${cleanLine(lesson.lesson)}`)
      : ["- Accepted lessons: none matched"]),
    ...(evidence.examples.length > 0
      ? evidence.examples.map((example) => `- Quality example ${example.scoreId}: ${example.overallScore}/10; ${cleanLine(example.strengths.join("; "))}`)
      : ["- Quality examples: none matched"]),
    "- Reused evidence is advisory and grants no permission.",
    "",
    "## Safety boundary",
    "",
    "This worker created files only inside the AG OS isolated state workspace. It did not use credentials, call a live connector, deploy, post, message, change DNS, spend money, or access customer or production data.",
    ""
  ].join("\n");
}

export function executeLocalWorkProduct({ job, plan, command, adapter, runId, root = process.cwd(), now = new Date() }) {
  if (adapter?.adapterId !== "local-work-product") throw new Error("local work-product adapter is required");
  if (!job?.jobId || !plan?.planId || !command?.commandIntakeId) throw new Error("job, plan, and command records are required");
  const normalizedRunId = normalizeRunId(runId || job.jobId.replace(/^job-/, ""));
  const workspace = `.codex/workspaces/${slugify(job.projectId)}/${slugify(job.jobId)}`;
  const workProductPath = `${workspace}/WORK_PRODUCT.md`;
  const absoluteWorkProductPath = path.join(root, workProductPath);
  const evidence = loadWorkerEvidence({ plan, root });
  mkdirSync(path.dirname(absoluteWorkProductPath), { recursive: true });
  writeFileSync(absoluteWorkProductPath, workProductMarkdown({ job, plan, command, adapter, evidence, now }), "utf8");

  const timestamp = isoTimestamp(now);
  const executionStep = {
    executionStepId: `exec-${normalizedRunId}-local-work-product`,
    planId: plan.planId,
    jobId: job.jobId,
    projectId: job.projectId,
    stepType: "update_files",
    status: "done",
    riskLevel: job.riskLevel || plan.riskLevel || "R1",
    command: "Execute the registered local work-product adapter inside the isolated AG OS state workspace.",
    expectedResult: plan.expectedOutput || job.expectedOutput,
    evidenceRequired: [workProductPath, "local validation result", "quality score", "lesson candidates"],
    rollbackRequired: false,
    rollbackPlan: "Remove only the generated isolated workspace and its derived evidence before acceptance.",
    safety: {
      credentialsAllowed: false,
      liveServiceUseAllowed: false,
      deploymentAllowed: false,
      domainChangeAllowed: false,
      productionDataAllowed: false,
      paidActionAllowed: false
    },
    createdAt: timestamp,
    updatedAt: timestamp
  };
  const executionPath = `.codex/execution/${executionStep.executionStepId}.json`;
  writeJson(executionPath, executionStep, root);
  return { adapter, executionPath, executionStep, workProductPath, workProductPaths: [workProductPath], reusedEvidence: evidence };
}
