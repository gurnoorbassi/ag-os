# Instagram Production Readiness

Target platform: Instagram

Target handle: `@agdigitalz`

Desired first connection mode: `connected_draft_only`

## OAuth Readiness Gates

OAuth may not start until:

- owner approves `approval-instagram-oauth-execution`
- credential reference `credential-ref-instagram-agdigitalz-oauth` points to the approved external secure connector credential store
- the active connector path can store tokens outside Git, chat, logs, dashboard data, audit payloads, and client records
- requested permissions match the readiness package
- tokens will not be printed, pasted into chat, or committed
- posting, scheduling, analytics, DMs/comments, and n8n activation remain blocked
- validation, boot check, security scan, and tests pass

## Current Preflight State

- credential reference: `credential-ref-instagram-agdigitalz-oauth`
- credential reference status: `approved_reference`
- credential secret value in repo: `false`
- social preflight record: `.codex/social/preflight/social-preflight-instagram-oauth-agdigitalz.json`
- current blocker: final owner approval and live OAuth connector path are still missing
- account state: `access_requested`
- OAuth status: `ready_after_approval`

The readiness state does not connect Instagram and does not authorize posting.

## First Safe Production Step

The next owner decision is:

`Approve Instagram OAuth execution for @agdigitalz in connected_draft_only mode only.`

That approval must still exclude posting, scheduling, analytics, DMs/comments, n8n activation, paid tools, and credential storage in the repo.
