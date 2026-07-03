# State Management

## Purpose

State Management defines how AG OS will understand its current operating posture before runtime storage exists.

It tracks state for:

- Projects
- Tasks
- Jobs
- Pull requests
- Approvals
- Incidents
- Costs
- Connectors
- Capabilities
- Validation status
- Boot status
- Watchdog status
- Engine status

## Foundation Scope

State Management is source-controlled and read-only in this phase.

Allowed foundation work:

- Define schemas.
- Define templates.
- Document required state fields.
- Validate local source-controlled records.

Blocked foundation work:

- Live service calls.
- Runtime state persistence.
- Production or customer data.
- Credentials.
- Lead Gen source, VPS, Postgres, n8n, domain, or deployment changes.
- AI Receptionist repository changes.

## Source Of Truth

Until runtime storage is approved, state is derived from AG OS repository records:

- `.codex/projects/registry.json`
- `.codex/commands/registry.json`
- `.codex/connectors/registry.json`
- `.codex/capabilities/registry.json`
- `.codex/costs/budget.json`
- `.codex/watchdog/policy.json`
- `.codex/memory/policy.json`
- future approved ledgers and engine records

## Status Model

State records may use these lifecycle statuses:

- `draft`
- `current`
- `stale`
- `blocked`
- `archived`

## Safety Rules

State records must be production-clean. They must not store credentials, production data, customer data, live connector payloads, private endpoints, or unapproved runtime state.
