import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { recordExternalEvidence, validateExternalEvidence } from "../scripts/lib/runtime/external-evidence-service.mjs";

const evidence = {
  evidenceType: "quote_lead_pipeline",
  eventId: "foreman-quote:quote-1:ready",
  n8nExecutionId: "synthetic-execution-1",
  quoteId: "quote-1",
  leadId: "quote-builder:quote-1",
  created: true,
  status: "verified",
  occurredAt: "2026-07-21T20:00:00.000Z",
  synthetic: true
};

test("writes a non-secret, idempotent quote pipeline audit receipt", () => {
  const root = mkdtempSync(path.join(tmpdir(), "ag-os-evidence-"));
  const first = recordExternalEvidence(evidence, { root, now: new Date("2026-07-21T20:01:00.000Z") });
  const second = recordExternalEvidence(evidence, { root, now: new Date("2026-07-21T20:01:00.000Z") });
  assert.equal(first.recordPath, second.recordPath);
  const record = JSON.parse(readFileSync(path.join(root, first.recordPath), "utf8"));
  assert.equal(record.eventType, "external_pipeline_verified");
  assert.match(record.notes, /No customer contact data/);
  assert.doesNotMatch(JSON.stringify(record), /synthetic@example/);
});

test("rejects unexpected fields that could leak customer data", () => {
  assert.throws(() => validateExternalEvidence({ ...evidence, customerEmail: "synthetic@example.test" }), /unsupported fields/);
});
