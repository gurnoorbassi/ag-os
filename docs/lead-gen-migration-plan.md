# Lead Generation Migration Plan

## Current Status

The lead generation system is out of scope for this foundation scaffold. This document exists to prevent accidental changes and to define the safe future path.

No lead generation files, services, credentials, data, workflows, deployments, or databases should be touched from AG Digitalz OS until a dedicated migration project is approved.

## Migration Principles

1. Inventory before integration.
2. Read-only before write access.
3. Fake payloads before real payloads.
4. Disabled workflows before activated workflows.
5. Backups before migrations.
6. Explicit approval before every production change.
7. Rollback plan before deployment.

## Future Phases

### Phase 0: Lock

Keep lead generation untouched. Record known boundaries and do not connect services.

### Phase 1: Inventory

Create a read-only inventory of:

- Repositories
- Domains
- Netlify sites
- n8n workflows
- Postgres databases and tables
- Webhooks
- Forms
- API integrations
- Credentials locations, without copying secrets
- Current deployment paths

### Phase 2: Risk Map

Classify:

- Customer data
- Revenue-critical paths
- Outbound messaging paths
- Paid API usage
- Database write paths
- DNS and routing dependencies
- Backup and restore options

### Phase 3: Shadow Records

Create AG Digitalz OS project records that describe existing lead generation components without modifying the live system.

### Phase 4: Read-Only Sync

Only after approval, add read-only checks that report status without mutating anything.

### Phase 5: Controlled Migration

Only after read-only evidence and approval, plan controlled changes behind feature flags, disabled workflows, backups, and rollback notes.

## Hard Stop Conditions

Stop and request approval if any task requires:

- Production credentials
- Database writes
- n8n workflow activation
- DNS changes
- Netlify deploy hooks
- Customer data export
- Outbound email or SMS
- Deleting old workflows, branches, or deployments

## Current Foundation Instruction

Treat the lead generation system as production-critical and untouched.
