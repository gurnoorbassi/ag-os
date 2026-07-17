import { createHash } from "node:crypto";
import process from "node:process";
import { assertApprovalStillActive, assertExactConnectorApproval, canonicalJson } from "./connector-approval-guard.mjs";
import { fetchWithTimeout } from "./fetch-with-timeout.mjs";
import { isoTimestamp, normalizeRunId, writeJson } from "./common.mjs";

const API_BASE = "https://api.cloudflare.com/client/v4";
const TYPES = new Set(["A", "AAAA", "CNAME", "TXT", "MX", "CAA"]);

function safeId(value, label) {
  const text = String(value || "").trim();
  if (!/^[a-f0-9]{32}$/.test(text)) throw new Error(`Cloudflare ${label} must be an exact 32-character id`);
  return text;
}

function safeRecord(input) {
  const type = String(input?.type || "").toUpperCase();
  if (!TYPES.has(type)) throw new Error("DNS record type is not supported");
  const name = String(input?.name || "").trim().toLowerCase();
  if (!/^(?:\*\.)?(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(name)) throw new Error("DNS record name must be an exact hostname");
  const content = String(input?.content || "").trim();
  if (!content || content.length > 4_000 || /[\r\n\0]/.test(content)) throw new Error("DNS record content is invalid");
  const ttl = Number(input?.ttl ?? 1);
  if (!Number.isInteger(ttl) || (ttl !== 1 && (ttl < 60 || ttl > 86_400))) throw new Error("DNS TTL must be automatic or between 60 and 86400 seconds");
  const proxied = input?.proxied === true;
  const priority = input?.priority === undefined ? undefined : Number(input.priority);
  if (priority !== undefined && (!Number.isInteger(priority) || priority < 0 || priority > 65535)) throw new Error("DNS priority is invalid");
  return { type, name, content, ttl, proxied, ...(priority === undefined ? {} : { priority }) };
}

function digest(value) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export function validateDnsChangeRequest({ request }) {
  if (request?.adapterId !== "dns-change" || request?.operation !== "upsert_cloudflare_record") {
    throw new Error("executionRequest must select dns-change and upsert_cloudflare_record");
  }
  const zoneId = safeId(request.zoneId, "zoneId");
  const recordId = request.recordId ? safeId(request.recordId, "recordId") : null;
  const record = safeRecord(request.record);
  const recordDigest = digest({ zoneId, recordId, record });
  if (request.recordDigest !== recordDigest) throw new Error("DNS record digest does not match the exact approved change");
  return { zoneId, recordId, record, recordDigest };
}

export function dnsChangeApprovalCriteria(validated) {
  return [
    `Cloudflare zone ID is exactly ${validated.zoneId}.`,
    `DNS record target is exactly ${validated.record.type} ${validated.record.name}.`,
    `DNS change digest is exactly sha256:${validated.recordDigest}.`,
    "The adapter must snapshot the prior record, verify the exact result, and restore the snapshot if verification fails."
  ];
}

async function cloudflare(fetchImpl, token, method, pathname, body, timeoutMs) {
  const response = await fetchWithTimeout(fetchImpl, `${API_BASE}${pathname}`, {
    method,
    headers: { accept: "application/json", authorization: `Bearer ${token}`, "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  }, timeoutMs);
  const result = await response.json();
  if (!response.ok || result.success !== true) throw new Error(`Cloudflare ${method} ${pathname} failed with HTTP ${response.status}`);
  return result.result;
}

function sameRecord(actual, expected) {
  return actual?.type === expected.type && actual?.name === expected.name && actual?.content === expected.content &&
    Number(actual?.ttl) === expected.ttl && Boolean(actual?.proxied) === expected.proxied &&
    (expected.priority === undefined || Number(actual?.priority) === expected.priority);
}

export async function executeDnsChange({ request, job, adapter, approval, token, fetchImpl = globalThis.fetch, root = process.cwd(), now = new Date(), timeoutMs = process.env.AG_OS_PROVIDER_TIMEOUT_MS }) {
  if (!token) throw new Error("DNS private runtime credential is not configured");
  const validated = validateDnsChangeRequest({ request });
  assertExactConnectorApproval({ approval, job, adapter, criteria: dnsChangeApprovalCriteria(validated) });
  const query = `?type=${encodeURIComponent(validated.record.type)}&name=${encodeURIComponent(validated.record.name)}`;
  const matches = validated.recordId
    ? [await cloudflare(fetchImpl, token, "GET", `/zones/${validated.zoneId}/dns_records/${validated.recordId}`, undefined, timeoutMs)]
    : await cloudflare(fetchImpl, token, "GET", `/zones/${validated.zoneId}/dns_records${query}`, undefined, timeoutMs);
  if (matches.length > 1) throw new Error("multiple DNS records match; provide the exact recordId");
  const before = matches[0] || null;
  if (validated.recordId && before?.id !== validated.recordId) throw new Error("Cloudflare returned a different DNS record ID");
  let changed = null;
  try {
    assertApprovalStillActive({ approvalId: approval.approvalId, connectorName: "Cloudflare DNS", root, now });
    changed = before
      ? await cloudflare(fetchImpl, token, "PUT", `/zones/${validated.zoneId}/dns_records/${before.id}`, validated.record, timeoutMs)
      : await cloudflare(fetchImpl, token, "POST", `/zones/${validated.zoneId}/dns_records`, validated.record, timeoutMs);
    const verified = await cloudflare(fetchImpl, token, "GET", `/zones/${validated.zoneId}/dns_records/${changed.id}`, undefined, timeoutMs);
    if (!sameRecord(verified, validated.record)) throw new Error("Cloudflare DNS verification returned different record values");
    changed = verified;
  } catch (error) {
    if (changed?.id) {
      try {
        if (before) await cloudflare(fetchImpl, token, "PUT", `/zones/${validated.zoneId}/dns_records/${before.id}`, safeRecord(before), timeoutMs);
        else await cloudflare(fetchImpl, token, "DELETE", `/zones/${validated.zoneId}/dns_records/${changed.id}`, undefined, timeoutMs);
      } catch (rollbackError) {
        throw new Error(`${error.message}; automatic DNS rollback also failed: ${rollbackError.message}`);
      }
    }
    throw error;
  }

  const timestamp = isoTimestamp(now);
  const runId = normalizeRunId(job.jobId.replace(/^job-/, ""));
  const record = {
    connectorExecutionId: `connector-exec-${runId}-dns-change`,
    status: "done",
    connectorId: "connector-cloudflare-dns",
    requestedAction: adapter.requestedAction,
    riskLevel: job.riskLevel,
    projectId: job.projectId,
    approvalRequired: true,
    approvalId: approval.approvalId,
    requiredPermissions: ["Zone:DNS:Read", "Zone:DNS:Edit"],
    evidenceRequired: ["exact zone ID", "prior record snapshot", "exact record digest", "post-change verification"],
    safety: { executesLiveAction: true, usesCredentials: true, triggersDeployment: false, changesDomain: true, usesPaidAction: false, accessesProductionData: false },
    result: { provider: "cloudflare", zoneId: validated.zoneId, recordId: changed.id, record: validated.record, recordDigest: validated.recordDigest, priorRecordExisted: Boolean(before), rollbackAvailable: true },
    prohibitedActionsConfirmedFalse: ["nameserver_change", "zone_delete", "domain_registration", "ssl_change", "paid_action", "credential_change"],
    notes: "Changed one exact Cloudflare DNS record after snapshotting prior state. Verification and automatic rollback are mandatory within the approved action.",
    createdAt: timestamp,
    updatedAt: timestamp
  };
  const filePath = `.codex/connectors/${record.connectorExecutionId}.json`;
  writeJson(filePath, record, root);
  return {
    adapter,
    filePath,
    executionPath: filePath,
    record,
    deliverable: { kind: "dns_change_result", ownerUsable: true, previewAvailable: false, entryFile: "", files: [filePath] }
  };
}
