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
  "docs/safe-merge-policy.md",
  ".codex/agents/README.md",
  ".codex/tasks/README.md",
  ".codex/locks/README.md",
  ".codex/ideas/README.md",
  ".codex/memory/README.md",
  ".codex/costs/README.md",
  ".codex/quality/README.md",
  ".codex/security/README.md",
  ".codex/watchdog/README.md",
  ".codex/connectors/registry.json",
  ".codex/projects/README.md",
  ".codex/projects/registry.json",
  ".codex/projects/project.template.json",
  ".codex/tasks/task.template.json",
  ".codex/agents/agent.template.json",
  "docs/connector-registry.md",
  "docs/project-registry.md",
  "schemas/idea.schema.json",
  "schemas/connector-registry.schema.json",
  "schemas/project.schema.json",
  "schemas/project-registry.schema.json",
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
const placeholderPattern = /^REQUIRED_[A-Z0-9_]+$/;
const templateRecords = [
  {
    name: "project template",
    recordPath: ".codex/projects/project.template.json",
    schemaPath: "schemas/project.schema.json"
  },
  {
    name: "task template",
    recordPath: ".codex/tasks/task.template.json",
    schemaPath: "schemas/task.schema.json"
  },
  {
    name: "agent template",
    recordPath: ".codex/agents/agent.template.json",
    schemaPath: "schemas/agent.schema.json"
  }
];
const schemaValidatedRecords = [
  {
    name: "connector registry",
    recordPath: ".codex/connectors/registry.json",
    schemaPath: "schemas/connector-registry.schema.json"
  },
  {
    name: "project registry",
    recordPath: ".codex/projects/registry.json",
    schemaPath: "schemas/project-registry.schema.json"
  }
];
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

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(root, relativePath), "utf8"));
}

function isPlaceholder(value) {
  return typeof value === "string" && placeholderPattern.test(value);
}

function validateSchemaValue(value, schema, location, options = {}) {
  if (options.allowPlaceholders && isPlaceholder(value)) {
    return;
  }

  if (Array.isArray(schema.type)) {
    if (!schema.type.some((type) => matchesType(value, type))) {
      fail(`${location} must match one of these types or use a REQUIRED_* placeholder: ${schema.type.join(", ")}`);
    }
    return;
  }

  if (schema.type && !matchesType(value, schema.type)) {
    fail(`${location} must be ${schema.type} or use a REQUIRED_* placeholder`);
    return;
  }

  if (schema.enum && !schema.enum.includes(value)) {
    fail(`${location} must use a schema enum value or a REQUIRED_* placeholder`);
  }

  if (schema.pattern && typeof value === "string" && !new RegExp(schema.pattern).test(value)) {
    fail(`${location} must match schema pattern ${schema.pattern} or use a REQUIRED_* placeholder`);
  }

  if (schema.minLength && typeof value === "string" && value.length < schema.minLength) {
    fail(`${location} must be at least ${schema.minLength} character(s) or use a REQUIRED_* placeholder`);
  }

  if (schema.minimum !== undefined && typeof value === "number" && value < schema.minimum) {
    fail(`${location} must be at least ${schema.minimum} or use a REQUIRED_* placeholder`);
  }

  if (schema.maximum !== undefined && typeof value === "number" && value > schema.maximum) {
    fail(`${location} must be at most ${schema.maximum} or use a REQUIRED_* placeholder`);
  }

  if (schema.const !== undefined && value !== schema.const) {
    fail(`${location} must be ${JSON.stringify(schema.const)}`);
  }

  if (schema.type === "array") {
    validateSchemaArray(value, schema, location, options);
  }

  if (schema.type === "object") {
    validateSchemaObject(value, schema, location, options);
  }
}

function validateTemplateValue(value, schema, location) {
  validateSchemaValue(value, schema, location, { allowPlaceholders: true });
}

function matchesType(value, type) {
  if (type === "array") {
    return Array.isArray(value);
  }
  if (type === "integer") {
    return Number.isInteger(value);
  }
  if (type === "null") {
    return value === null;
  }
  return typeof value === type;
}

