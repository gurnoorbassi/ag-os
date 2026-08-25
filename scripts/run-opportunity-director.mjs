import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  createOpportunityDirector,
  generateDailyBrief,
  getOpportunityDirectorSnapshot,
  runOpportunityWake
} from "./lib/runtime/opportunity-director.mjs";

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

const root = process.cwd();
createOpportunityDirector({ root });

if (process.argv.includes("--brief")) {
  process.stdout.write(`${JSON.stringify(generateDailyBrief({ root }), null, 2)}\n`);
} else if (option("--fixture")) {
  const fixturePath = path.resolve(root, option("--fixture"));
  const fixture = JSON.parse(readFileSync(fixturePath, "utf8"));
  const result = await runOpportunityWake({ trigger: "manual_fixture_verification", fixture, root });
  process.stdout.write(`${JSON.stringify({ wake: result, dashboard: getOpportunityDirectorSnapshot({ root }) }, null, 2)}\n`);
} else {
  process.stdout.write(`${JSON.stringify(getOpportunityDirectorSnapshot({ root }), null, 2)}\n`);
}
