import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cpSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { canonicalJson } from "../scripts/lib/runtime/connector-approval-guard.mjs";
import { selectExecutionAdapter } from "../scripts/lib/runtime/execution-adapter-registry.mjs";
import { executeSocialPublishing, socialPublishingApprovalCriteria, validateSocialPublishingRequest } from "../scripts/lib/runtime/social-publishing-adapter.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function tempWorkspace() {
  const target = mkdtempSync(path.join(tmpdir(), "ag-os-social-"));
  cpSync(root, target, { recursive: true, filter: (source) => ![".git", "node_modules"].includes(path.basename(source)) });
  return target;
}

test("social publishing performs one exact approved Instagram image publish", async () => {
  const workspace = tempWorkspace();
  const exact = { accountId: "1234567890", expectedUsername: "agdigitalz", mediaUrl: "https://assets.example.test/post.jpg", caption: "Approved launch update." };
  const contentDigest = createHash("sha256").update(canonicalJson(exact)).digest("hex");
  const request = { adapterId: "social-publishing", operation: "publish_instagram_image", graphBaseUrl: "https://graph.facebook.com/v23.0", ...exact, contentDigest };
  const validated = validateSocialPublishingRequest({ request });
  const adapter = selectExecutionAdapter({ command: { executionRequest: request }, env: { AG_OS_LIVE_ADAPTERS_ENABLED: "true", AG_OS_SOCIAL_API_TOKEN: "configured" } });
  assert.equal(adapter.executionReady, true);
  const job = { jobId: "job-social-publish", projectId: "project-quote-builder", riskLevel: "R5" };
  const approval = {
    approvalId: "approval-social-publish", status: "approved", projectId: job.projectId,
    target: `${job.projectId}:${job.jobId}:${adapter.adapterId}`,
    approvedActions: [adapter.requestedAction], prohibitedActions: ["message_send"],
    inclusionCriteria: [`Job is exactly ${job.jobId}.`, ...socialPublishingApprovalCriteria(validated)],
    expiresAt: "2030-01-01T00:00:00.000Z"
  };
  writeFileSync(path.join(workspace, ".codex", "approvals", `${approval.approvalId}.json`), JSON.stringify(approval), "utf8");
  const calls = [];
  const result = await executeSocialPublishing({
    request, job, adapter, approval, token: "private-social-token", root: workspace,
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      const payload = url.includes("fields=id,username") ? { id: exact.accountId, username: exact.expectedUsername }
        : url.endsWith(`/${exact.accountId}/media`) ? { id: "container-1" }
          : url.includes("container-1?fields=id,status_code") ? { id: "container-1", status_code: "FINISHED" }
            : url.endsWith(`/${exact.accountId}/media_publish`) ? { id: "media-1" }
              : { id: "media-1", permalink: "https://instagram.com/p/proof", username: exact.expectedUsername, timestamp: "2026-07-16T00:00:00Z" };
      return { ok: true, status: 200, async json() { return payload; } };
    },
    now: new Date("2026-07-16T22:00:00.000Z")
  });
  assert.equal(result.record.result.mediaId, "media-1");
  assert.equal(calls.filter((call) => call.options.method === "POST").length, 2);
  assert.equal(JSON.stringify(result.record).includes("private-social-token"), false);
});
