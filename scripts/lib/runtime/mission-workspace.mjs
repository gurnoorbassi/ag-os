import { existsSync, lstatSync, mkdirSync, realpathSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";
import process from "node:process";
import { slugify } from "./common.mjs";

function git(args, { cwd, allowFailure = false } = {}) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (!allowFailure && result.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${(result.stderr || result.stdout).trim()}`);
  return { status: result.status, stdout: result.stdout.trim(), stderr: result.stderr.trim() };
}

export function assertGitRepository(repositoryPath) {
  const resolved = path.resolve(repositoryPath);
  if (!existsSync(resolved) || !lstatSync(resolved).isDirectory()) throw new Error("mission base repository does not exist");
  const probe = git(["rev-parse", "--show-toplevel"], { cwd: resolved });
  return realpathSync(probe.stdout);
}

export function resolveBaseRevision({ repositoryPath, baseRevision = "HEAD" }) {
  return git(["rev-parse", "--verify", `${baseRevision}^{commit}`], { cwd: repositoryPath }).stdout;
}

function runtimeBase(repositoryPath) {
  const parent = path.dirname(repositoryPath);
  return path.join(parent, ".ag-os-mission-worktrees", slugify(path.basename(repositoryPath)));
}

function safeBranchFragment(value) {
  const slug = slugify(value);
  if (slug.length <= 64) return slug;
  const fingerprint = createHash("sha256").update(String(value)).digest("hex").slice(0, 10);
  return `${slug.slice(0, 53)}-${fingerprint}`;
}

export function createMissionIntegrationWorkspace({ missionId, repositoryPath, baseRevision = "HEAD" }) {
  const repository = assertGitRepository(repositoryPath);
  const revision = resolveBaseRevision({ repositoryPath: repository, baseRevision });
  const branch = `codex/mission-${safeBranchFragment(missionId)}-integration`;
  const workspacePath = path.join(runtimeBase(repository), safeBranchFragment(missionId), "integration");
  mkdirSync(path.dirname(workspacePath), { recursive: true });
  git(["worktree", "add", "-b", branch, workspacePath, revision], { cwd: repository });
  return { workspaceId: `workspace-${safeBranchFragment(missionId)}-integration`, path: workspacePath, branch, baseRevision: revision, repository };
}

export function createTaskWorkspace({ missionId, taskId, repositoryPath, integrationWorkspace }) {
  const repository = assertGitRepository(repositoryPath);
  const baseRevision = resolveBaseRevision({ repositoryPath: integrationWorkspace.path, baseRevision: "HEAD" });
  const branch = `codex/mission-${safeBranchFragment(missionId)}-${safeBranchFragment(taskId)}`;
  const workspacePath = path.join(runtimeBase(repository), safeBranchFragment(missionId), safeBranchFragment(taskId));
  mkdirSync(path.dirname(workspacePath), { recursive: true });
  git(["worktree", "add", "-b", branch, workspacePath, baseRevision], { cwd: repository });
  return { workspaceId: `workspace-${safeBranchFragment(taskId)}`, path: workspacePath, branch, baseRevision, reviewBaseRevision: integrationWorkspace.baseRevision, repository };
}

export function removeTaskWorkspace({ workspace }) {
  const repository = assertGitRepository(workspace.repository);
  const base = path.resolve(runtimeBase(repository));
  const target = path.resolve(workspace.path);
  if (!target.startsWith(`${base}${path.sep}`)) throw new Error("task worktree cleanup target escaped its verified runtime directory");
  if (!String(workspace.branch || "").startsWith("codex/mission-")) throw new Error("task worktree cleanup refused an unexpected branch");
  git(["worktree", "remove", "--force", target], { cwd: repository, allowFailure: true });
  if (existsSync(target)) rmSync(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  git(["branch", "-D", workspace.branch], { cwd: repository, allowFailure: true });
  git(["worktree", "prune"], { cwd: repository, allowFailure: true });
  return { removed: target, branch: workspace.branch };
}

export function commitTaskWorkspace({ workspace, taskId }) {
  const status = git(["status", "--porcelain"], { cwd: workspace.path }).stdout;
  if (!status) return { changed: false, commit: null, files: [] };
  git(["add", "-A"], { cwd: workspace.path });
  for (const generatedPath of [":(glob)**/node_modules/**", ":(glob)**/.pnpm-store/**", ":(glob)**/.yarn/cache/**", ":(glob)**/.yarn/unplugged/**"]) {
    git(["reset", "--quiet", "HEAD", "--", generatedPath], { cwd: workspace.path, allowFailure: true });
  }
  if (git(["diff", "--cached", "--quiet"], { cwd: workspace.path, allowFailure: true }).status === 0) return { changed: false, commit: null, files: [] };
  git(["commit", "-m", `AG OS mission task: ${taskId}`], { cwd: workspace.path });
  const commit = git(["rev-parse", "HEAD"], { cwd: workspace.path }).stdout;
  const files = git(["diff-tree", "--no-commit-id", "--name-only", "-r", commit], { cwd: workspace.path }).stdout.split(/\r?\n/).filter(Boolean);
  return { changed: true, commit, files };
}

export function integrateTaskCommit({ integrationWorkspace, commit }) {
  if (!commit) return { integrated: false, commit: null, files: [] };
  const result = git(["cherry-pick", commit], { cwd: integrationWorkspace.path, allowFailure: true });
  if (result.status !== 0) {
    git(["cherry-pick", "--abort"], { cwd: integrationWorkspace.path, allowFailure: true });
    return { integrated: false, conflict: true, error: result.stderr || result.stdout };
  }
  const integratedCommit = git(["rev-parse", "HEAD"], { cwd: integrationWorkspace.path }).stdout;
  const files = git(["diff-tree", "--no-commit-id", "--name-only", "-r", integratedCommit], { cwd: integrationWorkspace.path }).stdout.split(/\r?\n/).filter(Boolean);
  return { integrated: true, commit: integratedCommit, files };
}

export function gitDiff(workspacePath, baseRevision = null) {
  const committed = baseRevision ? git(["diff", `${baseRevision}...HEAD`, "--", "."], { cwd: workspacePath }).stdout : "";
  const working = git(["diff", "--", "."], { cwd: workspacePath }).stdout;
  return [committed, working].filter(Boolean).join("\n");
}

export function gitStatus(workspacePath) {
  return git(["status", "--short"], { cwd: workspacePath }).stdout;
}

export function gitRevision(workspacePath) {
  return git(["rev-parse", "HEAD"], { cwd: workspacePath }).stdout;
}

export function cancelMissionWorkspaces({ repositoryPath, missionId }) {
  const repository = assertGitRepository(repositoryPath);
  const base = path.join(runtimeBase(repository), safeBranchFragment(missionId));
  const listed = git(["worktree", "list", "--porcelain"], { cwd: repository }).stdout;
  const targets = listed.split(/\r?\n/).filter((line) => line.startsWith("worktree ")).map((line) => line.slice(9)).filter((item) => path.resolve(item).startsWith(`${path.resolve(base)}${path.sep}`));
  for (const target of targets) {
    const resolvedTarget = path.resolve(target);
    if (!resolvedTarget.startsWith(`${path.resolve(base)}${path.sep}`)) throw new Error("mission worktree cleanup target escaped its verified runtime directory");
    git(["worktree", "remove", "--force", resolvedTarget], { cwd: repository, allowFailure: true });
    if (existsSync(resolvedTarget)) rmSync(resolvedTarget, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  }
  git(["worktree", "prune"], { cwd: repository, allowFailure: true });
  return { removed: targets };
}

export function platformNpmExecutable() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}
