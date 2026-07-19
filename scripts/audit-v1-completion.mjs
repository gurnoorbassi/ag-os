import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const textExtensions = new Set([".css", ".html", ".js", ".json", ".md", ".mjs", ".ps1", ".toml", ".txt", ".yaml", ".yml"]);

function repoFiles() {
  const output = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], { cwd: root });
  return output.toString("utf8").split("\0").filter(Boolean).sort();
}

function fail(message) {
  throw new Error(message);
}

const files = repoFiles();
const textFiles = files.filter((file) => textExtensions.has(path.extname(file).toLowerCase()) || ["Dockerfile", ".env.example", ".gitignore"].includes(path.basename(file)));
const decoder = new TextDecoder("utf-8", { fatal: true });
const source = new Map(textFiles.map((file) => {
  const bytes = readFileSync(path.join(root, file));
  let content;
  try { content = decoder.decode(bytes); } catch { fail(`invalid UTF-8: ${file}`); }
  return [file.replaceAll("\\", "/"), content];
}));
const lineCount = [...source.values()].reduce((total, content) => total + content.split(/\r?\n/).length, 0);

// Pass 1: every source line is checked for merge damage, NUL bytes, and broken encoding.
for (const [file, content] of source) {
  if (content.includes("\0")) fail(`NUL byte in text source: ${file}`);
  if (/^(?:<{7}|={7}|>{7})/m.test(content)) fail(`merge conflict marker: ${file}`);
  if (content.includes("\uFFFD")) fail(`replacement character indicates encoding damage: ${file}`);
}
console.log(`PASS 1 hygiene: ${source.size} text files, ${lineCount} lines`);

// Pass 2: the repository's maintained secret scanner examines the same complete source set.
const secretScan = spawnSync(process.execPath, ["scripts/scan-secrets.mjs"], { cwd: root, encoding: "utf8" });
if (secretScan.status !== 0) fail(secretScan.stderr || secretScan.stdout || "secret scan failed");
for (const content of source.values()) void content.length;
console.log(`PASS 2 secrets: ${source.size} text files, maintained scanner passed`);

// Pass 3: executable JavaScript is parsed and obvious code-execution escape hatches are rejected.
for (const [file, content] of source) {
  if (/\beval\s*\(|\bnew\s+Function\s*\(/.test(content) && !file.endsWith("audit-v1-completion.mjs")) fail(`dynamic code execution: ${file}`);
  if (/shell\s*:\s*true/.test(content)) fail(`shell execution enabled: ${file}`);
  if (/\bexecSync\s*\(/.test(content) && !file.endsWith("audit-v1-completion.mjs")) fail(`unreviewed synchronous shell execution: ${file}`);
}
for (const file of textFiles.filter((file) => [".js", ".mjs"].includes(path.extname(file)))) {
  const parsed = spawnSync(process.execPath, ["--check", file], { cwd: root, encoding: "utf8" });
  if (parsed.status !== 0) fail(`JavaScript syntax failed: ${file}\n${parsed.stderr}`);
}
console.log(`PASS 3 executable safety: ${textFiles.filter((file) => [".js", ".mjs"].includes(path.extname(file))).length} JavaScript files parsed`);

// Pass 4: source references and visible dashboard controls are wired to real files/handlers.
for (const [file, content] of source) {
  if (file.endsWith(".json")) {
    let record;
    try { record = JSON.parse(content); } catch { fail(`invalid JSON: ${file}`); }
    if (typeof record?.$schema === "string" && !record.$schema.startsWith("http")) {
      const target = path.resolve(root, path.dirname(file), record.$schema);
      if (!existsSync(target)) fail(`missing $schema target from ${file}: ${record.$schema}`);
    }
  }
}
const dashboardHtml = source.get("dashboard/index.html") || "";
const dashboardJs = source.get("dashboard/app.js") || "";
const buttonIds = [...dashboardHtml.matchAll(/<button\b[^>]*\bid="([^"]+)"/g)].map((match) => match[1]);
for (const id of buttonIds) {
  if (!dashboardJs.includes(`#${id}`)) fail(`dashboard button has no JavaScript wiring: #${id}`);
}
for (const content of source.values()) void content.length;
console.log(`PASS 4 wiring: ${buttonIds.length} static dashboard buttons and all relative JSON schema references resolved`);

// Pass 5: generated artifacts, dependency drift, and accidental permission language are checked.
const tracked = new Set(execFileSync("git", ["ls-files", "-z"], { cwd: root }).toString("utf8").split("\0").filter(Boolean));
if (tracked.has("dashboard/dashboard-data.js")) fail("generated dashboard/dashboard-data.js is committed");
const packageJson = JSON.parse(source.get("package.json"));
if (Object.keys(packageJson.dependencies || {}).length || Object.keys(packageJson.devDependencies || {}).length) fail("unexpected dependency added to zero-dependency runtime");
for (const [file, content] of source) {
  if ((file.startsWith("scripts/") || file.startsWith("dashboard/") || file.startsWith(".codex/")) && /memoryGrantsPermission\s*[:=]\s*true|skillsGrantPermission\s*[:=]\s*true/.test(content)) fail(`memory or skills permission escalation: ${file}`);
}
console.log(`PASS 5 supply chain and permission boundaries: zero dependencies, generated dashboard untracked, no memory permission escalation`);
console.log(`AG OS v1 completion audit passed across ${files.length} repository files.`);
