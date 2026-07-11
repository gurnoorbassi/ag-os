import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { readJson } from "./lib/runtime/common.mjs";
import { evaluateProductionReadiness } from "./lib/runtime/production-readiness-processor.mjs";

const root = process.cwd();
const JOB_COMPLETION_POLICY_ACTIVATED_AT = "2026-07-09T20:06:25.029Z";

const requiredPaths = [
  "README.md",
  "docs/architecture.md",
  "docs/operating-rules.md",
  "docs/hosting-plan.md",
  "docs/project-creation.md",
  "docs/lead-gen-migration-plan.md",
  "docs/lead-gen-project-migration-rules.md",
  "docs/safe-merge-policy.md",
  "docs/ag-os-constitution-v1.md",
  "docs/action-matrix.md",
  "docs/authority-order.md",
  "docs/approval-workflow.md",
  "docs/owner-role-model.md",
  "docs/usage-ledger-policy.md",
  "docs/supply-chain-policy.md",
  "docs/prompt-injection-policy.md",
  "docs/boot-sequence.md",
  "docs/data-classification.md",
  "docs/incident-response.md",
  "docs/rollback-policy.md",
  "docs/validation-limits.md",
  "docs/bootstrap-mode.md",
  "docs/memory-learning-policy.md",
  "docs/runtime-direction.md",
  "docs/storage-manager-policy.md",
  "docs/n8n-workflow-policy.md",
  "docs/watchdog-alert-policy.md",
  "docs/product-project-policy.md",
  "docs/critic-worker.md",
  "docs/secure-credential-store.md",
  "docs/secret-redaction-policy.md",
  "docs/instagram-oauth-execution-preflight.md",
  "docs/unified-memory-learning-os.md",
  "docs/lesson-promotion-policy.md",
  "docs/cross-worker-memory-sync.md",
  "docs/social-posting-os.md",
  "docs/social-posting-production-policy.md",
  "docs/instagram-production-readiness.md",
  "docs/social-post-lifecycle.md",
  "docs/social-permission-matrix.md",
  ".codex/agents/README.md",
  ".codex/tasks/README.md",
  ".codex/locks/README.md",
  ".codex/ideas/README.md",
  ".codex/memory/README.md",
  ".codex/memory/policy.json",
  ".codex/memory/registry.json",
  ".codex/memory/accepted/README.md",
  ".codex/memory/rejected/README.md",
  ".codex/memory/conflicts/README.md",
  ".codex/memory/archetype-updates/README.md",
  ".codex/costs/README.md",
  ".codex/costs/budget.json",
  ".codex/quality/README.md",
  ".codex/quality/policy.json",
  ".codex/quality-scores/README.md",
  ".codex/critiques/README.md",
  ".codex/security/README.md",
  ".codex/security/policy.json",
  ".codex/security/credential-store-policy.json",
  ".codex/credentials/README.md",
  ".codex/credentials/credential-ref-instagram-agdigitalz-oauth.json",
  ".codex/watchdog/README.md",
  ".codex/watchdog/policy.json",
  ".codex/approvals/README.md",
  ".codex/audit/README.md",
  ".codex/owners/README.md",
  ".codex/client-management/README.md",
  ".codex/social/accounts/ag-digitalz-instagram.json",
  ".codex/social/posts/README.md",
  ".codex/social/publish-approvals/README.md",
  ".codex/social/preflight/README.md",
  ".codex/social/preflight/social-preflight-instagram-oauth-agdigitalz.json",
  ".codex/production/README.md",
  ".codex/production/production-readiness-social-media-management-system-v1.json",
  ".codex/social/policies/production-posting-policy.json",
  ".codex/capabilities/README.md",
  ".codex/capabilities/registry.json",
  ".codex/commands/registry.json",
  ".codex/connectors/registry.json",
  ".codex/projects/README.md",
  ".codex/projects/registry.json",
  ".codex/projects/project.template.json",
  ".codex/tasks/task.template.json",
  ".codex/agents/agent.template.json",
  ".codex/templates/client-management/client.template.json",
  ".codex/templates/client-management/engagement.template.json",
  ".codex/templates/client-management/deliverable.template.json",
  ".codex/templates/client-management/access-request.template.json",
  ".codex/templates/client-management/client-approval.template.json",
  "docs/connector-registry.md",
  "docs/command-registry.md",
  "docs/capability-registry.md",
  "docs/cost-os.md",
  "docs/dashboard-os-plan.md",
  "docs/dashboard-control-center-v1.md",
  "docs/dashboard-read-model.md",
  "docs/memory-os.md",
  "docs/quality-os.md",
  "docs/security-os.md",
  "docs/watchdog-os.md",
  "docs/project-registry.md",
  "docs/client-engagement-records-v1.md",
  "docs/client-management-safety-policy.md",
  "docs/client-engagement-workflow.md",
  "schemas/idea.schema.json",
  "schemas/approval-lock.schema.json",
  "schemas/audit-event.schema.json",
  "schemas/owner.schema.json",
  "schemas/capability-registry.schema.json",
  "schemas/command-registry.schema.json",
  "schemas/connector-registry.schema.json",
  "schemas/cost-budget.schema.json",
  "schemas/memory-policy.schema.json",
  "schemas/quality-policy.schema.json",
  "schemas/security-policy.schema.json",
  "schemas/watchdog-policy.schema.json",
  "schemas/project.schema.json",
  "schemas/project-registry.schema.json",
  "schemas/agent.schema.json",
  "schemas/task.schema.json",
  "schemas/memory.schema.json",
  "schemas/cost.schema.json",
  "schemas/quality-check.schema.json",
  "schemas/plan-critique.schema.json",
  "schemas/security-review.schema.json",
  "schemas/deployment.schema.json",
  "schemas/client.schema.json",
  "schemas/engagement.schema.json",
  "schemas/deliverable.schema.json",
  "schemas/access-request.schema.json",
  "schemas/client-approval.schema.json",
  "schemas/credential-reference.schema.json",
  "schemas/unified-memory-record.schema.json",
  "schemas/lesson-promotion.schema.json",
  "schemas/social-account.schema.json",
  "schemas/social-post.schema.json",
  "schemas/social-publish-approval.schema.json",
  "schemas/social-connector-preflight.schema.json"
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
  },
  {
    name: "client template",
    recordPath: ".codex/templates/client-management/client.template.json",
    schemaPath: "schemas/client.schema.json"
  },
  {
    name: "engagement template",
    recordPath: ".codex/templates/client-management/engagement.template.json",
    schemaPath: "schemas/engagement.schema.json"
  },
  {
    name: "deliverable template",
    recordPath: ".codex/templates/client-management/deliverable.template.json",
    schemaPath: "schemas/deliverable.schema.json"
  },
  {
    name: "access request template",
    recordPath: ".codex/templates/client-management/access-request.template.json",
    schemaPath: "schemas/access-request.schema.json"
  },
  {
    name: "client approval template",
    recordPath: ".codex/templates/client-management/client-approval.template.json",
    schemaPath: "schemas/client-approval.schema.json"
  }
];
const schemaValidatedRecords = [
  {
    name: "connector registry",
    recordPath: ".codex/connectors/registry.json",
    schemaPath: "schemas/connector-registry.schema.json"
  },
  {
    name: "command registry",
    recordPath: ".codex/commands/registry.json",
    schemaPath: "schemas/command-registry.schema.json"
  },
  {
    name: "cost budget",
    recordPath: ".codex/costs/budget.json",
    schemaPath: "schemas/cost-budget.schema.json"
  },
  {
    name: "quality policy",
    recordPath: ".codex/quality/policy.json",
    schemaPath: "schemas/quality-policy.schema.json"
  },
  {
    name: "security policy",
    recordPath: ".codex/security/policy.json",
    schemaPath: "schemas/security-policy.schema.json"
  },
  {
    name: "watchdog policy",
    recordPath: ".codex/watchdog/policy.json",
    schemaPath: "schemas/watchdog-policy.schema.json"
  },
  {
    name: "memory policy",
    recordPath: ".codex/memory/policy.json",
    schemaPath: "schemas/memory-policy.schema.json"
  },
  {
    name: "unified memory registry",
    recordPath: ".codex/memory/registry.json",
    schemaPath: "schemas/unified-memory-record.schema.json"
  },
  {
    name: "capability registry",
    recordPath: ".codex/capabilities/registry.json",
    schemaPath: "schemas/capability-registry.schema.json"
  },
  {
    name: "project registry",
    recordPath: ".codex/projects/registry.json",
    schemaPath: "schemas/project-registry.schema.json"
  }
];
const schemaValidatedRecordDirectories = [
  {
    name: "approval lock",
    recordDir: ".codex/approvals",
    schemaPath: "schemas/approval-lock.schema.json"
  },
  {
    name: "audit event",
    recordDir: ".codex/audit",
    schemaPath: "schemas/audit-event.schema.json"
  },
  {
    name: "owner",
    recordDir: ".codex/owners",
    schemaPath: "schemas/owner.schema.json"
  }
];
const knowledgeRecordDirectories = [
  {
    name: "product archetype",
    recordDir: ".codex/archetypes",
    schemaPath: "schemas/product-archetype.schema.json"
  },
  {
    name: "accepted lesson",
    recordDir: ".codex/memory/lessons",
    schemaPath: "schemas/lesson.schema.json",
    allowedStatuses: ["accepted", "archived"]
  },
  {
    name: "accepted unified lesson",
    recordDir: ".codex/memory/accepted",
    schemaPath: "schemas/lesson.schema.json",
    allowedStatuses: ["accepted", "archived"]
  },
  {
    name: "lesson candidate",
    recordDir: ".codex/memory/lessons/candidates",
    schemaPath: "schemas/lesson.schema.json",
    allowedStatuses: ["candidate", "rejected"]
  },
  {
    name: "rejected lesson",
    recordDir: ".codex/memory/rejected",
    schemaPath: "schemas/lesson.schema.json",
    allowedStatuses: ["rejected", "archived"]
  },
  {
    name: "lesson conflict",
    recordDir: ".codex/memory/conflicts",
    schemaPath: "schemas/lesson-promotion.schema.json",
    allowedStatuses: ["blocked", "archived"]
  },
  {
    name: "skill",
    recordDir: ".codex/skills",
    schemaPath: "schemas/skill.schema.json",
    allowedStatuses: ["draft", "active", "deprecated"]
  },
  {
    name: "archetype update proposal",
    recordDir: ".codex/memory/archetype-updates",
    schemaPath: "schemas/archetype-update-proposal.schema.json",
    allowedStatuses: ["draft", "applied", "rejected", "archived"]
  },
  {
    name: "owner preference profile",
    recordDir: ".codex/owners/preferences",
    schemaPath: "schemas/owner-preferences.schema.json",
    allowedStatuses: ["active", "archived"]
  }
];
const engineRecordDirectories = [
  {
    name: "job",
    recordDir: ".codex/jobs",
    schemaPath: "schemas/job.schema.json"
  },
  {
    name: "plan",
    recordDir: ".codex/plans",
    schemaPath: "schemas/plan.schema.json"
  },
  {
    name: "route",
    recordDir: ".codex/router",
    schemaPath: "schemas/task-route.schema.json"
  },
  {
    name: "boot run",
    recordDir: ".codex/boot",
    schemaPath: "schemas/boot-sequence-run.schema.json"
  },
  {
    name: "execution step",
    recordDir: ".codex/execution",
    schemaPath: "schemas/execution-step.schema.json"
  },
  {
    name: "command intake",
    recordDir: ".codex/commands",
    schemaPath: "schemas/command-intake.schema.json",
    excludeFiles: ["registry.json"]
  },
  {
    name: "audit event",
    recordDir: ".codex/audit",
    schemaPath: "schemas/audit-event.schema.json"
  },
  {
    name: "approval lock",
    recordDir: ".codex/approvals",
    schemaPath: "schemas/approval-lock.schema.json"
  }
];
const runtimeRecordDirectories = [
  {
    name: "client",
    recordDir: ".codex/client-management/clients",
    schemaPath: "schemas/client.schema.json"
  },
  {
    name: "engagement",
    recordDir: ".codex/client-management/engagements",
    schemaPath: "schemas/engagement.schema.json"
  },
  {
    name: "deliverable",
    recordDir: ".codex/client-management/deliverables",
    schemaPath: "schemas/deliverable.schema.json"
  },
  {
    name: "access request",
    recordDir: ".codex/client-management/access-requests",
    schemaPath: "schemas/access-request.schema.json"
  },
  {
    name: "client approval",
    recordDir: ".codex/client-management/approvals",
    schemaPath: "schemas/client-approval.schema.json"
  },
  {
    name: "cost ledger",
    recordDir: ".codex/costs",
    schemaPath: "schemas/cost-ledger.schema.json",
    includePrefixes: ["cost-ledger-"]
  },
  {
    name: "connector execution",
    recordDir: ".codex/connectors",
    schemaPath: "schemas/connector-execution.schema.json",
    includePrefixes: ["connector-exec-"]
  },
  {
    name: "connector auth status",
    recordDir: ".codex/connectors",
    schemaPath: "schemas/connector-auth-status.schema.json",
    includePrefixes: ["connector-auth-"]
  },
  {
    name: "GitHub execution plan",
    recordDir: ".codex/github",
    schemaPath: "schemas/github-execution-plan.schema.json",
    includePrefixes: ["github-plan-"]
  },
  {
    name: "GitHub MCP execution gate",
    recordDir: ".codex/github",
    schemaPath: "schemas/github-mcp-execution-gate.schema.json",
    includePrefixes: ["github-mcp-gate-"]
  },
  {
    name: "quality score",
    recordDir: ".codex/quality-scores",
    schemaPath: "schemas/quality-score.schema.json",
    includePrefixes: ["quality-score-"]
  },
  {
    name: "plan critique",
    recordDir: ".codex/critiques",
    schemaPath: "schemas/plan-critique.schema.json",
    includePrefixes: ["critique-"]
  },
  {
    name: "credential reference",
    recordDir: ".codex/credentials",
    schemaPath: "schemas/credential-reference.schema.json",
    includePrefixes: ["credential-ref-"]
  },
  {
    name: "social account",
    recordDir: ".codex/social/accounts",
    schemaPath: "schemas/social-account.schema.json"
  },
  {
    name: "social post",
    recordDir: ".codex/social/posts",
    schemaPath: "schemas/social-post.schema.json"
  },
  {
    name: "social publish approval",
    recordDir: ".codex/social/publish-approvals",
    schemaPath: "schemas/social-publish-approval.schema.json"
  },
  {
    name: "social connector preflight",
    recordDir: ".codex/social/preflight",
    schemaPath: "schemas/social-connector-preflight.schema.json"
  },
  {
    name: "production readiness",
    recordDir: ".codex/production",
    schemaPath: "schemas/production-readiness.schema.json",
    includePrefixes: ["production-readiness-"]
  }
];
let failures = 0;
let warnings = 0;

