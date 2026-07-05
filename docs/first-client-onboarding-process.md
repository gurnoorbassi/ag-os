# First Client Onboarding Process

Status: draft-mode foundation only.

This process defines how AG OS prepares to add the first real client later. It does not create an active client record, store private client data, connect accounts, or authorize live work.

## Required Owner Inputs

Before any real client record is created, the owner must provide and approve:

- `REQUIRED_CLIENT_NAME`
- `REQUIRED_BRAND_NAME`
- `REQUIRED_PLATFORMS`
- `REQUIRED_HANDLES`
- `REQUIRED_POSTING_VOLUME`
- `REQUIRED_APPROVAL_OWNER`
- `REQUIRED_CONTENT_PILLARS`
- `REQUIRED_BRAND_VOICE`
- `REQUIRED_REPORTING_CADENCE`
- `REQUIRED_PROJECT_ID`
- `REQUIRED_SERVICE_SCOPE`
- `REQUIRED_PRIVACY_LEVEL`

If any input is unknown, the record remains a template with `REQUIRED_` placeholders.

## Draft-Mode Flow

1. Start from `.codex/templates/client-management/first-client-intake.template.json`.
2. Prepare the client shell with placeholders only.
3. Prepare the engagement shell from `.codex/templates/client-management/engagement-intake.template.json`.
4. Add platform account slots as placeholders, with no account connection.
5. Create access-needed templates for every future platform or system access request.
6. Create client-approval-needed templates for every future owner or client decision.
7. Link planned deliverables to projects, PRs, staging URLs, reports, critiques, and quality scores only after those source records exist.
8. Run validation before any PR.

## Active Record Gate

Creating a real client record requires a separate owner-approved PR that states:

- exact client name and privacy level
- allowed data fields
- project or engagement scope
- whether records are draft-only or active
- what data must remain outside AG OS
- which live actions remain blocked
- rollback or archival path

## Stop Conditions

Stop immediately if the onboarding needs credentials, private files, live social access, posting, scheduling, analytics APIs, n8n activation, paid tools, production data, domain or DNS changes, Lead Gen production changes, AI Receptionist production changes, or Constitution changes.
