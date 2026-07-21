const MAX_CONFIG_LINES = 200;
const MAX_HEADER_VALUE_LENGTH = 2_048;

function quotedString(value, label) {
  if (!/^"(?:[^"\\]|\\.)*"$/.test(value)) throw new Error(`Netlify ${label} must be a double-quoted string`);
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error(`Netlify ${label} must be a valid double-quoted string`);
  }
  if (typeof parsed !== "string") throw new Error(`Netlify ${label} must be a string`);
  return parsed;
}

export function assertSafeStaticNetlifyToml({ filePath, content }) {
  if (filePath !== "netlify.toml") throw new Error(`worker TOML artifacts are limited to a root netlify.toml: ${filePath}`);
  if (typeof content !== "string" || content.length === 0) throw new Error("root netlify.toml content is required");
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(content)) throw new Error("root netlify.toml contains prohibited control characters");

  const lines = content.replaceAll("\r\n", "\n").split("\n");
  if (lines.length > MAX_CONFIG_LINES) throw new Error(`root netlify.toml exceeds ${MAX_CONFIG_LINES} lines`);

  let section = null;
  let sawPublish = false;
  let headerBlockOpen = false;
  let headerHasTarget = false;
  for (const [index, rawLine] of lines.entries()) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    if (line === "[build]") {
      if (headerBlockOpen && !headerHasTarget) throw new Error("root netlify.toml headers block requires a for path");
      section = "build";
      headerBlockOpen = false;
      continue;
    }
    if (line === "[[headers]]") {
      if (headerBlockOpen && !headerHasTarget) throw new Error("root netlify.toml headers block requires a for path");
      section = "headers";
      headerBlockOpen = true;
      headerHasTarget = false;
      continue;
    }
    if (line === "[headers.values]") {
      if (!headerBlockOpen || !headerHasTarget) throw new Error("root netlify.toml headers.values requires a preceding headers for path");
      section = "header-values";
      continue;
    }
    if (line.startsWith("[")) throw new Error(`root netlify.toml section is not allowed on line ${index + 1}: ${line}`);

    const assignment = line.match(/^([A-Za-z][A-Za-z0-9_-]*)\s*=\s*(.+)$/);
    if (!assignment) throw new Error(`root netlify.toml contains an invalid assignment on line ${index + 1}`);
    const [, key, rawValue] = assignment;
    if (section === "build") {
      if (key !== "publish" || sawPublish) throw new Error(`root netlify.toml build setting is not allowed: ${key}`);
      const publish = quotedString(rawValue, "publish path");
      if (![".", "./"].includes(publish)) throw new Error("root netlify.toml publish path must be the artifact root");
      sawPublish = true;
      continue;
    }
    if (section === "headers") {
      if (key !== "for" || headerHasTarget) throw new Error(`root netlify.toml header setting is not allowed: ${key}`);
      const target = quotedString(rawValue, "header path");
      if (!target.startsWith("/") || target.includes("://")) throw new Error("root netlify.toml header path must be root-relative");
      headerHasTarget = true;
      continue;
    }
    if (section === "header-values") {
      if (!/^[A-Za-z][A-Za-z0-9-]{0,79}$/.test(key)) throw new Error(`root netlify.toml header name is not allowed: ${key}`);
      const value = quotedString(rawValue, `header value for ${key}`);
      if (value.length > MAX_HEADER_VALUE_LENGTH) throw new Error(`root netlify.toml header value is too long: ${key}`);
      continue;
    }
    throw new Error(`root netlify.toml assignment is outside an allowed section on line ${index + 1}`);
  }

  if (headerBlockOpen && !headerHasTarget) throw new Error("root netlify.toml headers block requires a for path");
  if (!sawPublish) throw new Error("root netlify.toml must declare [build] publish = \".\"");
  return true;
}
