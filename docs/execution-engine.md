# Execution Engine Foundation

The Execution Engine defines how AG OS will run safe work after planning, routing, approval checks, validation checks, and cost checks pass.

This foundation is metadata only. It does not create a runtime executor, call live services, deploy code, connect credentials, or spend money.

## Allowed Foundation Step Types

Until a runtime exists, execution records may describe only these safe repository actions:

- `create_branch`
- `update_files`
- `run_validation`
- `open_pr`
- `check_ci`
- `safe_merge`
- `pull_main`
- `report_result`

These step types do not override the action matrix. Any gated change must stop unless the required approval lock, audit event, validation result, CI result, and PR evidence exist.

## Blocked Step Types

The foundation Execution Engine must not perform or describe automatic execution for:

- live connector actions
- deployment
- production data access
- customer data access
- credential handling
- domain or DNS changes
- paid actions
- database migrations
- destructive actions
- Lead Gen source, VPS, Postgres, n8n, domain, or deployment changes
- AI Receptionist repository changes unless that project is the explicit target and gates pass

## Execution Record Requirements

Future execution step records must identify:

- execution step ID
- source plan and job
- project ID
- step type
- status
- risk level
- approval ID when required
- command or action description
- expected result
- evidence required
- rollback requirement
- safety limits

## Status Model

Execution steps must use one of these statuses:

- `planned`
- `waiting_approval`
- `ready`
- `running`
- `blocked`
- `failed`
- `done`
- `cancelled`

## Safe Merge Gate

Safe merge is allowed only when all applicable conditions are true:

- action matrix allows auto-merge for the risk tier
- local validation passed
- GitHub Foundation CI passed
- changed files match the approved scope
- no credentials or production/customer data were added
- no live service, deployment, domain, or paid action occurred
- approval lock exists when required
- audit event exists when required after runtime support exists

## Relationship To Other OS Domains

The Execution Engine consumes plans and approval state from:

- Planner
- Approval Ledger
- Cost Ledger
- Command Registry
- Connector Registry
- Project Registry
- Quality OS
- Security OS

Execution results are reported to:

- Audit Trail
- State Management
- Watchdog Engine
