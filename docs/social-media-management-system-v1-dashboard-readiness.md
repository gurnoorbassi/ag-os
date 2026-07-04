# Social Media Management System v1 Dashboard Readiness

## Purpose

The dashboard should make social media operations visible without enabling live actions. It is a control surface for status, review, and blocked-state clarity.

## Expected Sections

- Dashboard overview.
- Clients.
- Brands.
- Accounts.
- Content intake.
- Content calendar.
- Post packages.
- Approval queue.
- Weekly reports.
- Settings/config status.
- Blocked live actions panel.

## Overview Metrics

Draft/staging metrics:

- Clients configured.
- Brands configured.
- Accounts not connected.
- Content items in intake.
- Post packages in draft.
- Post variants in review.
- Approvals pending.
- Approvals completed.
- Live actions blocked.
- Weekly reports generated.

No metric may require a live platform API call in v1.

## Accounts View

Each account row should show:

- Client.
- Brand.
- Platform.
- Handle placeholder.
- Connection status.
- Posting mode.
- Approval required.
- Scheduling status.
- Analytics status.
- Live posting blocked.

Default visible state:

```text
not_connected / draft_only / approval_required / live_posting_blocked
```

## Content Intake View

The intake view should show:

- Source content reference.
- Intake status.
- Brand.
- Content pillars.
- Notes.
- Linked post package count.

The view must support placeholder/local references first.

## Approval Queue

The approval queue should show:

- Package or variant.
- Client.
- Brand.
- Platform/account target.
- Hook.
- Caption.
- CTA.
- Approval owner.
- Review status.
- Rejection notes.

No approve button may trigger live posting. Approval is content approval only.

## Blocked Live Actions Panel

This panel should always exist in v1. It should list:

- Social OAuth blocked.
- Scheduling blocked.
- Live posting blocked.
- Analytics API blocked.
- n8n activation blocked.
- Credentials blocked.
- Production deploy blocked.

Each blocked item should show the approval gate needed later.

## Future Netlify Staging

Netlify staging can only happen after a separate approval package. The dashboard must not assume a production domain, custom domain, DNS, paid feature, or live form handling.
