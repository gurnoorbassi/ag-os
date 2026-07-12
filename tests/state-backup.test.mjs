import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createStateBackup, restoreStateBackup, verifyStateBackup } from "../scripts/lib/runtime/state-backup.mjs";

test("creates, verifies, and restores an integrity-hashed state snapshot", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "ag-os-state-drill-"));
  const backups = mkdtempSync(path.join(os.tmpdir(), "ag-os-backups-"));
  const recordPath = path.join(root, ".codex", "jobs", "job-one.json");
  mkdirSync(path.dirname(recordPath), { recursive: true });
  writeFileSync(recordPath, "{\"status\":\"queued\"}\n", "utf8");

  const backup = createStateBackup({ workspaceRoot: root, backupRoot: backups, backupId: "drill-one" });
  assert.equal(verifyStateBackup({ backupPath: backup.target }).valid, true);
  writeFileSync(recordPath, "{\"status\":\"corrupted\"}\n", "utf8");
  assert.throws(() => restoreStateBackup({ workspaceRoot: root, backupPath: backup.target }), /confirm=true/);
  const restored = restoreStateBackup({ workspaceRoot: root, backupPath: backup.target, confirm: true });
  assert.equal(restored.valid, true);
  assert.equal(existsSync(recordPath), true);
  assert.match(readFileSync(recordPath, "utf8"), /queued/);
});

test("refuses to verify a tampered backup", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "ag-os-state-drill-"));
  const backups = mkdtempSync(path.join(os.tmpdir(), "ag-os-backups-"));
  const recordPath = path.join(root, ".codex", "jobs", "job-one.json");
  mkdirSync(path.dirname(recordPath), { recursive: true });
  writeFileSync(recordPath, "{\"status\":\"queued\"}\n", "utf8");
  const backup = createStateBackup({ workspaceRoot: root, backupRoot: backups, backupId: "drill-two" });
  writeFileSync(path.join(backup.target, "state", "jobs", "job-one.json"), "tampered", "utf8");
  assert.equal(verifyStateBackup({ backupPath: backup.target }).valid, false);
  assert.throws(
    () => restoreStateBackup({ workspaceRoot: root, backupPath: backup.target, confirm: true }),
    /integrity verification failed/
  );
});
