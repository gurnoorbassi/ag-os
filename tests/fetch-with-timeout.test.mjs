import assert from "node:assert/strict";
import test from "node:test";
import { fetchWithTimeout } from "../scripts/lib/runtime/fetch-with-timeout.mjs";

test("external requests fail closed when the provider does not respond", async () => {
  await assert.rejects(
    fetchWithTimeout((_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => reject(options.signal.reason), { once: true });
    }), "https://provider.invalid", {}, 100),
    /timed out after 100ms/
  );
});

test("external requests preserve successful responses before the timeout", async () => {
  const response = await fetchWithTimeout(async (_url, options) => ({ ok: true, signalAborted: options.signal.aborted }), "https://provider.invalid", {}, 100);
  assert.equal(response.ok, true);
  assert.equal(response.signalAborted, false);
});
