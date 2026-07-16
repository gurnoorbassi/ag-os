import { summarizeSafeMergeRuntime } from "./lib/runtime/safe-merge-runtime.mjs";

const summary = summarizeSafeMergeRuntime();
console.log(JSON.stringify(summary, null, 2));

if (summary.invalidCount > 0) {
  process.exitCode = 1;
}
