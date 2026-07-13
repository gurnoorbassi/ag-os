import { createHash, timingSafeEqual } from "node:crypto";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { listRecentOwnerCommands, submitOwnerCommand } from "./lib/runtime/live-command-service.mjs";
import { evaluateProductionReadiness } from "./lib/runtime/production-readiness-processor.mjs";
import { createAnthropicPlanDraft } from "./lib/runtime/anthropic-planner.mjs";
import { evaluateAnthropicPlannerReadiness } from "./lib/runtime/anthropic-planner-readiness.mjs";
import { createProject, listProjects } from "./lib/runtime/project-service.mjs";
import { listAutonomousJobs, processQueuedJobs } from "./lib/runtime/autonomous-runner.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dashboardRoot = path.join(root, "dashboard");
const host = process.env.AG_OS_HOST || "127.0.0.1";
const port = Number(process.env.PORT || process.env.AG_OS_PORT || 8787);
const ownerToken = process.env.AG_OS_OWNER_TOKEN || "";
const allowedOrigin = process.env.AG_OS_ALLOWED_ORIGIN || "";

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

function runAutomaticQueue() {
  try {
    return processQueuedJobs({ root });
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
    "access-control-allow-headers": "authorization, content-type",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    vary: "Origin"
  };
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
  const file = path.join(root, ".codex/production/production-readiness-social-media-management-system-v1.json");
  return evaluateProductionReadiness(JSON.parse(readFileSync(file, "utf8")));
}

function aiPlannerReadiness() {
  return evaluateAnthropicPlannerReadiness({ root });
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

  if (url.pathname.startsWith("/api/") && !tokenMatches(ownerToken, suppliedToken(request))) {
    json(response, 401, { error: "unauthorized" }, headers);
    return;
  }

  try {
    if (request.method === "GET" && url.pathname === "/api/v1/status") {
      json(response, 200, {
        service: "ag-os-coordinator",
        mode: "owner_operated_fail_closed",
        automation: {
          enabled: process.env.AG_OS_AUTOMATION_ENABLED !== "false",
          pollIntervalSeconds: 15,
          adapter: "built_in_local_validation",
          liveAdaptersEnabled: false
        },
        production: readinessStatus(),
        aiPlanner: publicAiPlannerStatus(),
        projects: listProjects({ root }),
        jobs: listAutonomousJobs({ root }),
        recentCommands: listRecentOwnerCommands({ root })
      }, headers);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/v1/projects") {
      const body = await readJsonBody(request);
      const result = createProject({ input: body, root });
      json(response, 201, result, headers);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/v1/automation/run") {
      const result = processQueuedJobs({ root });
      json(response, 200, result, headers);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/v1/commands") {
      const body = await readJsonBody(request);
      const plannerReadiness = aiPlannerReadiness();
      const result = await submitOwnerCommand({
        command: body.command,
        projectId: body.projectId,
        understanding: body.understanding,
        useAiPlanner: body.useAiPlanner === true,
        aiPlannerReadiness: plannerReadiness,
        planDraftProvider: (input) => createAnthropicPlanDraft({
          ...input,
          apiKey: process.env.ANTHROPIC_API_KEY,
          model: plannerReadiness.model,
          baseUrl: process.env.ANTHROPIC_BASE_URL
        }),
        root
      });
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
  });
}
