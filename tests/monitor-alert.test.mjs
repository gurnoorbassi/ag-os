import assert from "node:assert/strict";
import test from "node:test";
import { monitorAlertEvent, sendMonitorAlert } from "../ops/lib/monitor-alert.mjs";

test("monitor alerts once at the failure threshold and once on recovery", () => {
  assert.equal(monitorAlertEvent({ current: { status: "fail", consecutiveFailures: 2 }, previous: {}, threshold: 3 }), null);
  assert.equal(monitorAlertEvent({ current: { status: "fail", consecutiveFailures: 3 }, previous: {}, threshold: 3 }), "failure_threshold_reached");
  assert.equal(monitorAlertEvent({ current: { status: "fail", consecutiveFailures: 4 }, previous: {}, threshold: 3 }), null);
  assert.equal(monitorAlertEvent({ current: { status: "pass", consecutiveFailures: 0 }, previous: { consecutiveFailures: 3 }, threshold: 3 }), "service_recovered");
});

test("monitor webhook sends only bounded non-secret health evidence", async () => {
  let request;
  const result = await sendMonitorAlert({
    webhookUrl: "https://alerts.example.test/ag-os",
    token: "private-token",
    event: "failure_threshold_reached",
    record: { service: "ag-os-coordinator", status: "fail", checkedAt: "2026-07-16T00:00:00.000Z", consecutiveFailures: 3, lastSuccessAt: null, error: "timeout" },
    fetchImpl: async (url, options) => { request = { url: String(url), options }; return { ok: true, status: 204 }; }
  });
  assert.equal(result.sent, true);
  assert.equal(request.options.headers.authorization, "Bearer private-token");
  assert.deepEqual(JSON.parse(request.options.body), {
    event: "failure_threshold_reached",
    service: "ag-os-coordinator",
    status: "fail",
    checkedAt: "2026-07-16T00:00:00.000Z",
    consecutiveFailures: 3,
    lastSuccessAt: null,
    error: "timeout"
  });
});

test("monitor alerting is disabled without a webhook and rejects plaintext destinations", async () => {
  assert.deepEqual(await sendMonitorAlert({ event: "service_recovered", record: {}, webhookUrl: "" }), { attempted: false, sent: false, event: "service_recovered" });
  await assert.rejects(() => sendMonitorAlert({ event: "service_recovered", record: {}, webhookUrl: "http://alerts.example.test" }), /HTTPS/);
});
