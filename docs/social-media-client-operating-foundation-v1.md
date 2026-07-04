# Social Media Client Operating Foundation v1

Status: planning and source-of-truth foundation only.

This foundation defines how AG OS prepares the Social Media Management System v1 for the first real client without connecting live accounts, storing credentials, posting, scheduling, using analytics APIs, or activating n8n.

## Scope

The operating foundation covers:

- client configuration templates
- platform account slot templates
- content calendar templates
- post package templates
- weekly report templates
- approval templates
- blocked live-action rules
- future Client/Engagement Records v1 boundary

It does not create active client records. It does not contain real client private data. It does not authorize live social actions.

## Default Operating Mode

Every first-client setup must start with:

- account status: `not_connected`
- posting mode: `draft_only`
- approval required: `true`
- live posting blocked: `true`
- credentials stored: `false`

These defaults remain in force until a separate owner-approved PR and approval lock explicitly widens scope.

## First Client Draft Flow

1. Create client configuration from `.codex/templates/social-media/client-config.template.json`.
2. Keep all unknown fields as `REQUIRED_` placeholders until the owner provides real values.
3. Create platform account slots from `.codex/templates/social-media/platform-account.template.json`.
4. Set every platform account to `not_connected`.
5. Create a content calendar shell from `.codex/templates/social-media/content-calendar.template.json`.
6. Create post packages from `.codex/templates/social-media/post-package.template.json`.
7. Create weekly report structure from `.codex/templates/social-media/weekly-report.template.json`.
8. Use `.codex/templates/social-media/approval.template.json` for draft approvals only.

## Blocked Live Actions

The following remain blocked:

- social OAuth
- social account connection
- credential storage
- posting
- scheduling
- direct messages
- comments
- analytics API pulls
- n8n activation
- paid social tooling
- use of real private client data before the owner approves handling rules

## Approval Rules

Approvals in this foundation are draft approvals only. They can approve internal content status changes, but they cannot approve live posting, account connection, scheduling, analytics, n8n activation, credentials, paid tools, or production/customer data handling.

Any future live action requires:

- owner approval
- approval lock
- audit event
- action-matrix review
- validation
- CI where source-controlled changes are involved
- explicit stop-condition review

## Future Records Boundary

Client/Engagement Records v1 should be its own next PR if the repo does not already contain a compatible schema. That PR should define active client, engagement, deliverable, and reporting records before AG OS stores real client operating state.

