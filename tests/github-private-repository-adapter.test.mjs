import assert from "node:assert/strict";
import { cpSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { adapterDefinition, selectExecutionAdapter } from "../scripts/lib/runtime/execution-adapter-registry.mjs";
import {
  executeGitHubPrivateRepository,
  githubPrivateRepositoryApprovalCriteria,
  validateGitHubPrivateRepositoryRequest
} from "../scripts/lib/runtime/github-private-repository-adapter.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function tempWorkspace() {
  const target = mkdtempSync(path.join(tmpdir(), "ag-os-private-repo-"));
  cpSync(root, target, { recursive: true, filter: (source) => ![".git", "node_modules"].includes(path.basename(source)) });
  return target;
}

test("private repository commands select an approval-gated registered adapter", () => {
  const adapter = selectExecutionAdapter({ command: "Create a private repository for this new project" });
  assert.equal(adapter.adapterId, "github-private-repository");
  assert.equal(adapter.approvalRequired, true);
  assert.equal(adapter.implemented, true);
});

test("private repository adapter creates only the exact private target and binds the project", async () => {
  const workspace = tempWorkspace();
  const request = {
    adapterId: "github-private-repository",
    operation: "create_private_repository",
    repository: { owner: "gurnoorbassi", name: "private-owner-project" },
    projectId: "project-quote-builder",
    projectRecordPath: ".codex/projects/quote-builder.json",
    description: "Private owner project"
  };
  const validated = validateGitHubPrivateRepositoryRequest({ request, root: workspace });
  const job = { jobId: "job-runtime-operator-private-repo", projectId: request.projectId, riskLevel: "R3" };
  const adapter = adapterDefinition("github-private-repository");
  const approval = {
    approvalId: "approval-private-repo-test",
    status: "approved",
    projectId: request.projectId,
    approvedActions: [adapter.requestedAction],
    target: `${job.projectId}:${job.jobId}:${adapter.adapterId}`,
    inclusionCriteria: githubPrivateRepositoryApprovalCriteria(validated),
    expiresAt: "2026-07-16T04:00:00.000Z"
  };
  writeFileSync(path.join(workspace, ".codex/approvals", `${approval.approvalId}.json`), `${JSON.stringify(approval, null, 2)}\n`, "utf8");
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, method: options.method, body: options.body ? JSON.parse(options.body) : null });
    if (options.method === "GET") return new Response("{}", { status: 404 });
    return Response.json({
      id: 123,
      full_name: validated.repository,
      html_url: `https://github.com/${validated.repository}`,
      private: true,
      default_branch: "main"
    }, { status: 201 });
  };
  const result = await executeGitHubPrivateRepository({
    request,
    job,
    adapter,
    approval,
    token: "test-token-never-written",
    fetchImpl,
    root: workspace,
    now: new Date("2026-07-16T03:00:00.000Z")
  });

  assert.equal(calls.length, 2);
  assert.equal(calls[1].method, "POST");
  assert.equal(calls[1].body.private, true);
  assert.equal(calls[1].body.name, "private-owner-project");
  const project = JSON.parse(readFileSync(path.join(workspace, request.projectRecordPath), "utf8"));
  assert.equal(project.ownerWorkspace.repositoryFullName, validated.repository);
  assert.equal(project.ownerWorkspace.repositoryVisibility, "private");
  assert.equal(project.ownerWorkspace.sourceControlStatus, "connected");
  assert.equal(existsSync(path.join(workspace, result.workProductPath)), true);
});
