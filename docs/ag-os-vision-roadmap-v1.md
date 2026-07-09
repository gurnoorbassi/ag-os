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

## 2. Current State (evidence-backed, 2026-07-09)

Proven capabilities (see `.codex/capabilities/registry.json` for evidence chains):

- Live GitHub private repo creation, branch/PR creation, and approved target-PR merge.
- Netlify staging deploy under approval lock.
- n8n inactive draft workflow export.
- Quality score generation, critic review generation, and lesson candidate generation.

Working intelligence loop: command intake with product-aware classification and worker understanding blocks; planner that loads archetype content (phases, quality bar, first-build guidance) into plans; 11-archetype library; quality scores recorded under `.codex/quality-scores/`; lessons pipeline with candidate/accepted separation; boot briefing delivering context to workers.

Foundation trust now includes:

- Validator self-tests in `tests/validate-foundation.test.mjs`, active runtime validation for cost, connector execution, and GitHub plan/gate records, and fail-loud/warning behavior for unsupported schema keywords.
- Truthful validation boundaries in `docs/validation-limits.md`, including the remaining hand-rolled validator limits.
- Local CI-equivalent gates for validation, dashboard integrity, boot checks, secret scanning, and the Node test suite.
- Runtime proof writing, stale approval cleanup, offline connector preflight, and source-controlled record conventions.

Compounding intelligence now includes:

- Unified candidate, accepted, rejected, and conflict-aware memory records with accepted-only runtime loading.
- An owner-gated lesson promotion/rejection path.
- A validated skills library with three active evidence-cited procedural skills delivered to workers without granting permission.

The Social Media Management System has progressed through draft UI, content review, manual posting pack, target-repo merge, dedicated Netlify staging proof, and full H2 owner acceptance. Production Social Posting OS and an Instagram `@agdigitalz` reference-only OAuth preflight are source controlled. OAuth execution, account connection, posting, scheduling, analytics, DMs/comments, and n8n activation remain blocked unless separately approved.

Known weaknesses (from the validator/schema audit):

- Validation still uses a hand-rolled JSON Schema subset: `format` is warning-only, structural keywords are unsupported, and metadata-only schemas remain deferred until active record paths exist.
- Understanding depends on a worker being manually placed in the loop.
- The accepted H2 social product remains intentionally limited to managed staging and draft-only operation; live-operation readiness is an H5 concern with separate gates.
- Mechanical completion scoring now covers the local execution processor; remaining completion paths must adopt the same guarded `done` contract as they are added.
- Relevance retrieval is deterministic and metadata-based; semantic retrieval and measured reuse effectiveness remain future improvements if evidence justifies them.
- Documentation continues to grow; consolidation debt accrues.
- Accumulated context is only an asset while it is true; stale or wrong lessons make the system worse than a cold session.

## 3. Horizons

### H1 — Trust the Foundation (now)

Goal: the green checkmark means what it says. Close validator coverage gaps, add validator self-tests, wire record-bearing orphan schemas (cost ledger, connector executions, GitHub plans/gates), make unsupported schema keywords fail or warn loudly, and truth-up `docs/validation-limits.md`. Exit criteria: every active record directory validates against its schema, and the validator has its own test suite.

Status: core exit criteria achieved. Remaining metadata-only schemas and any future AJV migration stay in the H1 tail; new active record directories must be wired before they can claim validator coverage.

### H2 — First Revenue Product End to End

Goal: one archetype taken from owner command to a real, staged, approval-gated deliverable a client would pay for. Candidate: business website or social media content operations system. Exit criteria: quality score at or above bar, staged deploy under approval lock, owner acceptance recorded, at least three lesson candidates produced, and a repeatable runbook captured as records.

Status: complete through the Social Media Management System. Build, review, merge, staging, draft-content approval, operating-package evidence, full owner acceptance, and project-registry reconciliation are source controlled. This closes the H2 product milestone only and grants no live-operation permission.

### H3 — Compounding Intelligence

Goal: the learning loop runs itself. Every completed project auto-produces a quality score and lesson candidates; below-bar scores force improvement recommendations; accepted lessons feed archetype updates through reviewed PRs; boot briefing moves from load-everything to relevance retrieval (most similar past projects, their scores, applicable lessons). Add the skills library: reusable proven build patterns that plans reference instead of re-deriving. Exit criteria: a new project in a known category demonstrably reuses lessons and skills from prior projects, visible in its plan basis.

