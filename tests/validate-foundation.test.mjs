import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "..");
const fixedNodeArgs = ["scripts/validate-foundation.mjs"];

function runValidator(cwd) {
  const result = spawnSync(process.execPath, fixedNodeArgs, {
    cwd,
    encoding: "utf8"
  });
  return {
    status: result.status,
    output: `${result.stdout || ""}${result.stderr || ""}`
  };
}

function copyTrackedRepo() {
  const root = mkdtempSync(path.join(os.tmpdir(), "ag-os-validator-"));
  const tracked = execFileSync("git", ["ls-files", "-z"], {
    cwd: repoRoot,
    encoding: "utf8"
  }).split("\0").filter(Boolean);

  for (const relativePath of tracked) {
    const source = path.join(repoRoot, relativePath);
    const target = path.join(root, relativePath);
    mkdirSync(path.dirname(target), { recursive: true });
    cpSync(source, target);
  }

  return root;
}

function readJson(root, relativePath) {
  return JSON.parse(readFileSync(path.join(root, relativePath), "utf8"));
}

function writeJson(root, relativePath, value) {
  writeFileSync(path.join(root, relativePath), `${JSON.stringify(value, null, 2)}\n`);
}

function withTempRepo(assertion) {
  const root = copyTrackedRepo();
  try {
    return assertion(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("validator succeeds on current valid repo state", () => {
  const result = runValidator(repoRoot);

  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /Foundation validation passed\./);
});

test("validator fails when a required field is missing", () => withTempRepo((root) => {
  const recordPath = ".codex/connectors/registry.json";
  const registry = readJson(root, recordPath);
  delete registry.status;
  writeJson(root, recordPath, registry);

  const result = runValidator(root);

  assert.notEqual(result.status, 0);
  assert.match(result.output, /missing required field: status/);
}));

test("validator fails when a schema enum value is wrong", () => withTempRepo((root) => {
  const recordPath = ".codex/connectors/registry.json";
  const registry = readJson(root, recordPath);
  registry.status = "unsupported";
  writeJson(root, recordPath, registry);

  const result = runValidator(root);

  assert.notEqual(result.status, 0);
  assert.match(result.output, /status must use a schema enum value/);
}));

test("validator fails when additionalProperties false is violated", () => withTempRepo((root) => {
  const recordPath = ".codex/connectors/registry.json";
  const registry = readJson(root, recordPath);
  registry.unexpectedField = true;
  writeJson(root, recordPath, registry);

  const result = runValidator(root);

  assert.notEqual(result.status, 0);
  assert.match(result.output, /includes field not allowed by schema: unexpectedField/);
}));

test("validator fails on an invalid active archetype record", () => withTempRepo((root) => {
  const recordPath = ".codex/archetypes/crm-system.json";
  const archetype = readJson(root, recordPath);
  archetype.status = "unsupported";
  writeJson(root, recordPath, archetype);

  const result = runValidator(root);

  assert.notEqual(result.status, 0);
  assert.match(result.output, /crm-system\.json\.status must use a schema enum value/);
}));

test("validator fails on an invalid owner preference record", () => withTempRepo((root) => {
  const recordPath = ".codex/owners/preferences/owner-preferences.json";
  const preferences = readJson(root, recordPath);
  preferences.preferences[0].category = "unsupported";
  writeJson(root, recordPath, preferences);

  const result = runValidator(root);

  assert.notEqual(result.status, 0);
  assert.match(result.output, /owner-preferences\.json\.preferences\[0\]\.category must use a schema enum value/);
}));

test("validator fails when a lesson candidate uses an invalid candidate status", () => withTempRepo((root) => {
  const recordPath = ".codex/memory/lessons/candidates/lesson-20260703-github-repo-creation-gates.json";
  const lesson = readJson(root, recordPath);
  lesson.status = "accepted";
  writeJson(root, recordPath, lesson);

  const result = runValidator(root);

  assert.notEqual(result.status, 0);
  assert.match(result.output, /status must be one of: candidate, rejected/);
}));

test("validator exits nonzero when a temp record is invalid JSON", () => withTempRepo((root) => {
  writeFileSync(path.join(root, ".codex/connectors/registry.json"), "{ invalid json\n");

  const result = runValidator(root);

  assert.notEqual(result.status, 0);
  assert.match(result.output, /connector registry could not be validated/);
}));

test("validator accepts current tracked runtime records in an isolated copy", () => withTempRepo((root) => {
  const result = runValidator(root);

  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /Foundation validation passed\./);
}));

test("validator fails on an invalid cost ledger runtime record", () => withTempRepo((root) => {
  const recordPath = ".codex/costs/cost-ledger-runtime-construction-website-automated-20260703.json";
  const costLedger = readJson(root, recordPath);
  delete costLedger.summary.budgetStatus;
  writeJson(root, recordPath, costLedger);

  const result = runValidator(root);

  assert.notEqual(result.status, 0);
  assert.match(result.output, /cost-ledger-runtime-construction-website-automated-20260703\.json\.summary missing required field: budgetStatus/);
}));

test("validator fails on an invalid connector execution runtime record", () => withTempRepo((root) => {
  const recordPath = ".codex/connectors/connector-exec-runtime-github-construction-website-repo-20260703-create-repo.json";
  const connectorExecution = readJson(root, recordPath);
  connectorExecution.status = "unsupported";
  writeJson(root, recordPath, connectorExecution);

  const result = runValidator(root);

  assert.notEqual(result.status, 0);
  assert.match(result.output, /connector-exec-runtime-github-construction-website-repo-20260703-create-repo\.json\.status must use a schema enum value/);
}));

test("validator fails on an invalid GitHub execution plan runtime record", () => withTempRepo((root) => {
  const recordPath = ".codex/github/github-plan-runtime-github-construction-website-repo-20260703.json";
  const githubPlan = readJson(root, recordPath);
  githubPlan.plannedActions = [];
  writeJson(root, recordPath, githubPlan);

  const result = runValidator(root);

  assert.notEqual(result.status, 0);
  assert.match(result.output, /github-plan-runtime-github-construction-website-repo-20260703\.json\.plannedActions must include at least 1 item/);
}));

test("validator fails on an invalid GitHub MCP execution gate runtime record", () => withTempRepo((root) => {
  const recordPath = ".codex/github/github-mcp-gate-runtime-github-construction-website-repo-20260703.json";
  const githubGate = readJson(root, recordPath);
  githubGate.mode = "unsupported";
  writeJson(root, recordPath, githubGate);

  const result = runValidator(root);

  assert.notEqual(result.status, 0);
  assert.match(result.output, /github-mcp-gate-runtime-github-construction-website-repo-20260703\.json\.mode must be "execution_gate_only"/);
}));

test("validator fails when an enforced schema uses an unsupported structural keyword", () => withTempRepo((root) => {
  const schemaPath = "schemas/cost-ledger.schema.json";
  const schema = readJson(root, schemaPath);
  schema.properties.costLedgerId.$ref = "#/$defs/costLedgerId";
  writeJson(root, schemaPath, schema);

  const result = runValidator(root);

  assert.notEqual(result.status, 0);
  assert.match(result.output, /unsupported schema keyword \$ref in enforced schema schemas\/cost-ledger\.schema\.json/);
}));

test("validator warns when format keywords are present but not enforced", () => withTempRepo((root) => {
  const result = runValidator(root);

  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /WARN schema format keyword is present but not enforced/);
}));

test("validator reports unsupported keywords in orphan schemas without failing", () => withTempRepo((root) => {
  const result = runValidator(root);

  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /WARN unsupported schema keyword \$ref in orphan schema schemas\/state-management\.schema\.json/);
}));

test("validator still succeeds on the real repo after invalid temp fixtures are cleaned up", () => {
  const result = runValidator(repoRoot);

  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /Foundation validation passed\./);
});
