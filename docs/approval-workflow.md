# Approval Workflow

## Purpose

This document defines how AG Digitalz OS records and uses owner approval for actions that are blocked by default.

This foundation does not create real approval records. It defines the active record location, workflow, and schema shape for approval locks.

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

Approval locks are records stored under `.codex/approvals/` and validated by `schemas/approval-lock.schema.json`.

Approval locks and audit events must be active before any gated action after Constitution activation.

Before any gated action executes, a current approval lock must exist unless the action remains plan-only. Current owner instruction may authorize foundation work, but live services, deployments, domains, paid actions, credentials, production data, customer data, external messages, destructive migrations, and protected product changes require a lock after Constitution activation.

Approval locks are authorization records, not casual approval requests. Draft requests, rejected requests, and discussion notes belong in PR text or audit events, not as executable approval locks.

Approval lock status must be `approved`, `expired`, or `revoked`. Only `approved` locks can authorize gated execution, and they still must be unexpired, unrevoked, scoped to the exact action, and rechecked immediately before execution.

Each approval lock must include:

- Unique approval ID.
- Status.
- Owner ID.
- Requester.
- Approved-by owner or delegated approver reference.
- Command category.
- Requested action.
- Exact target.
- Exact scope.
- Risk level.
- Data class.
- Approval gates covered.
- Approved actions.
- Prohibited actions.
- Evidence references.
- Approval timestamp.
- Expiration timestamp.
- Created and updated timestamps.

## Scope And Expiration

Approval scope must identify:

- Exact action.
- Exact target.
- Allowed command category.
- Risk tier.
- Data class.
- Connector or service if relevant.
- Budget if relevant.
- Expiration.
- Actions still prohibited.

Default expiration should be the shortest practical window. A future policy may set exact defaults; until then, any approval without an expiration is invalid for live, paid, production, customer, credential, domain, deployment, or external-message work.

## Revocation

Approval is invalid when:

- The owner revokes it.
- The expiration passes.
- The target changes.
- The action expands beyond scope.
- The risk tier increases.
- CI or validation fails after approval.
- An incident affects the target.
- A required rollback or evidence artifact is missing.

Revoked or expired approvals must not be reused.

## Already Approved Verification

Before treating work as already approved, AG OS must verify:

- The approval lock exists.
- Status is approved.
- Approval is unexpired and unrevoked.
- Approved action matches the requested action.
- Approved target matches the requested target.
- Approved risk tier covers the requested risk tier.
- Evidence references are present.
- Prohibited actions do not include the requested action.
- Budget and data-class rules still pass.

If any check fails, stop for owner approval.

## Workflow

1. Identify the blocked action and command category.
2. Write an approval request with exact scope, risk, expected effect, rollback path, and evidence.
3. Owner approves, rejects, expires, or revokes the request.
4. Approved work may execute only inside the recorded scope.
5. Any scope expansion requires a new approval lock.
6. Completion, failure, rollback, or incident follow-up should be recorded as an audit event when audit records become active.
7. High-risk overrides must include who approved, reason, risk accepted, and rollback path.

## Approval Rules

- Approval must be explicit, scoped, and current.
- Approval cannot be inferred from vague permission.
- Approval does not carry across unrelated projects, services, domains, workflows, or time windows.
- Approval does not permit credentials or customer data to be committed.
- Approval does not bypass validation, CI, safe-merge policy, or Constitution rules.
- Approval does not authorize actions outside the approval lock.
- Approval must be rechecked immediately before execution.

## Foundation Limitation

Until approval records are active, owner approval is represented by the current task instruction and PR history. Live services, deployments, credentials, paid actions, production data, and domain changes remain blocked unless the owner gives explicit scoped approval.

Constitution activation must not happen until approval locks and audit events are ready for gated actions.
