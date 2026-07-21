import assert from "node:assert/strict";
import test from "node:test";
import { budgetView, jobGlyph, jobTone } from "../dashboard/ops-model.mjs";

test("Ops budget percent is derived from the fixture payload without invented progress", () => {
  const result = budgetView({ anthropicBudget: { monthlyActualUsd: 12.5, dailyCallCount: 3, dailyCallLimit: 20, limits: { monthlyMaxUsd: 50, perTaskMaxUsd: 5 }, breakerArmed: true } });
  assert.equal(result.percent, 25);
  assert.equal(result.callsToday, 3);
  assert.equal(result.dailyCallLimit, 20);
  assert.equal(result.breakerArmed, true);
});

test("Ops job glyphs communicate actual lifecycle states", () => {
  assert.equal(jobGlyph("done"), "●");
  assert.equal(jobGlyph("running"), "◐");
  assert.equal(jobGlyph("waiting_approval"), "▲");
  assert.equal(jobGlyph("failed"), "■");
  assert.equal(jobTone("queued"), "idle");
});
