import process from "node:process";

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
console.log(JSON.stringify(result));
process.exit(result.status === "pass" ? 0 : 2);
