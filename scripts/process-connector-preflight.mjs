#!/usr/bin/env node
import { readFileSync } from "node:fs";
import process from "node:process";
import { buildConnectorPreflightRecord } from "./lib/runtime/connector-preflight-runtime.mjs";

function readArg(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}

const inputPath = readArg("--input");

if (!inputPath) {
  console.error("Usage: node scripts/process-connector-preflight.mjs --input <preflight-input.json>");
  process.exit(1);
}

const input = JSON.parse(readFileSync(inputPath, "utf8"));
const result = buildConnectorPreflightRecord({ input });

console.log(JSON.stringify(result, null, 2));
process.exit(result.status === "ready" ? 0 : 2);