function fail(message) {
  failures += 1;
  console.error(`FAIL ${message}`);
}

function warn(message) {
  warnings += 1;
  console.warn(`WARN ${message}`);
}

function pass(message) {
  console.log(`PASS ${message}`);
}

const unsupportedStructuralKeywords = new Set([
  "$ref",
  "oneOf",
  "anyOf",
  "allOf",
  "if",
  "then",
  "else",
  "patternProperties",
  "dependentRequired"
]);

const enforcedSchemaPaths = new Set([
  ...templateRecords.map((record) => record.schemaPath),
  ...schemaValidatedRecords.map((record) => record.schemaPath),
  ...schemaValidatedRecordDirectories.map((directory) => directory.schemaPath),
  ...knowledgeRecordDirectories.map((directory) => directory.schemaPath),
  ...engineRecordDirectories.map((directory) => directory.schemaPath),
  ...runtimeRecordDirectories.map((directory) => directory.schemaPath)
]);

function inspectSchemaKeywordSupport(schema, schemaPath, enforced, location = "$") {
  if (!schema || typeof schema !== "object") {
    return;
  }

  if (Array.isArray(schema)) {
    schema.forEach((item, index) => inspectSchemaKeywordSupport(item, schemaPath, enforced, `${location}[${index}]`));
    return;
  }

  for (const [key, value] of Object.entries(schema)) {
    if (key === "format") {
      warn(`schema format keyword is present but not enforced: ${schemaPath} at ${location}.format`);
    }

    if (unsupportedStructuralKeywords.has(key)) {
      const message = `unsupported schema keyword ${key} in ${enforced ? "enforced" : "orphan"} schema ${schemaPath} at ${location}.${key}`;
      if (enforced) {
        fail(message);
      } else {
        warn(message);
      }
    }

    inspectSchemaKeywordSupport(value, schemaPath, enforced, `${location}.${key}`);
  }
}

