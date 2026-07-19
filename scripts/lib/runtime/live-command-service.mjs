import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { writeAuditEventRecord } from "./audit-writer.mjs";
import { writeBootRunRecord } from "./boot-runner-processor.mjs";
import { routeCommandCategory, writeCommandIntakeRecord } from "./command-intake-processor.mjs";
import { writeConnectorDryRunGateRecords } from "./connector-dry-run-gates.mjs";
import { writeCostLedgerRecord } from "./cost-ledger-writer.mjs";
import { writeJobRecord } from "./job-queue-processor.mjs";
import { writePlanRecord } from "./planner-processor.mjs";
import { writeTaskRouteRecord } from "./task-router-processor.mjs";
import { calculateAnthropicCostUsd } from "./anthropic-planner.mjs";
import { writeAnthropicWorkProduct } from "./anthropic-worker.mjs";
import { writeDeliverableCritique } from "./anthropic-critic.mjs";
import { finalizeAnthropicBudgetReservation } from "./anthropic-budget-guard.mjs";
import { runLocalValidation } from "./execution-dry-run-processor.mjs";
import { writeJobCompletionArtifacts } from "./job-completion-processor.mjs";
import { isoTimestamp, writeJson } from "./common.mjs";
import { deriveExecutionRequest } from "./execution-request-deriver.mjs";

const MAX_COMMAND_LENGTH = 10_000;
const inFlightAiApprovals = new Set();
export const ONE_OFF_PROJECT_ID = "project-one-off";

export function commandRequiresBuilder(command) {
  const text = String(command || "").trim();
  if (!text || /\b(?:plan|outline|research|audit|review|explain|analy[sz]e)\b/i.test(text)) return false;
  return /\b(?:build|create|make|implement|code|design|redesign|write)\b/i.test(text) &&
    /\b(?:website|site|app|application|dashboard|page|component|code|file|document|tool|system|workflow)\b/i.test(text);
}

function artifact(type, reference) {
  return { type, reference };
}

