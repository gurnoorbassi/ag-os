# Client Config Draft Mode Policy

Status: source-of-truth policy only.

Draft mode lets AG OS prepare client configuration structure without activating client work or storing sensitive details.

## Allowed In Draft Mode

- placeholder client, brand, platform, and handle fields
- account slots with `not_connected` status
- posting mode set to `draft_only`
- approval flags set to required
- deliverable plans that cite existing source records
- staging URLs already recorded in AG OS
- blocked action lists
- owner questions needed before activation

## Not Allowed In Draft Mode

- credentials or secret values
- real private client data without separate owner approval
- social OAuth connection
- live posting
- scheduling
- DMs, comments, or outreach
- analytics API pulls
- n8n activation
- paid tools
- production deploys
- custom domains or DNS changes

## Platform Account Slots

Platform account slots may be created as templates only. Every slot must default to:

- `connectionStatus: "not_connected"`
- `postingMode: "draft_only"`
- `approvalRequired: true`
- `livePostingBlocked: true`
- `credentialsStored: false`
- `analyticsConnected: false`
- `schedulingEnabled: false`

## Promotion To Active Client Config

Promotion from draft template to active client config requires owner approval, validation, audit record, privacy review, and a clear list of fields that are allowed to become real client data.
