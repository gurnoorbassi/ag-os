import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createProject, listProjects, validateProjectCreateInput } from "../scripts/lib/runtime/project-service.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function tempWorkspace() {
  const target = mkdtempSync(path.join(tmpdir(), "ag-os-project-"));
  cpSync(root, target, {
    recursive: true,
    filter: (source) => ![".git", "node_modules"].includes(path.basename(source))
  });
  return target;
}

const validInput = {
  name: "Owner Operations Hub",
  goal: "Coordinate internal owner operations from one command.",
  scope: ["Create the local workflow", "Verify acceptance criteria"],
  stack: ["AG OS", "local filesystem"],
  projectType: "internal_project",
  managementMode: "active_build",
  trustLevel: 1
};

test("project creation input requires real scope and stack", () => {
  assert.throws(() => validateProjectCreateInput({ ...validInput, scope: [] }), /scope requires/);
  assert.throws(() => validateProjectCreateInput({ ...validInput, stack: "" }), /stack requires/);
});

test("authenticated project service creates a production-clean registry transaction", () => {
  const workspace = tempWorkspace();
  const result = createProject({
    input: validInput,
    root: workspace,
    now: new Date("2026-07-13T12:00:00.000Z")
  });

  assert.equal(result.status, "created");
  assert.equal(result.project.id, "project-owner-operations-hub");
  assert.equal(result.project.status, "planned");
  assert.equal(result.safety.externalActionExecuted, false);
  assert.ok(result.project.approvalRequiredFor.includes("paid actions"));
  assert.ok(listProjects({ root: workspace }).some((project) => project.id === result.project.id));

  const registry = JSON.parse(readFileSync(path.join(workspace, ".codex/projects/registry.json"), "utf8"));
  assert.ok(registry.projects.some((entry) => entry.projectId === result.project.id));
  const auditPath = result.recordsCreated.find((recordPath) => recordPath.startsWith(".codex/audit/"));
  const audit = JSON.parse(readFileSync(path.join(workspace, auditPath), "utf8"));
  assert.equal(audit.eventType, "registry_change");
  assert.equal(audit.liveServiceTouched, false);

  const validation = spawnSync(process.execPath, ["scripts/validate-foundation.mjs"], {
    cwd: workspace,
    encoding: "utf8"
  });
  assert.equal(validation.status, 0, validation.stderr || validation.stdout);
});

test("project creation rejects duplicate ids without changing the registry", () => {
  const workspace = tempWorkspace();
  createProject({ input: validInput, root: workspace });
  const before = readFileSync(path.join(workspace, ".codex/projects/registry.json"), "utf8");
  assert.throws(() => createProject({ input: validInput, root: workspace }), /already exists/);
  assert.equal(readFileSync(path.join(workspace, ".codex/projects/registry.json"), "utf8"), before);
});
