# Analytics Read-only Package

Status: planning only. Not approved for execution.

This package defines the future path for read-only analytics collection for Social Media Management System v1. It does not call analytics APIs, connect accounts, store tokens, activate jobs, import history, or create dashboards from live data.

## Future Scope

A future owner-approved action may pull read-only analytics for approved accounts after OAuth and credential storage are separately approved.

Allowed future metrics must be explicitly named, such as:

- post views
- reach
- engagement count
- click count
- follower count
- publish timestamp

The future package must classify whether each metric is public, internal, confidential, restricted, customer data, or production data.

## Required Approval

Analytics access requires:

- owner approval
- active approval lock
- audit event
- approved account connection record
- approved credential storage path
- data classification
- retention window
- Cost OS check

## Data Handling

No analytics payload may be committed unless it is approved, sanitized, and classified. Raw platform responses are blocked by default.

Source-controlled records may store summary metadata only when approved:

- metric name
- date range
- source platform
- account handle
- collection status
- redacted evidence path

## Stop Conditions

Stop immediately if:

- an analytics API token is needed without approval
- a live analytics API call would occur during planning
- paid analytics access is required
- bulk historical import is requested
- private customer data or production data would be copied into AG OS
- social posting, scheduling, DMs, comments, n8n activation, deployment, domain/DNS, Lead Gen, AI Receptionist, or Constitution scope appears

## Validation Before Future Execution

Before any future analytics read:

- `npm.cmd run validate`
- `npm.cmd run boot:check`
- `node --test tests/*.test.mjs`
- approved account and credential records must exist
- data classification must be recorded
- retention and deletion rules must be documented

