import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();

const requiredPaths = [
  "README.md",
  "docs/architecture.md",
  "docs/operating-rules.md",
  "docs/hosting-plan.md",
  "docs/project-creation.md",
  "docs/lead-gen-migration-plan.md",
  ".codex/agents/README.md",
  ".codex/tasks/README.md",
  ".codex/locks/README.md",
  ".codex/ideas/README.md",
  ".codex/memory/README.md",
  ".codex/costs/README.md",
  ".codex/quality/README.md",
  ".codex/security/README.md",
  ".codex/watchdog/README.md",
  ".codex/projects/README.md",
  "schemas/idea.schema.json",
  "schemas/project.schema.json",
  "schemas/agent.schema.json",
  "schemas/task.schema.json",
  "schemas/memory.schema.json",
  "schemas/cost.schema.json",
  "schemas/quality-check.schema.json",
  "schemas/security-review.schema.json",
  "schemas/deployment.schema.json"
];

const forbiddenPatterns = [
  /postgres(?:ql)?:\/\/[^ \n"']+/i,
  /mongodb(?:\+srv)?:\/\/[^ \n"']+/i,
  /mysql:\/\/[^ \n"']+/i,
  /redis:\/\/[^ \n"']+/i,
  /sk-[A-Za-z0-9_-]{20,}/,
  /ghp_[A-Za-z0-9_]{20,}/,
  /netlify[a-z0-9_-]*token/i,
  /n8n[a-z0-9_-]*api[a-z0-9_-]*key/i,
  /BEGIN (?:RSA |EC |OPENSSH |PRIVATE )?PRIVATE KEY/
];

const ignoreDirs = new Set([".git", "node_modules"]);
let failures = 0;

function fail(message) {
  failures += 1;
  console.error(`FAIL ${message}`);
}

function pass(message) {
  console.log(`PASS ${message}`);
}

for (const requiredPath of requiredPaths) {
  const absolutePath = path.join(root, requiredPath);
  if (!existsSync(absolutePath)) {
    fail(`missing required path: ${requiredPath}`);
  } else {
    pass(`found ${requiredPath}`);
  }
}

for (const schemaName of readdirSync(path.join(root, "schemas")).filter((name) => name.endsWith(".json"))) {
  const schemaPath = path.join(root, "schemas", schemaName);
  try {
    const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
    if (schema.$schema !== "https://json-schema.org/draft/2020-12/schema") {
      fail(`${schemaName} must use JSON Schema draft 2020-12`);
    }
    if (!schema.$id || !schema.title || schema.type !== "object") {
      fail(`${schemaName} must include $id, title, and object type`);
    } else {
      pass(`schema metadata valid: ${schemaName}`);
    }
  } catch (error) {
    fail(`${schemaName} is not valid JSON: ${error.message}`);
  }
}

function walk(relativeDir = ".") {
  const absoluteDir = path.join(root, relativeDir);
  for (const entry of readdirSync(absoluteDir)) {
    if (ignoreDirs.has(entry)) {
      continue;
    }

    const relativePath = path.join(relativeDir, entry);
    const absolutePath = path.join(root, relativePath);
    const stats = statSync(absolutePath);

    if (stats.isDirectory()) {
      walk(relativePath);
      continue;
    }

    const normalizedPath = relativePath.replaceAll("\\", "/");
    if (!/\.(md|json|mjs|yml|yaml|gitignore)$/.test(normalizedPath) && normalizedPath !== "package.json") {
      continue;
    }

    const content = readFileSync(absolutePath, "utf8");
    for (const pattern of forbiddenPatterns) {
      if (pattern.test(content)) {
        fail(`possible forbidden live credential or connection marker in ${normalizedPath}`);
      }
    }
  }
}

walk();

if (failures > 0) {
  console.error(`Foundation validation failed with ${failures} issue(s).`);
  process.exit(1);
}

console.log("Foundation validation passed.");
