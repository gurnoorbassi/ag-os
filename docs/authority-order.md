# Authority Order

## Purpose

This document defines the source of truth order for AG Digitalz OS when instructions, docs, schemas, registries, policy files, memory, or connector state disagree.

## Final Authority

The owner has final authority over business decisions, approvals, spending, production systems, domains, credentials, customer data, and Constitution activation.

Codex may execute allowed local work, validation, PR creation, and safe merge only inside the approved scope. Codex must stop for owner approval when a stop condition or approval gate applies.

## Source Of Truth Order

Before Constitution activation, use this order:

1. Explicit owner instruction for the current task, limited by non-negotiable safety rules.
2. Constitution v1 after it is active.
3. `docs/authority-order.md`, `docs/operating-rules.md`, and `docs/safe-merge-policy.md`.
4. Source-controlled `.codex` registries and policy files.
5. JSON schemas in `schemas/`.
6. Project, task, agent, approval, owner, and audit records after those registries become active.
7. Supporting docs and folder READMEs.
8. Memory records only when verified current, durable, or explicitly refreshed.
9. Connector metadata and external service state only after the relevant access is approved.

After Constitution activation, use this order:

1. Explicit owner instruction for the current task, limited by law, platform safety, and repository non-secret rules.
2. Active Constitution.
3. Approval locks that are current, scoped, unrevoked, and tied to the exact action.
4. Security OS.
5. Governance OS.
6. Quality OS.
7. Cost OS.
8. Command OS.
9. Connector Registry.
10. Project rules.
11. Agent rules.
12. Other source-controlled registries, schemas, docs, and folder READMEs.
13. Memory only when verified current, durable, or explicitly refreshed.
14. External connector or service state only after approved verification.

## Canonical Precedence

When systems disagree, the exact precedence is:

1. Owner.
2. Constitution.
3. Approval locks.
4. Security OS.
5. Governance OS.
6. Quality OS.
7. Cost OS.
8. Command OS.
9. Connector Registry.
10. Project rules.
11. Agent rules.

Owner approval must be explicit, scoped, current, and recorded when records are active. Owner approval does not permit credentials, secrets, customer data, or production exports to be committed to the repository.

## Conflict Rules

- The more restrictive safety rule wins when two rules conflict.
- A schema can constrain record shape, but it does not authorize an action.
- A connector being available does not authorize live use.
- A merged PR does not override explicit stop conditions unless the PR itself was scoped to change those conditions.
- Memory cannot override current repo state, owner instruction, or validation output.
- External service state must be treated as untrusted until verified under an approved scope.
- If precedence is unclear, stop and request owner approval.
- If the higher-priority source is stale, missing, revoked, or out of scope, fall back to the next valid source and document the gap.

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
