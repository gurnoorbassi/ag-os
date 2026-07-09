# Instagram Production Readiness

Target platform: Instagram

Target handle: `@agdigitalz`

Desired first connection mode: `connected_draft_only`

## OAuth Readiness Gates

OAuth may not start until:

- owner approves `approval-instagram-oauth-execution`
- secure credential storage is approved
- requested permissions match the readiness package
- tokens will not be printed, pasted into chat, or committed
- posting, scheduling, analytics, DMs/comments, and n8n activation remain blocked
- validation, boot check, security scan, and tests pass

## First Safe Production Step

The next owner decision is:

`Approve Instagram OAuth execution for @agdigitalz in connected_draft_only mode only.`

That approval must still exclude posting, scheduling, analytics, DMs/comments, n8n activation, paid tools, and credential storage in the repo.
