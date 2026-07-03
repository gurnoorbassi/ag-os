# Watchdog Engine Foundation

The Watchdog Engine defines safe offline checks for AG OS health.

This foundation is template and schema metadata only. It does not add live monitoring, send alerts, call connectors, deploy code, or access credentials.

## Offline Check Scope

The Watchdog Engine may define checks for:

- repository health
- validation status
- CI status when PR context exists
- stale approval locks
- stale audit expectations
- cost budget state
- active incident records
- connector registry permissions
- capability registry status
- storage risk when runtime exists
- dashboard data freshness
- engine status

## Severity Levels

Watchdog checks must use one of these severities:

- `info`
- `warning`
- `blocked`
- `critical`

`blocked` and `critical` findings must stop command execution until resolved or owner approval explicitly allows a scoped override.

## Alert Rules

No live alerts are enabled in this foundation.

Future alerts, including WhatsApp, email, SMS, or other messaging, require:

- owner approval
- approval lock
- connector permission review
- audit event
- cost review
- redaction rules

## Safety Rules

The Watchdog Engine must not:

- read credentials
- call live services
- run deployments
- modify domains or DNS
- inspect production/customer data
- send messages
- spend money
- auto-fix findings without approval

## Relationship To Other OS Domains

The Watchdog Engine reads from:

- State Management
- Boot Sequence Runner
- Approval Ledger
- Audit Trail
- Cost Ledger
- Connector Registry
- Capability Registry
- Quality OS
- Security OS

It reports blocked status to Command Intake, Planner, and Execution Engine.
