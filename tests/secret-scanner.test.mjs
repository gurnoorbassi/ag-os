import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { scanSecrets } from "../scripts/lib/security/secret-scanner.mjs";

function withWorkspace(fn) {
  const root = mkdtempSync(path.join(os.tmpdir(), "ag-os-secret-scan-"));
  try {
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function write(root, relativePath, content) {
  const targetPath = path.join(root, relativePath);
  mkdirSync(path.dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, content, "utf8");
}

test("passes clean policy and placeholder files", () => withWorkspace((root) => {
  write(root, "docs/policy.md", "Use REQUIRED_API_KEY as a placeholder only.\n");
  write(root, ".codex/credentials/README.md", "No secret values are stored here.\n");

  const result = scanSecrets({ root });

  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
}));

test("flags GitHub and OpenAI-style tokens", () => withWorkspace((root) => {
  const githubToken = `ghp_${"1234567890abcdefghijklmnopqrst"}`;
  const openAiKey = `sk-${"proj"}-${"1234567890abcdefghijklmnopqrst"}`;
  write(root, "notes.txt", `github token: ${githubToken}\nOpenAI key: ${openAiKey}\n`);

  const result = scanSecrets({ root });

  assert.equal(result.ok, false);
  assert.equal(result.findings.some((finding) => finding.ruleId === "github_token"), true);
  assert.equal(result.findings.some((finding) => finding.ruleId === "openai_api_key"), true);
}));

test("flags Meta, AWS, Slack, Google, and JWT token families", () => withWorkspace((root) => {
  const metaToken = `EAA${"A1b2C3d4E5f6G7h8I9j0K1"}`;
  const awsKey = `AKIA${"ABCDEFGHIJKLMNOP"}`;
  const slackToken = `xoxb-${"1234567890"}-${"abcdefghijklmnopqrst"}`;
  const googleKey = `AIza${"1234567890abcdefghijklmnopqrstuvwxy"}`;
  const jwt = [
    `eyJ${"hbGciOiJIUzI1NiJ9"}`,
    "eyJzdWIiOiIxMjM0NTY3ODkwIn0",
    "SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
  ].join(".");
  write(root, "provider-secrets.txt", [metaToken, awsKey, slackToken, googleKey, jwt].join("\n"));

  const result = scanSecrets({ root });
  const ruleIds = new Set(result.findings.map((finding) => finding.ruleId));

  assert.equal(result.ok, false);
  for (const ruleId of ["meta_access_token", "aws_access_key_id", "slack_token", "google_api_key", "json_web_token"]) {
    assert.equal(ruleIds.has(ruleId), true, `missing ${ruleId}`);
  }
}));

test("reports every same-family secret on one line", () => withWorkspace((root) => {
  const first = `ghp_${"1234567890abcdefghijklmnopqrst"}`;
  const second = `ghp_${"zyxwvutsrqponmlkjihgfedcba098765"}`;
  write(root, "two.txt", `${first} ${second}\n`);

  const result = scanSecrets({ root });

  assert.equal(result.findings.filter((finding) => finding.ruleId === "github_token").length, 2);
}));

test("flags private keys and env secret assignments", () => withWorkspace((root) => {
  const privateKeyHeader = `-----BEGIN ${"OPENSSH"} PRIVATE KEY-----`;
  const privateKeyFooter = `-----END ${"OPENSSH"} PRIVATE KEY-----`;
  const envKeyName = `N8N_${"API"}_KEY`;
  write(root, "private.pem", `${privateKeyHeader}\nsecret\n${privateKeyFooter}\n`);
  write(root, ".env", `${envKeyName}=abc1234567890abcdef\n`);

  const result = scanSecrets({ root });

  assert.equal(result.ok, false);
  assert.equal(result.findings.some((finding) => finding.ruleId === "private_key"), true);
  assert.equal(result.findings.some((finding) => finding.ruleId === "env_secret_assignment"), true);
}));

test("ignores dependency and git directories", () => withWorkspace((root) => {
  const githubToken = `ghp_${"1234567890abcdefghijklmnopqrst"}`;
  write(root, "node_modules/pkg/file.js", `const token = '${githubToken}';\n`);
  write(root, ".git/config", `token = ${githubToken}\n`);

  const result = scanSecrets({ root });

  assert.equal(result.ok, true);
}));

test("reports file path, line, and redacted match only", () => withWorkspace((root) => {
  write(root, "unsafe.md", `${"password"} = hunter2\n`);

  const result = scanSecrets({ root });

  assert.equal(result.ok, false);
  assert.equal(result.findings[0].filePath, "unsafe.md");
  assert.equal(result.findings[0].line, 1);
  assert.equal(result.findings[0].match.includes("hunter2"), false);
}));
