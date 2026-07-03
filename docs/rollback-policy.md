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

## Emergency Stop

If a task appears to risk credentials, production data, customer data, domain settings, billing, live workflows, or deployments, Codex must stop and request owner approval before continuing.

## Evidence

Rollback completion should include:

- Validation result.
- CI result when applicable.
- Diff or change reference.
- Owner approval reference when required.
- Audit event when audit records become active.
