import process from "node:process";

const baseUrl = (process.env.AG_OS_BASE_URL || "").replace(/\/$/, "");
const ownerToken = process.env.AG_OS_OWNER_TOKEN || "";
if (!baseUrl || !ownerToken) {
  console.error("AG_OS_BASE_URL and AG_OS_OWNER_TOKEN are required.");
  process.exit(1);
}

const health = await fetch(`${baseUrl}/healthz`);
const unauthorized = await fetch(`${baseUrl}/api/v1/status`);
const authorized = await fetch(`${baseUrl}/api/v1/status`, {
  headers: { authorization: `Bearer ${ownerToken}` }
});
const status = authorized.ok ? await authorized.json() : null;
const passed = health.status === 200 && unauthorized.status === 401 && authorized.status === 200 &&
  status?.mode === "owner_operated_fail_closed" && status?.production?.activationAllowed === false;

console.log(JSON.stringify({
  passed,
  healthStatus: health.status,
  unauthorizedStatus: unauthorized.status,
  authorizedStatus: authorized.status,
  mode: status?.mode ?? null,
  productionStatus: status?.production?.status ?? null,
  productionActivationAllowed: status?.production?.activationAllowed ?? null,
  tokenPrinted: false
}, null, 2));
process.exit(passed ? 0 : 2);
