# Social Media Management System v1 Approval Package

## Purpose

Social Media Management System v1 is the first reusable AG OS client-system package for social media content operations. It is designed to support multiple clients, multiple brands per client, and multiple platform accounts per client without rebuilding the architecture for each new account set.

This package is draft/staging only. It prepares the source-of-truth plan, models, gates, and approval boundaries. It does not create a product repository, build an app, deploy a site, connect social accounts, use credentials, schedule posts, publish posts, activate n8n workflows, call platform APIs, or use paid tools.

## Full-Version Role

This is not a toy build. The v1 architecture must be complete enough to become the reusable AG OS client-system template for future social media operations. The first implementation should stay simple under Bootstrap Mode, but the data model must already support:

- Multiple clients.
- Multiple brands per client.
- Multiple platform accounts per client.
- Platform/account mapping.
- Account connection statuses.
- Draft-only posting mode.
- Content calendar.
- Content/video intake queue.
- Post package structure.
- Platform-specific post variants.
- Captions and hooks.
- Story, carousel, and short-form variants.
- Approval queue.
- Blocked publish state.
- Weekly report structure.
- Dashboard/status view.
- Audit/activity log.
- Future n8n workflow integration.
- Future social OAuth integration.
- Future analytics integration.
- Future scheduling integration.
- Future client portal integration.

## Draft/Staging Scope

Allowed in this package:

- Register production-clean AG OS project metadata.
- Define the approval package.
- Define the build plan.
- Define data, client/account, content, approval, dashboard, and future connector models.
- Define safety gates and stop conditions.
- Use REQUIRED_ placeholders in documentation and templates for unknown client-specific values.

Not allowed in this package:

- No product repository creation.
- No target repository branch, file, or PR creation.
- No Netlify deployment.
- No n8n workflow creation or activation.
- No social account connection.
- No OAuth flow.
- No credentials.
- No live posting.
- No scheduling.
- No direct messages or comments.
- No analytics API pulls.
- No external platform API calls.
- No paid tools.
- No production or customer data.
- No Lead Gen production changes.
- No AI Receptionist changes.
- No Constitution changes.

## Proposed Repository and Stack

Proposed future repository:

```text
ag-social-media-management-system
```

Recommended Bootstrap Mode stack:

- GitHub as source of truth.
- Static or lightweight app frontend first.
- Source-controlled placeholder data only for structure.
- Netlify staging only after separate owner approval.
- n8n draft workflow only after separate owner approval.
- No live database requirement in v1 unless a later build plan justifies it and the owner approves.
- No paid services.
- No social platform API calls.
- No tracking scripts.

## Required Placeholders

The first client package must use placeholders until owner-approved client records exist:

- `REQUIRED_CLIENT_NAME`
- `REQUIRED_BRAND_NAME`
- `REQUIRED_PLATFORMS`
- `REQUIRED_HANDLES`
- `REQUIRED_POSTING_VOLUME`
- `REQUIRED_APPROVAL_OWNER`
- `REQUIRED_CONTENT_PILLARS`
- `REQUIRED_BRAND_VOICE`
- `REQUIRED_REPORTING_CADENCE`

These placeholders belong in docs, templates, or future non-active scaffold files only. Active AG OS records must stay production-clean and must not invent client records.

## Approval Gates

Separate owner approval is required before each future step:

- Create the product repository.
- Create a branch or PR in the product repository.
- Add starter app files.
- Merge any target repository PR.
- Deploy to Netlify staging.
- Create an n8n draft workflow.
- Connect social OAuth.
- Handle credentials.
- Use real client content or customer data.
- Enable scheduling.
- Publish posts.
- Send messages.
- Pull analytics through platform APIs.
- Use paid tools.
- Change domain or DNS.

## What The Owner Would Approve Later

The next approval after this package would be narrow:

```text
Create one private GitHub repo named ag-social-media-management-system, create one starter branch, add draft/staging-only starter app files, and open one PR. No deploy, no social connections, no credentials, no scheduling, no posting, no paid tools.
```

That approval is not granted by this package.

## Capability Registry Verification

The Capability Registry already reflects the completed AG OS v1 proof chain:

- GitHub private repo creation with approval.
- GitHub branch and PR creation with approval.
- Target PR review with critique and quality score.
- Target PR merge with approval.
- Netlify staging deploy on a dedicated staging-only site with approval.
- n8n inactive draft workflow creation/export with approval.
- Critic review generation.
- Quality score generation.
- Lesson candidate generation.

This package does not modify the Capability Registry.

## Stop Conditions

Stop immediately if the work requires any of the following:

- Live posting.
- Scheduling.
- Social account connection.
- Credentials.
- Direct messages or comments.
- Analytics API access.
- Production/customer data.
- Paid tools.
- Domain or DNS changes.
- Production deployment.
- Active n8n workflow.
- Outbound messages.
- Lead Gen production changes.
- AI Receptionist changes.
- Constitution changes.
- A hardcoded client, brand, account, handle, or platform value without owner approval.

## Current Status

Status: package prepared for owner review.

Merge of this AG OS package requires owner approval. Any future build, repo creation, deployment, connector action, or live action requires a separate owner approval.
