# Instagram OAuth Readiness Package

Status: planning only. Not approved for execution.

This package prepares the approval boundary for a future Instagram OAuth connection for AG Digitalz. It does not start OAuth, connect Instagram, store credentials, post, schedule, pull analytics, use DMs/comments, activate n8n, or call social APIs.

## Target

- Platform: Instagram
- Public handle: `@agdigitalz`
- Project: `project-social-media-management-system-v1`
- Client: `client-ag-digitalz-internal`
- Desired future connection mode: `connected_draft_only`

TikTok, YouTube Shorts, and LinkedIn remain `not_provided` and `pending_owner_input`.

## Connected Draft-Only Meaning

`connected_draft_only` would mean a future approved OAuth action may verify and connect the Instagram account for draft-mode workflow readiness only.

It does not authorize:

- posting
- scheduling
- analytics pulls
- DMs or comments
- outbound messages
- n8n activation
- paid tools
- production/customer data handling

The Social Media Management System must continue to show:

- `connectionStatus`: `not_connected` until the future OAuth action succeeds
- `postingMode`: `draft_only`
- `approvalRequired`: `true`
- `livePostingBlocked`: `true`
- `credentialsStored`: `false`

## Requested OAuth Purpose

The future OAuth action, if separately approved, may request the narrowest available Instagram permission set needed to verify the account identity, confirm the handle/account relationship, and record connection metadata in AG OS.

The first connection milestone is not allowed to publish, schedule, read analytics, moderate comments, send or read messages, or activate automation.

## Requested Permissions

The requested permission set must be confirmed against the current Meta documentation immediately before execution.

Preferred initial permission:

- `instagram_business_basic`: verify Instagram professional account identity and basic account metadata when using Instagram API with Instagram Login.

Fallback only if the selected Meta OAuth path requires Facebook Login for Business:

- `instagram_basic`: basic Instagram professional account metadata.
- `pages_show_list`: discover the Facebook Page relationship required to locate the connected Instagram professional account.

Do not request these permissions in the first connected-draft-only approval:

- `instagram_business_content_publish`
- `instagram_content_publish`
- `instagram_business_manage_insights`
- `pages_read_engagement`
- `instagram_business_manage_comments`
- `instagram_manage_comments`
- `instagram_business_manage_messages`
- `instagram_manage_messages`
- ads, webhook, payment, lead, or messaging permissions

If Meta bundles broader scopes into the connection flow, AG OS must stop and ask the owner for a new approval.

## Credential Storage Policy

No credentials, OAuth codes, access tokens, refresh tokens, app secrets, webhook secrets, client secrets, cookies, or session values may be committed to Git or written into AG OS source-controlled records.

Any future token must live only in an owner-approved secure connector or credential store. Source-controlled AG OS records may store only metadata such as:

- platform
- public handle
- connection mode
- connection status
- approval ID
- non-secret connector result ID
- revocation instructions
- timestamp

## Rollback And Disconnect Plan

If a future Instagram OAuth connection is approved and then must be rolled back, AG OS must:

1. Mark Instagram connection status as `revoked` or `disconnected` in source-of-truth records.
2. Revert Social Media Management System UI state to `not_connected` and `draft_only`.
3. Revoke app access in Meta/Instagram owner-controlled settings where available.
4. Remove or rotate any credential from the approved secure credential store.
5. Write an audit event.
6. Record a connector execution result.
7. Keep posting, scheduling, analytics, DMs/comments, and n8n activation blocked.

## Risk Assessment

Risk level: `R4`, because OAuth can grant third-party account access even when no posting permission is requested.

Main risks:

- requesting broader scopes than needed
- token exposure
- accidental upgrade from draft-only to live posting
- confusing Instagram connection with publishing approval
- Meta app-review or account-type prerequisites blocking the flow
- storing secret material in the repo

Controls:

- owner approval required before execution
- active approval lock required
- least-privilege permissions only
- secure credential storage required before any token exists
- explicit audit event required
- no posting/scheduling/analytics permissions in this package
- validation, dashboard check, boot check, and tests must pass before execution

## Stop Conditions

Stop immediately if:

- owner approval is missing
- approval lock is missing, expired, revoked, or scope-mismatched
- OAuth would start during readiness work
- any credential or token would be copied into AG OS or GitHub
- Meta requests publishing, scheduling, analytics, comments, messages, ads, webhooks, or broader permissions without a new approval
- Instagram handle differs from `@agdigitalz`
- target platform is not Instagram
- connection mode is not `connected_draft_only`
- posting, scheduling, analytics, DMs/comments, or n8n activation becomes necessary
- paid tools are required
- domain/DNS, Lead Gen, AI Receptionist, or Constitution scope appears
- validation, dashboard check, boot check, tests, or security scan fails

## Audit Requirements

Before any future OAuth execution, AG OS must have:

- owner approval
- active approval lock
- audit event for approval
- cost ledger entry
- connector execution plan
- credential storage destination approved outside Git
- rollback plan confirmed

After any future execution attempt, AG OS must record:

- connector result
- audit event
- cost ledger
- connection status
- whether credentials were stored in the approved secure store
- whether any prohibited action remained blocked

## Cost Estimate

Expected direct cost for readiness planning: `$0`.

Future OAuth execution must stop if a paid Meta, connector, hosting, or third-party feature becomes required without owner approval.

## References

- Meta Instagram Platform documentation: https://developers.facebook.com/documentation/instagram-platform
- Meta Instagram API with Instagram Login documentation: https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login
- Meta Business Login for Instagram documentation: https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/business-login
- Meta Permissions Reference: https://developers.facebook.com/docs/permissions/
