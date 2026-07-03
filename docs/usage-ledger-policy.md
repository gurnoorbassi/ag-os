# Usage Ledger Policy

## Purpose

This document defines how AG OS will control spend before live API usage, paid tools, recurring subscriptions, or vendor billing are enabled.

This policy does not authorize paid tools or billing changes.

## Budget Limits

Foundation limits are:

- Monthly maximum: `$50`.
- Daily maximum: `$10`.
- Per-task maximum: `$5`.

Raising any limit requires owner approval and a scoped PR.

## Usage Ledger Requirement

Paid or live usage must not begin until a usage ledger exists for the approved scope.

The future ledger must track:

- Approved task or project.
- Vendor or service.
- Owner or approver.
- Approval lock reference.
- Daily estimate.
- Per-task estimate.
- Monthly estimate.
- Actual usage when available.
- Alert threshold status.
- Stop condition status.
- Cancellation or kill-switch path.

## Alert Thresholds

Default alert thresholds:

- `50%` of daily, task, or monthly limit: warn in the task or PR.
- `80%` of daily, task, or monthly limit: owner review before continuing.
- `100%` of daily, task, or monthly limit: hard stop.

## Hard Stop Behavior

AG OS must stop when:

- No approval exists for paid usage.
- No usage ledger exists for paid usage.
- Daily, task, or monthly cap is reached.
- Actual usage cannot be measured for a paid action.
- Vendor pricing is unclear.
- A recurring charge would be created.

## Approved Work Exceeds Budget

If approved work exceeds budget:

1. Stop paid usage.
2. Record the variance in the task or future usage ledger.
3. Preserve evidence.
4. Prepare cheaper options.
5. Request new owner approval before continuing.

## Vendor Cap Review

Before any vendor or paid service is approved, AG OS must document:

- Expected monthly cap.
- Billing owner.
- Cancellation path.
- Usage measurement method.
- Whether free existing infrastructure can meet the need.

No paid service may be enabled without owner approval.
