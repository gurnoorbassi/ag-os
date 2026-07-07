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

Each option remains blocked until separately approved, implemented, tested, and audited.

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
