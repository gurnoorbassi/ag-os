import { createHash, timingSafeEqual } from "node:crypto";
import { createReadStream, existsSync, lstatSync, readFileSync, readdirSync, realpathSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { commandRequiresBuilder, listRecentOwnerCommands, submitOwnerCommand } from "./lib/runtime/live-command-service.mjs";
import { evaluateProductionReadiness } from "./lib/runtime/production-readiness-processor.mjs";
import { createAnthropicPlanDraft } from "./lib/runtime/anthropic-planner.mjs";
import { createAnthropicMissionPlan } from "./lib/runtime/anthropic-mission-planner.mjs";
import { finalizeAnthropicBudgetReservation } from "./lib/runtime/anthropic-budget-guard.mjs";
import { evaluateAnthropicPlannerReadiness } from "./lib/runtime/anthropic-planner-readiness.mjs";
import { createAnthropicWorkProduct } from "./lib/runtime/anthropic-worker.mjs";
import { evaluateAnthropicWorkerReadiness } from "./lib/runtime/anthropic-worker-readiness.mjs";
import { createAnthropicDeliverableCritique } from "./lib/runtime/anthropic-critic.mjs";
import { evaluateAnthropicCriticReadiness } from "./lib/runtime/anthropic-critic-readiness.mjs";
import { createProject, listProjects } from "./lib/runtime/project-service.mjs";
import {
  decideLessons,
  getOperatingSystems,
  getProjectWorkspace,
  listLessonDecisions
} from "./lib/runtime/control-center-service.mjs";
import { decideProposal, listProposals, markProposalStartFailed, refreshProposals } from "./lib/runtime/proposal-engine.mjs";
import { listOutcomes, recordJobOutcome } from "./lib/runtime/outcome-feedback-service.mjs";
import { autonomousExecutionStatus, listAutonomousJobs, processQueuedJobs } from "./lib/runtime/autonomous-runner.mjs";
import { decideJob } from "./lib/runtime/job-approval-service.mjs";
import { evaluateOperationalSafeguards, resolveOperationalFinding } from "./lib/runtime/operational-safeguards.mjs";
import { startInternalWatchdog } from "./lib/runtime/internal-watchdog.mjs";
import { getJobDeliverable } from "./lib/runtime/deliverable-service.mjs";
import { prepareJobRecovery } from "./lib/runtime/job-recovery-service.mjs";
import { consumeMobileApproval, createMobileApprovalLink, deliverMobileApprovalLink, mobileApprovalReadiness } from "./lib/runtime/mobile-approval-service.mjs";
import { recordExternalEvidence } from "./lib/runtime/external-evidence-service.mjs";
import { cancelMission, createMission, listMissions, missionDetail, runMission } from "./lib/runtime/mission-runtime.mjs";
import { listMissionAgents, listMissionHandoffs, listMissionTasks, missionPaths, readMissionEvents } from "./lib/runtime/mission-store.mjs";
import { createAnthropicAgentProvider } from "./lib/runtime/anthropic-agent-provider.mjs";
import {
  buildOwnerSessionCookie,
  clearOwnerSessionCookie,
  createLoginRateLimiter,
  createOwnerSession,
  isOwnerPasswordHash,
  sessionCookieValue,
  verifyOwnerPassword,
  verifyOwnerSession
} from "./lib/runtime/owner-auth.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dashboardRoot = path.join(root, "dashboard");
const host = process.env.AG_OS_HOST || "127.0.0.1";
const port = Number(process.env.PORT || process.env.AG_OS_PORT || 8787);
const ownerToken = process.env.AG_OS_OWNER_TOKEN || "";
const ownerPasswordHash = process.env.AG_OS_OWNER_PASSWORD_HASH || "";
const externalEvidenceToken = process.env.AG_OS_EXTERNAL_EVIDENCE_TOKEN || "";
const configuredSessionDays = Number(process.env.AG_OS_OWNER_SESSION_DAYS || 30);
const ownerSessionDays = Number.isInteger(configuredSessionDays) && configuredSessionDays >= 1 && configuredSessionDays <= 30
  ? configuredSessionDays
  : 30;
const allowedOrigin = process.env.AG_OS_ALLOWED_ORIGIN || "";
const loginRateLimiter = createLoginRateLimiter();
const activeMissionRuns = new Map();

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml",
  ".toml": "text/plain; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8"
};

async function runAutomaticQueue() {
  try {
    const result = await processQueuedJobs({ root });
    if (result.dashboardRefresh?.passed === false) {
      console.error(JSON.stringify({
        service: "ag-os-coordinator",
        event: "dashboard-refresh-deferred",
        detail: result.dashboardRefresh.error
      }));
    }
    refreshProposals({ root });
    return result;
  } catch (error) {
    console.error(JSON.stringify({ service: "ag-os-coordinator", event: "automatic-run-failed", detail: error.message }));
    return { status: "failed", processed: [], error: error.message };
  }
}

