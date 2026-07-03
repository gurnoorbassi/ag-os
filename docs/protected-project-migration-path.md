# Protected Project Migration Path

## Purpose

Protected projects need a read-only-first migration path before AG OS can manage them. This prevents AG OS from damaging finished production work or active product projects while it learns the project shape.

## Protected Projects

Current protected projects:

- Lead Generation System: finished production project, observe-only unless owner approves a scoped change.
- AG Digitalz AI Receptionist: separate active product project, not AG OS core.

## Read-Only Inventory Phase

AG OS may document known metadata and prepare future migration plans. It must not:

- Touch Lead Gen source code.
- Touch Lead Gen VPS, Postgres, n8n workflows, domain, DNS, or deployment path.
- Modify the AI Receptionist repo.
- Connect credentials.
- Deploy.
- Use production or customer data.
- Activate workflows.
- Create paid services.

Inventory should capture only owner-approved or repository-visible facts:

- Project name and status.
- Management mode.
- Source location or repository when known.
- Runtime direction.
- Database direction.
- Automation direction.
- Domain status at a high level.
- Unknowns as `REQUIRED_` placeholders only in templates.

## Migration Planning Phase

A migration plan must include:

- Source of truth target.
- Backup requirement.
- Rollback requirement.
- Data classification.
- Credentials and secret handling plan.
- CI and validation plan.
- n8n workflow backup and disabled-first approach when workflows are involved.
- Cost estimate.
- Approval gates.
- Incident response path.

## Approved Migration Phase

Migration work requires owner approval and must be split into small PRs. Each PR should have one clear purpose and evidence that validation, boot checks, and relevant tests pass.

For Lead Gen, the default remains observe-only until the owner approves a specific source migration, workflow backup, database access, deployment path, or domain change.

For AI Receptionist, the default remains separate product management. AG OS may reference its registry record but must not change the repo without scoped approval.

## Rollback Requirements

Before any live or production-adjacent migration step:

- Confirm backup location and restore method.
- Confirm who can approve rollback.
- Confirm expected recovery time and recovery point targets when known.
- Confirm disable path for workflows.
- Confirm audit event and incident path.

## Stop Conditions

Stop immediately before:

- Credentials.
- Live service calls.
- VPS access.
- Postgres access.
- n8n workflow activation or edits.
- Domain or DNS changes.
- Deployment.
- Paid actions.
- Production or customer data handling.
- Destructive migrations.
- Broad refactors.
- Any change to Lead Gen production or AI Receptionist repo outside approved scope.