for (const requiredPath of requiredPaths) {
  const absolutePath = path.join(root, requiredPath);
  if (!existsSync(absolutePath)) {
    fail(`missing required path: ${requiredPath}`);
  } else {
    pass(`found ${requiredPath}`);
  }
}

const constitutionPath = path.join(root, "docs/ag-os-constitution-v1.md");
if (existsSync(constitutionPath)) {
  const constitution = readFileSync(constitutionPath, "utf8");
  if (!constitution.includes("Status: Active Constitution v1.0.")) {
    fail("Constitution v1 must be marked active as v1.0");
  } else {
    pass("Constitution v1 status is active v1.0");
  }
  if (!constitution.includes("Activation date: 2026-07-03.")) {
    fail("Constitution v1 must include the activation date");
  } else {
    pass("Constitution v1 activation date present");
  }
  if (!constitution.includes("This file activates Constitution v1.0 as the canonical operating contract.")) {
    fail("Constitution v1 must include an activation statement");
  } else {
    pass("Constitution v1 activation statement present");
  }
}

for (const schemaName of readdirSync(path.join(root, "schemas")).filter((name) => name.endsWith(".json"))) {
  const schemaPath = path.join(root, "schemas", schemaName);
  const relativeSchemaPath = `schemas/${schemaName}`;
  try {
    const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
    inspectSchemaKeywordSupport(schema, relativeSchemaPath, enforcedSchemaPaths.has(relativeSchemaPath));
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

function listJsonRecords(relativeDir) {
  const absoluteDir = path.join(root, relativeDir);
  return readdirSync(absoluteDir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => path.join(relativeDir, name).replaceAll("\\", "/"));
}

function isPlaceholder(value) {
  return typeof value === "string" && placeholderPattern.test(value);
}

function isTemplateRecordPath(recordPath) {
  return path.basename(recordPath) === "registry.json" ? false : recordPath.endsWith(".template.json");
}

function listEngineJsonRecords(recordDirectory) {
  const excludedFiles = new Set(recordDirectory.excludeFiles ?? []);
  return listJsonRecords(recordDirectory.recordDir).filter((recordPath) => {
    const name = path.basename(recordPath);
    if (excludedFiles.has(name)) {
      return false;
    }

    if (recordDirectory.includePrefixes?.length > 0) {
      return recordDirectory.includePrefixes.some((prefix) => name.startsWith(prefix));
    }

    return true;
  });
}

function assertNoPlaceholders(value, location) {
  if (isPlaceholder(value)) {
    fail(`${location} must not use REQUIRED_* placeholders in active records`);
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoPlaceholders(item, `${location}[${index}]`));
    return;
  }

  if (value && typeof value === "object") {
    for (const [key, childValue] of Object.entries(value)) {
      assertNoPlaceholders(childValue, `${location}.${key}`);
    }
  }
}

function assertNoFixtureMarkers(value, location) {
  if (typeof value === "string" && /\b(?:fake|demo)\b/i.test(value)) {
    fail(`${location} must not contain fake/demo markers in active records`);
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoFixtureMarkers(item, `${location}[${index}]`));
    return;
  }

  if (value && typeof value === "object") {
    for (const [key, childValue] of Object.entries(value)) {
      assertNoFixtureMarkers(childValue, `${location}.${key}`);
    }
  }
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

function validateCommandRegistry(record) {
  const requiredCategories = [
    "discuss_only",
    "plan_only",
    "build",
    "deploy_staging",
    "deploy_production",
    "connect_service",
    "change_domain",
    "send_message",
    "stop_all",
    "rollback",
    "audit"
  ];
  const approvalGatedCategories = [
    "deploy_staging",
    "deploy_production",
    "connect_service",
    "change_domain",
    "send_message",
    "stop_all",
    "rollback"
  ];
  const neverDefaultExecutableCategories = [
    "deploy_production",
    "connect_service",
    "change_domain",
    "send_message"
  ];

  const categoryIds = new Set();
  for (const category of record.categories ?? []) {
    if (categoryIds.has(category.id)) {
      fail(`command registry contains duplicate category: ${category.id}`);
    }
    categoryIds.add(category.id);

    if (approvalGatedCategories.includes(category.id) && category.requiresOwnerApproval !== true) {
      fail(`command category ${category.id} must require owner approval`);
    }

    if (neverDefaultExecutableCategories.includes(category.id) && category.allowedByDefault !== false) {
      fail(`command category ${category.id} must not be allowed by default`);
    }
  }

  for (const requiredCategory of requiredCategories) {
    if (!categoryIds.has(requiredCategory)) {
      fail(`command registry missing required category: ${requiredCategory}`);
    }
  }
}

function validateCostBudget(record) {
  if (record.limits?.monthlyMaxUsd !== 50) {
    fail("cost budget monthly max must be 50 USD");
  }

  if (record.limits?.dailyMaxUsd !== 10) {
    fail("cost budget daily max must be 10 USD");
  }

  if (record.limits?.perTaskMaxUsd !== 5) {
    fail("cost budget per-task max must be 5 USD");
  }

  if (record.approvalRules?.paidToolsRequireOwnerApproval !== true) {
    fail("cost budget must require owner approval for paid tools");
  }

  if (record.approvalRules?.liveApiUsageRequiresOwnerApprovalUnlessApproved !== true) {
    fail("cost budget must require owner approval for live API usage unless already approved");
  }

  if (record.sourcingRules?.preferExistingToolsAndInfrastructure !== true) {
    fail("cost budget must prefer existing tools and infrastructure");
  }

  if (record.sourcingRules?.useCheapestOptionThatMeetsQuality !== true) {
    fail("cost budget must prefer the cheapest option that still meets quality");
  }

  if (record.sourcingRules?.neverSacrificeQualityForTinyCostSavings !== true) {
    fail("cost budget must never sacrifice quality for tiny cost savings");
  }
}

function validateQualityPolicy(record) {
  const requiredGates = [
    "foundation_validation",
    "schema_validation",
    "safety_review",
    "documentation_review",
    "rollback_readiness",
    "residual_risk_review"
  ];
  const gateIds = new Set((record.gates ?? []).map((gate) => gate.id));

  for (const requiredGate of requiredGates) {
    if (!gateIds.has(requiredGate)) {
      fail(`quality policy missing required gate: ${requiredGate}`);
    }
  }

  if (record.rules?.validationRequiredBeforeMerge !== true) {
    fail("quality policy must require validation before merge");
  }

  if (record.rules?.evidenceRequiredForPassingStatus !== true) {
    fail("quality policy must require evidence for passing status");
  }

  if (record.rules?.ownerApprovalRequiredForWaivers !== true) {
    fail("quality policy must require owner approval for waivers");
  }

  if (record.rules?.noMergeOnFailedRequiredGate !== true) {
    fail("quality policy must block merge on failed required gates");
  }

  if (record.rules?.rollbackNotesRequiredForRiskyChanges !== true) {
    fail("quality policy must require rollback notes for risky changes");
  }
}

function validateSecurityPolicy(record) {
  const requiredControls = [
    "secret_handling",
    "data_sensitivity_review",
    "access_change_review",
    "connector_scope_review",
    "production_data_block",
    "safe_merge_security_review"
  ];
  const controlIds = new Set((record.controls ?? []).map((control) => control.id));

  for (const requiredControl of requiredControls) {
    if (!controlIds.has(requiredControl)) {
      fail(`security policy missing required control: ${requiredControl}`);
    }
  }

  if (record.rules?.credentialsAllowed !== false) {
    fail("security policy must disallow credentials in the repo");
  }

  if (record.rules?.productionCustomerDataAllowed !== false) {
    fail("security policy must disallow production/customer data");
  }

  if (record.rules?.liveServiceChangesRequireOwnerApproval !== true) {
    fail("security policy must require owner approval for live service changes");
  }

  if (record.rules?.accessChangesRequireOwnerApproval !== true) {
    fail("security policy must require owner approval for access changes");
  }

  if (record.rules?.secretsFindingBlocksMerge !== true) {
    fail("security policy must block merge when secrets are found");
  }
}

function validateJobCompletionEvidence(record, recordPath) {
  if (record.status !== "done") {
    return;
  }

  const completedAt = record.queueTimestamps?.completedAt;
  const policyApplies = typeof completedAt !== "string" || completedAt >= JOB_COMPLETION_POLICY_ACTIVATED_AT;
  if (!policyApplies) {
    return;
  }

  const evidence = record.completionEvidence;
  if (!evidence) {
    fail(`${recordPath} completed after the job completion policy activation but has no completionEvidence`);
    return;
  }

  const evidencePaths = [evidence.qualityScorePath, ...(evidence.lessonCandidatePaths ?? [])];
  for (const evidencePath of evidencePaths) {
    if (typeof evidencePath !== "string" || path.isAbsolute(evidencePath) || evidencePath.startsWith("..")) {
      fail(`${recordPath} completion evidence must use a repository-relative path`);
      continue;
    }
    if (!existsSync(path.join(root, evidencePath))) {
      fail(`${recordPath} completion evidence does not exist: ${evidencePath}`);
    }
  }

  if (typeof evidence.qualityScorePath !== "string" || !existsSync(path.join(root, evidence.qualityScorePath))) {
    return;
  }

  try {
    const qualityScore = readJson(evidence.qualityScorePath);
    if (qualityScore.projectId !== record.projectId) {
      fail(`${recordPath} completion quality score projectId must match the job`);
    }

    const expectedLessonIds = new Set(qualityScore.lessonCandidates ?? []);
    for (const lessonPath of evidence.lessonCandidatePaths ?? []) {
      if (!existsSync(path.join(root, lessonPath))) {
        continue;
      }
      const lesson = readJson(lessonPath);
      if (lesson.sourceScoreId !== qualityScore.scoreId) {
        fail(`${recordPath} lesson candidate must cite completion quality score ${qualityScore.scoreId}`);
      }
      if (!expectedLessonIds.has(lesson.lessonId)) {
        fail(`${recordPath} completion quality score must list lesson candidate ${lesson.lessonId}`);
      }
    }
  } catch (error) {
    fail(`${recordPath} completion evidence could not be validated: ${error.message}`);
  }
}

function validateStandingApprovalRecord(record, recordPath) {
  if (record.approvalKind !== "standing") {
    return;
  }

  if (!record.actionClass) {
    fail(`${recordPath} standing approval must define actionClass`);
  }
  if (!Array.isArray(record.inclusionCriteria) || record.inclusionCriteria.length === 0) {
    fail(`${recordPath} standing approval must define deterministic inclusionCriteria`);
  }
  if (!Number.isInteger(record.maxUses) || record.maxUses < 1) {
    fail(`${recordPath} standing approval maxUses must be a positive integer`);
  }
  if (record.usageAuditRequired !== true) {
    fail(`${recordPath} standing approval must require a per-use audit event`);
  }
  if (record.revocableImmediately !== true) {
    fail(`${recordPath} standing approval must be immediately revocable`);
  }

  const requiredPermanentExclusions = [
    "merge_pull_request",
    "credential_handling",
    "customer_data_handling",
    "message_send",
    "social_posting",
    "paid_action",
    "dns_change",
    "production_change"
  ];
  for (const exclusion of requiredPermanentExclusions) {
    if (!(record.prohibitedActions ?? []).includes(exclusion)) {
      fail(`${recordPath} standing approval missing permanent exclusion: ${exclusion}`);
    }
  }
}

function validateCredentialStorePolicy(record) {
  const approvedOptions = new Set((record.approvedStorageOptions ?? []).map((option) => option.id));
  for (const requiredOption of [
    "future_secure_connector_credential_store",
    "future_local_encrypted_secret_store",
    "future_platform_environment_variables_owner_approved"
  ]) {
    if (!approvedOptions.has(requiredOption)) {
      fail(`credential store policy missing planned storage option: ${requiredOption}`);
    }
  }

  for (const forbiddenLocation of [
    "git_repository_files",
    "github_commits",
    "pull_request_bodies",
    "chat_messages",
    "dashboard-data.js",
    "logs"
  ]) {
    if (!(record.forbiddenStorageLocations ?? []).includes(forbiddenLocation)) {
      fail(`credential store policy missing forbidden storage location: ${forbiddenLocation}`);
    }
  }

  if (record.rules?.secretValuesAllowedInRepo !== false) {
    fail("credential store policy must forbid secret values in repo");
  }

  if (record.rules?.credentialReferencesOnly !== true) {
    fail("credential store policy must allow credential references only");
  }

  if (record.rules?.ownerApprovalRequiredBeforeUse !== true) {
    fail("credential store policy must require owner approval before credential use");
  }

  if (record.rules?.tokensMayBePrinted !== false) {
    fail("credential store policy must forbid printing tokens");
  }

  if (record.rules?.tokensMayBeLogged !== false) {
    fail("credential store policy must forbid logging tokens");
  }

  if (record.rules?.tokensMayBeStoredInDashboardData !== false) {
    fail("credential store policy must forbid tokens in dashboard data");
  }

  const allowedFirstUseStatuses = new Set([
    "blocked_until_secure_storage_and_final_owner_approval",
    "credential_reference_ready_final_owner_approval_required"
  ]);
  if (!allowedFirstUseStatuses.has(record.firstCandidateUseCase?.status)) {
    fail("credential store policy first candidate use case must remain blocked or waiting for final owner approval");
  }
}

const credentialMaterialPatterns = [
  /\baccess[_-]?token\b/i,
  /\brefresh[_-]?token\b/i,
  /\boauth[_-]?code\b/i,
  /\bapi[_-]?key\b/i,
  /\bpassword\b/i,
  /\bsecret\s*[:=]\s*[^,\s"']{8,}/i,
  /\btoken\s*[:=]\s*[^,\s"']{8,}/i,
  /\btoken\s+[A-Za-z0-9_-]{8,}/i
];

function collectRecordText(value) {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(collectRecordText).join(" ");
  }
  if (typeof value === "object") {
    return Object.values(value).map(collectRecordText).join(" ");
  }
  return String(value);
}

function validateCredentialReferenceRecord(record, recordPath) {
  const text = collectRecordText(record);
  if (credentialMaterialPatterns.some((pattern) => pattern.test(text))) {
    fail(`${recordPath} credential reference must not contain credential or token material`);
  }
}

function validateSocialPostingPolicy(record) {
  if (record.status !== "active") {
    fail("social posting policy must be active");
  }

  const rules = record.rules ?? {};
  const falseRules = [
    "credentialsInRepoAllowed",
    "tokensPrintedAllowed",
    "oauthImpliesPostingApproval",
    "connectedDraftOnlyImpliesPostingApproval",
    "draftApprovalImpliesPostingApproval",
    "memoryCanGrantPermission",
    "skillsCanGrantPermission",
    "candidateLessonsCanGrantPermission"
  ];
  for (const ruleName of falseRules) {
    if (rules[ruleName] !== false) {
      fail(`social posting policy must set ${ruleName} to false`);
    }
  }

  for (const ruleName of [
    "singlePostRequiresExactOwnerApproval",
    "schedulingRequiresSeparateOwnerApproval",
    "analyticsRequiresSeparateOwnerApproval",
    "dmCommentsBlockedByDefault",
    "n8nActivationBlockedByDefault",
    "paidToolsRequireOwnerApproval"
  ]) {
    if (rules[ruleName] !== true) {
      fail(`social posting policy must set ${ruleName} to true`);
    }
  }

  for (const requiredState of ["owner_approved_draft", "owner_approved_for_single_publish", "published", "scheduled", "blocked"]) {
    if (!(record.allowedStates?.postLifecycle ?? []).includes(requiredState)) {
      fail(`social posting policy missing post lifecycle state: ${requiredState}`);
    }
  }

  for (const requiredState of ["not_connected", "connected_draft_only", "approved_for_single_publish", "approved_for_scheduling", "revoked", "expired", "blocked"]) {
    if (!(record.allowedStates?.accountState ?? []).includes(requiredState)) {
      fail(`social posting policy missing account state: ${requiredState}`);
    }
  }
}

function validateWatchdogPolicy(record) {
  if (record.defaults?.monitoringEnabled !== false) {
    fail("watchdog policy must disable monitoring by default");
  }

  if (record.defaults?.liveChecksAllowed !== false) {
    fail("watchdog policy must disallow live checks by default");
  }

  if (record.defaults?.mutationsAllowed !== false) {
    fail("watchdog policy must disallow mutations by default");
  }

  if (record.defaults?.notificationsAllowed !== false) {
    fail("watchdog policy must disallow notifications by default");
  }

  if (record.approvalRules?.liveMonitoringRequiresOwnerApproval !== true) {
    fail("watchdog policy must require owner approval for live monitoring");
  }

  if (record.approvalRules?.externalNotificationsRequireOwnerApproval !== true) {
    fail("watchdog policy must require owner approval for external notifications");
  }
}

function validateMemoryPolicy(record) {
  if (record.windows?.shortTermDays !== 30) {
    fail("memory policy short-term window must be 30 days");
  }

  if (record.rules?.secretsAllowed !== false) {
    fail("memory policy must disallow secrets");
  }

  if (record.rules?.customerDataAllowed !== false) {
    fail("memory policy must disallow customer data");
  }

  if (record.rules?.sourceRequired !== true) {
    fail("memory policy must require a source");
  }

  if (record.rules?.verifiedCurrentFactsRequireVerifiedAt !== true) {
    fail("memory policy must require verifiedAt for verified current facts");
  }

  if (record.rules?.staleMemoryRequiresRefreshTrigger !== true) {
    fail("memory policy must require refresh triggers for stale memory");
  }
}

function validateUnifiedMemoryRegistry(record) {
  const requiredDirs = [
    record.sourceOfTruth?.acceptedLessonsDir,
    record.sourceOfTruth?.candidateLessonsDir,
    record.sourceOfTruth?.rejectedLessonsDir,
    record.sourceOfTruth?.conflictsDir,
    record.sourceOfTruth?.skillsDir
  ];
  for (const requiredDir of requiredDirs) {
    if (!requiredDir || !existsSync(path.join(root, requiredDir))) {
      fail(`unified memory registry points to missing directory: ${requiredDir}`);
    }
  }

  for (const requiredScope of ["personal", "project", "client", "company", "agent_shared", "worker_specific"]) {
    if (!record.scopeDefinitions?.[requiredScope]) {
      fail(`unified memory registry missing scope definition: ${requiredScope}`);
    }
  }

  if (record.rules?.candidateLessonsAdvisoryOnly !== true) {
    fail("unified memory registry must keep candidate lessons advisory only");
  }
  if (record.rules?.ownerApprovalRequiredForPromotion !== true) {
    fail("unified memory registry must require owner approval for lesson promotion");
  }
  if (record.rules?.memoryGrantsPermission !== false) {
    fail("unified memory registry must not allow memory to grant permission");
  }
  if (record.rules?.skillsGrantPermission !== false) {
    fail("unified memory registry must not allow skills to grant permission");
  }
  if (record.rules?.secretsAllowed !== false || record.rules?.customerDataAllowed !== false || record.rules?.productionDataAllowed !== false) {
    fail("unified memory registry must block secrets, customer data, and production data");
  }
  if (record.rules?.conflictsBlockPromotion !== true) {
    fail("unified memory registry must block promotion on lesson conflicts");
  }
  if (record.runtimeLoading?.candidateLessonsLoadedAsTruth !== false) {
    fail("unified memory registry must keep candidatesLoadedAsTruth false");
  }
  if (record.runtimeLoading?.rejectedLessonsLoadedAsTruth !== false) {
    fail("unified memory registry must keep rejectedLessonsLoadedAsTruth false");
  }
  if (!record.runtimeLoading?.loaderScript || !existsSync(path.join(root, record.runtimeLoading.loaderScript))) {
    fail("unified memory registry loaderScript must point to an existing loader");
  }
}

function validateCapabilityRegistry(record) {
  if (record.status === "foundation" && record.capabilities?.length !== 0) {
    fail("capability registry foundation must not include capability records yet");
  }

  if (record.rules?.credentialsAllowed !== false) {
    fail("capability registry must disallow credentials");
  }

  if (record.rules?.liveActionsAllowedByDefault !== false) {
    fail("capability registry must disallow live actions by default");
  }

  if (record.rules?.ownerApprovalRequiredForLiveActions !== true) {
    fail("capability registry must require owner approval for live actions");
  }

  if (record.rules?.ownerApprovalRequiredForPaidActions !== true) {
    fail("capability registry must require owner approval for paid actions");
  }
}

function validateProjectRegistry(record) {
  if (record.status === "foundation" && record.projects?.length !== 0) {
    fail("project registry foundation must not include project records yet");
    return;
  }

  const projectSchema = readJson("schemas/project.schema.json");
  const projectIds = new Set();

  for (const entry of record.projects ?? []) {
    if (projectIds.has(entry.projectId)) {
      fail(`project registry contains duplicate project: ${entry.projectId}`);
      continue;
    }
    projectIds.add(entry.projectId);

    const recordPath = entry.recordPath;
    if (!existsSync(path.join(root, recordPath))) {
      fail(`project registry points to missing record: ${recordPath}`);
      continue;
    }

    const project = readJson(recordPath);
    const failuresBeforeProject = failures;
    validateSchemaObject(project, projectSchema, recordPath);

    if (project.template === true) {
      fail(`project registry must not point to template record: ${recordPath}`);
    }

    if (project.id !== entry.projectId) {
      fail(`${recordPath} id must match registry projectId`);
    }

    if (project.status !== entry.status) {
      fail(`${recordPath} status must match registry status`);
    }

    validateKnownProjectPosture(project, recordPath);

    if (failures === failuresBeforeProject) {
      pass(`project record structurally valid: ${recordPath}`);
    }
  }
}

function validateKnownProjectPosture(project, recordPath) {
  const projectText = JSON.stringify(project);

  if (project.id === "project-lead-generation-system") {
    if (project.status !== "complete") {
      fail("Lead Generation System must be registered as complete");
    }
    if (project.projectType !== "product_project") {
      fail("Lead Generation System must be registered as a product project");
    }
    if (!["observe_only", "read_only"].includes(project.managementMode)) {
      fail("Lead Generation System management mode must be observe_only or read_only");
    }
    for (const requiredBoundary of [
      "Do not touch source code.",
      "Do not touch VPS.",
      "Do not touch Postgres.",
      "Do not touch n8n workflows.",
      "Do not touch domain or DNS.",
      "Do not deploy.",
      "Do not connect credentials."
    ]) {
      if (!project.outOfScope?.includes(requiredBoundary)) {
        fail(`Lead Generation System record missing boundary: ${requiredBoundary}`);
      }
    }
  }

  if (project.id === "project-ag-digitalz-ai-receptionist") {
    if (project.status !== "active") {
      fail("AG Digitalz AI Receptionist must be registered as active");
    }
    if (project.projectType !== "product_project") {
      fail("AG Digitalz AI Receptionist must be registered as a product project");
    }
    if (project.managementMode !== "active_build") {
      fail("AG Digitalz AI Receptionist management mode must be active_build");
    }
    if (!projectText.includes("https://github.com/gurnoorbassi/ag-digitalz-ai-receptionist")) {
      fail("AG Digitalz AI Receptionist record must include the known GitHub repo URL");
    }
  }
}

function validateApprovalLockSchema(schema) {
  const requiredFields = [
    "approvalId",
    "approvedBy",
    "target",
    "dataClass",
    "revocationPath",
    "approvedAt",
    "approvedActions",
    "evidence"
  ];
  for (const requiredField of requiredFields) {
    if (!schema.required?.includes(requiredField)) {
      fail(`approval lock schema must require ${requiredField}`);
    }
  }

  const expectedRiskLevels = ["R0", "R1", "R2", "R3", "R4", "R5", "R6"];
  const actualRiskLevels = schema.properties?.riskLevel?.enum ?? [];
  if (JSON.stringify(actualRiskLevels) !== JSON.stringify(expectedRiskLevels)) {
    fail("approval lock schema riskLevel must use canonical R0-R6 values");
  }

  if (schema.required?.includes("id") || schema.properties?.id) {
    fail("approval lock schema must use approvalId instead of ambiguous id");
  }

  const expectedApprovalIdPattern = "^approval-[0-9]{8}-[a-z0-9]+(?:-[a-z0-9]+)*$";
  if (schema.properties?.approvalId?.pattern !== expectedApprovalIdPattern) {
    fail("approval lock schema approvalId must use approval-YYYYMMDD-slug pattern");
  }

  if ((schema.properties?.approvedActions?.minItems ?? 0) < 1) {
    fail("approval lock schema must require at least one approved action");
  }

  if ((schema.properties?.evidence?.minItems ?? 0) < 1) {
    fail("approval lock schema must require at least one evidence item");
  }

  if ((schema.properties?.revocationPath?.minLength ?? 0) < 1) {
    fail("approval lock schema must require a non-empty revocationPath");
  }
}

function validateActivationBlockers() {
  const approvalLockSchema = readJson("schemas/approval-lock.schema.json");
  validateApprovalLockSchema(approvalLockSchema);

  const actionMatrix = readFileSync(path.join(root, "docs/action-matrix.md"), "utf8");
  if (!actionMatrix.includes("| Validation script changes | `R2` | Blocked for auto-merge | Yes | Approval lock after activation and PR |")) {
    fail("action matrix must block validation script changes for auto-merge and require approval");
  }
  if (!actionMatrix.includes("| CI workflow changes | `R2` | Blocked for auto-merge | Yes | Approval lock after activation and PR |")) {
    fail("action matrix must block CI workflow changes for auto-merge and require approval");
  }
  if (!actionMatrix.includes("| Authority, safe-merge, approval workflow, owner record, or Constitution change | `R2` | Blocked for auto-merge | Yes | Owner approval, approval lock, hostile audit note, PR, and audit event |")) {
    fail("action matrix must require owner approval, approval lock, hostile audit note, PR, and audit event for Constitution and governance changes");
  }
  if (!actionMatrix.includes("Blocked unless explicitly owner-approved for that governance PR")) {
    fail("action matrix must block auto-merge for governance changes unless owner-approved for that exact governance PR");
  }

  const constitution = readFileSync(path.join(root, "docs/ag-os-constitution-v1.md"), "utf8");
  if (!constitution.includes("Before executing commands after Constitution activation, AG OS must:")) {
    fail("Constitution boot sequence must be mandatory after activation");
  }
  if (!constitution.includes("hostile audit note")) {
    fail("Constitution must require a hostile audit note for activation and amendments");
  }
  if (!constitution.includes("`approvalId`, the canonical approval lock identifier")) {
    fail("Constitution must define approvalId as the canonical approval lock identifier");
  }
  if (!constitution.includes("Revocation path explaining how the approval gets revoked, expired, cancelled, or invalidated")) {
    fail("Constitution must define approval lock revocation path requirements");
  }

  const bootSequence = readFileSync(path.join(root, "docs/boot-sequence.md"), "utf8");
  if (!bootSequence.includes("Before executing commands, AG OS must:")) {
    fail("boot sequence must use mandatory language");
  }

  const approvalWorkflow = readFileSync(path.join(root, "docs/approval-workflow.md"), "utf8");
  if (!approvalWorkflow.includes("`approvalId` must use the clear `approval-YYYYMMDD-slug` format")) {
    fail("approval workflow must define approvalId naming");
  }
  if (!approvalWorkflow.includes("revoked, expired, cancelled, or invalidated")) {
    fail("approval workflow must define revocationPath meaning");
  }
  if (!approvalWorkflow.includes("hostile audit note")) {
    fail("approval workflow must require hostile audit notes for governance changes");
  }

  const approvalsReadme = readFileSync(path.join(root, ".codex/approvals/README.md"), "utf8");
  const auditReadme = readFileSync(path.join(root, ".codex/audit/README.md"), "utf8");
  if (/will live here/i.test(approvalsReadme) || /will live here/i.test(auditReadme)) {
    fail("approval and audit folders must not describe records as future-only placeholders");
  }
}

validateActivationBlockers();

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

    if (schemaValidatedRecord.recordPath === ".codex/connectors/registry.json") {
      validateConnectorRegistry(record);
    }

    if (schemaValidatedRecord.recordPath === ".codex/commands/registry.json") {
      validateCommandRegistry(record);
    }

    if (schemaValidatedRecord.recordPath === ".codex/costs/budget.json") {
      validateCostBudget(record);
    }

    if (schemaValidatedRecord.recordPath === ".codex/quality/policy.json") {
      validateQualityPolicy(record);
    }

    if (schemaValidatedRecord.recordPath === ".codex/security/policy.json") {
      validateSecurityPolicy(record);
    }

    if (schemaValidatedRecord.recordPath === ".codex/watchdog/policy.json") {
      validateWatchdogPolicy(record);
    }

    if (schemaValidatedRecord.recordPath === ".codex/memory/policy.json") {
      validateMemoryPolicy(record);
    }

    if (schemaValidatedRecord.recordPath === ".codex/memory/registry.json") {
      validateUnifiedMemoryRegistry(record);
    }

    if (schemaValidatedRecord.recordPath === ".codex/capabilities/registry.json") {
      validateCapabilityRegistry(record);
    }

    if (schemaValidatedRecord.recordPath === ".codex/projects/registry.json") {
      validateProjectRegistry(record);
    }

    if (failures === failuresBeforeRecord) {
      pass(`record structurally valid: ${schemaValidatedRecord.recordPath}`);
    }
  } catch (error) {
    fail(`${schemaValidatedRecord.name} could not be validated: ${error.message}`);
  }
}

