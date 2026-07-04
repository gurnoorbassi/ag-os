import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { DEFAULT_PROJECT_ID, isoTimestamp, normalizeRunId, slugify, writeJson } from "./common.mjs";

// Product type detection is a deterministic hint, not understanding. Real
// understanding comes from the worker block; these matchers only pick a
// product-aware label and the archetype to look up. Order matters: first
// match wins, so more specific product types come first.
const PRODUCT_TYPE_MATCHERS = [
  {
    productType: "social media content operations",
    slug: "social-media-content-operations",
    archetypeId: "archetype-social-media-content-operations-system",
    pattern: /social\s*media|content\s+operations|posts?\s+across|multi[-\s]?platform|multiple\s+platforms/
  },
  {
    productType: "website",
    slug: "website",
    archetypeId: "archetype-website",
    pattern: /\b(web\s*site|website|landing\s+page)\b/
  },
  {
    productType: "crm",
    slug: "crm",
    archetypeId: "archetype-crm",
    pattern: /\bcrm\b|customer\s+relationship/
  },
  {
    productType: "lead generation system",
    slug: "lead-generation-system",
    archetypeId: "archetype-lead-generation",
    pattern: /\blead\s+gen(?:eration)?\b/
  },
  {
    productType: "dashboard",
    slug: "dashboard",
    archetypeId: "archetype-dashboard",
    pattern: /\bdashboard\b/
  },
  {
    productType: "presentation",
    slug: "presentation",
    archetypeId: "archetype-presentation",
    pattern: /\bpower\s*point\b|\bpresentation\b|\bslide\s*deck\b|\bpptx\b/
  },
  {
    productType: "training platform",
    slug: "training-platform",
    archetypeId: "archetype-training-platform",
    pattern: /\btraining\s+platform\b|\bemployee\s+training\b|\bcourse\s+platform\b/
  },
  {
    productType: "client portal",
    slug: "client-portal",
    archetypeId: "archetype-client-portal",
    pattern: /\bclient\s+portal\b|\bcustomer\s+portal\b|\bagency\s+portal\b/
  },
  {
    productType: "ecommerce store",
    slug: "ecommerce-store",
    archetypeId: "archetype-ecommerce-store",
    pattern: /\be[-\s]?commerce\b|\bonline\s+store\b|\bhero\s+product\s+store\b|\b(store|shop)\s+for\s+(?:one|1)\s+hero\s+product\b/
  },
  {
    productType: "ai receptionist",
    slug: "ai-receptionist",
    archetypeId: "archetype-ai-tool",
    pattern: /\bai\s+receptionist\b|\bphone\s+receptionist\b|\bpizza\s+shop\s+receptionist\b|\bcall\s+answering\b|\breceptionist\b/
  },
  {
    productType: "ai tool",
    slug: "ai-tool",
    archetypeId: "archetype-ai-tool",
    pattern: /\bai\s+(tool|app|assistant|agent)\b/
  },
  {
    productType: "automation",
    slug: "automation",
    archetypeId: "archetype-automation",
    pattern: /\bautomation\b|\bworkflow\b/
  }
];

const COMMAND_SLUG_STOP_WORDS = new Set([
  "make", "me", "a", "an", "the", "for", "of", "to", "and", "with", "that",
  "this", "my", "i", "can", "it", "in", "on", "where", "build", "create",
  "system", "please", "want", "need"
]);

// Unknown product types keep a slug derived from the command's own words
// instead of collapsing into a weak generic name like "request".
function deriveCommandSlug(command) {
  const words = command
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 0 && !COMMAND_SLUG_STOP_WORDS.has(word));

  return slugify(words.slice(0, 4).join(" ")) === "unspecified"
    ? "unclassified-product"
    : slugify(words.slice(0, 4).join(" "));
}

function findRegisteredArchetype(archetypeId, root = process.cwd()) {
  if (!archetypeId) {
    return false;
  }

  const archetypeDir = path.join(root, ".codex/archetypes");
  if (!existsSync(archetypeDir)) {
    return false;
  }

  return readdirSync(archetypeDir)
    .filter((name) => name.endsWith(".json") && !name.endsWith(".template.json"))
    .some((name) => {
      try {
        const record = JSON.parse(readFileSync(path.join(archetypeDir, name), "utf8"));
        return record.archetypeId === archetypeId;
      } catch {
        return false;
      }
    });
}

