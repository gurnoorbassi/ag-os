# Social OAuth Readiness Package

Status: planning only. Not approved for execution.

This package defines what must be ready before AG OS can request or use social account OAuth for Social Media Management System v1. It does not start OAuth, connect accounts, store credentials, post, schedule, pull analytics, or call any social API.

## Current Owner Decision

The owner approved 21 AG Digitalz post packages and one weekly report as draft content only.

This approval does not authorize:

- live posting
- scheduling
- social OAuth
- account connection
- analytics API access
- DMs or comments
- n8n activation

The official public Instagram handle is now recorded as `@agdigitalz`. TikTok, YouTube Shorts, and LinkedIn remain `not_provided`, and AG OS must keep those platforms in `pending_owner_input` until the owner provides exact public handles.

## Platforms

Future OAuth readiness may cover only these platforms unless the owner expands scope:

- Instagram
- TikTok
- YouTube Shorts
- LinkedIn

Each platform requires separate owner approval before OAuth can start. If a platform handle remains `not_provided`, that platform remains blocked.

## Future Scope

A future owner-approved action may request access to explicitly named platform accounts for one approved client and brand in `connected_draft_only` mode first.

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

## Required Permissions

AG OS must request the narrowest permissions needed for `connected_draft_only` readiness. Initial permissions may support only account identity verification, draft metadata preparation, and connection status recording.

The following remain separately gated and not included in this readiness package:

- publishing
- scheduling
- analytics pulls
- comments
- direct messages
- paid advertising
- webhook activation
- n8n workflow activation

If a platform bundles these capabilities with OAuth, AG OS must stop and ask for a narrower scope or a new owner approval.

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
- per-platform owner approval

Client approval is not AG OS owner approval. A client may approve draft content or account access, but AG OS still needs owner approval before connector execution.

## Credential Policy

Credentials, refresh tokens, access tokens, app secrets, webhook secrets, and OAuth codes must never be committed to Git.

If OAuth requires a token, AG OS must stop until a secure storage path is approved. Source-controlled records may store only metadata such as connection status, platform name, handle, approved scope, and revocation instructions.

## Rollback Plan

If a future OAuth connection is approved and then must be rolled back, AG OS must:

- mark the connection status as revoked or disconnected in source-of-truth records
- revoke the platform app authorization in the platform UI where possible
- remove or rotate any token from the approved secret store
- write an audit event
- update the connector result record
- keep live posting, scheduling, analytics, DMs/comments, and n8n activation blocked unless separately approved

## Default State

Until this package is executed under a future approval:

- account status remains `not_connected`
- posting mode remains `draft_only`
- approval required remains `true`
- live posting remains blocked
- scheduling remains blocked
- analytics API remains blocked
- social OAuth status remains `not_connected`
- credentials stored remains `false`

## Stop Conditions

Stop immediately if:

- OAuth would start without an active approval lock
- a platform handle is `not_provided`
- a credential or token would be copied into AG OS
- a platform asks for broader scopes than approved
- live posting, scheduling, DMs, comments, or analytics permissions are bundled without approval
- paid platform access is required
- real client private data is needed before owner approval
- Lead Gen, AI Receptionist, domain/DNS, deployment, or Constitution scope appears
- validation, dashboard check, boot check, or tests fail

## Validation Before Future Execution

Before any future OAuth action:

- `npm.cmd run dashboard:build`
- `npm.cmd run dashboard:check`
- `npm.cmd run validate`
- `npm.cmd run boot:check`
- `node --test tests/*.test.mjs`
- approval lock scope must match the exact client, brand, platform, handle, and OAuth permission set
