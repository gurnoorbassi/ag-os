# Client Engagement Workflow

Status: draft workflow only.

This workflow describes how AG OS should prepare client-management records later, after owner approval.

## Draft Setup

1. Start with `client.template.json`.
2. Create a client record only after the owner approves real client data handling.
3. Start with `engagement.template.json` for the project relationship.
4. Link the engagement to an existing project record by `projectId`.
5. Create deliverables from `deliverable.template.json`.
6. Create access requests only to describe future access needs.
7. Create client approvals for decisions that must block progress.

## Engagement Phases

Allowed phases are:

- `discovery`
- `package_prepared`
- `draft_build`
- `staging`
- `client_review`
- `approved_live_later`
- `paused`
- `completed`

Moving into a live phase does not authorize live action by itself. Live action still requires owner approval and the normal AG OS gates.

## Deliverable Review

Every deliverable should track:

- deliverable type
- status
- location
- review status
- quality score reference
- whether approval is required
- whether an owner decision is needed

## Access Requests

Access requests must describe what is needed and why. They must not include credential values. Approved future credentials must use secure connector or secret handling outside the source-controlled record.

## Client Approvals

Client approvals track pending, approved, rejected, changes requested, expired, and revoked decisions. They do not replace AG OS owner approvals or approval locks.
