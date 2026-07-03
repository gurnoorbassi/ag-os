# Approval Workflow

## Purpose

This document defines how AG Digitalz OS records and uses owner approval for actions that are blocked by default.

This foundation does not create approval records. It defines the workflow and schema shape for future approval locks.

## Actions Requiring Approval

Approval is required before:

- Creating, storing, rotating, or using credentials.
- Connecting live services.
- Running live API calls unless already approved for the exact scope.
- Deploying to staging or production.
- Changing domains, DNS, routing, or public URLs.
- Activating or mutating n8n workflows.
- Sending external messages.
- Spending money, changing billing, or enabling paid tools.
- Reading, moving, deleting, importing, or exporting production or customer data.
- Running database migrations.
- Touching protected product systems such as Lead Gen before an approved migration scope exists.
- Promoting AG OS trust level.
- Activating or amending Constitution v1 when authority, safety, approvals, live systems, costs, or data rules change.

## Approval Lock Format

Approval locks are future records stored under `.codex/approvals/` and validated by `schemas/approval-lock.schema.json`.

Each approval lock must include:

- Unique approval ID.
- Status.
- Owner ID.
- Requester.
- Command category.
- Requested action.
- Exact scope.
- Risk level.
- Approval gates covered.
- Approved actions.
- Prohibited actions.
- Evidence references.
- Expiration timestamp.
- Created and updated timestamps.

## Workflow

1. Identify the blocked action and command category.
2. Write an approval request with exact scope, risk, expected effect, rollback path, and evidence.
3. Owner approves, rejects, expires, or revokes the request.
4. Approved work may execute only inside the recorded scope.
5. Any scope expansion requires a new approval lock.
6. Completion, failure, rollback, or incident follow-up should be recorded as an audit event when audit records become active.

## Approval Rules

- Approval must be explicit, scoped, and current.
- Approval cannot be inferred from vague permission.
- Approval does not carry across unrelated projects, services, domains, workflows, or time windows.
- Approval does not permit credentials or customer data to be committed.
- Approval does not bypass validation, CI, safe-merge policy, or Constitution rules.

## Foundation Limitation

Until approval records are active, owner approval is represented by the current task instruction and PR history. Live services, deployments, credentials, paid actions, production data, and domain changes remain blocked unless the owner gives explicit scoped approval.
