import process from "node:process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { monitorAlertEvent, sendMonitorAlert } from "./lib/monitor-alert.mjs";

const baseUrl = (process.env.AG_OS_BASE_URL || "http://127.0.0.1:8787").replace(/\/$/, "");
const timeoutMs = Number(process.env.AG_OS_MONITOR_TIMEOUT_MS || 5000);
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), timeoutMs);
let result;
try {
  const response = await fetch(`${baseUrl}/healthz`, { signal: controller.signal });
  result = { checkedAt: new Date().toISOString(), status: response.status === 200 ? "pass" : "fail", httpStatus: response.status };
} catch (error) {
  result = { checkedAt: new Date().toISOString(), status: "fail", error: error.name === "AbortError" ? "timeout" : "unreachable" };
} finally {
  clearTimeout(timer);
}
const stateFile = process.env.AG_OS_MONITOR_STATE_FILE || "";
if (stateFile) {
  const resolved = path.resolve(stateFile);
  const allowedRoot = path.resolve("/var/lib/ag-os-monitor");
  if (process.platform !== "win32" && resolved !== allowedRoot && !resolved.startsWith(`${allowedRoot}${path.sep}`)) {
    throw new Error("monitor state file must remain under /var/lib/ag-os-monitor");
  }
  let previous = null;
  try { if (existsSync(resolved)) previous = JSON.parse(readFileSync(resolved, "utf8")); } catch { /* a fresh trustworthy record replaces malformed local monitor state */ }
  const record = {
    service: "ag-os-coordinator",
    ...result,
    consecutiveFailures: result.status === "pass" ? 0 : Number(previous?.consecutiveFailures || 0) + 1,
    lastSuccessAt: result.status === "pass" ? result.checkedAt : previous?.lastSuccessAt || null
  };
  const alertEvent = monitorAlertEvent({
    current: record,
    previous,
    threshold: process.env.AG_OS_MONITOR_ALERT_FAILURE_THRESHOLD || 3
  });
  record.alert = await sendMonitorAlert({
    webhookUrl: process.env.AG_OS_MONITOR_ALERT_WEBHOOK_URL || "",
    token: process.env.AG_OS_MONITOR_ALERT_TOKEN || "",
    event: alertEvent,
    record,
    timeoutMs: process.env.AG_OS_MONITOR_ALERT_TIMEOUT_MS || 5000
  });
  mkdirSync(path.dirname(resolved), { recursive: true });
  const temporary = `${resolved}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(record, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  renameSync(temporary, resolved);
  result = record;
}
console.log(JSON.stringify(result));
process.exit(result.status === "pass" && result.alert?.attempted && !result.alert?.sent ? 3 : result.status === "pass" ? 0 : 2);