function json(response, status, body, extraHeaders = {}) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    ...extraHeaders
  });
  response.end(`${JSON.stringify(body)}\n`);
}

function tokenDigest(value) {
  return createHash("sha256").update(value).digest();
}

export function tokenMatches(expected, supplied) {
  if (!expected || !supplied) {
    return false;
  }
  return timingSafeEqual(tokenDigest(expected), tokenDigest(supplied));
}

function suppliedToken(request) {
  const value = request.headers.authorization || "";
  return value.startsWith("Bearer ") ? value.slice(7) : "";
}

function corsHeaders(request) {
  const origin = request.headers.origin;
  if (!origin || !allowedOrigin || origin !== allowedOrigin) {
    return {};
  }
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-credentials": "true",
    "access-control-allow-headers": "authorization, content-type",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    vary: "Origin"
  };
}

function trustedBrowserOrigin(request, { allowMissing = false } = {}) {
  const origin = request.headers.origin;
  if (!origin) return allowMissing;
  if (allowedOrigin && origin === allowedOrigin) return true;
  try {
    const parsed = new URL(origin);
    return ["http:", "https:"].includes(parsed.protocol) && parsed.host === request.headers.host;
  } catch {
    return false;
  }
}

function requestAuthentication(request) {
  if (tokenMatches(ownerToken, suppliedToken(request))) return "recovery_token";
  const session = sessionCookieValue(request.headers.cookie);
  return verifyOwnerSession({ value: session, ownerToken, passwordHash: ownerPasswordHash }) ? "password_session" : null;
}

function isLoopbackAddress(value) {
  return ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(String(value || "").toLowerCase());
}

export function loginRateLimitKey(request, env = process.env) {
  const socketAddress = request.socket.remoteAddress || "unknown-private-client";
  if (env.AG_OS_TRUST_PROXY !== "true" || !isLoopbackAddress(socketAddress)) return socketAddress;
  const forwarded = Array.isArray(request.headers["x-forwarded-for"])
    ? request.headers["x-forwarded-for"].join(",")
    : String(request.headers["x-forwarded-for"] || "");
  const rightmost = forwarded.split(",").map((item) => item.trim()).filter(Boolean).at(-1);
  return rightmost && rightmost.length <= 128 ? rightmost : socketAddress;
}

export function secureSessionCookieFor(request, env = process.env) {
  if (env.AG_OS_OWNER_SESSION_COOKIE_SECURE === "true") return true;
  if (env.AG_OS_OWNER_SESSION_COOKIE_SECURE === "false") return false;
  const socketAddress = request.socket.remoteAddress || "";
  if (env.AG_OS_TRUST_PROXY !== "true" || !isLoopbackAddress(socketAddress)) return false;
  const forwardedProto = Array.isArray(request.headers["x-forwarded-proto"])
    ? request.headers["x-forwarded-proto"][0]
    : String(request.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  return forwardedProto.toLowerCase() === "https";
}

async function readJsonBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 65_536) {
      throw new Error("request body is too large");
    }
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function readinessStatus() {
  const file = path.join(root, ".codex/production/production-readiness-ag-os-coordinator-v1.json");
  return evaluateProductionReadiness(JSON.parse(readFileSync(file, "utf8")));
}

function projectReadinessStatuses() {
  const directory = path.join(root, ".codex/production");
  return readdirSync(directory)
    .filter((name) => name.startsWith("production-readiness-") && name.endsWith(".json"))
    .map((name) => {
      const record = JSON.parse(readFileSync(path.join(directory, name), "utf8"));
      if (record.status === "archived") return null;
      return {
        projectId: record.projectId,
        targetMode: record.targetMode,
        ...evaluateProductionReadiness(record)
      };
    })
    .filter(Boolean);
}

function aiPlannerReadiness() {
  return evaluateAnthropicPlannerReadiness({ root });
}

function aiWorkerReadiness() {
  return evaluateAnthropicWorkerReadiness({ root });
}

function aiCriticReadiness() {
  return evaluateAnthropicCriticReadiness({ root });
}

function publicAiPlannerStatus(readiness = aiPlannerReadiness()) {
  return {
    ready: readiness.ready,
    enabled: readiness.enabled,
    credentialConfigured: readiness.credentialConfigured,
    model: readiness.model,
    approvalId: readiness.approvalId,
    uses: readiness.uses,
    blockers: readiness.blockers
  };
}

function publicAiWorkerStatus(readiness = aiWorkerReadiness()) {
  return {
    ready: readiness.ready,
    enabled: readiness.enabled,
    credentialConfigured: readiness.credentialConfigured,
    model: readiness.model,
    approvalId: readiness.approvalId,
    uses: readiness.uses,
    blockers: readiness.blockers
  };
}

function publicAiCriticStatus(readiness = aiCriticReadiness()) {
  return { ready: readiness.ready, enabled: readiness.enabled, required: readiness.required, credentialConfigured: readiness.credentialConfigured, model: readiness.model, approvalId: readiness.approvalId, uses: readiness.uses, blockers: readiness.blockers };
}

