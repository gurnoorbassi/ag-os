# Runtime Direction

## Purpose

This document defines the preferred future runtime direction for AG OS without creating deployments, credentials, databases, domains, or live service connections.

## Preferred Runtime

- Dashboard on Netlify.
- Coordinator on Hetzner VPS.
- Existing Postgres for AG OS data where practical.
- n8n for automations.
- GitHub as source of truth.
- Domain or subdomain only with owner approval.

## PC Role

The owner's PC is not the primary runtime.

PC sync is optional for local development, inspection, and operator convenience. The always-on runtime target is the VPS.

## Existing Postgres Direction

Use existing Postgres where practical, with a separate AG OS database or schema.

Rules:

- Do not touch Lead Gen production tables without owner approval.
- No destructive migration without owner approval.
- Backups are required before migration.
- Migration PRs must include rollback steps.

## Netlify Dashboard Direction

Dashboard v1 is read-only by default.

- Netlify staging deploys require owner approval or an approved staging capability.
- Production deploys require owner approval.
- Domain and DNS changes require owner approval.
- Dashboard must not expose credentials, production data, customer data, billing data, or live mutation controls by default.

## Runtime Promotion

Runtime promotion requires approval locks, usage ledger review when paid services are involved, backup and rollback plans, and audit events when audit records are active.
