# AG OS Full Vision Roadmap v1

Status: Active planning source of truth.

This document is planning only. It authorizes nothing. Every gated action named here still requires its own approval lock, boot check, validation, audit trail, and Constitution v1.0 compliance. Phase mechanics live in `docs/build-mode-roadmap.md`; this roadmap is the umbrella: vision, current proof, activation matrix, backlog, and safety plan.

## 1. Vision

AG OS is the operating system for an autonomous software company. The owner states outcomes; AG OS understands the business goal, plans against professional standards, routes work to workers, executes through gates, scores its own output, and learns from every project.

Operating principle: the model does not become smarter; the system becomes smarter. AG OS compounds through archetypes, lessons, preferences, quality scores, and proven capabilities delivered to workers at boot. A booted AG OS must beat a cold model session on AG Digitalz work because it never starts from zero.

North star outcomes:

- One command from the owner produces a professional, approval-gated product with no micromanagement.
- Every completed project measurably improves the next one in its category.
- Safety is structural: no live, paid, credentialed, or destructive action can occur without a scoped approval lock.
- AG OS generates revenue for AG Digitalz through client work it builds and operates.

Non-goals:

- AG OS does not compete with the underlying models; it orchestrates them.
- AG OS is not a task manager; it is a builder with judgment encoded in records.
- AG OS never trades quality for tiny cost savings, and never trades safety for speed.

## 2. Current State (evidence-backed, 2026-07-04)

Proven capabilities (see `.codex/capabilities/registry.json` for evidence chains):

- Live GitHub private repo creation, branch/PR creation, and approved target-PR merge.
- Netlify staging deploy under approval lock.
- n8n inactive draft workflow export.
- Quality score generation, critic review generation, and lesson candidate generation.

Working intelligence loop: command intake with product-aware classification and worker understanding blocks; planner that loads archetype content (phases, quality bar, first-build guidance) into plans; 11-archetype library; quality scores recorded under `.codex/quality-scores/`; lessons pipeline with candidate/accepted separation; boot briefing delivering context to workers.

Known weaknesses (from the validator/schema audit):

- Validator coverage is narrower than its green check implies: orphan schemas, unvalidated record directories, `format` keyword unenforced, no validator self-tests.
- Understanding depends on a worker being manually placed in the loop.
- 74 docs and growing; consolidation debt accrues.
- Accumulated context is only an asset while it is true; stale or wrong lessons make the system worse than a cold session.

## 3. Horizons

### H1 — Trust the Foundation (now)

Goal: the green checkmark means what it says. Close validator coverage gaps, add validator self-tests, wire record-bearing orphan schemas (cost ledger, connector executions, GitHub plans/gates), make unsupported schema keywords fail or warn loudly, and truth-up `docs/validation-limits.md`. Exit criteria: every active record directory validates against its schema, and the validator has its own test suite.

### H2 — First Revenue Product End to End

Goal: one archetype taken from owner command to a real, staged, approval-gated deliverable a client would pay for. Candidate: business website or social media content operations system. Exit criteria: quality score at or above bar, staged deploy under approval lock, owner acceptance recorded, at least three lesson candidates produced, and a repeatable runbook captured as records.

### H3 — Compounding Intelligence

Goal: the learning loop runs itself. Every completed project auto-produces a quality score and lesson candidates; below-bar scores force improvement recommendations; accepted lessons feed archetype updates through reviewed PRs; boot briefing moves from load-everything to relevance retrieval (most similar past projects, their scores, applicable lessons). Add the skills library: reusable proven build patterns that plans reference instead of re-deriving. Exit criteria: a new project in a known category demonstrably reuses lessons and skills from prior projects, visible in its plan basis.

### H4 — Scaled Operations

Goal: the owner's attention is spent on judgment, not clicks. Activate the first standing approval lock (class-scoped, expiring, revocable, per `docs/standing-approvals.md`); batch owner approvals into a single review surface; run multiple projects concurrently through the job queue; instrument the system (estimate-vs-actual cost, quality trend per category, rework rate, lesson application rate). Exit criteria: two or more projects progress in parallel with owner touches only at judgment gates.

### H5 — Live Operations and Protected Product Management

Goal: production under governance. Approved production deploys with rollback and backup readiness; client-facing access under approval; Lead Gen migration along its observe → read_only → managed_staging → production_managed ladder; AI Receptionist managed as a governed product project. Exit criteria: one production system operated by AG OS with full audit trail and zero ungated actions.

Horizons overlap; they are gates of trust, not a strict calendar. H1 is a precondition for compounding (H3) because compounding on an unverified foundation compounds errors.

## 4. Activation Matrix

Status values: `proven` (done under gates, evidence recorded), `ready` (mechanics exist, needs approval lock per use), `planned` (designed, not built), `blocked` (requires owner decision or new governance path).

