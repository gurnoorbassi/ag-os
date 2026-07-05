# Social Media First Client Readiness Checklist

Status: readiness checklist only.

This checklist prepares Social Media Management System v1 for a future first real client without creating the client record yet.

## Source Records Required

- Social Media Management System v1 project record
- target repo and staging URL records
- starter build execution record
- target PR review and quality score records
- Netlify staging execution record
- client management templates
- access request templates
- client approval templates

## Owner Inputs Required

- `REQUIRED_CLIENT_NAME`
- `REQUIRED_BRAND_NAME`
- `REQUIRED_PLATFORMS`
- `REQUIRED_HANDLES`
- `REQUIRED_POSTING_VOLUME`
- `REQUIRED_APPROVAL_OWNER`
- `REQUIRED_CONTENT_PILLARS`
- `REQUIRED_BRAND_VOICE`
- `REQUIRED_REPORTING_CADENCE`

## Readiness Checks

- account statuses remain `not_connected`
- posting mode remains `draft_only`
- live posting remains blocked
- scheduling remains blocked
- analytics remains disconnected
- n8n live activation remains blocked
- credentials are not stored
- staging URL is available for owner review
- content intake uses placeholders until real data is approved
- approval queue can represent needed decisions without sending messages

## First Real Client PR Requirements

A future first-client PR must include only owner-approved real fields, a privacy classification, a rollback or archive path, and evidence that no credentials, live social connection, posting, scheduling, analytics API, n8n activation, paid action, or production deploy is included.
