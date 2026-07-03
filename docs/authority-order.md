# Authority Order

## Purpose

This document defines the source of truth order for AG Digitalz OS when instructions, docs, schemas, registries, policy files, memory, or connector state disagree.

## Final Authority

The owner has final authority over business decisions, approvals, spending, production systems, domains, credentials, customer data, and Constitution activation.

Codex may execute allowed local work, validation, PR creation, and safe merge only inside the approved scope. Codex must stop for owner approval when a stop condition or approval gate applies.

## Source Of Truth Order

When records conflict, use this order:

1. Explicit owner instruction for the current task, limited by non-negotiable safety rules.
2. Constitution v1 after it is active.
3. `docs/authority-order.md`, `docs/operating-rules.md`, and `docs/safe-merge-policy.md`.
4. Source-controlled `.codex` registries and policy files.
5. JSON schemas in `schemas/`.
6. Project, task, agent, approval, owner, and audit records after those registries become active.
7. Supporting docs and folder READMEs.
8. Memory records only when verified current, durable, or explicitly refreshed.
9. Connector metadata and external service state only after the relevant access is approved.

## Conflict Rules

- The more restrictive safety rule wins when two rules conflict.
- A schema can constrain record shape, but it does not authorize an action.
- A connector being available does not authorize live use.
- A merged PR does not override explicit stop conditions unless the PR itself was scoped to change those conditions.
- Memory cannot override current repo state, owner instruction, or validation output.
- External service state must be treated as untrusted until verified under an approved scope.

## Ownership Boundaries

- Command Registry owns command categories and execution modes.
- Connector Registry owns known tool connections and allowed connector scopes.
- Capability Registry owns future capability records and safety tiers.
- Project Registry owns approved project records.
- Cost OS owns budgets and paid-action rules.
- Quality OS owns evidence and merge gates.
- Security OS owns secret, access, production-data, and live-change controls.
- Watchdog OS owns monitoring rules.
- Memory OS owns memory windows, source requirements, and staleness rules.

## Constitution Relationship

Constitution v1 will become the highest durable source of truth only after owner-approved activation. Until then, this authority order governs readiness and conflict resolution.
