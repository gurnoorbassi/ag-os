# Client Management Safety Policy

Status: mandatory safety policy for future client-management records.

Client-management records may describe needed access, decisions, deliverables, and blockers. They must not contain secrets or live credentials.

## Credential Policy

AG OS records must never store:

- passwords
- API keys
- OAuth secrets
- session cookies
- recovery codes
- private keys
- social platform credentials
- analytics credentials

Records may state that access is needed. Future credentials must live only in an owner-approved secure connector or secret system.

## Data Policy

Do not add real client private data until the owner approves:

- the client identity
- the privacy level
- the exact fields allowed
- the storage location
- the retention rule
- the deletion rule
- the access boundary

Templates can use `REQUIRED_` placeholders only.

## Live Action Blocks

Client-management records do not authorize:

- posting
- scheduling
- direct messages
- comments
- analytics API pulls
- social OAuth
- n8n activation
- Netlify deployment
- domain or DNS changes
- paid tools

Any future live action requires the AG OS action matrix, owner approval, an approval lock, audit event, validation, and stop-condition review.

## Stop Conditions

Stop if a task requires credentials, private client files, live account access, production/customer data, posting, scheduling, analytics, n8n activation, paid tools, Lead Gen changes, AI Receptionist changes, or Constitution changes.
