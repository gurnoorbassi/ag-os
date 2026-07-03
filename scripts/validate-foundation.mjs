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
  ".codex/agents/README.md",
  ".codex/tasks/README.md",
  ".codex/locks/README.md",
  ".codex/ideas/README.md",
  ".codex/memory/README.md",
  ".codex/memory/policy.json",
  ".codex/costs/README.md",
  ".codex/costs/budget.json",
  ".codex/quality/README.md",
  ".codex/quality/policy.json",
  ".codex/security/README.md",
  ".codex/security/policy.json",
  ".codex/watchdog/README.md",
  ".codex/watchdog/policy.json",
  ".codex/approvals/README.md",
  ".codex/audit/README.md",
  ".codex/owners/README.md",
  ".codex/capabilities/README.md",
  ".codex/capabilities/registry.json",
  ".codex/commands/registry.json",
  ".codex/connectors/registry.json",
  ".codex/projects/README.md",
  ".codex/projects/registry.json",
  ".codex/projects/project.template.json",
  ".codex/tasks/task.template.json",
  ".codex/agents/agent.template.json",
  "docs/connector-registry.md",
  "docs/command-registry.md",
  "docs/capability-registry.md",
  "docs/cost-os.md",
  "docs/dashboard-os-plan.md",
  "docs/memory-os.md",
  "docs/quality-os.md",
  "docs/security-os.md",
  "docs/watchdog-os.md",
  "docs/project-registry.md",
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

const constitutionPath = path.join(root, "docs/ag-os-constitution-v1.md");
if (existsSync(constitutionPath)) {
  const constitution = readFileSync(constitutionPath, "utf8");
  if (!constitution.includes("Status: Draft only. Not active.")) {
    fail("Constitution v1 must remain marked as draft-only and not active");
  } else {
    pass("Constitution v1 status is draft-only");
  }
  if (!constitution.includes("This file is a draft Constitution v1. It does not activate Constitution v1")) {
    fail("Constitution v1 must include a non-activation statement");
  } else {
    pass("Constitution v1 non-activation statement present");
  }
  if (/^Status:\s*Active\b/im.test(constitution)) {
    fail("Constitution v1 must not be marked active in foundation validation");
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

function listJsonRecords(relativeDir) {
  const absoluteDir = path.join(root, relativeDir);
  return readdirSync(absoluteDir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => path.join(relativeDir, name).replaceAll("\\", "/"));
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

function validateApprovalLockSchema(schema) {
  const requiredFields = [
    "approvedBy",
    "target",
    "dataClass",
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

  if ((schema.properties?.approvedActions?.minItems ?? 0) < 1) {
    fail("approval lock schema must require at least one approved action");
  }

  if ((schema.properties?.evidence?.minItems ?? 0) < 1) {
    fail("approval lock schema must require at least one evidence item");
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
  if (!actionMatrix.includes("| Authority, safe-merge, approval workflow, owner record, or Constitution change | `R2` | Blocked for auto-merge | Yes | Approval lock after activation, PR, and audit event after audit exists |")) {
    fail("action matrix must require an approval lock for Constitution and governance changes after activation");
  }

  const constitution = readFileSync(path.join(root, "docs/ag-os-constitution-v1.md"), "utf8");
  if (!constitution.includes("Before executing commands after Constitution activation, AG OS must:")) {
    fail("Constitution boot sequence must be mandatory after activation");
  }

  const bootSequence = readFileSync(path.join(root, "docs/boot-sequence.md"), "utf8");
  if (!bootSequence.includes("Before executing commands, AG OS must:")) {
    fail("boot sequence must use mandatory language");
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

    if (schemaValidatedRecord.recordPath === ".codex/projects/registry.json" && record.projects?.length !== 0) {
      fail("project registry foundation must not include project records yet");
    }

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

    if (schemaValidatedRecord.recordPath === ".codex/capabilities/registry.json") {
      validateCapabilityRegistry(record);
    }

    if (failures === failuresBeforeRecord) {
      pass(`record structurally valid: ${schemaValidatedRecord.recordPath}`);
    }
  } catch (error) {
    fail(`${schemaValidatedRecord.name} could not be validated: ${error.message}`);
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
