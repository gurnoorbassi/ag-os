# Approval Ledger Foundation

The Approval Ledger stores approval locks and approval status for gated actions.

This foundation is templates and schema metadata only. It does not create active approvals, authorize live actions, call services, deploy code, change domains, or spend money.

## Purpose

The Approval Ledger gives AG OS one place to track:

- approval locks
- approval scope
- who approved
- evidence
- expiration
- revocation path
- allowed actions
- excluded actions
- blocked gated work

## Approval Lock Rules

After Constitution activation, gated actions require an approval lock before execution. An approval lock must identify:

- `approvalId`
- status
- risk level
- approval scope
- approved by
- approved actions
- not approved actions
- evidence
- expiration
- revocation path
- creation and update timestamps

`approvalId` is the canonical approval lock identifier. Ambiguous `id` fields must not be used for approval locks.

## Template Storage

Templates live under `.codex/approvals/templates/`.

Active approval records must not be created until the live approval workflow and audit trail are ready. Active records belong directly under `.codex/approvals/` only when validation supports them and owner approval is recorded.

## Safety Rules

The Approval Ledger must stop before any gated action when:

- approval scope is unclear
- approval lock is missing
- approval lock is expired
- approval lock is revoked
- approval evidence is missing
- the requested action is outside the approved scope
- approval was not granted by the owner or valid delegate
- audit event requirements are not satisfied

## Relationship To Other OS Domains

The Approval Ledger is consulted by:

- Planner
- Execution Engine
- Connector Executor
- Command Intake
- Cost Ledger
- Audit Trail
- Watchdog Engine

State Management may summarize approval health, but approval locks remain the canonical approval artifacts once runtime exists.
