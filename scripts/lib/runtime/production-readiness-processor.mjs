import process from "node:process";
import { readJson } from "./common.mjs";

const REQUIRED_CHECK_IDS = [
  "staging_proven",
  "owner_product_acceptance",
  "source_backup_verified",
  "rollback_restore_drill",
  "monitoring_active",
  "incident_response_ready",
  "credential_rotation_revocation_ready",
  "cost_review_passed",
  "validation_security_ci_passed",
  "exact_production_approval_active",
  "post_activation_validation_plan"
];

export function evaluateProductionReadiness(record) {
  const checkMap = new Map((record?.requiredChecks ?? []).map((check) => [check.checkId, check]));
  const blockers = [];
  for (const checkId of REQUIRED_CHECK_IDS) {
    const check = checkMap.get(checkId);
    if (!check || check.status !== "pass" || !Array.isArray(check.evidence) || check.evidence.length === 0) {
      blockers.push(checkId);
    }
  }

  const safetyLocked = record?.safety && Object.values(record.safety).every((value) => value === false);
  if (!safetyLocked) {
    blockers.push("safety_defaults_not_locked");
  }
  if (!record?.recoveryTargets?.rtoMinutes || record?.recoveryTargets?.rpoMinutes === undefined) {
    blockers.push("recovery_targets_missing");
  }
  if (!record?.incidentCommander || !record?.emergencyStop) {
    blockers.push("incident_command_missing");
  }

  const evidenceReady = blockers.length === 0;
  const allowed = record?.status === "ready" && record?.activationAllowed === true && evidenceReady;
  if (record?.activationAllowed === true && !allowed) {
    blockers.push("activation_flag_conflicts_with_evidence");
  }

  return {
    readinessId: record?.readinessId ?? null,
    status: allowed ? "ready" : "blocked",
    activationAllowed: allowed,
    blockers: [...new Set(blockers)],
    passedCheckCount: REQUIRED_CHECK_IDS.length - blockers.filter((item) => REQUIRED_CHECK_IDS.includes(item)).length,
    requiredCheckCount: REQUIRED_CHECK_IDS.length,
    liveActionPerformed: false,
    permissionGrantedByReadiness: false
  };
}

export function evaluateProductionReadinessFile({ recordPath, root = process.cwd() }) {
  return evaluateProductionReadiness(readJson(recordPath, root));
}
