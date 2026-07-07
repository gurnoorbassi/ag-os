#!/usr/bin/env node
import { readFileSync } from "node:fs";
import process from "node:process";
import {
  buildRuntimeProofRecords,
  writeRuntimeProofRecords
} from "./lib/runtime/runtime-proof-writer.mjs";

function readArg(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}

const inputPath = readArg("--input");
const dryRun = process.argv.includes("--dry-run");

if (!inputPath) {
  console.error("Usage: node scripts/process-runtime-proof-writer.mjs --input <proof-input.json> [--dry-run]");
  process.exit(1);
}

const input = JSON.parse(readFileSync(inputPath, "utf8"));
const result = dryRun
  ? buildRuntimeProofRecords({ input })
  : writeRuntimeProofRecords({ input });

console.log(JSON.stringify({
  status: dryRun ? "planned" : "written",
  proofId: input.proofId,
  paths: result.paths,
  safety: {
    liveActionsExecuted: false,
    credentialsAccessed: false,
    oauthExecuted: false,
    socialActionsExecuted: false,
    deploymentsExecuted: false,
    paidActionsUsed: false
  }
}, null, 2));
