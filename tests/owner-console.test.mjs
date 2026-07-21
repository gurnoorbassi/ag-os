import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("the unified owner console is the only dashboard entry and reads the live runtime contract", () => {
  const redirect = readFileSync("dashboard/index.html", "utf8");
  const html = readFileSync("dashboard/os.html", "utf8");
  const script = readFileSync("dashboard/os.js", "utf8");
  const server = readFileSync("scripts/live-server.mjs", "utf8");

  assert.match(redirect, /url=os\.html#console/);
  for (const view of ["console", "ops", "keep", "dash"]) {
    assert.match(html, new RegExp(`data-view="${view}"`));
  }
  assert.doesNotMatch(html, /href="index\.html"/);
  assert.match(html, /id="os-input"/);
  assert.match(script, /result\.commandIntakeId/);
  assert.match(script, /result\.planId/);
  assert.match(script, /result\.jobId/);
  assert.match(script, /result\.status/);
  assert.match(script, /\/api\/v1\/auth\/login/);
  assert.match(script, /\/api\/v1\/projects\/\$\{encodeURIComponent\(projectId\)\}/);
  assert.match(script, /\/api\/v1\/jobs\/\$\{encodeURIComponent\(jobId\)\}\/deliverable/);
  assert.match(script, /\/api\/v1\/jobs\/\$\{encodeURIComponent\(jobId\)\}\/preview\//);
  assert.match(server, /requestPath === "\/" \? "os\.html"/);
  assert.match(server, /preview_not_available/);
  assert.match(server, /sandbox allow-scripts/);
  assert.doesNotMatch(script, /demoActive\s*=\s*true/);
});
