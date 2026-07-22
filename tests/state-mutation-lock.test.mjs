import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { withStateMutationLock } from "../scripts/lib/runtime/state-mutation-lock.mjs";

test("serializes cross-process-style state mutations and releases after completion", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "ag-os-lock-"));
  let release;
  const first = withStateMutationLock({ root, operation: "first" }, async () => {
    await new Promise((resolve) => { release = resolve; });
    return "first-complete";
  });
  await new Promise((resolve) => setTimeout(resolve, 25));
  const second = await withStateMutationLock({ root, operation: "second", waitMs: 20, pollMs: 5 }, async () => "should-not-run");
  assert.equal(second.acquired, false);
  release();
  assert.equal((await first).result, "first-complete");
  const third = await withStateMutationLock({ root, operation: "third" }, async () => "third-complete");
  assert.equal(third.result, "third-complete");
});
