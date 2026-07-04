# Client Engagement Records v1

Status: source-of-truth foundation only.

Client Engagement Records v1 defines the first AG OS structure for tracking clients, engagements, deliverables, access requests, and client approvals without storing private client data or live credentials.

## Records

The foundation adds schemas and templates for:

- Client: a business or person AG OS may serve.
- Engagement: the paid or project relationship.
- Deliverable: an output created for an engagement.
- Access Request: access needed later without storing credentials.
- Client Approval: decisions needed before work can move forward.

## Templates

Templates live in `.codex/templates/client-management/` and are not active records. Unknown values must remain `REQUIRED_` placeholders until the owner approves real values.

The templates are:

- `client.template.json`
- `engagement.template.json`
- `deliverable.template.json`
- `access-request.template.json`
- `client-approval.template.json`

## No Active Client Records Yet

This PR does not create:

- real client records
- AG Digitalz client records
- named client records
- fabricated records
- active engagement records
- active deliverable records
- access credentials
- live social account connections

Active records should be added only after a separate owner-approved PR defines the exact client, privacy level, allowed data, and operating mode.

## Safety Defaults

The default posture is:

- no credentials in AG OS records
- no live social account connection
- no posting
- no scheduling
- no analytics API usage
- no n8n activation
- no paid tools
- no production/customer data
- no Lead Gen changes
- no AI Receptionist changes
- no Constitution changes

## Future Active Record Location

When approved, active records should live under `.codex/client-management/` or a reviewed subdirectory pattern. The directory currently contains only a README to preserve the boundary.
