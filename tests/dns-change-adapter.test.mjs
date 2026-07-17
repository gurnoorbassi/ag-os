import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cpSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { canonicalJson } from "../scripts/lib/runtime/connector-approval-guard.mjs";
import { selectExecutionAdapter } from "../scripts/lib/runtime/execution-adapter-registry.mjs";
import { dnsChangeApprovalCriteria, executeDnsChange, validateDnsChangeRequest } from "../scripts/lib/runtime/dns-change-adapter.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const zoneId = "a".repeat(32);
const recordId = "b".repeat(32);

function tempWorkspace() {
  const target = mkdtempSync(path.join(tmpdir(), "ag-os-dns-"));
  cpSync(root, target, { recursive: true, filter: (source) => ![".git", "node_modules"].includes(path.basename(source)) });
  return target;
}

test("DNS transport snapshots, changes, and verifies one exact Cloudflare record", async () => {
  const workspace = tempWorkspace();
  const record = { type: "A", name: "app.example.com", content: "203.0.113.10", ttl: 300, proxied: true };
  const recordDigest = createHash("sha256").update(canonicalJson({ zoneId, recordId, record })).digest("hex");
  const request = { adapterId: "dns-change", operation: "upsert_cloudflare_record", zoneId, recordId, record, recordDigest };
  const validated = validateDnsChangeRequest({ request });
  const adapter = selectExecutionAdapter({ command: { executionRequest: request }, env: { AG_OS_LIVE_ADAPTERS_ENABLED: "true", AG_OS_DNS_API_TOKEN: "configured" } });
  assert.equal(adapter.executionReady, true);
  const job = { jobId: "job-dns-change", projectId: "project-quote-builder", riskLevel: "R6" };
  const approval = {
    approvalId: "approval-dns-change", status: "approved", projectId: job.projectId,
    target: `${job.projectId}:${job.jobId}:${adapter.adapterId}`,
    approvedActions: [adapter.requestedAction], prohibitedActions: ["nameserver_change"],
    inclusionCriteria: [`Job is exactly ${job.jobId}.`, ...dnsChangeApprovalCriteria(validated)],
    expiresAt: "2030-01-01T00:00:00.000Z"
  };
  writeFileSync(path.join(workspace, ".codex", "approvals", `${approval.approvalId}.json`), JSON.stringify(approval), "utf8");
  let current = { id: recordId, type: "A", name: record.name, content: "203.0.113.5", ttl: 300, proxied: true };
  const calls = [];
  const result = await executeDnsChange({
    request, job, adapter, approval, token: "private-dns-token", root: workspace,
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      if (options.method === "PUT") current = { id: recordId, ...JSON.parse(options.body) };
      return { ok: true, status: 200, async json() { return { success: true, result: current }; } };
    },
    now: new Date("2026-07-16T22:15:00.000Z")
  });
  assert.equal(result.record.result.record.content, record.content);
  assert.equal(result.record.safety.changesDomain, true);
  assert.equal(calls.filter((call) => call.options.method === "PUT").length, 1);
  assert.equal(JSON.stringify(result.record).includes("private-dns-token"), false);
});
