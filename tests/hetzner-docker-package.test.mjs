import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dockerfile = readFileSync(path.join(root, "Dockerfile"), "utf8");
const compose = readFileSync(path.join(root, "ops/docker-compose.hetzner.yml"), "utf8");
const packageJson = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
const gitignore = readFileSync(path.join(root, ".gitignore"), "utf8");

test("pins the approved amd64 Node 20 image and runs as non-root", () => {
  assert.match(dockerfile, /^FROM node:20-alpine@sha256:[a-f0-9]{64}$/m);
  assert.match(dockerfile, /^USER node$/m);
  assert.match(dockerfile, /AG_OS_HOST=0\.0\.0\.0/);
  assert.match(dockerfile, /^CMD \["npm", "run", "live:start"\]$/m);
  assert.match(packageJson.scripts["live:start"], /^node scripts\/build-dashboard\.mjs && node scripts\/live-server\.mjs$/);
  assert.doesNotMatch(dockerfile, /curl\s+.*\|\s*(?:sh|bash)/);
});

test("generates dashboard data at startup without committing the build artifact", () => {
  assert.match(gitignore, /^dashboard\/dashboard-data\.js$/m);
  const tracked = execFileSync("git", ["ls-files", "dashboard/dashboard-data.js"], { cwd: root, encoding: "utf8" }).trim();
  assert.equal(tracked, "");
});

test("keeps the Hetzner coordinator public-port-free with an isolated runner bridge", () => {
  assert.match(compose, /"127\.0\.0\.1:8787:8787"/);
  assert.match(compose, /name: ag-os-private-runner/);
  assert.match(compose, /subnet: 172\.30\.79\.0\/24/);
  assert.match(compose, /gateway: 172\.30\.79\.1/);
  assert.doesNotMatch(compose, /8790:8790/);
  assert.doesNotMatch(compose, /infra_default|ai-lead-command-center|N8N_/);
  assert.match(compose, /no-new-privileges:true/);
  assert.match(compose, /cap_drop:\s*\n\s*- ALL/);
  assert.match(compose, /\/var\/lib\/ag-os\/state:\/app\/\.codex/);
  assert.match(compose, /\/etc\/ag-os\/ag-os\.env/);
});
