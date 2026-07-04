# Social Media Management System v1 Data Model

## Model Rules

The v1 data model must be complete enough for a reusable client-system template while staying draft/staging only.

Rules:

- No real client private data.
- No social credentials.
- No access tokens.
- No platform API payloads.
- No live posting identifiers.
- No analytics API pulls.
- No production/customer data.
- REQUIRED_ placeholders are allowed only in docs, templates, and future non-active scaffold data.

## Client

Purpose: top-level customer or owner-managed organization.

Fields:

- `clientId`
- `clientName`: `REQUIRED_CLIENT_NAME`
- `status`: `draft_setup | active_draft_only | paused | archived`
- `approvalOwner`: `REQUIRED_APPROVAL_OWNER`
- `reportingCadence`: `REQUIRED_REPORTING_CADENCE`
- `brands`
- `createdAt`
- `updatedAt`

Default:

- `status`: `draft_setup`
- No live connectors.
- No production/customer payloads.

## Brand

Purpose: a client may have one or more brands with different voice, pillars, and accounts.

Fields:

- `brandId`
- `clientId`
- `brandName`: `REQUIRED_BRAND_NAME`
- `brandVoice`: `REQUIRED_BRAND_VOICE`
- `contentPillars`: `REQUIRED_CONTENT_PILLARS`
- `postingVolume`: `REQUIRED_POSTING_VOLUME`
- `platforms`: `REQUIRED_PLATFORMS`
- `createdAt`
- `updatedAt`

## PlatformAccount

Purpose: map a brand to platform-specific account records without connecting the account.

Fields:

- `accountId`
- `clientId`
- `brandId`
- `platform`
- `handle`: `REQUIRED_HANDLES`
- `connectionStatus`
- `postingMode`
- `approvalRequired`
- `livePostingBlocked`
- `schedulingStatus`
- `analyticsStatus`
- `credentialStatus`
- `createdAt`
- `updatedAt`

Allowed `connectionStatus` values:

- `not_connected`
- `access_requested`
- `connected_draft_only`
- `approved_for_scheduling`
- `approved_for_live_posting`

V1 defaults:

- `connectionStatus`: `not_connected`
- `postingMode`: `draft_only`
- `approvalRequired`: `true`
- `livePostingBlocked`: `true`
- `schedulingStatus`: `blocked`
- `analyticsStatus`: `not_connected`
- `credentialStatus`: `none`

## ContentItem

Purpose: represent a source content asset or idea before platform variants exist.

Fields:

- `contentItemId`
- `clientId`
- `brandId`
- `sourceType`: `video | image | text | idea | link | other`
- `sourceReference`
- `intakeStatus`: `received | triage | needs_info | ready_for_package | archived`
- `contentPillars`
- `notes`
- `createdAt`
- `updatedAt`

V1 rule: `sourceReference` must be a placeholder or local reference until owner approval allows real client content handling.

## PostPackage

Purpose: group one source item into a publishable content set.

Fields:

- `postPackageId`
- `contentItemId`
- `clientId`
- `brandId`
- `packageStatus`: `draft | in_review | approved | rejected | blocked`
- `targetAccounts`
- `variants`
- `approvalId`
- `blockedReason`
- `createdAt`
- `updatedAt`

V1 rule: package status may reach `approved` as an internal draft state, but live scheduling and posting remain blocked.

## PostVariant

Purpose: platform/account-specific output.

Fields:

- `postVariantId`
- `postPackageId`
- `accountId`
- `platform`
- `variantType`: `short_form | story | carousel | static_post | text_post | other`
- `hook`
- `caption`
- `cta`
- `hashtags`
- `mediaInstructions`
- `scheduledFor`
- `variantStatus`: `draft | in_review | approved | rejected | blocked`
- `liveActionStatus`
- `createdAt`
- `updatedAt`

Default:

- `liveActionStatus`: `blocked`
- `scheduledFor`: empty until scheduling is separately approved.

## Approval

Purpose: record draft approval state before anything can be scheduled or posted.

Fields:

- `approvalRecordId`
- `postPackageId`
- `approvalOwner`
- `status`: `pending | approved | rejected | revoked`
- `decisionNotes`
- `decidedAt`
- `createdAt`
- `updatedAt`

Rule: approval records are content approvals only. They are not AG OS approval locks and cannot authorize live connector actions.

## WeeklyReport

Purpose: show work performed and status without platform API access.

Fields:

- `weeklyReportId`
- `clientId`
- `brandId`
- `periodStart`
- `periodEnd`
- `contentItemsReceived`
- `postPackagesCreated`
- `variantsCreated`
- `approvalsPending`
- `approvalsCompleted`
- `blockedLiveActions`
- `platformPerformance`
- `notes`
- `createdAt`

V1 rule: `platformPerformance` remains placeholder/manual until analytics API access is separately approved.

## ActivityLog

Purpose: audit operator and system activity.

Fields:

- `activityId`
- `actor`
- `action`
- `entityType`
- `entityId`
- `summary`
- `riskLevel`
- `createdAt`

Required events:

- Client package created.
- Account status changed.
- Content item received.
- Post package created.
- Variant created.
- Approval requested.
- Approval decided.
- Live action blocked.
- Connector action requested.

## Future Integration Statuses

V1 defaults:

- `n8n_status`: `blocked_until_approved`
- `social_oauth_status`: `not_connected`
- `analytics_api_status`: `not_connected`
- `scheduling_status`: `blocked`
- `live_posting_status`: `blocked`
