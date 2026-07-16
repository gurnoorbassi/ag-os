# Watchdog OS

## Purpose

Watchdog OS checks AG Digitalz OS local runtime health, boot readiness, action monitoring, stale approvals, budget posture, and validation state on a recurring schedule.

The built-in watchdog runs inside the private coordinator every 60 seconds when `AG_OS_INTERNAL_WATCHDOG_ENABLED=true`. It writes local evidence only. It does not scrape, ping external services, notify, mutate, deploy, or trigger paid monitoring.

## Current Policy

```text
.codex/watchdog/policy.json
```

Schema:

```text
schemas/watchdog-policy.schema.json
```

## Defaults

External Watchdog actions remain disabled by default:

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

The private coordinator uses the implemented local subset. CI review and all external or production-target monitoring stay approval-gated.

## Approval Rules

Owner approval is still required before any:

- Live monitoring
- External notification
- Paid monitoring
- Mutation
- Production target check

## Alert Policy

Dashboard alerts come first.

WhatsApp or other external alerts are future-only and require explicit owner approval before any real message is sent.

Urgent alerts are limited to CI failure, security risk, live-service risk, production issue, cost limit reached, or storage over `90%`.

Watchdog must avoid alert spam by grouping repeated alerts and making owner action clear.

## Validation

`npm run validate` checks that:

- The Watchdog OS policy file exists.
- The Watchdog OS schema exists.
- Monitoring is disabled by default.
- Live checks are disabled by default.
- Mutations are disabled by default.
- Notifications are disabled by default.
- Live monitoring and external notifications require owner approval.

This validation is local and offline. Runtime freshness is derived from `.codex/watchdog/watchdog-runtime-internal-state.json`; generated dashboard data does not fabricate that evidence.

See also `docs/watchdog-alert-policy.md`.
