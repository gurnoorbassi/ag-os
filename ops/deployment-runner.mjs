import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { validateProductionDeploymentRequest } from "../scripts/lib/runtime/production-deployment-adapter.mjs";

const host = process.env.AG_OS_DEPLOYMENT_RUNNER_HOST || "127.0.0.1";
const port = Number(process.env.AG_OS_DEPLOYMENT_RUNNER_PORT || 8790);
const credential = process.env.AG_OS_DEPLOYMENT_RUNNER_TOKEN || "";
const profilesPath = process.env.AG_OS_DEPLOYMENT_PROFILES_FILE || "/etc/ag-os/deployment-profiles.json";
let busy = false;

function digest(value) { return createHash("sha256").update(String(value || "")).digest(); }
function authorized(request) {
  const header = String(request.headers.authorization || "");
  const supplied = header.startsWith("Bearer ") ? header.slice(7) : "";
  return Boolean(credential && supplied) && timingSafeEqual(digest(credential), digest(supplied));
}

function json(response, status, body) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" });
  response.end(`${JSON.stringify(body)}\n`);
}

async function body(request) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > 64_000) throw new Error("deployment request is too large");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function commandList(value, name) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 20) throw new Error(`profile ${name} commands are required`);
  return value.map((command) => {
    if (!command || typeof command !== "object" || !path.isAbsolute(command.file) || !path.isAbsolute(command.cwd) || !Array.isArray(command.args)) {
      throw new Error(`profile ${name} command must use absolute file and cwd values plus an args array`);
    }
    if (command.args.length > 40 || command.args.some((arg) => typeof arg !== "string" || /[\r\n\0]/.test(arg))) throw new Error(`profile ${name} command args are invalid`);
    if (!["/opt", "/var/lib/ag-os", "/var/backups/ag-os"].some((root) => command.cwd === root || command.cwd.startsWith(`${root}/`))) {
      throw new Error(`profile ${name} cwd is outside the deployment allowlist`);
    }
    return command;
  });
}

export function loadDeploymentProfiles(filePath = profilesPath) {
  const stat = statSync(filePath);
  if (process.platform !== "win32" && (stat.uid !== 0 || (stat.mode & 0o077) !== 0)) {
    throw new Error("deployment profiles must be root-owned and inaccessible to group or other users");
  }
  const parsed = JSON.parse(readFileSync(filePath, "utf8"));
  if (!Array.isArray(parsed.profiles) || parsed.profiles.length === 0 || parsed.profiles.length > 10) throw new Error("deployment profiles are missing");
  return parsed.profiles.map((profile) => ({
    profileId: String(profile.profileId || ""),
    repository: String(profile.repository || ""),
    expectedService: String(profile.expectedService || ""),
    backup: commandList(profile.backup, "backup"),
    deploy: commandList(profile.deploy, "deploy"),
    verify: commandList(profile.verify, "verify"),
    rollback: commandList(profile.rollback, "rollback")
  }));
}

function expand(value, context) {
  return value.replaceAll("${commitSha}", context.commitSha).replaceAll("${backupId}", context.backupId);
}

function runCommands(commands, context) {
  const childEnvironment = { ...process.env, AG_OS_APPROVED_COMMIT: context.commitSha, AG_OS_BACKUP_ID: context.backupId };
  delete childEnvironment.AG_OS_DEPLOYMENT_RUNNER_TOKEN;
  for (const command of commands) {
    const result = spawnSync(command.file, command.args.map((arg) => expand(arg, context)), {
      cwd: command.cwd,
      encoding: "utf8",
      timeout: 15 * 60 * 1000,
      shell: false,
      env: childEnvironment
    });
    if (result.status !== 0) throw new Error(`allowlisted deployment phase failed with status ${result.status}`);
  }
}

export function executeDeploymentProfile({ request, profiles = loadDeploymentProfiles() }) {
  const candidate = validateProductionDeploymentRequest({ request });
  const profile = profiles.find((item) => item.profileId === candidate.profileId);
  if (!profile || profile.repository !== candidate.repository || profile.expectedService !== candidate.expectedService) {
    throw new Error("deployment request does not match an allowlisted root-owned profile");
  }
  const backupId = `backup-${new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14)}-${randomUUID().slice(0, 8)}`;
  const context = { commitSha: candidate.commitSha, backupId };
  try {
    runCommands(profile.backup, context);
    runCommands(profile.deploy, context);
    runCommands(profile.verify, context);
  } catch (error) {
    try { runCommands(profile.rollback, context); } catch { /* original failure remains authoritative */ }
    throw error;
  }
  return {
    status: "succeeded",
    deploymentId: `deployment-${randomUUID()}`,
    profileId: candidate.profileId,
    repository: candidate.repository,
    verifiedCommit: candidate.commitSha,
    expectedService: candidate.expectedService,
    backupId,
    rollbackAvailable: true,
    health: { ok: true, checkedAt: new Date().toISOString() }
  };
}

const server = createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/health") return json(response, 200, { service: "ag-os-deployment-runner", status: "ready", busy });
  if (request.method !== "POST" || request.url !== "/v1/deployments") return json(response, 404, { error: "not_found" });
  if (!authorized(request)) return json(response, 401, { error: "unauthorized" });
  if (busy) return json(response, 409, { error: "deployment_in_progress" });
  busy = true;
  try {
    json(response, 200, executeDeploymentProfile({ request: await body(request) }));
  } catch (error) {
    json(response, 400, { error: "deployment_failed", detail: error.message });
  } finally {
    busy = false;
  }
});

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!credential) throw new Error("AG OS deployment runner credential is required");
  if (host !== "127.0.0.1") throw new Error("deployment runner must remain loopback-only");
  server.listen(port, host, () => console.log(JSON.stringify({ service: "ag-os-deployment-runner", status: "listening", host, port })));
}
