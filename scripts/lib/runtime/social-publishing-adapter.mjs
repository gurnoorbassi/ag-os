import { createHash } from "node:crypto";
import process from "node:process";
import { assertApprovalStillActive, assertExactConnectorApproval, canonicalJson } from "./connector-approval-guard.mjs";
import { fetchWithTimeout } from "./fetch-with-timeout.mjs";
import { isoTimestamp, normalizeRunId, writeJson } from "./common.mjs";

const DEFAULT_GRAPH_BASE = "https://graph.facebook.com/v23.0";

function safeText(value, label, pattern, max) {
  const text = String(value || "").trim();
  if (!text || text.length > max || !pattern.test(text)) throw new Error(`invalid social publishing ${label}`);
  return text;
}

function safeGraphBase(value = DEFAULT_GRAPH_BASE) {
  let url;
  try { url = new URL(String(value)); } catch { throw new Error("social Graph API base URL is invalid"); }
  if (url.protocol !== "https:" || url.hostname !== "graph.facebook.com" || !/^\/v\d+\.\d+$/.test(url.pathname) || url.search || url.hash || url.username || url.password) {
    throw new Error("social Graph API base URL must be an exact versioned graph.facebook.com HTTPS URL");
  }
  return `${url.origin}${url.pathname}`;
}

function sha256(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

export function validateSocialPublishingRequest({ request }) {
  if (request?.adapterId !== "social-publishing" || request?.operation !== "publish_instagram_image") {
    throw new Error("executionRequest must select social-publishing and publish_instagram_image");
  }
  const accountId = safeText(request.accountId, "accountId", /^\d{5,40}$/, 40);
  const expectedUsername = safeText(request.expectedUsername, "expectedUsername", /^[A-Za-z0-9._]{1,30}$/, 30);
  let mediaUrl;
  try { mediaUrl = new URL(String(request.mediaUrl || "")); } catch { throw new Error("social publishing mediaUrl is invalid"); }
  if (mediaUrl.protocol !== "https:" || mediaUrl.username || mediaUrl.password || mediaUrl.hash) throw new Error("social publishing mediaUrl must be public HTTPS without credentials or fragments");
  const caption = String(request.caption || "").trim();
  if (!caption || caption.length > 2_200 || /\0/.test(caption)) throw new Error("social publishing caption must be between 1 and 2200 characters");
  const contentDigest = sha256(canonicalJson({ accountId, expectedUsername, mediaUrl: mediaUrl.toString(), caption }));
  if (request.contentDigest !== contentDigest) throw new Error("social publishing content digest does not match the exact approved post");
  return { graphBaseUrl: safeGraphBase(request.graphBaseUrl), accountId, expectedUsername, mediaUrl: mediaUrl.toString(), caption, contentDigest };
}

export function socialPublishingApprovalCriteria(validated) {
  return [
    `Instagram account ID is exactly ${validated.accountId}.`,
    `Instagram username is exactly ${validated.expectedUsername}.`,
    `Social post content digest is exactly sha256:${validated.contentDigest}.`,
    "The action is one immediate Instagram image publish; scheduling, deletion, messaging, comments, ads, and additional posts are prohibited."
  ];
}

async function graph(fetchImpl, token, method, url, body, timeoutMs) {
  const response = await fetchWithTimeout(fetchImpl, url, {
    method,
    headers: { accept: "application/json", authorization: `Bearer ${token}`, ...(body ? { "content-type": "application/x-www-form-urlencoded" } : {}) },
    ...(body ? { body: new URLSearchParams(body) } : {})
  }, timeoutMs);
  const result = await response.json();
  if (!response.ok || result?.error) throw new Error(`Meta Graph ${method} failed with HTTP ${response.status}`);
  return result;
}

export async function executeSocialPublishing({ request, job, adapter, approval, token, fetchImpl = globalThis.fetch, root = process.cwd(), now = new Date(), timeoutMs = process.env.AG_OS_PROVIDER_TIMEOUT_MS }) {
  if (!token) throw new Error("social publishing private runtime credential is not configured");
  const validated = validateSocialPublishingRequest({ request });
  assertExactConnectorApproval({ approval, job, adapter, criteria: socialPublishingApprovalCriteria(validated) });
  const account = await graph(fetchImpl, token, "GET", `${validated.graphBaseUrl}/${validated.accountId}?fields=id,username`, null, timeoutMs);
  if (String(account.id) !== validated.accountId || account.username !== validated.expectedUsername) throw new Error("Instagram account identity changed after approval");

  assertApprovalStillActive({ approvalId: approval.approvalId, connectorName: "Instagram", root, now });
  const container = await graph(fetchImpl, token, "POST", `${validated.graphBaseUrl}/${validated.accountId}/media`, {
    image_url: validated.mediaUrl,
    caption: validated.caption
  }, timeoutMs);
  if (!container.id) throw new Error("Instagram did not create a media container");

  const status = await graph(fetchImpl, token, "GET", `${validated.graphBaseUrl}/${container.id}?fields=id,status_code`, null, timeoutMs);
  if (status.status_code !== "FINISHED") throw new Error(`Instagram media container is not ready: ${status.status_code || "unknown"}`);
  assertApprovalStillActive({ approvalId: approval.approvalId, connectorName: "Instagram", root, now });
  const published = await graph(fetchImpl, token, "POST", `${validated.graphBaseUrl}/${validated.accountId}/media_publish`, { creation_id: container.id }, timeoutMs);
  if (!published.id) throw new Error("Instagram did not return a published media ID");
  const verified = await graph(fetchImpl, token, "GET", `${validated.graphBaseUrl}/${published.id}?fields=id,permalink,username,timestamp`, null, timeoutMs);
  if (String(verified.id) !== String(published.id) || verified.username !== validated.expectedUsername || !verified.permalink) throw new Error("Instagram publish verification failed");

  const runId = normalizeRunId(job.jobId.replace(/^job-/, ""));
  const timestamp = isoTimestamp(now);
  const record = {
    connectorExecutionId: `connector-exec-${runId}-social-publish`,
    status: "done",
    connectorId: "connector-social-publishing",
    requestedAction: adapter.requestedAction,
    riskLevel: job.riskLevel,
    projectId: job.projectId,
    approvalRequired: true,
    approvalId: approval.approvalId,
    requiredPermissions: ["instagram_basic", "instagram_content_publish"],
    evidenceRequired: ["exact Instagram account identity", "exact content digest", "published media ID", "verified public permalink"],
    safety: { executesLiveAction: true, usesCredentials: true, triggersDeployment: false, changesDomain: false, usesPaidAction: false, accessesProductionData: false },
    result: {
      mediaId: published.id,
      permalink: verified.permalink,
      username: verified.username,
      contentDigest: validated.contentDigest,
      rollbackSupported: false
    },
    prohibitedActionsConfirmedFalse: ["scheduling", "message_send", "comment_action", "ad_spend", "additional_post", "dns_change", "credential_change"],
    notes: `Published one exact approved image post to Instagram @${validated.expectedUsername}. Instagram publishing has no guaranteed transactional rollback; deletion requires a separate exact approval if supported by the account.`,
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
    result: { mediaId: published.id, permalink: verified.permalink, username: verified.username },
    deliverable: { kind: "published_result", ownerUsable: true, previewAvailable: false, entryFile: "", files: [filePath] }
  };
}
