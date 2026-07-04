# Social Media Management System v1 Skills and Patterns

## Pattern: Draft First

Every workflow creates draft records first. A draft can move to review and content approval, but live scheduling and live posting remain blocked until separate owner approval.

Required states:

- `draft`
- `in_review`
- `approved`
- `rejected`
- `blocked`

Approved content state is not the same as approval to publish.

## Pattern: Account Mapping Before Content Fan-Out

Post variants must always reference a platform account. If the account is not connected, the variant can still exist as a draft, but the live action status stays blocked.

Required references:

- Client.
- Brand.
- Platform account.
- Source content item.
- Post package.
- Post variant.
- Approval state.

## Pattern: Blocked Actions Are Visible

The product should not hide unavailable live features. It should show blocked states clearly so operators know what approval is missing.

Blocked actions should include:

- Why it is blocked.
- Which approval gate is required.
- Which connector is not connected.
- Which safety rule applies.

## Pattern: Weekly Report Without Live Analytics

V1 weekly reports should work from local pipeline data:

- Items received.
- Packages created.
- Variants drafted.
- Approvals pending.
- Approvals completed.
- Live actions blocked.
- Notes for owner review.

Performance metrics stay empty or manually entered until analytics API approval exists.

## Pattern: Client Reuse Without Hardcoding

The architecture should support future clients and brands through records, not custom code branches. No real client should be added until owner approval creates a production-clean client record or target repo configuration.

Use these placeholders in docs/templates:

- `REQUIRED_CLIENT_NAME`
- `REQUIRED_BRAND_NAME`
- `REQUIRED_PLATFORMS`
- `REQUIRED_HANDLES`
- `REQUIRED_POSTING_VOLUME`
- `REQUIRED_APPROVAL_OWNER`
- `REQUIRED_CONTENT_PILLARS`
- `REQUIRED_BRAND_VOICE`
- `REQUIRED_REPORTING_CADENCE`

## Pattern: Lessons Stay Candidate-Only

The system may later generate lesson candidates from reviews or quality scores, but it must not create accepted lessons or permanent memory automatically.

## Pattern: Owner Gates Beat Worker Suggestions

Planner, critic, quality score, and worker recommendations are advisory. They cannot approve:

- Social connections.
- Credentials.
- Posting.
- Scheduling.
- Messaging.
- Analytics API access.
- n8n activation.
- Netlify deployment.
- Paid tools.
- Production/customer data.
