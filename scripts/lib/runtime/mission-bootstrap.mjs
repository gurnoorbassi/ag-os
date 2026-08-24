import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { platformNpmExecutable } from "./mission-workspace.mjs";

const MAX_BOOTSTRAP_OUTPUT = 200_000;
const DEFAULT_BOOTSTRAP_TIMEOUT_MS = 300_000;
const LOCKFILES = {
  npm: ["package-lock.json", "npm-shrinkwrap.json"],
  pnpm: ["pnpm-lock.yaml"],
  yarn: ["yarn.lock"]
};

function abortError(signal) {
  const error = signal?.reason instanceof Error ? signal.reason : new Error(String(signal?.reason || "mission bootstrap aborted"));
  error.name = "AbortError";
  error.code = "ABORT_ERR";
  return error;
}

function bounded(current, chunk) {
  const next = `${current}${String(chunk || "")}`;
  return next.length > MAX_BOOTSTRAP_OUTPUT ? next.slice(-MAX_BOOTSTRAP_OUTPUT) : next;
}

function packageManagerDeclaration(packageJson) {
  if (!packageJson.packageManager) return null;
  const match = String(packageJson.packageManager).match(/^(npm|pnpm|yarn)@([^+\s]+)(?:\+.*)?$/);
  if (!match) throw new Error(`unsupported or malformed packageManager declaration: ${packageJson.packageManager}`);
  return { name: match[1], version: match[2] };
}

export function detectWorkspacePackageManager(workspacePath) {
  const packagePath = path.join(workspacePath, "package.json");
  if (!existsSync(packagePath)) return { required: false, reason: "no_package_json" };
  const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
  const declaration = packageManagerDeclaration(packageJson);
  const lockManagers = Object.entries(LOCKFILES).filter(([, files]) => files.some((file) => existsSync(path.join(workspacePath, file)))).map(([name]) => name);
  if (declaration && lockManagers.length > 0 && !lockManagers.includes(declaration.name)) {
    throw new Error(`packageManager ${declaration.name} conflicts with ${lockManagers.join(", ")} lockfile`);
  }
  if (!declaration && lockManagers.length > 1) throw new Error(`multiple package manager lockfiles found: ${lockManagers.join(", ")}`);
  const manager = declaration?.name || lockManagers[0] || null;
  const hasDependencies = Object.keys(packageJson.dependencies || {}).length > 0 || Object.keys(packageJson.devDependencies || {}).length > 0 || Object.keys(packageJson.optionalDependencies || {}).length > 0;
  if (!manager) {
    if (hasDependencies) throw new Error("dependency-based Node workspace requires packageManager or a supported lockfile");
    return { required: false, reason: "no_dependencies", packageJson };
  }
  if (!lockManagers.includes(manager)) throw new Error(`deterministic ${manager} bootstrap requires its lockfile`);
  return { required: true, manager, version: declaration?.version || null, packageJson };
}

function wrappedExecutable(executable, args) {
  if (process.platform === "win32" && executable.endsWith(".cmd")) {
    return { executable: process.env.ComSpec || "cmd.exe", args: ["/d", "/s", "/c", executable, ...args] };
  }
  return { executable, args };
}

function bootstrapCommand(detected) {
  if (detected.manager === "npm") return wrappedExecutable(platformNpmExecutable(), ["ci", "--ignore-scripts", "--no-audit", "--no-fund"]);
  const corepack = process.platform === "win32" ? "corepack.cmd" : "corepack";
  if (detected.manager === "pnpm") return wrappedExecutable(corepack, ["pnpm", "install", "--frozen-lockfile", "--ignore-scripts"]);
  const yarnMajor = Number(String(detected.version || "1").split(".")[0]);
  return yarnMajor >= 2
    ? wrappedExecutable(corepack, ["yarn", "install", "--immutable", "--mode=skip-build"])
    : wrappedExecutable(corepack, ["yarn", "install", "--frozen-lockfile", "--ignore-scripts", "--non-interactive"]);
}

async function executeBootstrap({ workspacePath, command, timeoutMs, signal }) {
  if (signal?.aborted) throw abortError(signal);
  return new Promise((resolve, reject) => {
    const childEnv = { ...process.env, npm_config_audit: "false", npm_config_fund: "false", npm_config_update_notifier: "false" };
    delete childEnv.NODE_TEST_CONTEXT;
    const child = spawn(command.executable, command.args, { cwd: workspacePath, env: childEnv, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let settled = false;
    const terminate = () => {
      if (child.exitCode === null && process.platform === "win32" && child.pid) {
        const killer = spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore", windowsHide: true });
        killer.on("error", () => { if (child.exitCode === null) child.kill("SIGTERM"); });
      } else if (child.exitCode === null) child.kill("SIGTERM");
      const force = setTimeout(() => { if (child.exitCode === null) child.kill("SIGKILL"); }, 1500);
      force.unref?.();
    };
    const onAbort = () => terminate();
    const timer = setTimeout(() => { timedOut = true; terminate(); }, timeoutMs);
    timer.unref?.();
    signal?.addEventListener("abort", onAbort, { once: true });
    child.stdout.on("data", (chunk) => { stdout = bounded(stdout, chunk); });
    child.stderr.on("data", (chunk) => { stderr = bounded(stderr, chunk); });
    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      if (signal?.aborted) reject(abortError(signal));
      else reject(new Error(`dependency bootstrap failed to start: ${error.message}`));
    });
    child.on("close", (status) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      if (signal?.aborted) return reject(abortError(signal));
      if (timedOut) return reject(new Error(`dependency bootstrap timed out after ${timeoutMs}ms`));
      if (status !== 0) return reject(new Error(`dependency bootstrap failed with exit ${status}: ${(stderr || stdout).slice(-4000)}`));
      resolve({ status, stdout, stderr });
    });
  });
}

export async function bootstrapMissionWorkspace({ workspacePath, timeoutMs = DEFAULT_BOOTSTRAP_TIMEOUT_MS, signal = null }) {
  const detected = detectWorkspacePackageManager(workspacePath);
  if (!detected.required) return { status: "not_required", manager: null, reason: detected.reason, lifecycleScriptsAllowed: false };
  const command = bootstrapCommand(detected);
  const result = await executeBootstrap({ workspacePath, command, timeoutMs, signal });
  return {
    status: "complete",
    manager: detected.manager,
    version: detected.version,
    lifecycleScriptsAllowed: false,
    command: [command.executable, ...command.args].join(" "),
    exitStatus: result.status,
    output: (result.stderr || result.stdout || "").slice(-4000)
  };
}