try {
  validateCredentialStorePolicy(readJson(".codex/security/credential-store-policy.json"));
  pass("credential store policy safety rules valid");
} catch (error) {
  fail(`credential store policy could not be validated: ${error.message}`);
}

try {
  validateSocialPostingPolicy(readJson(".codex/social/policies/production-posting-policy.json"));
  pass("social posting policy safety rules valid");
} catch (error) {
  fail(`social posting policy could not be validated: ${error.message}`);
}

for (const engineRecordDirectory of engineRecordDirectories) {
  try {
    const schema = readJson(engineRecordDirectory.schemaPath);
    const recordPaths = listEngineJsonRecords(engineRecordDirectory);
    let activeRecordCount = 0;

    for (const recordPath of recordPaths) {
      const record = readJson(recordPath);
      const failuresBeforeRecord = failures;

      if (isTemplateRecordPath(recordPath)) {
        validateTemplateObject(record, schema, recordPath);
        if (failures === failuresBeforeRecord) {
          pass(`${engineRecordDirectory.name} template structurally valid: ${recordPath}`);
        }
        continue;
      }

      activeRecordCount += 1;
      assertNoPlaceholders(record, recordPath);
      assertNoFixtureMarkers(record, recordPath);
      validateSchemaObject(record, schema, recordPath);
      if (engineRecordDirectory.name === "job") {
        validateJobCompletionEvidence(record, recordPath);
      }

      if (failures === failuresBeforeRecord) {
        pass(`${engineRecordDirectory.name} active record structurally valid: ${recordPath}`);
      }
    }

    if (activeRecordCount === 0) {
      pass(`no active ${engineRecordDirectory.name} records found in ${engineRecordDirectory.recordDir}`);
    }
  } catch (error) {
    fail(`${engineRecordDirectory.name} records could not be validated: ${error.message}`);
  }
}

