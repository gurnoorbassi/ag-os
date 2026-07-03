# Watchdog Alert Policy

## Purpose

Watchdog alerts should surface real risk without creating notification spam or sending external messages before approval.

This policy does not activate monitoring, notifications, WhatsApp, or live checks.

## Alert Channels

Default alert channel:

- Dashboard alerts first.

Future channel:

- WhatsApp later only with explicit owner approval.

No real WhatsApp messages may be sent before approval.

## Urgent Alert Criteria

Urgent alerts are allowed only for:

- CI failure.
- Security risk.
- Live-service risk.
- Production issue.
- Cost limit reached.
- Storage over `90%`.

## Anti-Spam Rules

- Group repeated alerts.
- Include clear owner action required.
- Avoid noisy low-priority alerts.
- Do not send external notifications without approval.

## Escalation

External alerting requires approval lock, channel scope, message template, recipient scope, quiet-hour behavior, and rollback or disable path.
