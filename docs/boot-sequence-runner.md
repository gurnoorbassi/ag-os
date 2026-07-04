# Boot Sequence Runner Foundation

The Boot Sequence Runner defines the startup checks AG OS must run before command execution.

This foundation is templates and schema metadata only. It does not add runtime code, call live services, connect credentials, deploy code, or modify production systems.

## Mandatory Checks

Before command execution, AG OS must check:

- active Constitution status
- registry structure
- schema metadata
- project registry status
- connector registry status
- command registry status
- cost budget status
- active approval locks
- active incidents
- stale locks
- validation status
- CI status when a PR is involved
- watchdog status
- storage risk when runtime exists
- engine status when runtime exists

## Check Statuses

Boot checks must use one of these statuses:

- `pending`
- `pass`
- `warn`
- `blocked`
- `failed`
- `not_applicable`

Any required check with `blocked` or `failed` status blocks command execution.

## Safety Rules

The Boot Sequence Runner must not perform:

- live service calls
- credential reads
- connector actions
- deployments
- domain or DNS checks that require live account access
- paid API calls
- production data access

Live health checks can be added only after the relevant connector permissions, approval workflow, audit trail, and storage rules are active.

## Worker Briefing

Boot output includes an offline `briefing` block that delivers accumulated context to workers at session start: Constitution status, repo health, current budget limits, owner preferences when present, known archetypes, accepted lessons, active approval locks, connector status from source-controlled metadata, quality score record count and latest summary when present, current blockers, and engine record counts.

The briefing is assembled only from source-controlled records. It makes no live calls and grants no permissions. An empty quality-score directory is valid and reports a count of `0`; AG OS must not invent a quality score. Workers must read the briefing before planning work, per `docs/worker-protocol.md`.

## Output

Each future boot run must produce:

- boot run ID
- status
- required checks
- evidence references
- blocked reasons
- readiness decision
- timestamps

## Relationship To Other OS Domains

The Boot Sequence Runner reads from:

- Constitution
- Project Registry
- Connector Registry
- Command Registry
- Capability Registry
- Cost OS
- Approval Ledger
- Audit Trail
- Watchdog Engine
- State Management

It reports readiness to Command Intake and Execution Engine before work begins.