Status: partially implemented. Unified memory, accepted-only loading, promotion/rejection mechanics, the skills-library foundation, guarded done-job scoring, and project/archetype/output relevance retrieval are implemented. Demonstrated lesson/skill reuse in a new project remains open.

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
| Unified memory loading and owner-gated lesson promotion | ready | owner approval for each promotion; memory never grants permission |
| Skills library and active procedural skills | ready | evidence-backed use; action-specific gates still apply |
| Netlify staging deploy | proven | approval lock per deploy |
| n8n draft workflow export (inactive) | proven | approval lock per export |
| n8n workflow activation | blocked | owner approval, rollback plan, audit |
| Netlify production deploy | blocked | owner approval, H5 readiness items |
| Domain / DNS changes | blocked | owner approval, permanent per-action gate |
| Reference-only credential records and secure-store preflight | ready | exact connector approval; secret values never enter repo, chat, logs, or dashboard data |
| Live credential/OAuth handling | blocked | owner approval, active external secure store, connector path, audit, validation |
| External messages / posting / outreach | blocked | owner approval, permanent per-action gate |
| Paid tools / paid APIs | blocked | owner approval + Cost OS review, permanent gate |
| Production / customer data | blocked | owner approval + data classification path |
| Standing approval locks | planned | owner grants first class-scoped lock (H4) |
| Relevance-retrieval boot briefing | planned | H3 backlog item |
| Instagram OAuth for `@agdigitalz` in `connected_draft_only` mode | blocked | exact owner approval plus live connector path; no posting permissions |
| Lead Gen managed staging | blocked | scoped migration approval, backups, rollback |
| Constitution amendments | blocked | full §32 process, always |

## 5. Backlog (priority order)

| # | Item | Horizon | Size | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | Validator self-test suite (`tests/validate-foundation.test.mjs`) | H1 | S | complete | Self-tests cover valid and adversarial validator behavior. |
| 2 | Wire orphan schemas with live records: cost-ledger, connector-execution, github plan/gate | H1 | M | complete | Active runtime patterns are validated; metadata-only schemas remain declared as such. |
| 3 | Unsupported-keyword visibility: warn on `format`, fail on `$ref`/`oneOf`/etc. | H1 | S | complete | Behavior and self-tests are source controlled. |
| 4 | Truth-up `docs/validation-limits.md` | H1 | S | complete | Current coverage, warning-only behavior, and deferred schemas are explicit. |
| 5 | Runtime proof records policy: commit milestone proof, ignore routine churn | H1 | S | complete | Runtime proof writer and record conventions are merged. |
| 6 | End-to-end revenue product run (one archetype, staged, scored, accepted) | H2 | L | complete | Social product has staged, scored, lesson-candidate, runbook, owner-acceptance, and reconciled project-status evidence. |
| 7 | Auto-score + lesson candidates required for every `done` job | H3 | M | complete | Completion Policy v1 fails closed unless the local execution processor produces score and lesson evidence; future completion paths must use the same contract. |
| 8 | Boot briefing relevance retrieval (similar projects, applicable lessons only) | H3 | M | complete | Workers can request deterministic project/archetype/output briefings; planners record selected accepted lessons and high-quality examples. |
| 9 | Skills library foundation (schema, `.codex/skills/`, first proven pattern) | H3 | M | complete | Three active evidence-cited procedural skills exist. |
| 10 | Archetype update path from accepted lessons (reviewed PRs) | H3 | S | open | Compounding into category knowledge. |
| 11 | First standing approval lock (owner grant, class-scoped, expiring) | H4 | S | open | Biggest micromanagement reducer. |
| 12 | Batched approval review surface | H4 | M | open | One place to approve queued gated work. |
| 13 | Metrics instrumentation: cost variance, quality trend, rework, lesson application | H4 | M | open | Evidence the system improves. |
| 14 | Doc consolidation pass (duplicate boot docs, restated gate lists) | H1–H4 | M | open | Own scoped PR; validator pins exact strings. |
| 15 | AJV migration decision | H1 tail | M | open | Consider only if the hand-rolled subset blocks safe progress; requires supply-chain review. |
| 16 | Production readiness package (rollback, backup, incident drill) | H5 | L | open | Precondition for any production deploy. |
| 17 | Lead Gen migration plan execution (observe → read_only first) | H5 | L | open | Separate scoped approvals throughout. |

Evidence for the 2026-07-09 status truth-up:

- H1: `tests/validate-foundation.test.mjs`, `scripts/validate-foundation.mjs`, `docs/validation-limits.md`, `docs/runtime-proof-records-policy.md`, and `scripts/process-runtime-proof-writer.mjs`.
- H2: `.codex/quality-scores/quality-score-runtime-target-pr-review-ag-digitalz-manual-posting-pack-v1-20260705.json`, `.codex/audit/audit-20260705-ag-digitalz-manual-posting-pack-v1-netlify-staging-executed.json`, `.codex/audit/audit-20260709-social-media-management-system-h2-owner-accepted.json`, and `.codex/projects/registry.json`.
- H3: `docs/unified-memory-learning-os.md`, `scripts/load-accepted-lessons.mjs`, `scripts/process-lesson-promotion.mjs`, `scripts/lib/runtime/job-completion-processor.mjs`, `schemas/skill.schema.json`, and the active records under `.codex/skills/`.
- Instagram production boundary: `.codex/social/preflight/social-preflight-instagram-oauth-agdigitalz.json`, `.codex/credentials/credential-ref-instagram-agdigitalz-oauth.json`, and `docs/instagram-production-readiness.md`.

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
