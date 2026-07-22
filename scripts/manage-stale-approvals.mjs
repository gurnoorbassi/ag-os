#!/usr/bin/env node
import process from "node:process";
import {
  archiveApprovalLock,
  findStaleApprovalLocks,
  listActiveApprovalLocks
} from "./lib/runtime/stale-approval-manager.mjs";
import { withStateMutationLock } from "./lib/runtime/state-mutation-lock.mjs";

function usage() {
  console.log(`Usage:
  node scripts/manage-stale-approvals.mjs --list
  node scripts/manage-stale-approvals.mjs --archive-stale
  node scripts/manage-stale-approvals.mjs --archive-consumed <approval-file> [approval-file...]

This local tool reads and writes source-controlled approval records only.
It performs no live service, connector, credential, deployment, domain, paid,
production-data, customer-data, social, n8n, Lead Gen, AI Receptionist, or
Constitution action.`);
}

const args = process.argv.slice(2);
const root = process.cwd();
const now = new Date();

if (args.includes("--help") || args.length === 0) {
  usage();
  process.exit(args.length === 0 ? 1 : 0);
}

if (args.includes("--list")) {
  const active = listActiveApprovalLocks({ root });
  const stale = findStaleApprovalLocks({ root, now });
  console.log(JSON.stringify({
    generatedAt: now.toISOString(),
    activeCount: active.filter((approval) => approval.status === "approved").length,
    staleCount: stale.length,
    staleApprovals: stale.map((approval) => ({
      approvalId: approval.approvalId,
      recordPath: approval.recordPath,
      expiresAt: approval.expiresAt,
      reason: approval.reason,
      archivePath: approval.archivePath
    })),
    safety: {
      liveActions: false,
      credentialAccess: false,
      deployments: false,
      paidActions: false
    }
  }, null, 2));
  process.exit(0);
}

if (args.includes("--archive-stale")) {
  const locked = await withStateMutationLock({ root, operation: "archive-stale-approvals" }, () => {
    const stale = findStaleApprovalLocks({ root, now });
    return stale.map((approval) => archiveApprovalLock({
      root,
      recordPath: approval.recordPath,
      now,
      reason: "Expired approval lock blocked or would block the mandatory boot sequence."
    }));
  });
  if (!locked.acquired) throw new Error("AG OS state is busy; stale approvals were not changed");
  const archived = locked.result;

  console.log(JSON.stringify({
    generatedAt: now.toISOString(),
    archivedCount: archived.length,
    archived,
    safety: {
      liveActions: false,
      credentialAccess: false,
      deployments: false,
      paidActions: false
    }
  }, null, 2));
  process.exit(0);
}

const consumedIndex = args.indexOf("--archive-consumed");
if (consumedIndex !== -1) {
  const targets = args.slice(consumedIndex + 1).filter((arg) => !arg.startsWith("--"));
  if (targets.length === 0) {
    throw new Error("--archive-consumed requires at least one approval file path");
  }

  const locked = await withStateMutationLock({ root, operation: "archive-consumed-approvals" }, () => targets.map((recordPath) => archiveApprovalLock({
    root,
    recordPath,
    now,
    reason: "Completed one-time approval lock was consumed by its recorded milestone and is archived before it can authorize future work."
  })));
  if (!locked.acquired) throw new Error("AG OS state is busy; consumed approvals were not changed");
  const archived = locked.result;

  console.log(JSON.stringify({
    generatedAt: now.toISOString(),
    archivedCount: archived.length,
    archived,
    safety: {
      liveActions: false,
      credentialAccess: false,
      deployments: false,
      paidActions: false
    }
  }, null, 2));
  process.exit(0);
}

usage();
process.exit(1);
