# Monitoring Safety Policy

Status: policy foundation only.

Monitoring is visibility, not authority. A monitoring record can identify a risk, but it cannot approve an action, connect a service, deploy, repair production, or bypass the owner.

## Rules

- Read source-of-truth records first.
- Treat missing data as `unknown`, not healthy.
- Treat stale approvals as blocked until a fresh owner approval exists.
- Treat failed validation, failed CI, or failed boot checks as stop conditions.
- Do not auto-fix.
- Do not auto-retry live connectors.
- Do not page, message, email, text, or post unless a future owner-approved alert connector exists.
- Do not store credentials or private customer data in monitoring records.

## Future Live Monitoring Gate

Any future live monitoring must have:

- owner approval
- approval lock
- explicit connector scope
- rate and cost limits
- credential policy
- audit event
- rollback or disable plan
- proof that it does not touch production systems without approval

## Incident Boundary

A template can prepare an incident structure. A real incident record should only be created when source records show a real issue or owner approval requests one.
