# Hosting Plan

## Current Status

No hosting is configured by this scaffold. This document records the intended hosting direction so future work can be planned safely.

## Stack Roles

### GitHub

GitHub is the source of truth for AG Digitalz OS artifacts. It owns:

- Version control
- Pull requests
- CI checks
- Change history
- Review records

### Hetzner VPS

The Hetzner VPS is the future host for persistent internal services that need long-running processes, private networking, or durable infrastructure.

Planned future uses:

- Internal OS API
- Worker services
- Secure n8n-adjacent utilities
- Monitoring or watchdog services

No VPS deployment is created in this foundation phase.

### Existing Postgres

Existing Postgres may become the durable state store after file-based schemas are stable.

Planned future uses:

- Projects
- Tasks
- Memory
- Cost records
- Quality records
- Security reviews
- Deployment records

No connection string, migration, or database client is added in this foundation phase.

### n8n

n8n remains the future orchestration layer for workflow automation. Workflows should be source-controlled as disabled exports before activation.

Planned future uses:

- Approval packet routing
- Periodic checks
- Project state sync
- Safe notification workflows
- Read-only reporting

No workflow is activated in this foundation phase.

### Netlify

Netlify can host future public or internal front-end surfaces.

Planned future uses:

- OS dashboard
- Project intake forms
- Public product landing pages
- Static docs

No Netlify site, deploy hook, build token, or DNS record is created in this foundation phase.

### Domain

The AG Digitalz domain can route future production surfaces after the hosting project is approved.

No DNS changes are made in this foundation phase.

### Base44

Base44 may be used for UI prototypes when useful, but it is not the system of record. Any useful prototype must be converted into reviewed source-controlled implementation work before becoming part of AG Digitalz OS.

## Hosting Sequence

1. Keep AG Digitalz OS file-based and validated in GitHub.
2. Add local fake data examples for schemas.
3. Add read-only dashboard prototype if useful.
4. Add Postgres schema plan with migration review.
5. Add read-only database integration in a separate PR.
6. Add disabled n8n workflow exports.
7. Add Netlify preview deployment for UI only.
8. Add Hetzner deployment plan for persistent API or workers.
9. Add production deployment with explicit approval, rollback, and monitoring.

## Deployment Readiness Checklist

Before any deployment exists:

- A project record describes the deployment.
- The deployment target is named.
- Required secrets are listed but not committed.
- Rollback is documented.
- CI validates build and tests.
- Data sensitivity is reviewed.
- Cost impact is estimated.
- Approval is captured.
