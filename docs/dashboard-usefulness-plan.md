# Dashboard Usefulness Plan

## Purpose

The AG OS dashboard should make operating state visible enough that the owner can make decisions without reading the whole repository. The dashboard remains read-only until a separate approved command model exists.

## Questions The Dashboard Should Answer

- Is Constitution v1.0 active?
- Are validation and boot checks passing?
- What projects are registered and what management modes apply?
- What connectors are connected, blocked, or dry-run only?
- What commands, jobs, plans, and routes exist?
- Which approvals are active, expired, revoked, or needed?
- What costs have been estimated or recorded against `$5`, `$10`, and `$50` limits?
- What incidents, stale locks, watchdog warnings, or storage risks exist?
- Which product archetypes are active?
- Which lessons are candidates and which have been accepted?
- Which safe-merge gates are blocking a PR?

## Read-Only First Rules

Dashboard v1 and near-term dashboard work must:

- Read from source-controlled records or local generated artifacts.
- Show source, timestamp, and limitation for important values.
- Avoid buttons, forms, inputs, destructive controls, or live connector actions.
- Avoid Netlify production deployment until approved.
- Avoid domain or DNS work.
- Avoid production and customer data.

## Useful Panels

High-value dashboard panels:

- Constitution and boot status.
- Project registry.
- Connector registry.
- Command and job state.
- Approval ledger.
- Audit trail summary.
- Cost budget and ledger.
- Product archetype coverage.
- Quality score and review status.
- Security and prompt-injection status.
- Watchdog and incident status.
- Protected project status for Lead Gen and AI Receptionist.

## Quality Bar

A useful dashboard must be:

- Fast to scan.
- Clear about blocked actions.
- Honest about stale or missing data.
- Dense enough for operations.
- Responsive without overlapping text.
- Free of write controls until approved.

## Stop Conditions

Stop dashboard work before:

- Live GitHub, Netlify, n8n, Postgres, VPS, phone, SMS, email, social, payment, or analytics connector actions.
- Deployment.
- Domain or DNS changes.
- Credential handling.
- Paid services.
- Production or customer data display.
- Write controls or command execution.