function validateSchemaArray(value, schema, location, options = {}) {
  if (!Array.isArray(value)) {
    return;
  }

  if (schema.minItems && value.length < schema.minItems) {
    fail(`${location} must include at least ${schema.minItems} item(s) or use a REQUIRED_* placeholder`);
  }

  if (schema.maxItems !== undefined && value.length > schema.maxItems) {
    fail(`${location} must include at most ${schema.maxItems} item(s)`);
  }

  if (schema.items) {
    value.forEach((item, index) => validateSchemaValue(item, schema.items, `${location}[${index}]`, options));
  }
}

function validateTemplateArray(value, schema, location) {
  validateSchemaArray(value, schema, location, { allowPlaceholders: true });
}

function validateSchemaObject(record, schema, location, options = {}) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    return;
  }

  for (const requiredKey of schema.required ?? []) {
    if (!Object.hasOwn(record, requiredKey)) {
      fail(`${location} missing required field: ${requiredKey}`);
    }
  }

  if (schema.additionalProperties === false) {
    for (const key of Object.keys(record)) {
      if (!schema.properties?.[key]) {
        fail(`${location} includes field not allowed by schema: ${key}`);
      }
    }
  }

  for (const [key, value] of Object.entries(record)) {
    const propertySchema = schema.properties?.[key];
    if (propertySchema) {
      validateSchemaValue(value, propertySchema, `${location}.${key}`, options);
    }
  }
}

function validateTemplateObject(record, schema, location) {
  validateSchemaObject(record, schema, location, { allowPlaceholders: true });
}

function validateConnectorRegistry(record) {
  const connectorIds = new Set((record.connectors ?? []).map((connector) => connector.id));
  for (const requiredConnectorId of ["connector-github-mcp", "connector-n8n-mcp", "connector-netlify-mcp"]) {
    if (!connectorIds.has(requiredConnectorId)) {
      fail(`connector registry missing required connected MCP record: ${requiredConnectorId}`);
    }
  }

  for (const connector of record.connectors ?? []) {
    if (connector.connectionStatus !== "connected") {
      fail(`connector ${connector.id} must be marked connected or moved out of connectors`);
    }
    if (/base44/i.test(`${connector.id} ${connector.name} ${connector.provider}`)) {
      fail("Base44 must not be listed as a connected connector until a Base44 MCP is available");
    }
  }

  const base44Entry = (record.availableButNotConnected ?? []).find((entry) => /base44/i.test(`${entry.name} ${entry.provider}`));
  if (!base44Entry) {
    fail("connector registry must mention Base44 as available but not connected");
  } else if (base44Entry.connectionStatus !== "available_not_connected") {
    fail("Base44 must be marked available_not_connected");
  }
}

for (const templateRecord of templateRecords) {
  try {
    const record = readJson(templateRecord.recordPath);
    const schema = readJson(templateRecord.schemaPath);
    const failuresBeforeTemplate = failures;

    if (record.template !== true) {
      fail(`${templateRecord.name} must be clearly marked with template: true`);
    }

    validateTemplateObject(record, schema, templateRecord.recordPath);
    if (failures === failuresBeforeTemplate) {
      pass(`template structurally valid: ${templateRecord.recordPath}`);
    }
  } catch (error) {
    fail(`${templateRecord.name} could not be validated: ${error.message}`);
  }
}

for (const schemaValidatedRecord of schemaValidatedRecords) {
  try {
    const record = readJson(schemaValidatedRecord.recordPath);
    const schema = readJson(schemaValidatedRecord.schemaPath);
    const failuresBeforeRecord = failures;

    validateSchemaObject(record, schema, schemaValidatedRecord.recordPath);

    if (schemaValidatedRecord.recordPath === ".codex/projects/registry.json" && record.projects?.length !== 0) {
      fail("project registry foundation must not include project records yet");
    }

    if (schemaValidatedRecord.recordPath === ".codex/connectors/registry.json") {
      validateConnectorRegistry(record);
    }

    if (failures === failuresBeforeRecord) {
      pass(`record structurally valid: ${schemaValidatedRecord.recordPath}`);
    }
  } catch (error) {
    fail(`${schemaValidatedRecord.name} could not be validated: ${error.message}`);
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
