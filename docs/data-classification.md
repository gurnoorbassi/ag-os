# Data Classification

## Purpose

This document defines the data sensitivity levels AG Digitalz OS must use before handling real records, memory, audit events, project records, or future runtime state.

## Levels

| Level | Meaning | Foundation Handling |
| --- | --- | --- |
| `none` | No sensitive data. Public docs, schemas, empty templates, and generic policies. | Allowed. |
| `internal` | AG Digitalz operating metadata that is not secret and not customer-specific. | Allowed when production-clean. |
| `customer` | Client, lead, user, or customer-specific information. | Blocked in foundation mode. |
| `secret` | Credentials, tokens, API keys, private keys, passwords, certificates, database URLs, or signing secrets. | Always blocked from the repo. |
| `regulated` | Data subject to legal, financial, health, identity, contractual, or jurisdiction-specific handling duties. | Blocked unless a future owner-approved policy exists. |

## Handling Rules

- Schemas and docs may describe sensitive categories, but must not include real sensitive values.
- Customer, production, secret, or regulated data must not be used in examples, fixtures, tests, memory records, or docs during foundation mode.
- Internal metadata must be minimal and source-controlled only when it helps governance.
- Secrets must live outside this repository in an approved secret manager or platform-specific secret store after a future approval.
- If classification is unclear, treat the data as the more sensitive level.

## Review Triggers

Security review is required when a change touches:

- Authentication or authorization.
- Webhooks or public endpoints.
- Database access.
- File uploads or exports.
- Customer data.
- Production data.
- Agent write permissions.
- Paid API actions.
- Credentials or secret handling.

## Data Downgrade Rule

Data classification may not be downgraded without owner approval and a documented reason. Redaction does not automatically make data safe; the redacted artifact must be reviewed on its own.