function projectWorkspacePath(projectId, body = {}) {
  if (body.repositoryPath) return path.resolve(body.repositoryPath);
  if (projectId === "project-ag-os-coordinator-runtime") return root;
  try {
    const configured = JSON.parse(process.env.AG_OS_PROJECT_WORKSPACES_JSON || "{}");
    return configured[projectId] ? path.resolve(configured[projectId]) : null;
  } catch {
    throw new Error("AG_OS_PROJECT_WORKSPACES_JSON is invalid JSON");
  }
}

function targetValidationCommands(repositoryPath, explicit) {
  if (Array.isArray(explicit) && explicit.length > 0) return explicit;
  const packagePath = path.join(repositoryPath, "package.json");
  if (!existsSync(packagePath)) throw new Error("target project has no declared validation strategy; provide validationCommands");
  const scripts = JSON.parse(readFileSync(packagePath, "utf8")).scripts || {};
  const commands = ["test", "typecheck", "lint", "build"].filter((name) => scripts[name]).map((name) => name === "test" ? "npm test" : `npm run ${name}`);
  if (commands.length === 0) throw new Error("target project package.json declares no test, typecheck, lint, or build command");
  return commands;
}

function missionProvider(readiness = aiWorkerReadiness()) {
  if (!readiness.ready) return null;
  return createAnthropicAgentProvider({
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: readiness.model,
    approvalId: readiness.approvalId,
    approvalMaxUsd: readiness.approval?.budget?.maxUsd,
    approvalUsesRemaining: (readiness.approval?.approvalKind === "standing" ? readiness.approval.maxUses : 1) - readiness.uses,
    root,
    baseUrl: process.env.ANTHROPIC_BASE_URL,
    inputCostPerMillionUsd: readiness.inputCostPerMillionUsd,
    outputCostPerMillionUsd: readiness.outputCostPerMillionUsd
  });
}

async function continueMission(missionId) {
  if (activeMissionRuns.has(missionId)) return activeMissionRuns.get(missionId).promise;
  const readiness = aiWorkerReadiness();
  const provider = missionProvider(readiness);
  if (!provider) return { status: "blocked", missionId, blockers: readiness.blockers };
  const controller = new AbortController();
  const active = { controller, promise: null };
  active.promise = runMission({ missionId, provider, root, signal: controller.signal }).finally(() => {
    if (activeMissionRuns.get(missionId) === active) activeMissionRuns.delete(missionId);
  });
  activeMissionRuns.set(missionId, active);
  return active.promise;
}

async function cancelActiveMission(missionId, reason) {
  const active = activeMissionRuns.get(missionId);
  if (!active) return cancelMission({ missionId, reason, root });
  active.controller.abort(new Error(String(reason || "Cancelled by owner")));
  return active.promise;
}

