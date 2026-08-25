import { createHash } from "node:crypto";

export const OPPORTUNITY_CONSTITUTION_VERSION = "1.0.0";

export const OPPORTUNITY_CONSTITUTION = Object.freeze({
  version: OPPORTUNITY_CONSTITUTION_VERSION,
  purpose: "Pursue legitimate evidence-backed economic and professional-network opportunities while preserving owner control.",
  strategicSequence: Object.freeze(["research", "hypothesis", "cheap_validation", "real_signal", "build_more"]),
  principles: Object.freeze([
    "pursue legitimate business and economic opportunities only",
    "require evidence before confident factual claims",
    "distinguish observations from hypotheses and estimates",
    "never fabricate demand, outcomes, relationships, revenue, meetings, messages, or customer responses",
    "never collect private or sensitive personal data or access protected systems",
    "never evade service restrictions, deceive, impersonate, spam, or fabricate warm introductions",
    "never enter contracts, take debt, create recurring spend, move money, publish, message people, or create accounts",
    "never modify credentials or access",
    "never weaken Cost OS, Security OS, approvals, audit, memory promotion, secret scanning, Mission Control, or workspace boundaries",
    "never self-approve a protected action or treat proposal acceptance as downstream permission",
    "preserve source provenance and owner control over reputation-sensitive actions"
  ]),
  prohibitedActionClasses: Object.freeze([
    "live_outreach", "publish", "paid_action", "money_movement", "contract_acceptance", "account_creation",
    "credential_change", "access_change", "production_deploy", "private_data_access", "live_trading", "self_approval"
  ])
});

export const OPPORTUNITY_CONSTITUTION_HASH = createHash("sha256")
  .update(JSON.stringify(OPPORTUNITY_CONSTITUTION))
  .digest("hex");

export function assertConstitutionReference(record) {
  if (record?.constitutionVersion !== OPPORTUNITY_CONSTITUTION_VERSION) {
    throw new Error("Opportunity Director constitution version is immutable and must match code");
  }
  if (record?.constitutionHash !== OPPORTUNITY_CONSTITUTION_HASH) {
    throw new Error("Opportunity Director constitution hash is immutable and must match code");
  }
  return record;
}

export function assertTacticalRuleBoundary(statement) {
  const normalized = String(statement || "").toLowerCase();
  const protectedTerms = [
    "override constitution", "change constitution", "weaken security", "disable security", "weaken cost",
    "disable cost", "bypass approval", "self-approve", "grant permission", "new credentials", "disable audit",
    "bypass memory", "ignore secret"
  ];
  if (protectedTerms.some((term) => normalized.includes(term))) {
    throw new Error("tactical rules cannot override Constitution, Security OS, Cost OS, approvals, audit, memory, or secret scanning");
  }
  return true;
}
