import assert from "node:assert/strict";
import test from "node:test";
import { evaluateProductionReadiness } from "../scripts/lib/runtime/production-readiness-processor.mjs";

const checkIds = [
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

function readyRecord() {
  return {
    readinessId: "production-readiness-test",
    status: "ready",
    activationAllowed: true,
    requiredChecks: checkIds.map((checkId) => ({ checkId, status: "pass", evidence: ["evidence"] })),
    recoveryTargets: { rtoMinutes: 60, rpoMinutes: 0 },
    incidentCommander: "owner-gurnoor-bassi",
    emergencyStop: "Stop and revoke.",
    safety: {
      credentialsInRepoAllowed: false,
      customerDataAllowed: false,
      productionDataAllowed: false,
      domainChangeAllowed: false,
      paidActionAllowed: false,
      postingAllowed: false
    }
  };
}

test("allows readiness only when every safeguard and explicit activation flag pass", () => {
  const result = evaluateProductionReadiness(readyRecord());
  assert.equal(result.status, "ready");
  assert.equal(result.activationAllowed, true);
  assert.equal(result.blockers.length, 0);
  assert.equal(result.permissionGrantedByReadiness, false);
});

test("fails closed when one required safeguard is blocked", () => {
  const record = readyRecord();
  record.requiredChecks.find((check) => check.checkId === "rollback_restore_drill").status = "blocked";
  const result = evaluateProductionReadiness(record);
  assert.equal(result.status, "blocked");
  assert.equal(result.activationAllowed, false);
  assert.equal(result.blockers.includes("rollback_restore_drill"), true);
  assert.equal(result.blockers.includes("activation_flag_conflicts_with_evidence"), true);
});

test("fails closed when any safety default is relaxed", () => {
  const record = readyRecord();
  record.safety.postingAllowed = true;
  const result = evaluateProductionReadiness(record);
  assert.equal(result.activationAllowed, false);
  assert.equal(result.blockers.includes("safety_defaults_not_locked"), true);
});

test("treats archived legacy readiness as inactive history instead of an active blocker", () => {
  const record = readyRecord();
  record.status = "archived";
  record.activationAllowed = false;
  record.requiredChecks[0].status = "blocked";
  const result = evaluateProductionReadiness(record);
  assert.equal(result.status, "archived");
  assert.equal(result.activationAllowed, false);
  assert.deepEqual(result.blockers, []);
  assert.equal(result.permissionGrantedByReadiness, false);
});
