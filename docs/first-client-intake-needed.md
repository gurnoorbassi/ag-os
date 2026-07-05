# First Client Intake Needed

Status: intake needed. No active client or engagement records created.

AG OS cannot create the first Social Media Management System client records yet because the owner-provided client configuration still contains required placeholders.

## Missing Required Fields

- `CLIENT_NAME`: `REQUIRED_CLIENT_NAME`
- `BRAND_NAME`: `REQUIRED_BRAND_NAME`
- `PLATFORMS`: `REQUIRED_PLATFORMS`
- `HANDLES`: `REQUIRED_HANDLES`
- `POSTING_VOLUME`: `REQUIRED_POSTING_VOLUME`
- `APPROVAL_OWNER`: `REQUIRED_APPROVAL_OWNER`
- `CONTENT_PILLARS`: `REQUIRED_CONTENT_PILLARS`
- `BRAND_VOICE`: `REQUIRED_BRAND_VOICE`
- `REPORTING_CADENCE`: `REQUIRED_REPORTING_CADENCE`

## Current Result

AG OS must not create active client, engagement, deliverable, access request, or client approval records until every required field is replaced with real owner-approved values.

The existing templates remain the safe source for future first-client setup:

- `.codex/templates/client-management/first-client-intake.template.json`
- `.codex/templates/client-management/client.template.json`
- `.codex/templates/client-management/engagement.template.json`
- `.codex/templates/client-management/deliverable.template.json`
- `.codex/templates/client-management/access-request.template.json`
- `.codex/templates/client-management/client-approval.template.json`

## Required Owner Input

Before active first-client records can be created, the owner must provide:

- client name
- brand name
- approved platforms
- platform handles
- posting volume
- approval owner
- content pillars
- brand voice
- reporting cadence

## Safety Rules

Until the missing fields are supplied, AG OS remains in intake-needed mode:

- no social account connection
- no OAuth execution
- no credentials
- no live posting
- no scheduling
- no direct messages or comments
- no analytics API calls
- no n8n activation
- no outbound messages
- no paid tools
- no production deployment
- no domain or DNS changes
- no custom domain
- no real private client data

When active records are created later, all platform accounts must still default to `not_connected`, posting mode must remain `draft_only`, `approval_required` must be `true`, and `live_posting_blocked` must be `true`.
