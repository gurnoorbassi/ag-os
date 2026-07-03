# Watchdog OS

## Purpose

Watchdog OS defines how AG Digitalz OS will eventually check local state, CI status, registries, stale memory, cost budgets, and security policy drift.

This foundation is policy only. It does not monitor, scrape, ping, notify, mutate, deploy, or trigger paid monitoring.

## Current Policy

```text
.codex/watchdog/policy.json
```

Schema:

```text
schemas/watchdog-policy.schema.json
```

## Defaults

Watchdog OS is disabled by default:

- Monitoring enabled: `false`
- Live checks allowed: `false`
- Mutations allowed: `false`
- Notifications allowed: `false`
- Paid monitoring allowed: `false`

## Planned Check Types

- `local_validation`
- `ci_status_review`
- `registry_consistency`
- `stale_memory_review`
- `cost_budget_review`
- `security_policy_review`

These are planned categories only. They do not activate live monitoring.

## Approval Rules

Owner approval is required before any:

- Live monitoring
- External notification
- Paid monitoring
- Mutation
- Production target check

## Validation

`npm run validate` checks that:

- The Watchdog OS policy file exists.
- The Watchdog OS schema exists.
- Monitoring is disabled by default.
- Live checks are disabled by default.
- Mutations are disabled by default.
- Notifications are disabled by default.
- Live monitoring and external notifications require owner approval.

This validation is local and offline.
