import path from "node:path";
import process from "node:process";
import { createStateBackup, restoreStateBackup, verifyStateBackup } from "../scripts/lib/runtime/state-backup.mjs";

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const mode = process.argv[2];
if (mode === "create") {
  const workspaceRoot = path.resolve(arg("--workspace") || ".");
  const backupRoot = path.resolve(arg("--backup-root") || "");
  const backupId = arg("--backup-id");
  const result = createStateBackup({ workspaceRoot, backupRoot, backupId });
  console.log(JSON.stringify({ mode, backupPath: result.target, fileCount: result.manifest.fileCount, secretsPrinted: false }, null, 2));
} else if (mode === "verify") {
  const backupPath = path.resolve(arg("--backup") || "");
  const result = verifyStateBackup({ backupPath });
  console.log(JSON.stringify({ mode, backupPath, ...result, secretsPrinted: false }, null, 2));
  process.exit(result.valid ? 0 : 2);
} else if (mode === "restore") {
  const workspaceRoot = path.resolve(arg("--workspace") || ".");
  const backupPath = path.resolve(arg("--backup") || "");
  const confirm = process.argv.includes("--confirm-live-restore");
  const result = restoreStateBackup({ workspaceRoot, backupPath, confirm });
  console.log(JSON.stringify({ mode, restored: result.valid, fileCount: result.fileCount, secretsPrinted: false }, null, 2));
} else {
  console.error("Usage: node ops/state-backup.mjs create --workspace <path> --backup-root <path> --backup-id <id> | verify --backup <path> | restore --workspace <path> --backup <path> --confirm-live-restore");
  process.exit(1);
}
