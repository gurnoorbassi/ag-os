import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("owner console is discoverable and reads the live command response contract", () => {
  const dashboard = readFileSync("dashboard/index.html", "utf8");
  const html = readFileSync("dashboard/os.html", "utf8");
  const script = readFileSync("dashboard/os.js", "utf8");

  assert.match(dashboard, /href="os\.html"/);
  assert.match(html, /aria-label="Owner command"/);
  assert.match(script, /result\.commandIntakeId/);
  assert.match(script, /result\.planId/);
  assert.match(script, /result\.jobId/);
  assert.match(script, /result\.status/);
  assert.doesNotMatch(script, /demoActive\s*=\s*true/);
  assert.match(script, /offline — live data unavailable/);
});
