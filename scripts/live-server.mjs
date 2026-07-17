import { createHash, timingSafeEqual } from "node:crypto";
import { createReadStream, existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { commandRequiresBuilder, listRecentOwnerCommands, submitOwnerCommand } from "./lib/runtime/live-command-service.mjs";
import { evaluateProductionReadiness } from "./lib/runtime/production-readiness-processor.mjs";
import { createAnthropicPlanDraft } from "./lib/runtime/anthropic-planner.mjs";
import { evaluateAnthropicPlannerReadiness } from "./lib/runtime/anthropic-planner-readiness.mjs";
import { createAnthropicWorkProduct } from "./lib/runtime/anthropic-worker.mjs";
import { evaluateAnthropicWorkerReadiness } from "./lib/runtime/anthropic-worker-readiness.mjs";
import { createProject, listProjects } from "./lib/runtime/project-service.mjs";
import {
  decideLessons,
  getOperatingSystems,
  getProjectWorkspace,
  listLessonDecisions
} from "./lib/runtime/control-center-service.mjs";
import { autonomousExecutionStatus, listAutonomousJobs, processQueuedJobs } from "./lib/runtime/autonomous-runner.mjs";
import { decideJob } from "./lib/runtime/job-approval-service.mjs";
import { evaluateOperationalSafeguards, resolveOperationalFinding } from "./lib/runtime/operational-safeguards.mjs";
import { startInternalWatchdog } from "./lib/runtime/internal-watchdog.mjs";
import { getJobDeliverable } from "./lib/runtime/deliverable-service.mjs";
import { prepareJobRecovery } from "./lib/runtime/job-recovery-service.mjs";
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
const configuredSessionDays = Number(process.env.AG_OS_OWNER_SESSION_DAYS || 30);
const ownerSessionDays = Number.isInteger(configuredSessionDays) && configuredSessionDays >= 1 && configuredSessionDays <= 30
  ? configuredSessionDays
  : 30;
const secureSessionCookie = process.env.AG_OS_OWNER_SESSION_COOKIE_SECURE === "true";
const allowedOrigin = process.env.AG_OS_ALLOWED_ORIGIN || "";
const loginRateLimiter = createLoginRateLimiter();

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
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

function loginRateLimitKey(request) {
  return request.socket.remoteAddress || "unknown-private-client";
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

async function submitRuntimeCommand(body, { recovery = null, forceReplan = false, disablePlanner = false } = {}) {
  const plannerReadiness = aiPlannerReadiness();
  const workerReadiness = aiWorkerReadiness();
  const builderRequired = !body.executionRequest && commandRequiresBuilder(body.command);
  const useAiWorker = body.useAiWorker === true || builderRequired;
  const useAiPlanner = !disablePlanner && (body.useAiPlanner === true || forceReplan || (builderRequired && plannerReadiness.ready));
  if (builderRequired && !workerReadiness.ready) {
    throw new Error(`This command requests a real deliverable, but the professional builder is not active: ${workerReadiness.blockers.join("; ")}. AG OS did not create a plan-only job or claim completion.`);
  }
  return submitOwnerCommand({
    command: body.command,
    projectId: body.projectId,
    understanding: body.understanding,
    executionRequest: body.executionRequest,
    useAiPlanner,
    useAiWorker,
    aiPlannerReadiness: plannerReadiness,
    aiWorkerReadiness: workerReadiness,
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
    recovery,
    root
  });
}

function serveStatic(request, response) {
  const requestPath = new URL(request.url, "http://localhost").pathname;
  const relative = requestPath === "/" ? "index.html" : decodeURIComponent(requestPath.slice(1));
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
        secure: secureSessionCookie
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
      "set-cookie": clearOwnerSessionCookie({ secure: secureSessionCookie })
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
        projects: listProjects({ root }),
        operatingSystems: getOperatingSystems({ root }),
        lessonDecisions: listLessonDecisions({ root }),
        jobs: listAutonomousJobs({ root }),
        recentCommands: listRecentOwnerCommands({ root })
      }, headers);
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
