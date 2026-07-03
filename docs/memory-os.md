# Memory OS

## Purpose

Memory OS defines how AG Digitalz OS should classify durable facts, decisions, preferences, rules, state, and runbooks.

This foundation is policy only. It does not add memory records, store secrets, store customer data, connect services, or read production systems.

## Current Policy

```text
.codex/memory/policy.json
```

Schema:

```text
schemas/memory-policy.schema.json
```

## Memory Windows

- Short-term window: `30` days
- Medium-term review window: `90` days
- Long-term memory requires review before it is treated as current

Short-term casual memory is deleted after `30` days if unused. If referenced again, it may be refreshed. It must not become permanent memory without owner approval or a valid source.

## Memory Scopes

- `personal`
- `project`
- `company`
- `agent_shared`

Agents may learn from each other only through source-backed `agent_shared` lessons.

## Memory States

- `verified_current`
- `short_term`
- `stale_needs_review`
- `archived`

## Rules

- Secrets are not allowed.
- Customer data is not allowed.
- Production data is not allowed.
- Every memory record must have a source.
- Verified current facts must include `verifiedAt`.
- Stale memory must include a refresh trigger.
- Sensitive memory requires owner approval.

## Allowed Record Types

- `decision`
- `fact`
- `preference`
- `rule`
- `state`
- `runbook`

## Validation

`npm run validate` checks that:

- The Memory OS policy file exists.
- The Memory OS schema exists.
- The short-term window is exactly `30` days.
- Secrets, customer data, and production data are disallowed.
- Sources are required.
- Verified current facts require `verifiedAt`.
- Stale memory requires a refresh trigger.
- Short-term casual memory must be deleted after `30` days if unused.
- Random brainstorming must not become permanent memory.
- Casual ideas must not create work without a commitment signal.

See `docs/memory-learning-policy.md`.

This validation is local and offline.
