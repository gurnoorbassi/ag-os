# Social Posting OS

Social Posting OS defines how AG OS may eventually publish approved AG Digitalz social content. It is a governed production path, not a shortcut around approval gates.

Current status: foundation only.

AG Digitalz target account:
- Platform: Instagram
- Handle: `@agdigitalz`
- Account state: `access_requested`
- Mode: `draft_only`
- OAuth: ready after a separate owner-approved execution lock and connector path exist
- Credential reference: `credential-ref-instagram-agdigitalz-oauth`
- Live posting: blocked
- Scheduling: blocked
- Analytics: blocked
- DMs/comments: blocked
- n8n activation: blocked

## Source Of Truth

- Account record: `.codex/social/accounts/ag-digitalz-instagram.json`
- Credential reference: `.codex/credentials/credential-ref-instagram-agdigitalz-oauth.json`
- OAuth preflight: `.codex/social/preflight/social-preflight-instagram-oauth-agdigitalz.json`
- Production policy: `.codex/social/policies/production-posting-policy.json`
- Draft content sprint: `.codex/client-management/content-sprints/content-sprint-ag-digitalz-first-content-sprint-v1.json`
- OAuth readiness plan: `.codex/social/instagram-oauth-plan-20260704-agdigitalz.json`

## Permission Boundary

OAuth approval does not allow posting.

`connected_draft_only` does not allow posting.

Draft content approval does not allow posting.

Memory, accepted lessons, candidate lessons, skills, dashboard state, or connector auth state never grant posting permission.

Posting requires an exact owner approval lock for one post or an exact approved schedule. Scheduling and analytics require separate approval.

Credential reference readiness does not mean Instagram is connected. The source-controlled credential reference contains no secret value and only points at the external credential store path that must be used later after final owner approval.