async function submitRuntimeCommand(body, { recovery = null, forceReplan = false, disablePlanner = false } = {}) {
  const plannerReadiness = aiPlannerReadiness();
  const workerReadiness = aiWorkerReadiness();
  const criticReadiness = aiCriticReadiness();
  const builderRequired = !body.executionRequest && commandRequiresBuilder(body.command);
  if (builderRequired && body.useMission !== false) {
    const projectId = body.projectId || "project-one-off";
    const repositoryPath = projectWorkspacePath(projectId, body);
    if (!repositoryPath) throw new Error(`No local mission workspace is configured for ${projectId}. Configure AG_OS_PROJECT_WORKSPACES_JSON or provide repositoryPath.`);
    const missionBudgetUsd = body.missionBudgetUsd ?? 5;
    const validationCommands = targetValidationCommands(repositoryPath, body.validationCommands);
    let planningEvidence = null;
    if (plannerReadiness.ready) {
      const planned = await createAnthropicMissionPlan({
        ownerOutcome: body.command,
        projectId,
        validationCommands,
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: plannerReadiness.model,
        baseUrl: process.env.ANTHROPIC_BASE_URL,
        inputCostPerMillionUsd: plannerReadiness.inputCostPerMillionUsd,
        outputCostPerMillionUsd: plannerReadiness.outputCostPerMillionUsd,
        approvalId: plannerReadiness.approvalId,
        approvalMaxUsd: Math.min(Number(plannerReadiness.approval?.budget?.maxUsd), Number(missionBudgetUsd)),
        root,
        env: process.env
      });
      finalizeAnthropicBudgetReservation({ reservation: planned.budgetReservation, consumed: true, actualCostUsd: planned.costUsd, root });
      planningEvidence = { planDraft: planned.planDraft, model: planned.model, usage: planned.usage, usageAuditPath: planned.usageAuditPath, costUsd: planned.costUsd };
    }
    const mission = createMission({
      ownerOutcome: body.command,
      projectId,
      repositoryPath,
      baseRevision: body.baseRevision || "HEAD",
      autonomyLevel: body.autonomyLevel || "balanced",
      concurrencyLimit: body.concurrencyLimit ?? 3,
      budgetUsd: missionBudgetUsd,
      validationCommands,
      planningEvidence,
      root
    });
    const readiness = aiWorkerReadiness();
    const shouldRun = readiness.ready && mission.autonomyLevel !== "supervised";
    if (shouldRun) setImmediate(() => continueMission(mission.missionId).catch((error) => console.error(JSON.stringify({ service: "ag-os-coordinator", event: "mission-run-failed", missionId: mission.missionId, detail: error.message }))));
    return { status: shouldRun ? "mission_running" : "mission_planned", missionId: mission.missionId, projectId, agentCount: mission.agents.length, taskCount: mission.tasks.length, planning: mission.planning, aiWorker: publicAiWorkerStatus(readiness), protectedExternalActionExecuted: false };
  }
  const useAiWorker = body.useAiWorker === true || builderRequired;
  const useAiPlanner = !disablePlanner && (body.useAiPlanner === true || forceReplan || (builderRequired && plannerReadiness.ready));
  if (builderRequired && !workerReadiness.ready) {
    throw new Error(`This command requests a real deliverable, but the professional builder is not active: ${workerReadiness.blockers.join("; ")}. AG OS did not create a plan-only job or claim completion.`);
  }
  const result = await submitOwnerCommand({
    command: body.command,
    projectId: body.projectId,
    understanding: body.understanding,
    executionRequest: body.executionRequest,
    useAiPlanner,
    useAiWorker,
    aiPlannerReadiness: plannerReadiness,
    aiWorkerReadiness: workerReadiness,
    aiCriticReadiness: criticReadiness,
    planDraftProvider: (input) => createAnthropicPlanDraft({
      ...input,
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: plannerReadiness.model,
      baseUrl: process.env.ANTHROPIC_BASE_URL,
      inputCostPerMillionUsd: plannerReadiness.inputCostPerMillionUsd,
      outputCostPerMillionUsd: plannerReadiness.outputCostPerMillionUsd,
      approvalId: plannerReadiness.approvalId,
      approvalMaxUsd: plannerReadiness.approval?.budget?.maxUsd,
      root
    }),
    workProductProvider: (input) => createAnthropicWorkProduct({
      ...input,
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: workerReadiness.model,
      baseUrl: process.env.ANTHROPIC_BASE_URL,
      inputCostPerMillionUsd: workerReadiness.inputCostPerMillionUsd,
      outputCostPerMillionUsd: workerReadiness.outputCostPerMillionUsd,
      approvalId: workerReadiness.approvalId,
      approvalMaxUsd: workerReadiness.approval?.budget?.maxUsd,
      root
    }),
    criticProvider: (input) => createAnthropicDeliverableCritique({
      ...input,
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: criticReadiness.model,
      baseUrl: process.env.ANTHROPIC_BASE_URL,
      inputCostPerMillionUsd: criticReadiness.inputCostPerMillionUsd,
      outputCostPerMillionUsd: criticReadiness.outputCostPerMillionUsd,
      approvalId: criticReadiness.approvalId,
      approvalMaxUsd: criticReadiness.approval?.budget?.maxUsd,
      root
    }),
    recovery,
    root,
    env: process.env
  });
  const mobile = mobileApprovalReadiness({ root });
  if (result.status === "waiting_approval" && mobile.ready && mobile.deliveryActive) {
    try {
      const link = createMobileApprovalLink({ jobId: result.jobId, root });
      result.mobileNotification = await deliverMobileApprovalLink({ linkResult: link, root });
    } catch (error) {
      result.mobileNotification = { delivery: { mode: mobile.delivery, sent: false }, error: error.message };
    }
  }
  return result;
}

