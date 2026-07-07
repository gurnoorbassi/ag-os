import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

export const DEFAULT_OWNER_ID = "owner-gurnoor-bassi";
export const DEFAULT_PROJECT_ID = "project-unregistered-construction-website";

export function slugify(value) {
  const slug = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return slug || "unspecified";
}

export function normalizeRunId(value, fallback = "runtime") {
  const slug = slugify(value || fallback);
  return slug.startsWith("runtime-") ? slug : `runtime-${slug}`;
}

export function isoTimestamp(now = new Date()) {
  if (now instanceof Date) {
    return now.toISOString();
  }

  return new Date(now).toISOString();
}

export function resolveWorkspacePath(relativePath, root = process.cwd()) {
  return path.join(root, relativePath);
}

export function readJson(relativePath, root = process.cwd()) {
  return JSON.parse(readFileSync(resolveWorkspacePath(relativePath, root), "utf8"));
}

export function listDirectJson(relativeDir, options = {}) {
  const root = options.root ?? process.cwd();
  const absoluteDir = path.join(root, relativeDir);
  if (!existsSync(absoluteDir)) {
    return [];
  }

  const excluded = new Set(options.exclude ?? []);
  return readdirSync(absoluteDir)
    .filter((name) => name.endsWith(".json"))
    .filter((name) => !name.endsWith(".template.json"))
    .filter((name) => !excluded.has(name))
    .map((name) => path.join(relativeDir, name).replaceAll("\\", "/"));
}

export function writeJson(relativePath, record, root = process.cwd()) {
  const targetPath = resolveWorkspacePath(relativePath, root);
  mkdirSync(path.dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  return targetPath;
}