| Capability / Action | Status today | Unlock requirement |
| --- | --- | --- |
| Plan-only command runs (intake→plan→gates) | proven | none, R0/R1 |
| Local builder work, starter artifacts in branch | proven | scope clarity, validation |
| GitHub repo creation | proven | approval lock per repo |
| GitHub branch/PR/merge on approved targets | proven | action matrix + CI + approval where gated |
| Critic review, quality score, lesson candidates | proven | none, offline |
| Netlify staging deploy | proven | approval lock per deploy |
| n8n draft workflow export (inactive) | proven | approval lock per export |
| n8n workflow activation | blocked | owner approval, rollback plan, audit |
| Netlify production deploy | blocked | owner approval, H5 readiness items |
| Domain / DNS changes | blocked | owner approval, permanent per-action gate |
| Credential handling | blocked | owner approval, secret-store design, never in repo |
| External messages / posting / outreach | blocked | owner approval, permanent per-action gate |
| Paid tools / paid APIs | blocked | owner approval + Cost OS review, permanent gate |
| Production / customer data | blocked | owner approval + data classification path |
| Standing approval locks | planned | owner grants first class-scoped lock (H4) |
| Relevance-retrieval boot briefing | planned | H3 backlog item |
| Skills library | planned | H3 backlog item |
| Lead Gen managed staging | blocked | scoped migration approval, backups, rollback |
| Constitution amendments | blocked | full §32 process, always |

## 5. Backlog (priority order)

| # | Item | Horizon | Size | Notes |
| --- | --- | --- | --- | --- |
| 1 | Validator self-test suite (`tests/validate-foundation.test.mjs`) | H1 | S | Before any validator change |
| 2 | Wire orphan schemas with live records: cost-ledger, connector-execution, github plan/gate | H1 | M | Highest real coverage gap |
| 3 | Unsupported-keyword visibility: warn on `format`, fail on `$ref`/`oneOf`/etc. | H1 | S | Scoped so 17 `format` schemas do not red-line |
| 4 | Truth-up `docs/validation-limits.md` (stale draft-only and empty-registry claims) | H1 | S | Docs honesty |
| 5 | Runtime proof records policy: commit milestone proof, ignore routine churn | H1 | S | Pattern already emerging; codify it |
| 6 | End-to-end revenue product run (one archetype, staged, scored, accepted) | H2 | L | The proof that AG OS builds, not just plans |
| 7 | Auto-score + lesson candidates required for every `done` job | H3 | M | Closes the loop mechanically |
| 8 | Boot briefing relevance retrieval (similar projects, applicable lessons only) | H3 | M | Before lesson store grows large |
| 9 | Skills library foundation (schema, `.codex/skills/`, first proven pattern) | H3 | M | Proven routes, not just destinations |
| 10 | Archetype update path from accepted lessons (reviewed PRs) | H3 | S | Compounding into category knowledge |
| 11 | First standing approval lock (owner grant, class-scoped, expiring) | H4 | S | Biggest micromanagement reducer |
| 12 | Batched approval review surface | H4 | M | One place to approve queued gated work |
| 13 | Metrics instrumentation: cost variance, quality trend, rework, lesson application | H4 | M | Evidence the system improves |
| 14 | Doc consolidation pass (duplicate boot docs, restated gate lists) | H1–H4 | M | Own scoped PR; validator pins exact strings |
| 15 | AJV migration decision | H1 tail | M | Only if items 1–3 prove hand-rolled path too costly; needs supply-chain review |
| 16 | Production readiness package (rollback, backup, incident drill) | H5 | L | Precondition for any production deploy |
| 17 | Lead Gen migration plan execution (observe → read_only first) | H5 | L | Separate scoped approvals throughout |

Backlog changes are made by editing this document through reviewed PRs, citing evidence (audit findings, quality scores, promoted lessons, or owner commands).

## 6. Safety Plan

Permanent per-action gates (no standing approval may ever cover these): credentials, production/customer data, domain/DNS, production deploys, external messages/posting, paid actions above Cost OS limits, Lead Gen production, destructive migrations, Constitution changes.

Trust ladder: capabilities move `planned → ready → proven` only through evidence-recorded gated runs. A proven capability never authorizes future execution; it documents that the gate chain works.

Poisoned-memory defense: candidates are never truth; promotion requires proof; every accepted lesson carries sources; a lesson repeatedly applied while scores stay below bar must be retired. Stale context is treated as a safety issue, not housekeeping, because every H3+ mechanism increases dependence on accumulated context being true.

Drift control: validation and CI gate every merge; validator hardening (H1) precedes compounding (H3); quality scores below bar force improvement or lesson records; the roadmap itself is reviewed against reality when horizons exit.

Kill paths: `stop_all` command category, approval-lock revocation, incident levels I0–I4 with mandatory stop on live-system risk, and rollback-before-risky-work rules all remain as defined in the Constitution and incident docs.

## 7. Review Cadence

- Re-validate this roadmap at every horizon exit and after any incident of level I2 or higher.
- Any conflict between this roadmap and the Constitution resolves in favor of the Constitution, always.
- Owner may reorder the backlog at any time; the reorder is recorded by a PR to this file.
