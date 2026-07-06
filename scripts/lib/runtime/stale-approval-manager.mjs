import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { isoTimestamp, writeJson } from "./common.mjs";

const INACTIVE_STATUSES = new Set(["expired", "revoked", "cancelled", "closed", "archived"]);

function toRepoPath(filePath) {
  return filePath.replaceAll("\\", "/");
}

function approvalsDir(root) {
  return path.join(root, ".codex", "approvals");
}

function approvalArchiveDir(root) {
  return path.join(root, ".codex", "approvals", "archive");
}

function readJsonAbsolute(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function assertDirectApprovalPath(recordPath) {
  const normalized = toRepoPath(recordPath);
  if (!normalized.startsWith(".codex/approvals/") || normalized.includes("/archive/") || normalized.endsWith(".template.json")) {
    throw new Error(`recordPath must be a direct non-template approval lock: ${recordPath}`);
  }
}

export function listActiveApprovalLocks({ root = process.cwd() } = {}) {
  const dir = approvalsDir(root);
  if (!existsSync(dir)) {
    return [];
  }

  return readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .filter((name) => !name.endsWith(".template.json"))
    .map((name) => {
      const recordPath = toRepoPath(path.join(".codex", "approvals", name));
      return {
        ...readJsonAbsolute(path.join(dir, name)),
        recordPath
      };
    });
}

export function findStaleApprovalLocks({ root = process.cwd(), now = new Date() } = {}) {
  const timestamp = now instanceof Date ? now : new Date(now);

  return listActiveApprovalLocks({ root })
    .filter((approval) => {
      if (!approval.expiresAt || INACTIVE_STATUSES.has(approval.status)) {
        return false;
      }

      return new Date(approval.expiresAt) < timestamp;
    })
    .map((approval) => ({
      ...approval,
      reason: "expired",
      archivePath: toRepoPath(path.join(".codex", "approvals", "archive", path.basename(approval.recordPath)))
    }));
}

export function archiveApprovalLock({
  root = process.cwd(),
  recordPath,
  now = new Date(),
  reason = "Approval lock is no longer valid for gated actions."
}) {
  if (!recordPath) {
    throw new Error("recordPath is required");
  }

  assertDirectApprovalPath(recordPath);

  const sourceAbsolute = path.resolve(root, recordPath);
  const approvalsRoot = path.resolve(approvalsDir(root));
  const archiveRoot = path.resolve(approvalArchiveDir(root));
  if (!sourceAbsolute.startsWith(`${approvalsRoot}${path.sep}`)) {
    throw new Error(`approval path is outside .codex/approvals: ${recordPath}`);
  }

  const sourcePath = toRepoPath(path.relative(root, sourceAbsolute));
  const archivePath = toRepoPath(path.join(".codex", "approvals", "archive", path.basename(recordPath)));
  const archiveAbsolute = path.resolve(root, archivePath);
  if (!archiveAbsolute.startsWith(`${archiveRoot}${path.sep}`)) {
    throw new Error(`archive path is outside .codex/approvals/archive: ${archivePath}`);
  }

  if (!existsSync(sourceAbsolute)) {
    throw new Error(`approval lock not found: ${sourcePath}`);
  }

  if (existsSync(archiveAbsolute)) {
    throw new Error(`archive target already exists: ${archivePath}`);
  }

  const approval = readJsonAbsolute(sourceAbsolute);
  const timestamp = isoTimestamp(now);
  const archivedApproval = {
    ...approval,
    status: "expired",
    revocationPath: `${reason} Original expiration: ${approval.expiresAt ?? "not recorded"}. This approval is no longer valid for gated actions. Historical proof remains preserved; any future action requires a new scoped owner approval lock.`,
    updatedAt: timestamp
  };

  writeJson(sourcePath, archivedApproval, root);
  mkdirSync(archiveRoot, { recursive: true });
  renameSync(sourceAbsolute, archiveAbsolute);

  return {
    approvalId: archivedApproval.approvalId,
    sourcePath,
    archivePath,
    status: archivedApproval.status,
    expiresAt: archivedApproval.expiresAt,
    updatedAt: archivedApproval.updatedAt
  };
}
