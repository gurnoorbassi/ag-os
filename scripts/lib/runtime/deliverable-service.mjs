import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { readJson, slugify } from "./common.mjs";

const MAX_FILES = 50;
const MAX_TOTAL_BYTES = 2_000_000;
const TEXT_EXTENSIONS = new Set([".css", ".html", ".js", ".json", ".md", ".svg", ".txt", ".yaml", ".yml"]);

function safeJobId(jobId) {
  const value = String(jobId || "");
  if (!/^[A-Za-z0-9._-]{1,220}$/.test(value)) throw new Error("invalid jobId");
  return value;
}

function collectTextFiles(absoluteRoot) {
  const files = [];
  let totalBytes = 0;
  function walk(directory, prefix = "") {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      const relative = path.posix.join(prefix, entry.name);
      const stat = lstatSync(absolute);
      if (stat.isSymbolicLink()) throw new Error(`deliverable contains a prohibited symlink: ${relative}`);
      if (entry.isDirectory()) {
        walk(absolute, relative);
        continue;
      }
      if (!entry.isFile() || !TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;
      totalBytes += stat.size;
      if (totalBytes > MAX_TOTAL_BYTES) throw new Error(`deliverable exceeds ${MAX_TOTAL_BYTES} bytes`);
      if (files.length >= MAX_FILES) throw new Error(`deliverable exceeds ${MAX_FILES} files`);
      files.push({ path: relative, bytes: stat.size, content: readFileSync(absolute, "utf8") });
    }
  }
  walk(absoluteRoot);
  return files;
}

export function getJobDeliverable({ jobId, root = process.cwd(), includeContent = true } = {}) {
  const id = safeJobId(jobId);
  const job = readJson(`.codex/jobs/${id}.json`, root);
  const workspace = path.join(root, ".codex", "workspaces", slugify(job.projectId), slugify(id));
  const deliverables = path.join(workspace, "deliverables");
  if (existsSync(deliverables)) {
    const files = collectTextFiles(deliverables);
    const entryFile = files.some((file) => file.path === "index.html")
      ? "index.html"
      : files.find((file) => file.path.endsWith(".html"))?.path || files[0]?.path || null;
    return {
      jobId: id,
      projectId: job.projectId,
      kind: entryFile?.endsWith(".html") ? "website" : "files",
      ownerUsable: files.length > 0,
      previewAvailable: Boolean(entryFile?.endsWith(".html")),
      entryFile,
      fileCount: files.length,
      files: includeContent ? files : files.map(({ path: filePath, bytes }) => ({ path: filePath, bytes }))
    };
  }
  const evidencePath = path.join(workspace, "WORK_PRODUCT.md");
  if (existsSync(evidencePath)) {
    const stat = lstatSync(evidencePath);
    return {
      jobId: id,
      projectId: job.projectId,
      kind: "plan_evidence",
      ownerUsable: false,
      previewAvailable: false,
      entryFile: null,
      fileCount: 1,
      files: includeContent
        ? [{ path: "WORK_PRODUCT.md", bytes: stat.size, content: readFileSync(evidencePath, "utf8") }]
        : [{ path: "WORK_PRODUCT.md", bytes: stat.size }]
    };
  }
  const recorded = job.completionEvidence?.deliverable;
  if (recorded?.ownerUsable && Array.isArray(recorded.files)) {
    const safePrefixes = [".codex/connectors/", ".codex/deployments/"];
    const files = recorded.files.map((recordPath) => {
      const normalized = String(recordPath || "").replaceAll("\\", "/");
      if (!safePrefixes.some((prefix) => normalized.startsWith(prefix)) || normalized.split("/").includes("..")) {
        throw new Error("recorded deliverable path is outside the result evidence allowlist");
      }
      const absolute = path.join(root, normalized);
      const stat = lstatSync(absolute);
      return { path: normalized, bytes: stat.size, ...(includeContent ? { content: readFileSync(absolute, "utf8") } : {}) };
    });
    return { ...recorded, jobId: id, projectId: job.projectId, fileCount: files.length, files };
  }
  return {
    jobId: id,
    projectId: job.projectId,
    kind: "none",
    ownerUsable: false,
    previewAvailable: false,
    entryFile: null,
    fileCount: 0,
    files: []
  };
}

export function jobDeliverableSummary({ job, root = process.cwd() }) {
  try {
    return getJobDeliverable({ jobId: job.jobId, root, includeContent: false });
  } catch {
    return job.completionEvidence?.deliverable
      ? { ...job.completionEvidence.deliverable, fileCount: job.completionEvidence.deliverable.files?.length ?? 0 }
      : { kind: "none", ownerUsable: false, previewAvailable: false, entryFile: null, fileCount: 0 };
  }
}
