# Instagram OAuth Execution Preflight v1

Target platform: Instagram

Target handle: `@agdigitalz`

Desired connection mode: `connected_draft_only`

## Approved Reference Path

AG OS may reference the future OAuth credential with:

`credential-ref-instagram-agdigitalz-oauth`

The reference points to `future_secure_connector_credential_store`. It contains no token, password, OAuth code, API key, recovery code, session cookie, or private secret.

## Required Future Approval

Before OAuth can execute, the owner must approve an active lock based on:

`.codex/approvals/approval-instagram-oauth-execution.template.json`

The approval must remain scoped to:

- Instagram only
- `@agdigitalz` only
- `connected_draft_only` only
- no posting
- no scheduling
- no analytics
- no DMs/comments
- no n8n activation
- no paid tools
- no domain/DNS
- no repo-stored credentials

## Requested Permission

Requested permission:

- `instagram_business_basic`

Excluded permissions:

- content publish
- insights/analytics
- comments
- messages
- ads
- webhook subscriptions

## Current Blockers

- final owner approval is missing
- live Instagram OAuth connector path is not recorded
- OAuth has not been executed
- Instagram is not connected

## Stop Conditions

Stop before OAuth if any token would be shown, copied into chat, stored in Git, logged, placed in dashboard data, or stored in an audit/cost/client record.

Stop before any permission request expands beyond `connected_draft_only`.
