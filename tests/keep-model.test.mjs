import assert from "node:assert/strict";
import test from "node:test";
import { budgetPercent, gateControlsForJob, packetStage, waitingApprovalJobs } from "../dashboard/keep-model.mjs";

test("Keep packet lifecycle follows real job state transitions", () => {
  const sequence = ["queued", "running", "waiting_approval", "running", "done"];
  assert.deepEqual(sequence.map(packetStage), ["planning", "forge", "gate", "forge", "archive"]);
  assert.equal(packetStage("failed"), "blocked");
});

test("Keep budget and gate models use fixture payload values", () => {
  assert.equal(budgetPercent(12.5, 50), 25);
  assert.equal(budgetPercent(80, 50), 100);
  assert.deepEqual(waitingApprovalJobs([{ jobId: "a", status: "queued" }, { jobId: "b", status: "waiting_approval" }]).map((job) => job.jobId), ["b"]);
  assert.deepEqual(gateControlsForJob({ status: "waiting_approval" }), ["approve", "reject"]);
  assert.deepEqual(gateControlsForJob({ status: "running" }), []);
});
