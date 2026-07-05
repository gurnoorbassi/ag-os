# Social Media System v1.1 Upgrade Package

Status: approval package only.

This package prepares a future owner-approved GitHub PR milestone for Social Media Management System v1.1. It does not execute the upgrade, create a branch, edit the target repo, open a target PR, deploy, connect social accounts, activate n8n, or use credentials.

## Target

- Project: Social Media Management System v1
- Target repo: `gurnoorbassi/ag-social-media-management-system`
- Current staged mode: draft/staging only
- Current staging URL: `https://ag-social-media-management-system-staging.netlify.app`

## Proposed Future Action

After separate owner approval, AG OS may:

- create one branch in the target repo
- update the static starter app for v1.1
- open one pull request to `main`
- stop before merge, deployment, account connection, scheduling, posting, analytics, or n8n activation

## v1.1 Upgrade Scope

The future upgrade should improve usability while keeping all live actions blocked:

- better client config workflow
- better content intake form UI
- better content calendar view
- better post package builder UI
- better approval queue status
- better weekly report draft
- clearer blocked live actions panel
- safe static export or download of draft post packages if it can be done without live services

## Expected Safety Defaults

Every starter config remains:

- `not_connected`
- `draft_only`
- `approval_required: true`
- `live_posting_blocked: true`
- credentials not stored
- social OAuth blocked
- scheduling blocked
- analytics blocked
- n8n activation blocked

## Not Approved

This package does not approve:

- live social account connection
- credentials
- posting
- scheduling
- DMs, comments, or outreach
- analytics API usage
- n8n activation
- production deploy
- custom domain or DNS
- paid tools
- real client private data
- Lead Gen production changes
- AI Receptionist production changes
- Constitution changes

## GitHub Plan Note

No `.codex/github/` execution plan is included in this package because the current GitHub execution plan schema is specialized for website builder plans. Adding a Social Media v1.1 plan under that schema would either fail validation or misrepresent the product type. A future schema update should generalize GitHub execution plans before Social Media v1.1 build execution is recorded there.

## Approval Needed To Execute

The owner must provide a separate live execution approval that names:

- target repo
- target branch
- exact files allowed to change
- whether a target PR may be opened
- validation commands required
- rollback path
- expiration
- prohibited live actions
