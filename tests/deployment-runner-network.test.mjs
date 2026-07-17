import assert from "node:assert/strict";
import test from "node:test";
import { DEPLOYMENT_RUNNER_PRIVATE_BRIDGE_HOST, validateDeploymentRunnerHost } from "../ops/deployment-runner.mjs";

test("runner binds only to loopback or the dedicated private bridge", () => {
  assert.equal(validateDeploymentRunnerHost("127.0.0.1"), "127.0.0.1");
  assert.equal(validateDeploymentRunnerHost(DEPLOYMENT_RUNNER_PRIVATE_BRIDGE_HOST), "172.30.79.1");
  assert.throws(() => validateDeploymentRunnerHost("0.0.0.0"), /loopback or the dedicated AG OS private bridge/);
  assert.throws(() => validateDeploymentRunnerHost("172.30.79.2"), /loopback or the dedicated AG OS private bridge/);
});
