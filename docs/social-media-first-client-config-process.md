# Social Media First Client Config Process

Status: draft-mode process only.

This process explains how to configure the first client without connecting accounts or using private client data.

## Required Inputs

The owner must provide or approve:

- `REQUIRED_CLIENT_NAME`
- `REQUIRED_BRAND_NAME`
- `REQUIRED_PLATFORMS`
- `REQUIRED_HANDLES`
- `REQUIRED_POSTING_VOLUME`
- `REQUIRED_APPROVAL_OWNER`
- `REQUIRED_CONTENT_PILLARS`
- `REQUIRED_BRAND_VOICE`
- `REQUIRED_REPORTING_CADENCE`

Until then, templates keep those placeholders.

## Steps

1. Start from `.codex/templates/social-media/client-config.template.json`.
2. Add one or more brand entries using `REQUIRED_BRAND_NAME`.
3. Add platform account slots using `REQUIRED_PLATFORMS` and `REQUIRED_HANDLES`.
4. Confirm every account slot is `not_connected`.
5. Confirm every account slot has `credentials_stored: false`.
6. Confirm posting mode is `draft_only`.
7. Confirm `approval_required: true`.
8. Confirm `live_posting_blocked: true`.
9. Prepare content intake and calendar shells without uploading private assets.
10. Prepare weekly report structure without connecting analytics APIs.

## Gates

Owner approval is required before:

- replacing placeholders with real private client details
- connecting any social account
- storing or using credentials
- enabling scheduling
- enabling posting
- pulling analytics
- enabling n8n automation
- connecting Netlify or any additional live service

## Stop Conditions

Stop immediately if work requires credentials, live social access, private client files, posting, scheduling, analytics APIs, n8n activation, paid tools, domain changes, production data, or any action outside AG OS source-of-truth planning.

