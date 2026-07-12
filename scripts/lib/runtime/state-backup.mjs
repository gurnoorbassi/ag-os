import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

function filesUnder(root) {
  const results = [];
  function walk(current) {
    for (const name of readdirSync(current).sort()) {
      const target = path.join(current, name);
      if (statSync(target).isDirectory()) {
        walk(target);
      } else {
        results.push(path.relative(root, target).replaceAll("\\", "/"));
      }
    }
  }
  walk(root);
  return results;
}

function sha256(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

export function createStateBackup({ workspaceRoot, backupRoot, backupId }) {
  if (!workspaceRoot || !backupRoot || !backupId) {
    throw new Error("workspaceRoot, backupRoot, and backupId are required");
  }
  const source = path.join(workspaceRoot, ".codex");
  if (!existsSync(source)) {
    throw new Error("workspace .codex state directory is missing");
  }
  const target = path.join(backupRoot, backupId);
  if (existsSync(target)) {
    throw new Error("backup target already exists");
  }
  const stateTarget = path.join(target, "state");
  mkdirSync(target, { recursive: true });
  cpSync(source, stateTarget, { recursive: true, errorOnExist: true });
  const files = filesUnder(stateTarget).map((relativePath) => ({
    relativePath,
    sha256: sha256(path.join(stateTarget, relativePath))
  }));
  const manifest = { backupId, source: ".codex", fileCount: files.length, files };
  writeFileSync(path.join(target, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return { target, manifest };
}

export function verifyStateBackup({ backupPath }) {
  const manifest = JSON.parse(readFileSync(path.join(backupPath, "manifest.json"), "utf8"));
  const stateRoot = path.join(backupPath, "state");
  const failures = manifest.files.filter((file) => {
    const target = path.join(stateRoot, file.relativePath);
    return !existsSync(target) || sha256(target) !== file.sha256;
  });
  return { valid: failures.length === 0, fileCount: manifest.fileCount, failures };
}

export function restoreStateBackup({ workspaceRoot, backupPath, confirm = false }) {
  if (!confirm) {
    throw new Error("restore requires confirm=true");
  }
  const verification = verifyStateBackup({ backupPath });
  if (!verification.valid) {
    throw new Error("backup integrity verification failed");
  }
  const target = path.join(workspaceRoot, ".codex");
  rmSync(target, { recursive: true, force: true });
  cpSync(path.join(backupPath, "state"), target, { recursive: true });
  return verification;
}
