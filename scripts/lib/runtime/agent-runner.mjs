import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { gitDiff, gitStatus, platformNpmExecutable } from "./mission-workspace.mjs";

const MAX_TOOL_STEPS = 60;
const MAX_FILE_BYTES = 1_000_000;
const MAX_OUTPUT_BYTES = 200_000;
const BLOCKED_SEGMENTS = new Set([".git", "node_modules"]);
const SECRET_PATH_PATTERN = /(^|\/)(?:\.env(?:\..+)?|id_rsa|id_ed25519|credentials?\.json)$/i;
const SECRET_CONTENT_PATTERNS = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bgh[opusr]_[A-Za-z0-9_]{20,}\b/,
  /\bsk-[A-Za-z0-9_-]{20,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/
];
const READ_TOOLS = ["list_files", "read_file", "search_files", "git_diff"];
const COMMAND_TOOLS = ["run_command", "run_tests", "run_build", "run_typecheck"];
const EDIT_TOOLS = ["write_file", "edit_file", "apply_patch"];

export const ROLE_TOOL_POLICIES = Object.freeze({
  Commander: [],
  "Product Manager": READ_TOOLS,
  Architect: [...READ_TOOLS, ...EDIT_TOOLS],
  "UI Designer": [...READ_TOOLS, ...EDIT_TOOLS],
  "Frontend Engineer": [...READ_TOOLS, ...EDIT_TOOLS, ...COMMAND_TOOLS],
  "Backend Engineer": [...READ_TOOLS, ...EDIT_TOOLS, ...COMMAND_TOOLS],
  "Database Engineer": [...READ_TOOLS, ...EDIT_TOOLS, ...COMMAND_TOOLS],
  "QA Engineer": [...READ_TOOLS, ...COMMAND_TOOLS],
  "Security Reviewer": [...READ_TOOLS, ...COMMAND_TOOLS],
  "Code Reviewer": [...READ_TOOLS, ...COMMAND_TOOLS],
  Fixer: [...READ_TOOLS, ...EDIT_TOOLS, ...COMMAND_TOOLS],
  "Integration Agent": [...READ_TOOLS, ...COMMAND_TOOLS]
});

export function allowedToolsForRole(role) {
  const tools = ROLE_TOOL_POLICIES[role];
  if (!tools) throw new Error(`unsupported mission role: ${role}`);
  return [...tools];
}

function abortError(signal) {
  const error = signal?.reason instanceof Error ? signal.reason : new Error(String(signal?.reason || "mission execution aborted"));
  error.name = "AbortError";
  error.code = "ABORT_ERR";
  return error;
}

function throwIfAborted(signal) {
  if (signal?.aborted) throw abortError(signal);
}

function normalizedRelative(value) {
  const normalized = String(value || "").replaceAll("\\", "/").replace(/^\.\//, "");
  if (!normalized || normalized.startsWith("/") || normalized.split("/").includes("..")) throw new Error("tool path escapes the assigned workspace");
  if (normalized.split("/").some((segment) => BLOCKED_SEGMENTS.has(segment))) throw new Error("tool path targets a protected workspace segment");
  if (SECRET_PATH_PATTERN.test(normalized)) throw new Error("tool path targets a secret-bearing file class");
  return normalized;
}

export function resolveAgentPath(workspacePath, relativePath, { allowMissing = false } = {}) {
  const normalized = normalizedRelative(relativePath);
  const root = realpathSync(workspacePath);
  const target = path.resolve(root, normalized);
  if (!target.startsWith(`${root}${path.sep}`)) throw new Error("tool path escapes the assigned workspace");
  let probe = target;
  while (!existsSync(probe) && path.dirname(probe) !== probe) probe = path.dirname(probe);
  const realParent = realpathSync(probe);
  if (realParent !== root && !realParent.startsWith(`${root}${path.sep}`)) throw new Error("tool path resolves outside the assigned workspace");
  if (existsSync(target) && lstatSync(target).isSymbolicLink()) throw new Error("agent tools cannot follow symbolic links");
  if (!allowMissing && !existsSync(target)) throw new Error(`workspace file does not exist: ${normalized}`);
  return { normalized, absolute: target };
}

function assertSafeContent(content) {
  if (typeof content !== "string") throw new Error("file content must be text");
  if (Buffer.byteLength(content, "utf8") > MAX_FILE_BYTES) throw new Error(`file exceeds ${MAX_FILE_BYTES} bytes`);
  if (SECRET_CONTENT_PATTERNS.some((pattern) => pattern.test(content))) throw new Error("file content appears to contain secret material");
}

function walkFiles(workspacePath, relative = "", output = []) {
  const directory = relative ? resolveAgentPath(workspacePath, relative).absolute : realpathSync(workspacePath);
  for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (BLOCKED_SEGMENTS.has(entry.name)) continue;
    const child = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) walkFiles(workspacePath, child, output);
    else if (entry.isFile()) output.push(child.replaceAll("\\", "/"));
    if (output.length >= 2000) break;
  }
  return output;
}

