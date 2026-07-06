#!/usr/bin/env node
import process from "node:process";
import { scanSecrets } from "./lib/security/secret-scanner.mjs";

const result = scanSecrets();

if (!result.ok) {
  console.error("Secret scan failed. Findings:");
  for (const finding of result.findings) {
    console.error(`${finding.filePath}:${finding.line} ${finding.ruleId} ${finding.match}`);
  }
  process.exit(1);
}

console.log("Secret scan passed.");
