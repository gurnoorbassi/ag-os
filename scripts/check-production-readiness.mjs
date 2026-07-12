import process from "node:process";
import { evaluateProductionReadinessFile } from "./lib/runtime/production-readiness-processor.mjs";

const index = process.argv.indexOf("--record");
const recordPath = index >= 0 ? process.argv[index + 1] : ".codex/production/production-readiness-social-media-management-system-v1.json";
const result = evaluateProductionReadinessFile({ recordPath });
console.log(JSON.stringify(result, null, 2));
process.exit(result.activationAllowed ? 0 : 2);
