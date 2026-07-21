import assert from "node:assert/strict";
import test from "node:test";
import { createRuntimeEvent, publishRuntimeEvent, serializeRuntimeEvent, subscribeRuntimeEvents } from "../scripts/lib/runtime/runtime-event-stream.mjs";

test("runtime event emitter publishes bounded state transitions to subscribers", () => {
  const received = [];
  const unsubscribe = subscribeRuntimeEvents((event) => received.push(event));
  const event = publishRuntimeEvent({
    type: "job_state_transition",
    jobId: "job-runtime-test",
    projectId: "project-one-off",
    previousStatus: "queued",
    status: "running",
    summary: "Worker started.",
    now: new Date("2026-07-20T12:00:00.000Z")
  });
  unsubscribe();
  assert.equal(received.length, 1);
  assert.deepEqual(received[0], event);
  assert.equal(event.status, "running");
  assert.match(serializeRuntimeEvent(event), /event: job_state_transition/);
  assert.match(serializeRuntimeEvent(event), /"previousStatus":"queued"/);
});

test("runtime events reject invalid types and timestamps", () => {
  assert.throws(() => createRuntimeEvent({ type: "Job Transition" }), /type is invalid/);
  assert.throws(() => createRuntimeEvent({ type: "automation_tick", now: "never" }), /timestamp is invalid/);
});
