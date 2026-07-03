# Lead Gen Project Migration Rules

## Purpose

These rules define when and how the existing lead generation system may later be represented inside AG Digitalz OS.

This document is planning and policy only. It does not touch the lead generation system, create a project record, connect services, read production data, deploy, migrate databases, change domains, or activate workflows.

## Current Status

Lead Gen is not registered in the AG OS Project Registry yet.

No Lead Gen record may be added until the owner explicitly approves a scoped migration PR.

## Migration Preconditions

Before any Lead Gen project record is created, the migration PR must define:

- Project owner
- Project ID
- Current production boundaries
- Data sensitivity
- Connected services
- Deployment surface
- Domain and DNS ownership
- Database and storage boundaries
- n8n workflow boundaries
- Rollback plan
- Quality evidence
- Security review
- Cost impact

## Hard Stops

Stop for owner approval before any work that includes:

- Credentials
- Live service calls
- Production data
- Customer data
- Database migrations
- Domain or DNS changes
- Deployments
- n8n workflow activation or mutation
- Paid actions
- External messages
- Changes inside the lead generation system repository or production server

## Allowed Foundation Work

Allowed before migration approval:

- Documentation
- Schema planning
- Migration checklist design
- Read-only source-controlled AG OS policy updates
- Local validation

## Project Registry Rule

The AG OS Project Registry must remain without a Lead Gen project record until a future owner-approved PR explicitly adds it.

The first Lead Gen registry PR must be separate from any live connection, deployment, database, DNS, or workflow activation work.

## Safety Requirements

Every future migration PR must confirm:

- No credentials are committed.
- No production/customer data is copied into AG OS.
- No live service is called unless explicitly approved.
- No deployment is triggered.
- No domain or DNS setting is changed.
- No paid action is triggered.
- `npm run validate` passes.

## Validation

`npm run validate` requires this rules document to exist. Future migration work should add schemas and offline validation before adding any Lead Gen project record.
