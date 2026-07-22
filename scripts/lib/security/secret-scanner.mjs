import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const IGNORE_DIRS = new Set([".git", ".netlify", ".next", "node_modules", "dist", "build", "coverage", "out"]);
const SCANNED_EXTENSIONS = new Set([
  ".env",
  ".json",
  ".js",
  ".mjs",
  ".md",
  ".txt",
  ".yml",
  ".yaml",
  ".toml",
  ".pem",
  ".key"
]);

const SECRET_RULES = [
  {
    ruleId: "github_token",
    pattern: /github_pat_[A-Za-z0-9_]{20,}|ghp_[A-Za-z0-9_]{20,}/
  },
  {
    ruleId: "openai_api_key",
    pattern: /sk-(?:proj-)?[A-Za-z0-9_-]{20,}/
  },
  {
    ruleId: "meta_access_token",
    pattern: /\bEAA[A-Za-z0-9]{20,}\b/
  },
  {
    ruleId: "aws_access_key_id",
    pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/
  },
  {
    ruleId: "slack_token",
    pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/
  },
  {
    ruleId: "google_api_key",
    pattern: /\bAIza[0-9A-Za-z_-]{35}\b/
  },
  {
    ruleId: "json_web_token",
    pattern: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/
  },
  {
    ruleId: "netlify_credential_marker",
    pattern: new RegExp("netlify" + "[a-z0-9_-]*(?:" + "token|auth" + ")[a-z0-9_-]*\\s*[:=]\\s*[\"']?[A-Za-z0-9._-]{12,}", "i")
  },
  {
    ruleId: "n8n_credential_marker",
    pattern: new RegExp("n8n" + "[a-z0-9_-]*" + "api" + "[a-z0-9_-]*" + "key" + "\\s*[:=]\\s*[\"']?[A-Za-z0-9._-]{12,}", "i")
  },
  {
    ruleId: "private_key",
    pattern: /BEGIN (?:RSA |EC |OPENSSH |PRIVATE )?PRIVATE KEY/
  },
  {
    ruleId: "env_secret_assignment",
    pattern: /(?:API[_-]?KEY|ACCESS[_-]?TOKEN|REFRESH[_-]?TOKEN|SECRET|PASSWORD)\s*=\s*(?!REQUIRED_|not_provided|false|true|0\b)[^\s"']{8,}/i
  },
  {
    ruleId: "password_assignment",
    pattern: /password\s*[:=]\s*(?!REQUIRED_|not_provided|false|true|0\b)[^\s"']{6,}/i
  }
];

function shouldScanFile(filePath) {
  const baseName = path.basename(filePath);
  if (baseName === ".env" || baseName.startsWith(".env.")) {
    return true;
  }
  return SCANNED_EXTENSIONS.has(path.extname(baseName));
}

function redact(value) {
  const raw = String(value);
  if (raw.length <= 8) {
    return "[redacted]";
  }
  return `${raw.slice(0, 4)}...[redacted]`;
}

function scanFile({ root, relativePath }) {
  const absolutePath = path.join(root, relativePath);
  const content = readFileSync(absolutePath, "utf8");
  const findings = [];
  const lines = content.split(/\r?\n/);

  lines.forEach((lineText, index) => {
    for (const rule of SECRET_RULES) {
      const flags = rule.pattern.flags.includes("g") ? rule.pattern.flags : `${rule.pattern.flags}g`;
      for (const match of lineText.matchAll(new RegExp(rule.pattern.source, flags))) {
        findings.push({
          ruleId: rule.ruleId,
          filePath: relativePath.replaceAll("\\", "/"),
          line: index + 1,
          match: redact(match[0])
        });
      }
    }
  });

  return findings;
}

export function scanSecrets({ root = process.cwd(), relativePaths } = {}) {
  const findings = [];

  if (Array.isArray(relativePaths) && relativePaths.length > 0) {
    for (const relativePath of relativePaths) {
      const normalized = path.normalize(relativePath);
      const absolutePath = path.resolve(root, normalized);
      const relative = path.relative(root, absolutePath);
      if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error(`scan path escapes root: ${relativePath}`);
      if (!existsSync(absolutePath) || !statSync(absolutePath).isFile() || !shouldScanFile(normalized)) continue;
      findings.push(...scanFile({ root, relativePath: normalized }));
    }
    return { ok: findings.length === 0, findings };
  }

  function walk(relativeDir = ".") {
    const absoluteDir = path.join(root, relativeDir);
    if (!existsSync(absoluteDir)) {
      return;
    }

    for (const entry of readdirSync(absoluteDir)) {
      if (IGNORE_DIRS.has(entry)) {
        continue;
      }

      const relativePath = path.join(relativeDir, entry);
      const absolutePath = path.join(root, relativePath);
      const stats = statSync(absolutePath);

      if (stats.isDirectory()) {
        walk(relativePath);
        continue;
      }

      if (!shouldScanFile(relativePath)) {
        continue;
      }

      findings.push(...scanFile({ root, relativePath }));
    }
  }

  walk();

  return {
    ok: findings.length === 0,
    findings
  };
}
