# Command Registry

## Purpose

The Command Registry defines owner command categories, approval levels, execution modes, and default safety rules for AG Digitalz OS.

It is a policy registry only. It does not execute commands, connect services, store credentials, deploy, send messages, activate workflows, or change domains.

## Command-Driven Execution

The owner gives outcomes. AG OS handles safe execution steps such as branch creation, local validation, PR creation, CI review, safe merge, and next-task selection when the command category and action matrix allow it.

The owner should not need to micromanage routine safe execution. AG OS must still stop when approval gates, stop conditions, or the action matrix require owner approval.

## Current Registry

```text
.codex/commands/registry.json
```

Schema:

```text
schemas/command-registry.schema.json
```

## Command Categories

The foundation registry defines these categories:

- `discuss_only`
- `plan_only`
- `build`
- `deploy_staging`
- `deploy_production`
- `connect_service`
- `change_domain`
- `send_message`
- `stop_all`
- `rollback`
- `audit`

## Approval Levels

- `none`: Safe discussion, planning, or offline inspection.
- `plan_required`: Local build work may proceed when the requested scope is clear and validation remains offline.
- `owner_approval_required`: The command must not execute until the owner explicitly approves the specific action and target.
- `hard_stop`: Reserved for future commands that must stop without a new approval path.

## Execution Modes

- `discussion`: Respond with analysis only.
- `planning`: Produce a plan only.
- `local_safe`: Work only in the repository and use offline validation.
- `approval_gated`: Prepare plans or approval packets only.
- `blocked`: Reserved for future disabled categories.

## Default Rules

By default, commands may not:

- Store or request credentials
- Make live service calls
- Deploy
- Activate workflows
- Change domains or DNS
- Send SMS, email, chat, or customer-facing messages
- Trigger paid actions
- Read or write production data

Any exception requires a future scoped request, explicit owner approval, validation, and a reviewed PR when source-controlled files change.

The canonical execution decision table is `docs/action-matrix.md`.

## Validation

`npm run validate` checks that:

- The command registry file exists.
- The command registry schema exists.
- Every required command category is present.
- Category IDs are not duplicated.
- High-risk categories require owner approval.
- Production deployment, service connection, domain change, and message-sending categories are not allowed by default.

This validation remains offline and does not contact live services.