function classifyCommand(command, root = process.cwd()) {
  const lowerCommand = command.toLowerCase();
  const isWebsite = /\b(web\s*site|website|site)\b/.test(lowerCommand);
  const isConstruction = /\bconstruction\b/.test(lowerCommand);
  const mentionsDeployment = /\bdeploy|deployment|publish|go live\b/.test(lowerCommand);
  const mentionsDomain = /\bdomain|dns\b/.test(lowerCommand);
  const mentionsPaid = /\bpaid|buy|purchase|subscribe|billing\b/.test(lowerCommand);
  const mentionsCredentials = /\bcredential|secret|api key|password|token\b/.test(lowerCommand);

  const matched = PRODUCT_TYPE_MATCHERS.find((matcher) => matcher.pattern.test(lowerCommand));
  const targetSlug = matched ? matched.slug : deriveCommandSlug(command);
  const productType = matched ? matched.productType : "unclassified product";
  const archetypeRegistered = matched ? findRegisteredArchetype(matched.archetypeId, root) : false;
  const productContext = {
    productType,
    archetypeId: matched?.archetypeId ?? null,
    archetypeRegistered,
    archetypeGap: matched
      ? (archetypeRegistered ? null : `missing_registered_archetype:${matched.archetypeId}`)
      : "no_product_type_match"
  };

  const requiresApproval = mentionsDeployment || mentionsDomain || mentionsPaid || mentionsCredentials;
  const productLabel = matched ? productType : targetSlug.replace(/-/g, " ");

  return {
    targetSlug,
    productContext,
    projectId: isConstruction && isWebsite ? DEFAULT_PROJECT_ID : `project-unregistered-${targetSlug}`,
    normalizedCommand: isConstruction && isWebsite
      ? "Create a plan-only construction website build plan."
      : `Create a plan-only ${productLabel} plan.`,
    plannedOutput: isConstruction && isWebsite
      ? "Plan-only command intake record for a construction website."
      : `Plan-only command intake record for ${productLabel}.`,
    riskLevel: requiresApproval ? "R3" : "R1",
    classification: {
      requiresPlan: true,
      requiresApproval,
      requiresLiveService: false,
      requiresDeployment: mentionsDeployment,
      requiresDomainChange: mentionsDomain,
      requiresPaidAction: mentionsPaid,
      requiresProductionData: false
    }
  };
}

const UNDERSTANDING_REQUIRED_FIELDS = [
  "producedBy",
  "inferredBusinessObjective",
  "productArchetype",
  "targetUser",
  "successCriteria",
  "criticalUnknowns",
  "confidence",
  "assumptions",
  "ownerConstraints"
];

// Phase B gate: deterministic shape check for a worker-authored understanding
// block. Content quality is the worker's job; shape and limits are enforced here.
export function assertUnderstandingShape(understanding) {
  for (const field of UNDERSTANDING_REQUIRED_FIELDS) {
    if (!Object.hasOwn(understanding, field)) {
      throw new Error(`understanding block missing required field: ${field}`);
    }
  }

  if (!Array.isArray(understanding.criticalUnknowns) || understanding.criticalUnknowns.length > 3) {
    throw new Error("understanding.criticalUnknowns must be an array with at most 3 entries");
  }

  if (!["low", "medium", "high"].includes(understanding.confidence)) {
    throw new Error("understanding.confidence must be low, medium, or high");
  }

  if (!Array.isArray(understanding.successCriteria) || understanding.successCriteria.length === 0) {
    throw new Error("understanding.successCriteria must be a non-empty array");
  }
}

export function buildCommandIntakeRecord({ command, runId, understanding, now = new Date(), root = process.cwd() }) {
  if (!command || typeof command !== "string" || command.trim().length === 0) {
    throw new Error("command is required");
  }

  if (understanding) {
    assertUnderstandingShape(understanding);
  }

  const normalizedRunId = normalizeRunId(runId || command);
  const timestamp = isoTimestamp(now);
  const classification = classifyCommand(command.trim(), root);

  return {
    ...(understanding ? { understanding } : {}),
    commandIntakeId: `command-intake-${normalizedRunId}`,
    status: "classified",
    rawCommand: command.trim(),
    normalizedCommand: classification.normalizedCommand,
    commandCategory: "plan_only",
    projectId: classification.projectId,
    riskLevel: classification.riskLevel,
    classification: classification.classification,
    productContext: classification.productContext,
    plannedOutput: classification.plannedOutput,
    nextRecord: {
      jobId: `job-${normalizedRunId}`,
      planId: `plan-${normalizedRunId}`
    },
    safety: {
      executesCommand: false,
      createsLiveSideEffect: false,
      usesCredentials: false,
      callsConnector: false
    },
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

export function writeCommandIntakeRecord({ command, runId, understanding, now, root = process.cwd() }) {
  const record = buildCommandIntakeRecord({ command, runId, understanding, now, root });
  const filePath = `.codex/commands/${record.commandIntakeId}.json`;
  writeJson(filePath, record, root);
  return { filePath, record };
}
