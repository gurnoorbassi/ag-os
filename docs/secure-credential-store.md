# Secure Credential Store Foundation v1

AG OS cannot execute OAuth or live credentialed connector work until a credential store is approved and operational.

This foundation defines references only. It does not create, store, print, or use credentials.

## Allowed Reference Model

Credential reference records may describe:

- credential reference id
- provider
- purpose
- storage backend
- allowed connectors
- prohibited uses
- rotation policy
- revocation policy
- audit requirement

Credential reference records must never contain:

- OAuth token values
- API keys
- passwords
- private keys
- recovery codes
- session cookies
- copied secrets

## Planned Storage Options

The only planned storage options are:

- future secure connector credential store
- future local encrypted secret store
- future platform environment variables, owner-approved

The Instagram `@agdigitalz` OAuth path now has one approved reference-only destination:

- `.codex/credentials/credential-ref-instagram-agdigitalz-oauth.json`
- storage backend: `future_secure_connector_credential_store`
- status: `approved_reference`

This is not a stored secret. It is only the source-controlled id AG OS may use later to point at an external approved credential store. The external credential store and OAuth connector still require final owner approval before use.

Other storage options remain blocked until separately approved, implemented, tested, and audited.

## Forbidden Storage Locations

Credential values are forbidden in:

- GitHub repository files
- Git commits
- pull request bodies
- chat messages
- `dashboard/dashboard-data.js`
- logs
- audit event secret values
- cost ledgers
- client records

## First Candidate Use Case

The first candidate credential use case is Instagram `@agdigitalz` in `connected_draft_only` mode.

The credential reference path is ready for preflight, but OAuth is not active and Instagram is not connected.

Even after credential storage exists, the following remain separately blocked until owner-approved:

- posting
- scheduling
- analytics API pulls
- DMs/comments
- n8n activation

## Owner Approval

Any credential use requires:

- owner approval
- active approval lock
- credential reference record
- credential store approval
- connector preflight
- secret scan
- audit event
- rollback or disconnect plan

No AG OS process may bypass these gates.