function commandTokens(command) {
  const text = String(command || "").trim();
  if (!text || text.length > 500) throw new Error("local command is missing or too long");
  if (/[;&|><`\r\n]/.test(text) || text.includes("$(")) throw new Error("shell operators are not allowed in agent commands");
  const tokens = [...text.matchAll(/"([^"]*)"|'([^']*)'|([^\s]+)/g)].map((match) => match[1] ?? match[2] ?? match[3]);
  const executable = String(tokens.shift() || "").toLowerCase().replace(/\.cmd$/, "");
  if (executable === "npm") {
    if (!(tokens[0] === "test" || (tokens[0] === "run" && /^[a-z0-9:_-]+$/i.test(tokens[1] || "")))) throw new Error("npm agent commands are limited to test and declared run scripts");
    if (process.platform === "win32") return { executable: process.env.ComSpec || "cmd.exe", args: ["/d", "/s", "/c", platformNpmExecutable(), ...tokens] };
    return { executable: platformNpmExecutable(), args: tokens };
  }
  if (executable === "node") {
    if (tokens[0] !== "--test") throw new Error("node agent commands are limited to the test runner");
    return { executable: process.execPath, args: tokens };
  }
  if (executable === "git") {
    if (!new Set(["diff", "status"]).has(tokens[0])) throw new Error("git agent commands are read-only");
    return { executable: "git", args: tokens };
  }
  throw new Error(`agent command is not allowlisted: ${executable || "missing"}`);
}

export function assertAllowedAgentCommand(command) {
  commandTokens(command);
  return command;
}

function appendBounded(current, chunk) {
  const next = `${current}${String(chunk || "")}`;
  return next.length > MAX_OUTPUT_BYTES ? next.slice(-MAX_OUTPUT_BYTES) : next;
}

async function runBoundedCommand({ parsed, command, workspacePath, timeoutMs, signal }) {
  throwIfAborted(signal);
  const childEnv = { ...process.env };
  delete childEnv.NODE_TEST_CONTEXT;
  return new Promise((resolve, reject) => {
    const child = spawn(parsed.executable, parsed.args, { cwd: workspacePath, env: childEnv, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let settled = false;
    const stop = () => {
      if (child.exitCode === null && process.platform === "win32" && child.pid) {
        const killer = spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore", windowsHide: true });
        killer.on("error", () => { if (child.exitCode === null) child.kill("SIGTERM"); });
      } else if (child.exitCode === null) child.kill("SIGTERM");
      const forceTimer = setTimeout(() => { if (child.exitCode === null) child.kill("SIGKILL"); }, 1500);
      forceTimer.unref?.();
    };
    const onAbort = () => stop();
    const timer = setTimeout(() => { timedOut = true; stop(); }, timeoutMs);
    timer.unref?.();
    signal?.addEventListener("abort", onAbort, { once: true });
    child.stdout.on("data", (chunk) => { stdout = appendBounded(stdout, chunk); });
    child.stderr.on("data", (chunk) => { stderr = appendBounded(stderr, chunk); });
    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      if (signal?.aborted) reject(abortError(signal));
      else resolve({ command, passed: false, status: null, stdout, stderr: appendBounded(stderr, error.message) });
    });
    child.on("close", (status, childSignal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      if (signal?.aborted) {
        reject(abortError(signal));
        return;
      }
      if (timedOut) stderr = appendBounded(stderr, `command timed out after ${timeoutMs}ms`);
      resolve({ command, passed: !timedOut && status === 0, status, signal: childSignal, stdout, stderr });
    });
  });
}

export async function executeAgentTool({ workspacePath, tool, input = {}, timeoutMs = 120_000, reviewBaseRevision = null, allowedTools = null, signal = null }) {
  throwIfAborted(signal);
  if (Array.isArray(allowedTools) && !allowedTools.includes(tool)) {
    const error = new Error(`agent role is not allowed to use tool: ${tool}`);
    error.code = "tool_not_allowed";
    throw error;
  }
  if (tool === "list_files") return { files: walkFiles(workspacePath) };
  if (tool === "read_file") {
    const target = resolveAgentPath(workspacePath, input.path);
    const stat = lstatSync(target.absolute);
    if (!stat.isFile() || stat.size > MAX_FILE_BYTES) throw new Error("file is not readable by the bounded agent tool");
    return { path: target.normalized, content: readFileSync(target.absolute, "utf8") };
  }
  if (tool === "search_files") {
    const query = String(input.query || "");
    if (!query || query.length > 200) throw new Error("search query is missing or too long");
    const matches = [];
    for (const file of walkFiles(workspacePath)) {
      const target = resolveAgentPath(workspacePath, file);
      if (lstatSync(target.absolute).size > MAX_FILE_BYTES) continue;
      const lines = readFileSync(target.absolute, "utf8").split(/\r?\n/);
      lines.forEach((line, index) => { if (line.includes(query) && matches.length < 200) matches.push({ path: file, line: index + 1, text: line.slice(0, 500) }); });
    }
    return { query, matches };
  }
  if (tool === "write_file") {
    const target = resolveAgentPath(workspacePath, input.path, { allowMissing: true });
    assertSafeContent(input.content);
    mkdirSync(path.dirname(target.absolute), { recursive: true });
    writeFileSync(target.absolute, input.content, "utf8");
    return { path: target.normalized, bytes: Buffer.byteLength(input.content, "utf8") };
  }
  if (tool === "edit_file" || tool === "apply_patch") {
    const target = resolveAgentPath(workspacePath, input.path);
    const current = readFileSync(target.absolute, "utf8");
    const search = String(input.search ?? "");
    if (!search || !current.includes(search)) throw new Error("edit search text was not found exactly once");
    if (current.indexOf(search) !== current.lastIndexOf(search)) throw new Error("edit search text is ambiguous");
    const next = current.replace(search, String(input.replace ?? ""));
    assertSafeContent(next);
    writeFileSync(target.absolute, next, "utf8");
    return { path: target.normalized, bytes: Buffer.byteLength(next, "utf8") };
  }
  if (tool === "git_diff") return { diff: gitDiff(workspacePath, reviewBaseRevision), status: gitStatus(workspacePath) };
  if (tool === "run_command" || tool === "run_tests" || tool === "run_build" || tool === "run_typecheck") {
    const parsed = commandTokens(input.command);
    return runBoundedCommand({ parsed, command: input.command, workspacePath, timeoutMs, signal });
  }
  throw new Error(`agent tool is not supported: ${tool}`);
}

export async function runAgentToolLoop({ agent, task, workspace, provider, emit, budgetRemainingUsd = Infinity, maxSteps = MAX_TOOL_STEPS, now = () => new Date(), signal = null }) {
  if (!provider || typeof provider.nextAction !== "function") throw new Error("agent provider must implement nextAction");
  const transcript = [];
  const filesChanged = new Set();
  const commandsExecuted = [];
  const testResults = [];
  const toolsUsed = [];
  let tokenUsage = { input: 0, output: 0 };
  let costUsd = 0;
  for (let step = 1; step <= maxSteps; step += 1) {
    throwIfAborted(signal);
    const response = await provider.nextAction({ agent, task, workspace, transcript: [...transcript], budgetRemainingUsd: budgetRemainingUsd - costUsd, step, signal });
    throwIfAborted(signal);
    const action = response?.action;
    tokenUsage = { input: tokenUsage.input + Number(response?.usage?.input || 0), output: tokenUsage.output + Number(response?.usage?.output || 0) };
    costUsd = Number((costUsd + Number(response?.costUsd || 0)).toFixed(6));
    if (costUsd > budgetRemainingUsd) {
      const error = new Error("mission budget exhausted during agent execution");
      error.code = "mission_budget_exhausted";
      error.costUsd = costUsd;
      error.tokenUsage = tokenUsage;
      throw error;
    }
    if (!action?.tool) throw new Error("agent provider returned no tool action");
    if (action.tool === "complete") {
      return {
        outcome: action.input?.outcome === "failed" ? "failed" : "complete",
        summary: String(action.input?.summary || "Agent completed the assigned task."),
        defects: Array.isArray(action.input?.defects) ? action.input.defects : [],
        filesChanged: [...filesChanged],
        commandsExecuted,
        testResults,
        toolsUsed,
        tokenUsage,
        costUsd,
        steps: step
      };
    }
    if (!agent.allowedTools.includes(action.tool)) {
      const error = new Error(`${agent.role} is not allowed to use tool: ${action.tool}`);
      error.code = "tool_not_allowed";
      throw error;
    }
    emit("tool.started", { tool: action.tool, input: { ...action.input, ...(action.input?.content ? { content: `[${Buffer.byteLength(action.input.content, "utf8")} bytes]` } : {}) } }, now());
    toolsUsed.push(action.tool);
    if (["run_command", "run_tests", "run_build", "run_typecheck"].includes(action.tool)) {
      emit("command.started", { command: action.input?.command, tool: action.tool }, now());
      if (action.tool === "run_tests") emit("test.started", { command: action.input?.command }, now());
    }
    let result;
    try {
      result = await executeAgentTool({ workspacePath: workspace.path, tool: action.tool, input: action.input, reviewBaseRevision: workspace.reviewBaseRevision, allowedTools: agent.allowedTools, signal });
      throwIfAborted(signal);
      emit("tool.completed", { tool: action.tool, passed: result.passed !== false }, now());
    } catch (error) {
      if (error?.name === "AbortError" || error?.code === "ABORT_ERR" || error?.code === "tool_not_allowed") throw error;
      result = { error: error.message, passed: false };
      emit("tool.completed", { tool: action.tool, passed: false, error: error.message }, now());
    }
    if (["write_file", "edit_file", "apply_patch"].includes(action.tool) && result.path) {
      filesChanged.add(result.path);
      emit("file.changed", { path: result.path, bytes: result.bytes }, now());
    }
    if (["run_command", "run_tests", "run_build", "run_typecheck"].includes(action.tool)) {
      commandsExecuted.push({ command: result.command || action.input?.command, passed: result.passed, status: result.status });
      emit("command.completed", { command: result.command || action.input?.command, passed: result.passed, status: result.status }, now());
      if (action.tool === "run_tests") {
        testResults.push({ command: result.command, passed: result.passed, output: (result.stderr || result.stdout || "").slice(-4000) });
        emit(result.passed ? "test.passed" : "test.failed", { command: result.command, output: (result.stderr || result.stdout || "").slice(-4000) }, now());
      }
    }
    transcript.push({ action, result });
    if (["QA Engineer", "Integration Agent"].includes(agent.role) && Array.isArray(task.validationCommands) && task.validationCommands.length > 0) {
      const evidence = new Map(commandsExecuted.map((entry) => [entry.command, entry]));
      const allDeclaredValidationPassed = task.validationCommands.every((command) => evidence.get(command)?.passed === true);
      const integrationEvidenceReady = agent.role !== "Integration Agent" || toolsUsed.includes("git_diff");
      if (allDeclaredValidationPassed && integrationEvidenceReady) {
        return {
          outcome: "complete",
          summary: `${agent.role} completed the full declared validation strategy with passing evidence.`,
          defects: [],
          filesChanged: [...filesChanged],
          commandsExecuted,
          testResults,
          toolsUsed,
          tokenUsage,
          costUsd,
          steps: step,
          completionMode: "deterministic_validation_evidence"
        };
      }
    }
  }
  throw new Error(`agent exceeded its bounded ${maxSteps}-step tool loop`);
}
