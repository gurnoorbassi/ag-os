# Social OAuth Readiness Package

Status: planning only. Not approved for execution.

This package defines what must be ready before AG OS can request or use social account OAuth for Social Media Management System v1. It does not start OAuth, connect accounts, store credentials, post, schedule, pull analytics, or call any social API.

## Future Scope

A future owner-approved action may request access to explicitly named platform accounts for one approved client and brand.

The future action must define:

- client record path
- brand record path
- platform names
- account handles
- permission scopes requested
- approval owner
- credential storage destination
- revocation path
- rollback plan

## Required Approval

Social OAuth requires:

- owner approval
- active approval lock
- audit event
- Cost OS review
- Security OS review
- data classification review
- per-client and per-platform scope
- explicit expiration

Client approval is not AG OS owner approval. A client may approve draft content or account access, but AG OS still needs owner approval before connector execution.

## Credential Policy

Credentials, refresh tokens, access tokens, app secrets, webhook secrets, and OAuth codes must never be committed to Git.

If OAuth requires a token, AG OS must stop until a secure storage path is approved. Source-controlled records may store only metadata such as connection status, platform name, handle, approved scope, and revocation instructions.

## Default State

Until this package is executed under a future approval:

- account status remains `not_connected`
- posting mode remains `draft_only`
- approval required remains `true`
- live posting remains blocked
- scheduling remains blocked
- analytics API remains blocked

## Stop Conditions

Stop immediately if:

- OAuth would start without an active approval lock
- a credential or token would be copied into AG OS
- a platform asks for broader scopes than approved
- live posting, scheduling, DMs, comments, or analytics permissions are bundled without approval
- paid platform access is required
- real client private data is needed before owner approval
- Lead Gen, AI Receptionist, domain/DNS, deployment, or Constitution scope appears

## Validation Before Future Execution

Before any future OAuth action:

- `npm.cmd run validate`
- `npm.cmd run boot:check`
- `node --test tests/*.test.mjs`
- approval lock scope must match the exact client, brand, platform, handle, and OAuth permission set