function runDashboardBuild(root) {
  const result = spawnSync(process.execPath, ["scripts/build-dashboard.mjs"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  if (result.status !== 0) {
    throw new Error(`dashboard refresh failed: ${result.stderr || result.stdout}`);
  }
}

export function assertOwnerCommand(command) {
  if (typeof command !== "string" || command.trim().length === 0) {
    throw new Error("command is required");
  }
  if (command.length > MAX_COMMAND_LENGTH) {
    throw new Error(`command must be ${MAX_COMMAND_LENGTH} characters or fewer`);
  }
}

export function assertRegisteredProject({ projectId, root = process.cwd() }) {
  if (projectId === ONE_OFF_PROJECT_ID) return;
  if (!projectId) throw new Error("project selection is missing");
  const registry = JSON.parse(readFileSync(path.join(root, ".codex/projects/registry.json"), "utf8"));
  if (!(registry.projects ?? []).some((project) => project.projectId === projectId)) {
    throw new Error(`project is not registered: ${projectId}`);
  }
}

export function createOperatorRunId(now = new Date()) {
  return `operator-${now.toISOString().replace(/[^0-9]/g, "").slice(0, 14)}-${randomUUID().slice(0, 8)}`;
}

export function listRecentOwnerCommands({ root = process.cwd(), limit = 10 } = {}) {
  const commandDir = path.join(root, ".codex/commands");
  return readdirSync(commandDir)
    .filter((name) => name.startsWith("command-intake-runtime-operator-") && name.endsWith(".json"))
    .map((name) => {
      const record = JSON.parse(readFileSync(path.join(commandDir, name), "utf8"));
      const jobId = record.nextRecord?.jobId;
      const jobPath = jobId ? path.join(root, ".codex/jobs", `${jobId}.json`) : null;
      const jobStatus = jobPath && existsSync(jobPath)
        ? JSON.parse(readFileSync(jobPath, "utf8")).status
        : null;
      return {
        commandIntakeId: record.commandIntakeId,
        rawCommand: record.rawCommand,
        riskLevel: record.riskLevel,
        projectId: record.projectId,
        createdAt: record.createdAt,
        requiresApproval: record.classification?.requiresApproval === true,
        planId: record.nextRecord?.planId,
        jobId,
        state: jobStatus || (record.classification?.requiresApproval === true ? "waiting_approval" : "planned")
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, Math.max(1, Math.min(limit, 50)));
}

export async function submitOwnerCommand({
  command,
  projectId,
  understanding,
  executionRequest,
  useAiPlanner = false,
  useAiWorker = false,
  aiPlannerReadiness,
  aiWorkerReadiness,
  aiCriticReadiness,
  planDraftProvider,
  workProductProvider,
  criticProvider,
  recovery = null,
  root = process.cwd(),
  env = process.env,
  now = new Date()
}) {
  assertOwnerCommand(command);
  const resolvedProjectId = projectId || ONE_OFF_PROJECT_ID;
  assertRegisteredProject({ projectId: resolvedProjectId, root });
  if (useAiPlanner && (!aiPlannerReadiness?.ready || typeof planDraftProvider !== "function")) {
    throw new Error(`AI planner is not ready: ${(aiPlannerReadiness?.blockers || ["planner provider unavailable"]).join("; ")}`);
  }
  if (useAiWorker && (!aiWorkerReadiness?.ready || typeof workProductProvider !== "function")) {
    throw new Error(`AI builder worker is not ready: ${(aiWorkerReadiness?.blockers || ["worker provider unavailable"]).join("; ")}`);
  }
  const useAiCritic = useAiWorker && aiCriticReadiness?.ready === true && typeof criticProvider === "function";
  if (useAiWorker && aiCriticReadiness?.required === true && !useAiCritic) {
    throw new Error(`Independent critic is required but not ready: ${(aiCriticReadiness?.blockers || ["critic provider unavailable"]).join("; ")}`);
  }
  const reservationIds = [...new Set([
    ...(useAiPlanner ? [aiPlannerReadiness.approvalId] : []),
    ...(useAiWorker ? [aiWorkerReadiness.approvalId] : []),
    ...(useAiCritic ? [aiCriticReadiness.approvalId] : [])
  ])];
  for (const approvalId of reservationIds) {
    if (!approvalId || inFlightAiApprovals.has(approvalId)) throw new Error(`AI approval ${approvalId || "missing"} already has a call in progress`);
  }
  reservationIds.forEach((approvalId) => inFlightAiApprovals.add(approvalId));
  try {
  const runId = createOperatorRunId(now);
  const boot = writeBootRunRecord({ runId, now, root });

  if (boot.record.status !== "ready") {
    throw new Error(`AG OS boot is blocked: ${boot.record.summary.blockedReasons.join("; ")}`);
  }

  const commandCategory = routeCommandCategory({ command: command.trim(), executionRequest, root });
  const intake = writeCommandIntakeRecord({
    command: command.trim(),
    projectId: resolvedProjectId,
    understanding,
    executionRequest,
    commandCategory: commandCategory.id,
    runId,
    now,
    root
  });
  const job = writeJobRecord({ commandIntake: intake.record, runId, now, recovery, root });
  const route = writeTaskRouteRecord({ job: job.record, commandIntake: intake.record, runId, now, root });
  const recordRunFailure = ({ error, stage, status = "failed", relatedArtifacts = [] }) => {
    const timestamp = isoTimestamp(now);
    const failedJob = {
      ...job.record,
      status,
      approvalRequired: false,
      blockedReason: `${stage} failed closed: ${error.message}`,
      queueTimestamps: {
        ...job.record.queueTimestamps,
        ...(stage === "planning" ? { planningStartedAt: timestamp } : { runningStartedAt: timestamp })
      },
      updatedAt: timestamp
    };
    writeJson(job.filePath, failedJob, root);
    writeAuditEventRecord({
      runId: `${runId}-${stage}-failed`,
      eventType: "validation_run",
      summary: `${stage} failed closed for ${job.record.jobId}; the job was not left runnable and completion was not claimed.`,
      scope: job.record.jobId,
      source: "ag_os_coordinator",
      relatedArtifacts: [artifact("other", job.filePath), ...relatedArtifacts],
      riskLevel: intake.record.riskLevel,
      liveServiceTouched: ["planning", "builder", "critic"].includes(stage),
      notes: String(error.message || error).slice(0, 4000),
      now,
      root
    });
    try { runDashboardBuild(root); } catch { /* Preserve the original stage failure. */ }
    return failedJob;
  };
  let aiPlanning = null;
  if (useAiPlanner) {
    try {
      aiPlanning = await planDraftProvider({ commandIntake: intake.record, job: job.record, route: route.record });
    } catch (error) {
      recordRunFailure({ error, stage: "planning" });
      throw error;
    }
  }
  const actualAiCostUsd = aiPlanning
    ? calculateAnthropicCostUsd({
        usage: aiPlanning.usage,
        inputCostPerMillionUsd: aiPlannerReadiness.inputCostPerMillionUsd,
        outputCostPerMillionUsd: aiPlannerReadiness.outputCostPerMillionUsd
      })
    : 0;
  const plan = writePlanRecord({
    route: route.record,
    job: job.record,
    commandIntake: intake.record,
    planDraft: aiPlanning?.planDraft,
    runId,
    now,
    root
  });
  let cost = null;
  if (aiPlanning) {
    cost = writeCostLedgerRecord({
      job: job.record,
      plan: plan.record,
      runId,
      now,
      estimatedCostUsd: plan.record.estimatedCostUsd,
      actualCostUsd: actualAiCostUsd,
      usesPaidService: true,
      usesLiveApi: true,
      root
    });
    finalizeAnthropicBudgetReservation({ reservation: aiPlanning.budgetReservation, consumed: true, actualCostUsd: actualAiCostUsd, root, now });
    if (actualAiCostUsd > aiPlannerReadiness.approval.budget.maxUsd) {
      throw new Error("AI planning call exceeded the approved budget");
    }
  }
  let aiWork = null;
  if (useAiWorker) {
    try {
      aiWork = await workProductProvider({ command: intake.record, job: job.record, plan: plan.record, root });
    } catch (error) {
      recordRunFailure({ error, stage: "builder", relatedArtifacts: [artifact("other", plan.filePath)] });
      throw error;
    }
  }
  const actualWorkerCostUsd = aiWork
    ? calculateAnthropicCostUsd({
        usage: aiWork.usage,
        inputCostPerMillionUsd: aiWorkerReadiness.inputCostPerMillionUsd,
        outputCostPerMillionUsd: aiWorkerReadiness.outputCostPerMillionUsd
      })
    : 0;
  let actualCriticCostUsd = 0;
  let criticResult = null;
  let criticRecord = null;
  let totalActualAiCostUsd = Number((actualAiCostUsd + actualWorkerCostUsd).toFixed(6));
  cost = writeCostLedgerRecord({
    job: job.record,
    plan: plan.record,
    runId,
    now,
    estimatedCostUsd: plan.record.estimatedCostUsd,
    actualCostUsd: totalActualAiCostUsd,
    usesPaidService: Boolean(aiPlanning || aiWork),
    usesLiveApi: Boolean(aiPlanning || aiWork),
    root
  });
  if (aiWork) {
    finalizeAnthropicBudgetReservation({ reservation: aiWork.budgetReservation, consumed: true, actualCostUsd: actualWorkerCostUsd, root, now });
    if (actualWorkerCostUsd > aiWorkerReadiness.approval.budget.maxUsd) {
      throw new Error("AI builder call exceeded the approved budget");
    }
  }
  const connectorGates = writeConnectorDryRunGateRecords({ plan: plan.record, runId, now, root });
  let workerExecution = null;
  let workerCompletion = null;
  let completedJob = job.record;
  if (aiWork) {
    try {
      workerExecution = writeAnthropicWorkProduct({
        job: job.record,
        plan: plan.record,
        command: intake.record,
        result: { ...aiWork, approvalId: aiWorkerReadiness.approvalId },
        runId,
        root,
        now
      });
    } catch (error) {
      recordRunFailure({ error, stage: "builder-write", relatedArtifacts: [artifact("other", plan.filePath)] });
      throw error;
    }
    if (useAiCritic) {
      try {
        criticResult = await criticProvider({ command: intake.record, job: job.record, plan: plan.record, execution: workerExecution, root });
      } catch (error) {
        recordRunFailure({ error, stage: "critic", status: "needs_revision", relatedArtifacts: [artifact("other", workerExecution.executionPath)] });
        throw error;
      }
      actualCriticCostUsd = calculateAnthropicCostUsd({
        usage: criticResult.usage,
        inputCostPerMillionUsd: aiCriticReadiness.inputCostPerMillionUsd,
        outputCostPerMillionUsd: aiCriticReadiness.outputCostPerMillionUsd
      });
      finalizeAnthropicBudgetReservation({ reservation: criticResult.budgetReservation, consumed: true, actualCostUsd: actualCriticCostUsd, root, now });
      if (actualCriticCostUsd > aiCriticReadiness.approval.budget.maxUsd) throw new Error("AI critic call exceeded the approved budget");
      totalActualAiCostUsd = Number((actualAiCostUsd + actualWorkerCostUsd + actualCriticCostUsd).toFixed(6));
      cost = writeCostLedgerRecord({ job: job.record, plan: plan.record, runId, now, estimatedCostUsd: plan.record.estimatedCostUsd, actualCostUsd: totalActualAiCostUsd, usesPaidService: true, usesLiveApi: true, root });
      criticRecord = writeDeliverableCritique({ job: job.record, plan: plan.record, execution: workerExecution, result: criticResult, approvalId: aiCriticReadiness.approvalId, root, now });
    }
    const derivedExecution = deriveExecutionRequest({ command: intake.record, job: job.record, workerExecution, env });
    let effectiveCommand = intake.record;
    if (derivedExecution.derived) {
      effectiveCommand = {
        ...intake.record,
        executionRequest: derivedExecution.request,
        riskLevel: "R3",
        classification: { ...intake.record.classification, requiresApproval: true, requiresLiveService: true }
      };
      writeJson(intake.filePath, effectiveCommand, root);
    }
    // The dashboard read model is part of local validation. Refresh it after
    // writing cost and execution records so validation evaluates the exact
    // candidate state rather than a stale projection.
    runDashboardBuild(root);
    const validation = runLocalValidation({ root });
    if (!validation.passed) {
      const error = new Error(`AI builder output failed local validation: ${validation.stderr || validation.stdout}`);
      recordRunFailure({ error, stage: "builder-validation", status: "needs_revision", relatedArtifacts: [artifact("other", workerExecution.executionPath)] });
      throw error;
    }
    if (criticRecord?.record.verdict === "needs_revision") {
      completedJob = {
        ...job.record,
        status: "needs_revision",
        approvalRequired: false,
        blockedReason: `Independent critic requires revision: ${criticRecord.record.requiredFixes.join("; ")}`,
        queueTimestamps: { ...job.record.queueTimestamps, runningStartedAt: isoTimestamp(now) },
        updatedAt: isoTimestamp(now)
      };
      writeJson(job.filePath, completedJob, root);
    } else {
    workerCompletion = writeJobCompletionArtifacts({
      job: job.record,
      plan: plan.record,
      planRecordPath: plan.filePath,
      commandRecordPath: intake.filePath,
      executionRecordPath: workerExecution.executionPath,
      workProductPath: workerExecution.workProductPath,
      deliverable: workerExecution.deliverable,
      root,
      now
    });
    const qualityPassed = workerCompletion.qualityScore.meetsBar === true && workerCompletion.qualityScore.reviewStatus === "pass";
    const missingExactExternalRequest = qualityPassed && derivedExecution.adapter.adapterId !== "local-work-product" && !effectiveCommand.executionRequest;
    const externalGatePending = qualityPassed && !missingExactExternalRequest && effectiveCommand.classification?.requiresApproval === true;
    completedJob = {
      ...job.record,
      status: qualityPassed ? (missingExactExternalRequest ? "blocked" : (externalGatePending ? "waiting_approval" : "done")) : "needs_revision",
      approvalRequired: externalGatePending,
      approvalId: aiWorkerReadiness.approvalId,
      ...(externalGatePending ? { blockedReason: "The professional work product is complete; the requested external action still requires a separate exact adapter approval." } : {}),
      ...(missingExactExternalRequest ? { blockedReason: `External action blocked: ${derivedExecution.blockers.join("; ")}. Use Retry after configuration is available.` } : {}),
      ...(!qualityPassed ? { blockedReason: `Deterministic quality gate requires revision: score ${workerCompletion.qualityScore.overallScore}/10.` } : {}),
      completionEvidence: workerCompletion.completionEvidence,
      queueTimestamps: {
        ...job.record.queueTimestamps,
        runningStartedAt: isoTimestamp(now),
        ...(qualityPassed ? { completedAt: isoTimestamp(now) } : {})
      },
      updatedAt: isoTimestamp(now)
    };
    writeJson(job.filePath, completedJob, root);
    }
  }
  const relatedArtifacts = [
    artifact("other", intake.record.commandIntakeId),
    artifact("other", boot.record.bootRunId),
    artifact("other", job.record.jobId),
    artifact("other", route.record.routeId),
    artifact("other", plan.record.planId),
    artifact("other", cost.record.costLedgerId),
    ...connectorGates.records.map((record) => artifact("other", record.connectorExecutionId)),
    ...(workerExecution ? [
      artifact("other", workerExecution.executionPath),
      ...workerExecution.workProductPaths.map((reference) => artifact("other", reference)),
      ...(criticRecord ? [artifact("other", criticRecord.recordPath)] : []),
      ...(workerCompletion ? [
        artifact("other", workerCompletion.qualityScorePath),
        ...workerCompletion.lessonCandidatePaths.map((reference) => artifact("other", reference)),
        ...workerCompletion.archetypeProposalPaths.map((reference) => artifact("other", reference))
      ] : [])
    ] : [])
  ];
  const audit = writeAuditEventRecord({
    runId,
    eventType: "owner_command_received",
    summary: "Authenticated owner command received and converted into an approval-gated AG OS work package.",
    scope: "live_owner_command_console",
    source: "ag_os_coordinator",
    relatedArtifacts,
    riskLevel: intake.record.riskLevel,
    liveServiceTouched: Boolean(aiPlanning || aiWork),
    notes: `${recovery ? `Recovery ${recovery.action} of ${recovery.sourceJobId}. ` : ""}${aiWork
      ? `The coordinator used separately approved Anthropic planning/build capabilities to create bounded files in the isolated AG OS workspace. Builder approval ${aiWorkerReadiness.approvalId}; model ${aiWork.model}; input tokens ${aiWork.usage.input_tokens || 0}; output tokens ${aiWork.usage.output_tokens || 0}; total recorded AI cost USD ${totalActualAiCostUsd}. No connector, deployment, message, post, DNS, customer-data, or production action was executed.`
      : aiPlanning
        ? `The coordinator used approved Anthropic planning via ${aiPlannerReadiness.approvalId}; model ${aiPlanning.model}; input tokens ${aiPlanning.usage.input_tokens || 0}; output tokens ${aiPlanning.usage.output_tokens || 0}; actual recorded cost USD ${actualAiCostUsd}. No connector, deployment, message, post, DNS, or production action was executed.`
        : "The coordinator created planning and gate records only. It did not execute connectors or live side effects."}`,
    now,
    root
  });

  const aiUsageAudit = aiPlanning
    ? writeAuditEventRecord({
        runId: `${runId}-anthropic-planner-use`,
        eventType: "standing_approval_used",
        summary: `Scoped approval ${aiPlannerReadiness.approvalId} used for one Anthropic plan generation call.`,
        scope: "anthropic_plan_generation",
        source: "connector_metadata",
        relatedArtifacts: [
          artifact("approval", aiPlannerReadiness.approvalId),
          artifact("other", plan.record.planId),
          artifact("other", cost.record.costLedgerId)
        ],
        riskLevel: intake.record.riskLevel,
        liveServiceTouched: true,
        notes: `Model ${aiPlanning.model}; input tokens ${aiPlanning.usage.input_tokens || 0}; output tokens ${aiPlanning.usage.output_tokens || 0}; recorded cost USD ${actualAiCostUsd}.`,
        now,
        root
      })
    : null;
  const aiWorkerUsageAudit = aiWork
    ? writeAuditEventRecord({
        runId: `${runId}-anthropic-worker-use`,
        eventType: "standing_approval_used",
        summary: `Scoped approval ${aiWorkerReadiness.approvalId} used for one Anthropic work-product generation call.`,
        scope: "anthropic_work_product_generation",
        source: "connector_metadata",
        relatedArtifacts: [
          artifact("approval", aiWorkerReadiness.approvalId),
          artifact("other", workerExecution.executionPath),
          ...(workerCompletion ? [artifact("other", workerCompletion.qualityScorePath)] : []),
          ...(criticRecord ? [artifact("other", criticRecord.recordPath)] : [])
        ],
        riskLevel: intake.record.riskLevel,
        liveServiceTouched: true,
        notes: `Model ${aiWork.model}; input tokens ${aiWork.usage.input_tokens || 0}; output tokens ${aiWork.usage.output_tokens || 0}; recorded builder cost USD ${actualWorkerCostUsd}.`,
        now,
        root
      })
    : null;
  const aiCriticUsageAudit = criticResult
    ? writeAuditEventRecord({
        runId: `${runId}-anthropic-critic-use`,
        eventType: "standing_approval_used",
        summary: `Scoped approval ${aiCriticReadiness.approvalId} used for one independent Anthropic deliverable critique.`,
        scope: "anthropic_deliverable_critique",
        source: "connector_metadata",
        relatedArtifacts: [artifact("approval", aiCriticReadiness.approvalId), artifact("other", criticRecord.recordPath), artifact("other", cost.record.costLedgerId)],
        riskLevel: intake.record.riskLevel,
        liveServiceTouched: true,
        notes: `Model ${criticResult.model}; verdict ${criticRecord.record.verdict}; input tokens ${criticResult.usage.input_tokens || 0}; output tokens ${criticResult.usage.output_tokens || 0}; recorded critic cost USD ${actualCriticCostUsd}.`,
        now,
        root
      })
    : null;

  runDashboardBuild(root);

  return {
    runId,
    status: aiWork ? completedJob.status : (job.record.approvalRequired ? "waiting_approval" : "planned"),
    commandIntakeId: intake.record.commandIntakeId,
    jobId: job.record.jobId,
    planId: plan.record.planId,
    auditId: audit.record.id,
    approvalRequired: aiWork ? completedJob.approvalRequired : job.record.approvalRequired,
    recordsCreated: [
      boot.filePath,
      intake.filePath,
      job.filePath,
      route.filePath,
      plan.filePath,
      cost.filePath,
      ...connectorGates.written.map((item) => item.filePath),
      audit.filePath,
      ...(aiUsageAudit ? [aiUsageAudit.filePath] : []),
      ...(workerExecution ? [workerExecution.executionPath, ...workerExecution.workProductPaths] : []),
      ...(criticRecord ? [criticRecord.recordPath] : []),
      ...(workerCompletion ? [workerCompletion.qualityScorePath, ...workerCompletion.lessonCandidatePaths, ...workerCompletion.archetypeProposalPaths] : []),
      ...(aiWorkerUsageAudit ? [aiWorkerUsageAudit.filePath] : []),
      ...(aiCriticUsageAudit ? [aiCriticUsageAudit.filePath] : [])
    ],
    safety: {
      liveActionExecuted: Boolean(aiPlanning || aiWork),
      externalBusinessActionExecuted: false,
      credentialsUsed: Boolean(aiPlanning || aiWork),
      deploymentTriggered: false,
      productionDataAccessed: false,
      paidActionTriggered: Boolean(aiPlanning || aiWork)
    },
    aiPlanner: aiPlanning ? {
      used: true,
      model: aiPlanning.model,
      inputTokens: aiPlanning.usage.input_tokens || 0,
      outputTokens: aiPlanning.usage.output_tokens || 0,
      actualCostUsd: actualAiCostUsd,
      approvalId: aiPlannerReadiness.approvalId
    } : { used: false },
    aiWorker: aiWork ? {
      used: true,
      model: aiWork.model,
      inputTokens: aiWork.usage.input_tokens || 0,
      outputTokens: aiWork.usage.output_tokens || 0,
      actualCostUsd: actualWorkerCostUsd,
      approvalId: aiWorkerReadiness.approvalId,
      workProductPaths: workerExecution.workProductPaths,
      qualityScorePath: workerCompletion?.qualityScorePath || null,
      lessonCandidatePaths: workerCompletion?.lessonCandidatePaths || [],
      archetypeProposalPaths: workerCompletion?.archetypeProposalPaths || []
    } : { used: false },
    aiCritic: criticResult ? {
      used: true,
      model: criticResult.model,
      verdict: criticRecord.record.verdict,
      score: criticRecord.record.score,
      actualCostUsd: actualCriticCostUsd,
      approvalId: aiCriticReadiness.approvalId,
      critiquePath: criticRecord.recordPath
    } : { used: false }
  };
  } finally {
    reservationIds.forEach((approvalId) => inFlightAiApprovals.delete(approvalId));
  }
}
