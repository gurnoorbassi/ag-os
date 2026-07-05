# Production Management Readiness Package

Status: planning only. Not approved for execution.

This package defines what AG OS must prove before managing any production system. It does not deploy, change DNS, connect domains, access production data, change databases, activate workflows, or use paid tools.

## Production Preconditions

Before any production-managed mode:

- staging version proven
- owner approval
- active approval lock
- current backup verified
- rollback procedure tested or owner-approved
- monitoring plan
- incident commander placeholder
- RTO and RPO targets
- data classification
- credential rotation and revocation plan
- cost impact review
- post-deploy validation plan

## Required Evidence

The future production PR or execution package must include:

- source commit SHA
- staging URL and validation evidence
- deployment target
- environment variable policy
- migration plan if data changes exist
- rollback command or documented manual rollback path
- backup evidence
- incident response contacts or placeholders
- audit event template
- cost ledger plan

## Blocked by Default

The following remain blocked until explicit approval:

- production deployment
- custom domain
- domain/DNS change
- database migration
- production data access
- customer data access
- paid features
- credentials in source control
- active n8n workflow changes
- external outbound messages
- Lead Gen production management
- AI Receptionist production management

## Stop Conditions

Stop immediately if:

- staging has not been proven first
- rollback is missing
- backup status is unknown
- CI or validation is missing or failed
- data migration risk is unclear
- credentials would be exposed
- domain/DNS changes are bundled with unrelated changes
- production and staging scopes are mixed in one approval

