import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const LOCK_RELATIVE_PATH = ".codex/.runtime-locks/state-mutations";

export async function withStateMutationLock({
  root = process.cwd(),
  operation = "state-mutation",
  waitMs = 5_000,
  staleMs = 10 * 60_000,
  pollMs = 50,
  now = () => Date.now()
} = {}, task) {
  if (typeof task !== "function") throw new Error("state mutation lock requires a task");
  const lockPath = path.join(root, LOCK_RELATIVE_PATH);
  const ownerPath = path.join(lockPath, "owner.json");
  const token = randomUUID();
  const deadline = now() + waitMs;
  mkdirSync(path.dirname(lockPath), { recursive: true });

  while (true) {
    try {
      mkdirSync(lockPath, { recursive: false });
      writeFileSync(ownerPath, `${JSON.stringify({ token, pid: process.pid, operation, acquiredAt: new Date(now()).toISOString() })}\n`, "utf8");
      break;
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      if (isStale(lockPath, staleMs, now())) {
        rmSync(lockPath, { recursive: true, force: true });
        continue;
      }
      if (now() >= deadline) return { acquired: false, status: "busy", operation };
      await new Promise((resolve) => setTimeout(resolve, pollMs));
    }
  }

  try {
    return { acquired: true, status: "complete", operation, result: await task() };
  } finally {
    if (lockOwnedBy(ownerPath, token)) rmSync(lockPath, { recursive: true, force: true });
  }
}

function isStale(lockPath, staleMs, timestamp) {
  try {
    return timestamp - statSync(lockPath).mtimeMs > staleMs;
  } catch {
    return !existsSync(lockPath);
  }
}

function lockOwnedBy(ownerPath, token) {
  try {
    return JSON.parse(readFileSync(ownerPath, "utf8")).token === token;
  } catch {
    return false;
  }
}
