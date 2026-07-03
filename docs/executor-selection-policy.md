# Executor Selection Policy

## Purpose

This policy defines how AG OS decides which executor handles a given piece of work: a deterministic script, a model worker, or an MCP connector.

This document is policy only. It does not execute work, call connectors, or grant permissions. Roles and session rules are defined in `docs/worker-protocol.md`.

## Selection Table

| Work type | Executor | Why |
| --- | --- | --- |
| Validation, schema checks, record shape checks | Deterministic scripts | Must never be wrong twice the same way |
| Boot checks, cost math, budget enforcement | Deterministic scripts | Safety-critical and repeatable |
| Safety scans and gate detection | Deterministic scripts | Gates must not depend on model judgment |
| Command understanding and business objective inference | Fable | Requires reasoning, not pattern matching |
| Architecture, product judgment, UX decisions | Fable | High-leverage judgment work |
| Plan authoring and hard planning | Fable | Plans are reasoning artifacts, validated by scripts |
| Review of risky or novel work | Fable | Independent judgment before acceptance |
| Implementation and file edits against a validated plan | Codex | High-volume, well-specified work |
| Local validation runs, PR creation, branch mechanics | Codex | Repo execution within safe-merge policy |
| MCP execution of approved actions | Codex | Executes only after gates and approvals pass |
| Repos, branches, PRs, CI, merges | GitHub MCP | Only through gates and safe-merge policy |
| Staging hosting, later | Netlify MCP | Never production without explicit owner approval |
| Workflow drafts and sanitized exports | n8n MCP | No activation without owner approval |

## Rules

1. If the work must be repeatable, auditable, and identical every run, use a deterministic script.
2. If the work requires understanding, inference, taste, or trade-off judgment, use a model worker. Scripts must validate the output shape.
3. If the work touches an external system, use an MCP connector, and only through the connector executor gates defined in `docs/connector-executor.md`.
4. If the work is gated by the action matrix, the owner approves before any executor runs it.
5. When an executor choice is unclear, prefer the more restrictive path: script over model, model over connector, stop over connector when gates are unclear.

## Worker Split

- Fable decides what to build and why: objectives, archetype fit, architecture, quality bar, phases, and review verdicts.
- Codex builds what was decided: edits, tests, validation, PRs, and gated MCP execution.
- Handoff between them happens through records, not chat. A Fable decision that Codex must act on becomes a plan record, an understanding block, or a reviewed doc first.

## Connector Boundaries

- GitHub MCP: repository metadata, branches, PR creation, CI checks, and safe merges within `docs/safe-merge-policy.md`. Repository creation and other live actions require an approval lock.
- Netlify MCP: read-only metadata by default. Staging deploys are future work behind owner approval or an approved standing capability. Production deploys always require explicit owner approval.
- n8n MCP: workflow SDK reference, node discovery, offline validation, and sanitized workflow exports. Workflow activation or mutation always requires owner approval.
- Base44: optional prototype builder only, never source of truth, and only when explicitly approved.

Connector availability never authorizes connector use. The Connector Registry and the action matrix decide what is allowed.

## Rule Of Thumb

Model decides. Script verifies. MCP executes. Owner approves.
