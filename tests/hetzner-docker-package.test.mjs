import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dockerfile = readFileSync(path.join(root, "Dockerfile"), "utf8");
const compose = readFileSync(path.join(root, "ops/docker-compose.hetzner.yml"), "utf8");

test("pins the approved amd64 Node 20 image and runs as non-root", () => {
  assert.match(dockerfile, /^FROM node:20-alpine@sha256:[a-f0-9]{64}$/m);
  assert.match(dockerfile, /^USER node$/m);
  assert.match(dockerfile, /AG_OS_HOST=0\.0\.0\.0/);
  assert.doesNotMatch(dockerfile, /curl\s+.*\|\s*(?:sh|bash)/);
});

test("keeps the first Hetzner activation loopback-only and isolated", () => {
  assert.match(compose, /"127\.0\.0\.1:8787:8787"/);
  assert.doesNotMatch(compose, /infra_default|ai-lead-command-center|N8N_/);
  assert.match(compose, /no-new-privileges:true/);
  assert.match(compose, /cap_drop:\s*\n\s*- ALL/);
  assert.match(compose, /\/var\/lib\/ag-os\/state:\/app\/\.codex/);
  assert.match(compose, /\/etc\/ag-os\/ag-os\.env/);
});
