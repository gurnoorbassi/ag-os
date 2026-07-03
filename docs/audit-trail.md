# Audit Trail Foundation

The Audit Trail stores action records for commands, pull requests, merges, approvals, incidents, validation changes, and blocked actions.

This foundation is templates and schema metadata only. It does not create active audit events, call services, deploy code, change domains, or store production/customer data.

## Purpose

The Audit Trail gives AG OS evidence for:

- owner commands
- plans and routing decisions
- approval locks
- PR creation
- CI and validation results
- safe merges
- blocked actions
- incidents
- rollback decisions
- validation and governance changes

## Event Requirements

Future audit events must identify:

- audit event ID
- event type
- actor
- project ID when applicable
- related record
- risk level
- summary
- evidence
- outcome
- tamper-resistance metadata
- timestamp

## Template Storage

Templates live under `.codex/audit/templates/`.

Active audit events must not be created until validation and runtime rules support them. Active records belong directly under `.codex/audit/` only when the action matrix and approval workflow allow them.

## Redaction Rules

Audit events must not store raw:

- credentials or secrets
- production data payloads
- customer data payloads
- access tokens
- private keys
- live connector responses unless explicitly classified and approved

Evidence should reference safe artifacts such as commit SHAs, PR links, validation summaries, and redacted incident notes.

## Relationship To Other OS Domains

The Audit Trail receives records from:

- Command Intake
- Planner
- Execution Engine
- Approval Ledger
- Cost Ledger
- Watchdog Engine
- Security OS
- Quality OS

State Management may summarize audit health, but audit records remain the canonical action history once runtime exists.
