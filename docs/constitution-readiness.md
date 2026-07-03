# Constitution Readiness

## Purpose

This document defines what must exist before Constitution v1 can become the active governing contract for AG Digitalz OS.

This readiness foundation does not activate Constitution v1. It adds the governance pieces needed to draft, review, and approve Constitution v1 safely.

## Current Status

AG Digitalz OS remains in foundation mode.

This repository may define docs, schemas, templates, registries, and offline validation. It must not connect live services, store credentials, deploy, change domains, use production data, trigger paid actions, or mutate customer systems.

## Required Governance Pieces

Constitution v1 must not become active until these pieces are present and reviewed:

- Authority order that defines the source of truth hierarchy.
- Final authority rule that keeps the owner as the final decision maker.
- Approval workflow for gated actions.
- Approval lock schema for scoped owner approvals.
- Owner and role model.
- Audit event schema for governance history.
- Data classification rules.
- Incident levels and response process.
- Rollback policy.
- Validation limits.
- Constitution amendment rules.

## Readiness Gates

Before Constitution v1 may be activated:

1. `npm run validate` must pass.
2. The Constitution v1 PR must be separate from live service, deployment, domain, billing, database, or production-data work.
3. The PR must explicitly state whether it changes authority, approvals, safety gates, or trust levels.
4. The owner must approve Constitution v1 activation.
5. Any exception or waiver must be documented in the PR and must not weaken credential, production-data, deployment, domain, billing, or live-service protections without explicit owner approval.

## Constitution Activation Rule

Constitution v1 becomes active only after a future PR adds the Constitution document, passes validation and CI, and is approved under the authority order in `docs/authority-order.md`.

Until then, existing operating rules, safe-merge policy, registries, policy files, and explicit owner instructions govern AG Digitalz OS.

## Amendment Rules

After Constitution v1 is active, amendments must follow these rules:

- Amendments require a scoped PR.
- Amendments must identify the changed section, reason, risk, and expected operating effect.
- Amendments that change authority, approval gates, data policy, deployments, live services, paid actions, production data, or security controls require explicit owner approval.
- Amendments must pass validation and CI before merge.
- Amendments must preserve a rollback path.
- Amendments should produce an audit event when the audit registry becomes active.

## Non-Activation Statement

This readiness foundation is not a Constitution. It does not authorize new capabilities, live integrations, deployments, credentials, production data, paid actions, or domain changes.
