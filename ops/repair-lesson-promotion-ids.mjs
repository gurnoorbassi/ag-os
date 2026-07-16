import process from "node:process";
import { repairLessonPromotionApprovalIds } from "../scripts/lib/runtime/lesson-promotion-approval.mjs";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const approvalIndex = args.indexOf("--approval-id");
const remediationApprovalId = approvalIndex >= 0 ? args[approvalIndex + 1] : undefined;

try {
  const result = repairLessonPromotionApprovalIds({ apply, remediationApprovalId });
  console.log(JSON.stringify({ ...result, secretsPrinted: false }, null, 2));
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
