# Rollback Policy

## Purpose

This document defines rollback requirements for AG Digitalz OS changes.

Rollback planning is required before risky changes and before any future live, deployment, database, domain, workflow, production-data, customer-data, or paid action.

## Rollback Requirements

Every rollback plan must identify:

- Target artifact, service, project, or record.
- Current state.
- Previous known-good state.
- Rollback method.
- Data impact.
- User or customer impact.
- Required approval.
- Validation after rollback.
- Residual risk.

## Foundation Rollbacks

For foundation-mode docs, schemas, READMEs, templates, registries, and validation, rollback should normally happen through a source-controlled PR that reverts or supersedes the change.

Direct destructive rollback is not allowed unless the owner explicitly approves the exact target and method.

## Live Rollbacks

Rollback involving live services, deployments, domains, databases, workflows, credentials, billing, production data, or customer data requires owner approval before execution.

Foundation mode may prepare rollback plans, but must not execute live rollback actions.

## Production Rollback Procedure

Before production rollback:

1. Confirm owner approval.
2. Confirm incident level or rollback reason.
3. Identify current state and previous known-good state.
4. Confirm backup or recovery point when data may be affected.
5. Confirm RTO and RPO targets when defined.
6. Confirm customer, production, credential, billing, and domain impact.
7. Execute only the approved rollback action.
8. Validate the restored state.
9. Document residual risk.
10. Record an audit event when audit records are active.

If any required item is missing, stop and request owner approval.

## Emergency Stop

If a task appears to risk credentials, production data, customer data, domain settings, billing, live workflows, or deployments, Codex must stop and request owner approval before continuing.

Emergency stop may prepare a plan, preserve local evidence, and identify targets. It must not mutate live systems without owner approval or a future explicitly delegated incident scope.

## Evidence

Rollback completion should include:

- Validation result.
- CI result when applicable.
- Diff or change reference.
- Owner approval reference when required.
- Audit event when audit records become active.
