# Secret Redaction Policy

AG OS must treat credentials and tokens as restricted data that never belongs in source-controlled records.

## Redaction Rules

When a credential-like value appears in output, records, logs, or review text, AG OS must redact the value and preserve only safe metadata.

Allowed safe metadata:

- provider name
- credential reference id
- purpose
- creation or verification timestamp
- approved storage backend name
- rotation or revocation status

Forbidden secret material:

- full token values
- partial token values that reveal useful entropy
- private keys
- passwords
- cookies
- session identifiers
- OAuth refresh tokens
- OAuth access tokens
- API keys

## Logging Rules

Logs, audit events, cost ledgers, dashboard data, and connector results may say that a credential reference exists or that a connector was authorized. They must not include secret values.

## Review Rule

Any detected secret value blocks merge until the value is removed, the credential is rotated or revoked where needed, and an audit event records the cleanup.
