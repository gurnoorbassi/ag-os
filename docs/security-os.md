# Security OS

## Purpose

Security OS defines baseline security controls, stop conditions, and owner-approval gates for AG Digitalz OS work.

This foundation is metadata and policy only. It does not store credentials, inspect live systems, change access, deploy, or connect services.

## Current Policy

```text
.codex/security/policy.json
```

Schema:

```text
schemas/security-policy.schema.json
```

## Required Controls

- `secret_handling`
- `data_sensitivity_review`
- `access_change_review`
- `connector_scope_review`
- `production_data_block`
- `safe_merge_security_review`

## Security Rules

- Credentials are not allowed in the repository.
- Production and customer data are not allowed in the repository.
- Live service changes require owner approval.
- Access changes require owner approval.
- Secret findings block merge.
- Domain and DNS changes require owner approval.
- Database migrations require owner approval.
- Paid actions require owner approval.

## Review Signals

Security review must stop or escalate when a change touches:

- Credentials
- Customer data
- Production data
- Access changes
- Live service changes
- Domain or DNS changes
- Database migrations
- Paid actions

## Validation

`npm run validate` checks that:

- The Security OS policy file exists.
- The Security OS schema exists.
- Every required control is present.
- Credentials are disallowed.
- Production and customer data are disallowed.
- Live service and access changes require owner approval.
- Secret findings block merge.

This validation is local and offline.
