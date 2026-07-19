import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { decideProposal, discoverProposalCandidates, refreshProposals } from "../scripts/lib/runtime/proposal-engine.mjs";

function writeJson(root, relative, value) {
  const target = path.join(root, relative);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(value)}\n`);
}

test("proposal engine discovers bounded evidence-backed work without executing it", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "ag-os-proposal-"));
  writeJson(root, ".codex/jobs/job-runtime-operator-failed.json", {
    jobId: "job-runtime-operator-failed", projectId: "project-one-off", status: "failed", blockedReason: "validation failed", updatedAt: "2026-07-19T00:00:00.000Z"
  });
  writeJson(root, ".codex/memory/lessons/candidates/lesson-one.json", {
    lessonId: "lesson-one", projectId: "project-one-off", title: "Keep previews truthful", status: "candidate", confidence: "high", whyThisMatters: "Owners need accessible results.", updatedAt: "2026-07-19T00:00:00.000Z"
  });
  const candidates = discoverProposalCandidates({ root, now: new Date("2026-07-19T00:00:00.000Z") });
  assert.equal(candidates.length, 2);
  const proposals = refreshProposals({ root, now: new Date("2026-07-19T00:00:00.000Z") });
  assert.equal(proposals.length, 2);
  assert.ok(proposals.every((proposal) => proposal.safety.mayExecuteWithoutOwnerDecision === false));
});

test("accepting a proposal returns a normal command and never grants downstream permission", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "ag-os-proposal-decision-"));
  writeJson(root, ".codex/jobs/job-runtime-operator-failed.json", {
    jobId: "job-runtime-operator-failed", projectId: "project-one-off", status: "failed", blockedReason: "validation failed", updatedAt: "2026-07-19T00:00:00.000Z"
  });
  const [proposal] = refreshProposals({ root, now: new Date("2026-07-19T00:00:00.000Z") });
  const result = decideProposal({
    proposalId: proposal.proposalId,
    decision: "accept",
    confirmation: `ACCEPT ${proposal.proposalId}`,
    root,
    now: new Date("2026-07-19T00:01:00.000Z")
  });
  assert.equal(result.proposal.status, "accepted");
  assert.equal(result.proposal.safety.grantsPermission, false);
  assert.match(result.acceptedCommand.command, /Replan and rebuild/);
});

test("proposal decisions require exact confirmation and are single use", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "ag-os-proposal-confirm-"));
  writeJson(root, ".codex/jobs/job-runtime-operator-failed.json", {
    jobId: "job-runtime-operator-failed", projectId: "project-one-off", status: "failed", updatedAt: "2026-07-19T00:00:00.000Z"
  });
  const [proposal] = refreshProposals({ root, now: new Date("2026-07-19T00:00:00.000Z") });
  assert.throws(() => decideProposal({ proposalId: proposal.proposalId, decision: "reject", confirmation: "REJECT WRONG", root }), /confirmation/);
  decideProposal({ proposalId: proposal.proposalId, decision: "reject", confirmation: `REJECT ${proposal.proposalId}`, root });
  assert.throws(() => decideProposal({ proposalId: proposal.proposalId, decision: "reject", confirmation: `REJECT ${proposal.proposalId}`, root }), /not pending/);
});
