import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync
} from "node:fs";
import path from "node:path";
import process from "node:process";
import { buildAuditEventRecord } from "./audit-writer.mjs";
import { DEFAULT_OWNER_ID, isoTimestamp, slugify } from "./common.mjs";

const PROJECT_TYPES = new Set(["internal_project", "product_project", "ag_os_core"]);
const MANAGEMENT_MODES = new Set(["observe_only", "read_only", "active_build", "managed_staging", "production_managed"]);
const MAX_TEXT_LENGTH = 5_000;

function requiredText(value, field) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} is required`);
  }
  if (value.length > MAX_TEXT_LENGTH) {
    throw new Error(`${field} must be ${MAX_TEXT_LENGTH} characters or fewer`);
  }
  return value.trim();
}

function stringList(value, field) {
  const items = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/\r?\n|,/)
      : [];
  const normalized = [...new Set(items.map((item) => String(item).trim()).filter(Boolean))];
  if (normalized.length === 0) {
    throw new Error(`${field} requires at least one real item`);
  }
  if (normalized.some((item) => item.length > MAX_TEXT_LENGTH)) {
    throw new Error(`${field} entries must be ${MAX_TEXT_LENGTH} characters or fewer`);
  }
  return normalized;
}

function optionalStringList(value, field) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  return stringList(value, field);
}

function runDashboardBuild(root) {
  const result = spawnSync(process.execPath, ["scripts/build-dashboard.mjs"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  if (result.status !== 0) {
    throw new Error(`dashboard refresh failed: ${result.stderr || result.stdout}`);
  }
}

function writeAtomic(target, content) {
  mkdirSync(path.dirname(target), { recursive: true });
  const temporary = `${target}.tmp-${process.pid}-${randomUUID()}`;
  writeFileSync(temporary, content, { encoding: "utf8", mode: 0o600 });
  renameSync(temporary, target);
}

function removeIfExists(target) {
  if (existsSync(target)) {
    unlinkSync(target);
  }
}

function riskLevelForTrust(trustLevel) {
  if (trustLevel <= 1) return "high";
  if (trustLevel === 2) return "medium";
  return "low";
}

function approvalSensitivity(riskLevel) {
  if (riskLevel === "high") return { level: "protected", label: "Protected", explanation: "Low starting trust keeps external and production actions behind exact owner approval." };
  if (riskLevel === "medium") return { level: "controlled", label: "Controlled", explanation: "Local work can run, while external or production effects remain approval-gated." };
  return { level: "routine", label: "Routine", explanation: "The project has more proven trust, but permanent live-action gates still apply." };
}

export function validateProjectCreateInput(input = {}) {
  const name = requiredText(input.name, "name");
  if (name.length < 3) {
    throw new Error("name must be at least 3 characters");
  }
  const goal = requiredText(input.goal, "goal");
  const scope = stringList(input.scope, "scope");
  const stack = stringList(input.stack, "stack");
  const knownFacts = optionalStringList(input.knownFacts, "knownFacts");
  const projectType = input.projectType || "internal_project";
  const managementMode = input.managementMode || "active_build";
  const trustLevel = input.trustLevel === undefined ? 1 : Number(input.trustLevel);

  if (!PROJECT_TYPES.has(projectType)) {
    throw new Error(`unsupported projectType: ${projectType}`);
  }
  if (!MANAGEMENT_MODES.has(managementMode)) {
    throw new Error(`unsupported managementMode: ${managementMode}`);
  }
  if (!Number.isInteger(trustLevel) || trustLevel < 0 || trustLevel > 4) {
    throw new Error("trustLevel must be an integer from 0 to 4");
  }

  return { name, goal, scope, stack, knownFacts, projectType, managementMode, trustLevel };
}

export function listProjects({ root = process.cwd() } = {}) {
  const registry = JSON.parse(readFileSync(path.join(root, ".codex/projects/registry.json"), "utf8"));
  return registry.projects.map((entry) => {
    const project = JSON.parse(readFileSync(path.join(root, entry.recordPath), "utf8"));
    const riskLevel = entry.riskLevel || "not_recorded";
    return {
      id: project.id,
      name: project.name,
      status: project.status,
      managementMode: project.managementMode,
      projectType: project.projectType,
      riskLevel,
      sensitivity: approvalSensitivity(riskLevel),
      owner: project.owner,
      recordPath: entry.recordPath,
      boundary: project.outOfScope?.[0] || "Boundary not recorded.",
      ownerWorkspace: project.ownerWorkspace ?? null
    };
  });
}

export function createProject({ input, root = process.cwd(), now = new Date() }) {
  const values = validateProjectCreateInput(input);
  const timestamp = isoTimestamp(now);
  const slug = slugify(values.name);
  const projectId = `project-${slug}`;
  const projectRecordPath = `.codex/projects/${slug}.json`;
  const registryPath = path.join(root, ".codex/projects/registry.json");
  const projectPath = path.join(root, projectRecordPath);
  const originalRegistry = readFileSync(registryPath, "utf8");
  const registry = JSON.parse(originalRegistry);

  if (existsSync(projectPath) || registry.projects.some((entry) => entry.projectId === projectId)) {
    throw new Error(`project already exists: ${projectId}`);
  }
  if (registry.projects.some((entry) => {
    const record = JSON.parse(readFileSync(path.join(root, entry.recordPath), "utf8"));
    return record.name.toLowerCase() === values.name.toLowerCase();
  })) {
    throw new Error(`project name already exists: ${values.name}`);
  }

  const project = {
    id: projectId,
    name: values.name,
    status: "planned",
    owner: DEFAULT_OWNER_ID,
    projectType: values.projectType,
    managementMode: values.managementMode,
    goal: values.goal,
    ...(values.knownFacts ? { knownFacts: values.knownFacts } : {}),
    scope: values.scope,
    outOfScope: [
      "Credentials, customer or production data, live services, deployments, posting, messaging, paid actions, DNS, and production changes without exact owner approval.",
      "Any action outside the recorded project scope or beyond the current trust level."
    ],
    trustLevel: values.trustLevel,
    stack: values.stack,
    risks: [{
      risk: "Automation could cross a live-action boundary before the project has proven capability and approval evidence.",
      mitigation: "Fail closed at approval gates, record every transition, and increase trust only from reviewed evidence."
    }],
    approvalRequiredFor: [
      "credential access or storage",
      "customer or production data access",
      "posting or messaging",
      "paid actions",
      "DNS or production changes",
      "deployment or external connector execution"
    ],
    qualityGates: [
      "project scope and acceptance criteria are explicit",
      "all relevant local validation and tests pass",
      "secret scanning passes",
      "every completed job records a quality score and lesson candidates",
      "owner acceptance is recorded before project completion"
    ],
    securityReview: "Required before any live service, credential, production data, or external connector is activated.",
    costTracking: "Record estimated and actual cost for every run; paid actions require a matching approval and budget.",
    deploymentPlan: "No deployment is authorized by project creation. Use a separately approved, verified, and reversible deployment plan.",
    createdAt: timestamp,
    updatedAt: timestamp
  };

  const nextRegistry = {
    ...registry,
    projects: [...registry.projects, {
      projectId,
      recordPath: projectRecordPath,
      status: "planned",
      owner: DEFAULT_OWNER_ID,
      riskLevel: riskLevelForTrust(values.trustLevel),
      lastReviewedAt: timestamp
    }]
  };
  const audit = buildAuditEventRecord({
    runId: `project-created-${slug}-${randomUUID().slice(0, 8)}`,
    eventType: "registry_change",
    summary: `Owner created project ${projectId} through the authenticated AG OS control center.`,
    scope: projectRecordPath,
    source: "ag_os_coordinator",
    relatedArtifacts: [
      { type: "other", reference: projectRecordPath },
      { type: "other", reference: ".codex/projects/registry.json" }
    ],
    riskLevel: "R1",
    liveServiceTouched: false,
    notes: "Project creation authorizes only the production-clean record and registry update. All permanent live-action gates remain in force.",
    now
  });
  const auditRecordPath = `.codex/audit/${audit.id}.json`;
  const auditPath = path.join(root, auditRecordPath);

  try {
    writeAtomic(projectPath, `${JSON.stringify(project, null, 2)}\n`);
    writeAtomic(registryPath, `${JSON.stringify(nextRegistry, null, 2)}\n`);
    writeAtomic(auditPath, `${JSON.stringify(audit, null, 2)}\n`);
    runDashboardBuild(root);
  } catch (error) {
    removeIfExists(projectPath);
    removeIfExists(auditPath);
    writeAtomic(registryPath, originalRegistry);
    try {
      runDashboardBuild(root);
    } catch {
      // Preserve the original failure; the source records are already restored.
    }
    throw error;
  }

  return {
    status: "created",
    project,
    registryEntry: nextRegistry.projects.at(-1),
    recordsCreated: [projectRecordPath, ".codex/projects/registry.json", auditRecordPath],
    safety: {
      externalActionExecuted: false,
      deploymentAuthorized: false,
      credentialsAccessed: false,
      paidActionTriggered: false
    }
  };
}