for (const runtimeRecordDirectory of runtimeRecordDirectories) {
  try {
    if (!existsSync(path.join(root, runtimeRecordDirectory.recordDir))) {
      pass(`no ${runtimeRecordDirectory.name} directory present yet: ${runtimeRecordDirectory.recordDir}`);
      continue;
    }

    const schema = readJson(runtimeRecordDirectory.schemaPath);
    const recordPaths = listEngineJsonRecords(runtimeRecordDirectory);
    let activeRecordCount = 0;

    for (const recordPath of recordPaths) {
      const record = readJson(recordPath);
      const failuresBeforeRecord = failures;

      if (isTemplateRecordPath(recordPath)) {
        validateTemplateObject(record, schema, recordPath);
        if (failures === failuresBeforeRecord) {
          pass(`${runtimeRecordDirectory.name} template structurally valid: ${recordPath}`);
        }
        continue;
      }

      activeRecordCount += 1;
      assertNoPlaceholders(record, recordPath);
      assertNoFixtureMarkers(record, recordPath);
      validateSchemaObject(record, schema, recordPath);
      if (runtimeRecordDirectory.name === "credential reference") {
        validateCredentialReferenceRecord(record, recordPath);
      }
      if (runtimeRecordDirectory.name === "production readiness") {
        const readiness = evaluateProductionReadiness(record);
        if (record.activationAllowed === true && readiness.activationAllowed !== true) {
          fail(`${recordPath} must fail closed while required production safeguards are blocked`);
        }
        if (record.status === "ready" && readiness.activationAllowed !== true) {
          fail(`${recordPath} cannot use ready status without every required production safeguard`);
        }
      }

      if (failures === failuresBeforeRecord) {
        pass(`${runtimeRecordDirectory.name} active record structurally valid: ${recordPath}`);
      }
    }

    if (activeRecordCount === 0) {
      pass(`no active ${runtimeRecordDirectory.name} records found in ${runtimeRecordDirectory.recordDir}`);
    }
  } catch (error) {
    fail(`${runtimeRecordDirectory.name} records could not be validated: ${error.message}`);
  }
}

