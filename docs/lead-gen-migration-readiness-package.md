# Lead Gen Migration Readiness Package

Status: planning only. Not approved for execution.

Lead Gen is an existing finished production project and remains protected. This package prepares future migration stages without touching source code, VPS, Postgres, n8n workflows, domain/DNS, credentials, production data, or customer data.

## Migration Modes

Future migration must move through explicit owner-approved modes:

- `observe_only`: AG OS can document known facts and source-of-truth references only.
- `read_only`: AG OS may inspect approved records or code without modifying production.
- `managed_staging`: AG OS may prepare staging-only changes after separate approval.
- `production_managed`: AG OS may manage production only after explicit owner approval, rollback readiness, backups, monitoring, and incident response are proven.

Lead Gen currently remains protected and must not be modified by this package.

## Future Preconditions

Before any mode change:

- owner approval
- active approval lock
- project registry update
- data classification
- credential handling plan
- backup plan
- rollback plan
- n8n workflow inventory
- Postgres boundary plan
- VPS boundary plan
- domain/DNS ownership notes
- incident response path

## Hard Stops

Stop immediately if:

- source code modification is needed
- VPS access is needed
- Postgres access is needed
- n8n workflow edit or activation is needed
- credentials are needed
- production/customer data would be copied into AG OS
- deployment, domain/DNS, paid tools, outbound messages, or Constitution scope appears

## Safe Work Allowed Later

With owner approval, future safe work may include:

- migration checklist
- read-only architecture inventory
- staging plan
- backup and rollback proof plan
- security review plan
- cost plan

