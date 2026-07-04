# Social Media Dashboard Next Steps

Status: read-only planning.

The Social Media Management System v1 dashboard should remain visibility-only until the owner approves write actions.

## Read-Only Dashboard Sections

The dashboard should show:

- client configuration completeness
- brand/account slots
- account connection status
- draft-only posting mode
- content intake queue
- content calendar
- post packages
- approval queue
- weekly reports
- blocked live actions
- future connector readiness

## Blocked Action Display

The dashboard must clearly show:

- social OAuth blocked
- credentials not stored
- live posting blocked
- scheduling blocked
- analytics API blocked
- n8n activation blocked
- paid tools blocked
- real client private data handling blocked until approved

## Future Dashboard PR

Dashboard wiring should read templates and future active records only. It must not create write buttons, account connection buttons, scheduling buttons, posting controls, credential fields, or live connector actions until a separate owner-approved build mode expands scope.