for (const knowledgeRecordDirectory of knowledgeRecordDirectories) {
  try {
    if (!existsSync(path.join(root, knowledgeRecordDirectory.recordDir))) {
      pass(`no ${knowledgeRecordDirectory.name} directory present yet: ${knowledgeRecordDirectory.recordDir}`);
      continue;
    }

    const schema = readJson(knowledgeRecordDirectory.schemaPath);
    const recordPaths = listEngineJsonRecords(knowledgeRecordDirectory);
    let activeRecordCount = 0;

    for (const recordPath of recordPaths) {
      const record = readJson(recordPath);
      const failuresBeforeRecord = failures;

      if (isTemplateRecordPath(recordPath)) {
        validateTemplateObject(record, schema, recordPath);
        if (failures === failuresBeforeRecord) {
          pass(`${knowledgeRecordDirectory.name} template structurally valid: ${recordPath}`);
        }
        continue;
      }

      activeRecordCount += 1;
      assertNoPlaceholders(record, recordPath);
      assertNoFixtureMarkers(record, recordPath);
      validateSchemaObject(record, schema, recordPath);

      if (knowledgeRecordDirectory.allowedStatuses && !knowledgeRecordDirectory.allowedStatuses.includes(record.status)) {
        fail(`${recordPath} status must be one of: ${knowledgeRecordDirectory.allowedStatuses.join(", ")}`);
      }

      if (failures === failuresBeforeRecord) {
        pass(`${knowledgeRecordDirectory.name} active record structurally valid: ${recordPath}`);
      }
    }

    if (activeRecordCount === 0) {
      pass(`no active ${knowledgeRecordDirectory.name} records found in ${knowledgeRecordDirectory.recordDir}`);
    }
  } catch (error) {
    fail(`${knowledgeRecordDirectory.name} records could not be validated: ${error.message}`);
  }
}

for (const schemaValidatedRecordDirectory of schemaValidatedRecordDirectories) {
  try {
    const schema = readJson(schemaValidatedRecordDirectory.schemaPath);
    const recordPaths = listJsonRecords(schemaValidatedRecordDirectory.recordDir);
    if (recordPaths.length === 0) {
      pass(`no active ${schemaValidatedRecordDirectory.name} records found in ${schemaValidatedRecordDirectory.recordDir}`);
      continue;
    }

    for (const recordPath of recordPaths) {
      const record = readJson(recordPath);
      const failuresBeforeRecord = failures;
      validateSchemaObject(record, schema, recordPath);
      if (schemaValidatedRecordDirectory.name === "approval lock") {
        validateStandingApprovalRecord(record, recordPath);
      }
      if (failures === failuresBeforeRecord) {
        pass(`${schemaValidatedRecordDirectory.name} record structurally valid: ${recordPath}`);
      }
    }
  } catch (error) {
    fail(`${schemaValidatedRecordDirectory.name} records could not be validated: ${error.message}`);
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