function serveStatic(request, response) {
  const requestPath = new URL(request.url, "http://localhost").pathname;
  const relative = requestPath === "/" ? "os.html" : requestPath === "/mobile-approval" ? "mobile-approval.html" : decodeURIComponent(requestPath.slice(1));
  const target = path.resolve(dashboardRoot, relative);
  if (!target.startsWith(`${dashboardRoot}${path.sep}`) || !existsSync(target) || !statSync(target).isFile()) {
    json(response, 404, { error: "not_found" });
    return;
  }
  response.writeHead(200, {
    "content-type": MIME_TYPES[path.extname(target)] || "application/octet-stream",
    "cache-control": path.basename(target) === "dashboard-data.js" ? "no-store" : "public, max-age=300",
    "content-security-policy": "default-src 'self'; connect-src 'self' https:; script-src 'self'; style-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY"
  });
  if (request.method === "HEAD") {
    response.end();
    return;
  }
  createReadStream(target).pipe(response);
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, "http://localhost");
  const headers = corsHeaders(request);

  if (request.method === "OPTIONS") {
    response.writeHead(Object.keys(headers).length > 0 ? 204 : 403, headers);
    response.end();
    return;
  }

  if (request.method === "GET" && url.pathname === "/healthz") {
    json(response, 200, { status: "ok", service: "ag-os-coordinator" }, headers);
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/v1/auth/config") {
    json(response, 200, {
      passwordLoginEnabled: isOwnerPasswordHash(ownerPasswordHash),
      sessionDays: ownerSessionDays,
      recoveryTokenAvailable: Boolean(ownerToken)
    }, headers);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/v1/mobile-approvals/decision") {
    try {
      const body = await readJsonBody(request);
      const result = consumeMobileApproval({ token: body.token, decision: body.decision, root });
      json(response, 200, { requestId: result.requestId, jobId: result.jobId, decision: result.decision, status: result.result.job.status }, headers);
      setImmediate(runAutomaticQueue);
    } catch (error) {
      json(response, 400, { error: "mobile_decision_rejected", detail: error.message }, headers);
    }
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/v1/evidence/external") {
    if (!tokenMatches(externalEvidenceToken, suppliedToken(request))) {
      json(response, 401, { error: "unauthorized" }, headers);
      return;
    }
    try {
      const body = await readJsonBody(request);
      json(response, 201, recordExternalEvidence(body, { root }), headers);
    } catch (error) {
      json(response, 400, { error: error.message }, headers);
    }
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/v1/auth/login") {
    if (!trustedBrowserOrigin(request, { allowMissing: true })) {
      json(response, 403, { error: "untrusted_origin" }, headers);
      return;
    }
    if (!isOwnerPasswordHash(ownerPasswordHash)) {
      json(response, 503, { error: "password_login_not_configured" }, headers);
      return;
    }
    const rateLimitKey = loginRateLimitKey(request);
    if (loginRateLimiter.isBlocked(rateLimitKey)) {
      json(response, 429, { error: "login_temporarily_locked" }, { ...headers, "retry-after": "900" });
      return;
    }
    let body;
    try {
      body = await readJsonBody(request);
    } catch {
      loginRateLimiter.recordFailure(rateLimitKey);
      json(response, 400, { error: "invalid_login_request" }, headers);
      return;
    }
    loginRateLimiter.recordFailure(rateLimitKey);
    if (!await verifyOwnerPassword(body.password, ownerPasswordHash)) {
      json(response, 401, { error: "invalid_credentials" }, headers);
      return;
    }
    loginRateLimiter.reset(rateLimitKey);
    const session = createOwnerSession({
      ownerToken,
      passwordHash: ownerPasswordHash,
      sessionDays: ownerSessionDays
    });
    json(response, 200, {
      authenticated: true,
      sessionDays: ownerSessionDays
    }, {
      ...headers,
      "set-cookie": buildOwnerSessionCookie(session.value, {
        maxAgeSeconds: session.maxAgeSeconds,
        secure: secureSessionCookieFor(request)
      })
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/v1/auth/logout") {
    if (!trustedBrowserOrigin(request, { allowMissing: true })) {
      json(response, 403, { error: "untrusted_origin" }, headers);
      return;
    }
    json(response, 200, { authenticated: false }, {
      ...headers,
      "set-cookie": clearOwnerSessionCookie({ secure: secureSessionCookieFor(request) })
    });
    return;
  }

  const authentication = requestAuthentication(request);
  if (url.pathname.startsWith("/api/") && !authentication) {
    json(response, 401, { error: "unauthorized" }, headers);
    return;
  }

  if (url.pathname.startsWith("/api/") && authentication === "password_session" &&
      !["GET", "HEAD"].includes(request.method) && !trustedBrowserOrigin(request)) {
    json(response, 403, { error: "untrusted_origin" }, headers);
    return;
  }

  try {
    if (request.method === "GET" && url.pathname === "/api/v1/status") {
      json(response, 200, {
        service: "ag-os-coordinator",
        mode: "owner_operated_fail_closed",
        runtimeDeployment: {
          status: "live_private",
          coordinatorResponding: true,
          publicExposureClaimed: false,
          permissionGrantedByDeployment: false
        },
        authentication: {
          method: authentication,
          passwordLoginEnabled: isOwnerPasswordHash(ownerPasswordHash),
          sessionDays: ownerSessionDays,
          recoveryTokenAvailable: Boolean(ownerToken)
        },
        automation: autonomousExecutionStatus(),
        safeguards: evaluateOperationalSafeguards({ root }),
        production: readinessStatus(),
        readiness: {
          coordinator: readinessStatus(),
          projects: projectReadinessStatuses()
        },
        aiPlanner: publicAiPlannerStatus(),
        aiWorker: publicAiWorkerStatus(),
        aiCritic: publicAiCriticStatus(),
        mobileApprovals: mobileApprovalReadiness(),
        projects: listProjects({ root }),
        operatingSystems: getOperatingSystems({ root }),
        lessonDecisions: listLessonDecisions({ root }),
        proposals: listProposals({ root }),
        outcomes: listOutcomes({ root }).slice(0, 20),
        jobs: listAutonomousJobs({ root }),
        recentCommands: listRecentOwnerCommands({ root }),
        missions: listMissions({ root })
      }, headers);
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/v1/missions") {
      json(response, 200, { missions: listMissions({ root }) }, headers);
      return;
    }

    const missionMatch = url.pathname.match(/^\/api\/v1\/missions\/([^/]+)$/);
    if (request.method === "GET" && missionMatch) {
      json(response, 200, missionDetail(decodeURIComponent(missionMatch[1]), root), headers);
      return;
    }

    const missionPreviewMatch = url.pathname.match(/^\/api\/v1\/missions\/([^/]+)\/preview(?:\/(.*))?$/);
    if (request.method === "GET" && missionPreviewMatch) {
      const mission = missionDetail(decodeURIComponent(missionPreviewMatch[1]), root);
      if (!mission.preview?.ready || !mission.preview.entryFile) {
        json(response, 404, { error: "preview_not_available" }, headers);
        return;
      }
      const requestedFile = decodeURIComponent(missionPreviewMatch[2] || mission.preview.entryFile).replaceAll("\\", "/");
      const workspaceRoot = path.resolve(mission.integrationWorkspace.path);
      const target = path.resolve(workspaceRoot, requestedFile);
      if (!target.startsWith(`${workspaceRoot}${path.sep}`) || !existsSync(target) || lstatSync(target).isSymbolicLink() || !statSync(target).isFile()) {
        json(response, 404, { error: "preview_file_not_found" }, headers);
        return;
      }
      const realTarget = realpathSync(target);
      if (!realTarget.startsWith(`${realpathSync(workspaceRoot)}${path.sep}`)) {
        json(response, 404, { error: "preview_file_not_found" }, headers);
        return;
      }
      response.writeHead(200, {
        ...headers,
        "content-type": MIME_TYPES[path.extname(target).toLowerCase()] || "text/plain; charset=utf-8",
        "cache-control": "no-store",
        "content-security-policy": "sandbox allow-scripts; default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors 'self'",
        "referrer-policy": "no-referrer",
        "x-content-type-options": "nosniff"
      });
      createReadStream(realTarget).pipe(response);
      return;
    }

    const missionCollectionMatch = url.pathname.match(/^\/api\/v1\/missions\/([^/]+)\/(agents|tasks|events|handoffs|artifacts)$/);
    if (request.method === "GET" && missionCollectionMatch) {
      const missionId = decodeURIComponent(missionCollectionMatch[1]);
      const collection = missionCollectionMatch[2];
      if (collection === "agents") json(response, 200, { agents: listMissionAgents(missionId, root) }, headers);
      else if (collection === "tasks") json(response, 200, { tasks: listMissionTasks(missionId, root) }, headers);
      else if (collection === "events") json(response, 200, { events: readMissionEvents(missionId, root, { after: Number(url.searchParams.get("after") || 0) }) }, headers);
      else if (collection === "handoffs") json(response, 200, { handoffs: listMissionHandoffs(missionId, root) }, headers);
      else {
        const artifactPath = path.join(root, missionPaths(missionId).artifacts, "final-result.json");
        json(response, 200, { artifacts: existsSync(artifactPath) ? [JSON.parse(readFileSync(artifactPath, "utf8"))] : [] }, headers);
      }
      return;
    }

    const missionStreamMatch = url.pathname.match(/^\/api\/v1\/missions\/([^/]+)\/events\/stream$/);
    if (request.method === "GET" && missionStreamMatch) {
      const missionId = decodeURIComponent(missionStreamMatch[1]);
      let cursor = Number(url.searchParams.get("after") || 0);
      response.writeHead(200, { ...headers, "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-store", connection: "keep-alive", "x-content-type-options": "nosniff" });
      const send = () => {
        for (const event of readMissionEvents(missionId, root, { after: cursor })) {
          cursor = event.sequence;
          response.write(`id: ${event.sequence}\ndata: ${JSON.stringify(event)}\n\n`);
        }
      };
      send();
      const interval = setInterval(() => { if (!response.destroyed) send(); }, 1000);
      request.on("close", () => clearInterval(interval));
      return;
    }

    const missionControlMatch = url.pathname.match(/^\/api\/v1\/missions\/([^/]+)\/controls$/);
    if (request.method === "POST" && missionControlMatch) {
      const missionId = decodeURIComponent(missionControlMatch[1]);
      const body = await readJsonBody(request);
      if (body.action === "cancel") json(response, 200, await cancelActiveMission(missionId, body.reason), headers);
      else if (body.action === "run" || body.action === "resume") {
        const readiness = aiWorkerReadiness();
        if (!readiness.ready) json(response, 409, { status: "blocked", missionId, blockers: readiness.blockers }, headers);
        else {
          setImmediate(() => continueMission(missionId).catch((error) => console.error(JSON.stringify({ service: "ag-os-coordinator", event: "mission-run-failed", missionId, detail: error.message }))));
          json(response, 202, { status: "mission_running", missionId }, headers);
        }
      }
      else throw new Error("mission control action must be run, resume, or cancel");
      return;
    }

    const projectWorkspaceMatch = url.pathname.match(/^\/api\/v1\/projects\/([^/]+)$/);
    if (request.method === "GET" && projectWorkspaceMatch) {
      json(response, 200, getProjectWorkspace({
        projectId: decodeURIComponent(projectWorkspaceMatch[1]),
        root
      }), headers);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/v1/projects") {
      const body = await readJsonBody(request);
      const repositoryOwner = process.env.AG_OS_GITHUB_OWNER || "gurnoorbassi";
      const created = createProject({ input: { ...body, repositoryOwner }, root });
      const provisioning = await submitOwnerCommand({
        command: `Create the private GitHub repository ${repositoryOwner}/${created.repositoryName} and bind it to ${created.project.id}.`,
        projectId: created.project.id,
        executionRequest: {
          adapterId: "github-private-repository",
          operation: "create_private_repository",
          repository: { owner: repositoryOwner, name: created.repositoryName },
          projectId: created.project.id,
          projectRecordPath: created.registryEntry.recordPath,
          description: `Private source repository for ${created.project.name}`
        },
        useAiPlanner: false,
        useAiWorker: false,
        root
      });
      json(response, 201, { ...created, repositoryProvisioning: provisioning }, headers);
      setImmediate(runAutomaticQueue);
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/v1/memory/lessons") {
      json(response, 200, listLessonDecisions({ root }), headers);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/v1/memory/lessons/decision") {
      const body = await readJsonBody(request);
      const result = decideLessons({
        lessonIds: body.lessonIds,
        decision: body.decision,
        reason: body.reason,
        root
      });
      json(response, 200, result, headers);
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/v1/proposals") {
      json(response, 200, { proposals: listProposals({ root }) }, headers);
      return;
    }

    const proposalDecisionMatch = url.pathname.match(/^\/api\/v1\/proposals\/([^/]+)\/decision$/);
    if (request.method === "POST" && proposalDecisionMatch) {
      const body = await readJsonBody(request);
      const decision = decideProposal({ proposalId: decodeURIComponent(proposalDecisionMatch[1]), decision: body.decision, confirmation: body.confirmation, reason: body.reason, root });
      let commandResult = null;
      if (decision.acceptedCommand) {
        try { commandResult = await submitRuntimeCommand(decision.acceptedCommand); }
        catch (error) { markProposalStartFailed({ proposalId: decision.proposal.proposalId, error: error.message, root }); throw error; }
      }
      json(response, 200, { ...decision, commandResult }, headers);
      if (commandResult) setImmediate(runAutomaticQueue);
      return;
    }

    const outcomeMatch = url.pathname.match(/^\/api\/v1\/jobs\/([^/]+)\/outcome$/);
    if (request.method === "POST" && outcomeMatch) {
      const body = await readJsonBody(request);
      const result = recordJobOutcome({ jobId: decodeURIComponent(outcomeMatch[1]), rating: body.rating, reason: body.reason, confirmation: body.confirmation, root });
      json(response, 201, result, headers);
      return;
    }

    const mobileLinkMatch = url.pathname.match(/^\/api\/v1\/jobs\/([^/]+)\/mobile-approval$/);
    if (request.method === "POST" && mobileLinkMatch) {
      const link = createMobileApprovalLink({ jobId: decodeURIComponent(mobileLinkMatch[1]), root });
      const result = await deliverMobileApprovalLink({ linkResult: link, root });
      json(response, 201, result, headers);
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/v1/operating-systems") {
      json(response, 200, { systems: getOperatingSystems({ root }) }, headers);
      return;
    }

    const watchdogResolutionMatch = url.pathname.match(/^\/api\/v1\/watchdog\/findings\/([^/]+)\/resolve$/);
    if (request.method === "POST" && watchdogResolutionMatch) {
      const body = await readJsonBody(request);
      const result = resolveOperationalFinding({
        findingId: decodeURIComponent(watchdogResolutionMatch[1]),
        reason: body.reason,
        confirmation: body.confirmation,
        root
      });
      json(response, 200, {
        status: "resolved",
        findingId: result.finding.findingId,
        resolutionPath: result.recordPath,
        auditPath: result.auditPath,
        safeguards: evaluateOperationalSafeguards({ root }),
        operatingSystems: getOperatingSystems({ root })
      }, headers);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/v1/automation/run") {
      const result = await processQueuedJobs({ root });
      json(response, 200, result, headers);
      return;
    }

    const jobDecisionMatch = url.pathname.match(/^\/api\/v1\/jobs\/([^/]+)\/decision$/);
    if (request.method === "POST" && jobDecisionMatch) {
      const body = await readJsonBody(request);
      const result = decideJob({
        jobId: decodeURIComponent(jobDecisionMatch[1]),
        decision: body.decision,
        confirmation: body.confirmation,
        expiresAt: body.expiresAt,
        root
      });
      json(response, 200, result, headers);
      if (result.decision === "approve") setImmediate(runAutomaticQueue);
      return;
    }

    const jobDeliverableMatch = url.pathname.match(/^\/api\/v1\/jobs\/([^/]+)\/deliverable$/);
    if (request.method === "GET" && jobDeliverableMatch) {
      json(response, 200, getJobDeliverable({
        jobId: decodeURIComponent(jobDeliverableMatch[1]),
        root,
        includeContent: true
      }), headers);
      return;
    }

    const jobPreviewMatch = url.pathname.match(/^\/api\/v1\/jobs\/([^/]+)\/preview(?:\/(.*))?$/);
    if (request.method === "GET" && jobPreviewMatch) {
      const jobId = decodeURIComponent(jobPreviewMatch[1]);
      const deliverable = getJobDeliverable({ jobId, root, includeContent: true });
      if (!deliverable.ownerUsable || !deliverable.previewAvailable || !deliverable.entryFile) {
        json(response, 404, { error: "preview_not_available" }, headers);
        return;
      }
      const requestedFile = decodeURIComponent(jobPreviewMatch[2] || deliverable.entryFile);
      const file = deliverable.files.find((candidate) => candidate.path === requestedFile);
      if (!file) {
        json(response, 404, { error: "preview_file_not_found" }, headers);
        return;
      }
      response.writeHead(200, {
        ...headers,
        "content-type": MIME_TYPES[path.extname(file.path).toLowerCase()] || "text/plain; charset=utf-8",
        "cache-control": "no-store",
        "content-security-policy": "sandbox allow-scripts; default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors 'self'",
        "referrer-policy": "no-referrer",
        "x-content-type-options": "nosniff"
      });
      response.end(file.content);
      return;
    }

    const jobRecoveryMatch = url.pathname.match(/^\/api\/v1\/jobs\/([^/]+)\/recover$/);
    if (request.method === "POST" && jobRecoveryMatch) {
      const body = await readJsonBody(request);
      const prepared = prepareJobRecovery({
        jobId: decodeURIComponent(jobRecoveryMatch[1]),
        action: body.action,
        confirmation: body.confirmation,
        root
      });
      const result = await submitRuntimeCommand({
        command: prepared.command,
        projectId: prepared.projectId,
        useAiPlanner: body.action === "replan"
      }, {
        recovery: prepared.recovery,
        forceReplan: body.action === "replan",
        disablePlanner: body.action === "retry"
      });
      json(response, 201, { ...result, recovery: prepared.recovery }, headers);
      setImmediate(runAutomaticQueue);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/v1/commands") {
      const body = await readJsonBody(request);
      const result = await submitRuntimeCommand(body);
      json(response, 201, result, headers);
      setImmediate(runAutomaticQueue);
      return;
    }

    if (url.pathname.startsWith("/api/")) {
      json(response, 404, { error: "not_found" }, headers);
      return;
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      json(response, 405, { error: "method_not_allowed" });
      return;
    }
    serveStatic(request, response);
  } catch (error) {
    json(response, 400, { error: "request_failed", detail: error.message }, headers);
  }
});

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  if (!ownerToken) {
    console.error("AG_OS_OWNER_TOKEN is required; refusing to start without operator authentication.");
    process.exit(1);
  }
  if (ownerPasswordHash && !isOwnerPasswordHash(ownerPasswordHash)) {
    console.error("AG_OS_OWNER_PASSWORD_HASH is invalid; refusing to start with broken password authentication.");
    process.exit(1);
  }
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    console.error("AG_OS_PORT/PORT must be a valid TCP port.");
    process.exit(1);
  }

  server.listen(port, host, () => {
    console.log(JSON.stringify({ service: "ag-os-coordinator", status: "listening", host, port }));
    setImmediate(() => {
      try { refreshProposals({ root }); }
      catch (error) { console.error(JSON.stringify({ service: "ag-os-coordinator", event: "proposal-refresh-failed", detail: error.message })); }
    });
    if (process.env.AG_OS_AUTOMATION_ENABLED !== "false") {
      setImmediate(runAutomaticQueue);
      setInterval(runAutomaticQueue, 15_000).unref();
    }
    if (process.env.AG_OS_INTERNAL_WATCHDOG_ENABLED === "true") {
      const configuredInterval = Number(process.env.AG_OS_INTERNAL_WATCHDOG_INTERVAL_MS || 60_000);
      startInternalWatchdog({
        root,
        intervalMs: configuredInterval,
        onError: (error) => console.error(JSON.stringify({ service: "ag-os-coordinator", event: "internal-watchdog-failed", detail: error.message }))
      });
    }
  });
}
