# Social Media Management System v1 Safety Gates

## Canonical Safety Position

Social Media Management System v1 is draft/staging only. The system may prepare records, plans, and interface scaffolding after approval, but it must not perform live social, scheduling, messaging, analytics, credential, paid, production, or customer-data actions.

## Default Account State

Every platform account must default to:

- `connectionStatus`: `not_connected`
- `postingMode`: `draft_only`
- `approvalRequired`: `true`
- `livePostingBlocked`: `true`

Allowed account status vocabulary:

- `not_connected`
- `access_requested`
- `connected_draft_only`
- `approved_for_scheduling`
- `approved_for_live_posting`

Only `not_connected` is allowed by default in v1 package records.

## Blocked Live Features

Blocked until separate owner approval:

- Social account connection.
- Social OAuth.
- Credentials or tokens.
- Live posting.
- Scheduling activation.
- Direct messages.
- Comments.
- Analytics API pulls.
- External platform API calls.
- Paid AI, media, storage, scheduling, or analytics tools.
- Production or customer data.
- Domain/DNS changes.
- Production deployment.
- Active n8n workflows.
- Outbound messages.

## Approval Gates

The following gates require an active, scoped approval lock:

- `create_repo`
- `create_branch`
- `open_product_pr`
- `merge_product_pr`
- `deploy_staging`
- `connect_n8n`
- `create_n8n_draft_workflow`
- `activate_n8n_workflow`
- `connect_social_account`
- `use_social_oauth`
- `handle_credentials`
- `enable_scheduling`
- `publish_content`
- `send_message`
- `pull_analytics`
- `use_paid_service`
- `access_customer_data`
- `access_production_data`
- `change_domain`
- `change_dns`

Critique, quality score, and internal content approvals are not approval locks and cannot authorize any gated action.

## Stop Conditions

Stop immediately if:

- A credential is needed.
- A platform account connection is needed.
- A social OAuth flow is needed.
- A post would go live.
- A schedule would be pushed to a live platform.
- A direct message or comment would be sent.
- A platform API call would be made.
- A workflow would be activated.
- A deployment would occur without the specific deployment approval.
- A custom domain or DNS change is needed.
- A paid tool is required.
- Production or customer data is requested.
- A real client or private account value is needed before owner approval.
- Lead Gen production would be touched.
- AI Receptionist would be touched.
- Constitution rules would need to change.

## Validation Requirements

Before any package or future build PR can merge:

- `npm.cmd run validate`
- `npm.cmd run boot:check`
- `node --test tests/*.test.mjs`
- `git diff --check`

Before any future target repo PR can merge:

- AG OS review record.
- Advisory critique record.
- Candidate quality score record.
- Cost ledger record.
- Owner approval for merge.
- Verification that reviewed files and head SHA did not change.

## Safe Failure Mode

If a live integration is missing approval or credentials are unavailable, the system must:

- Keep the work in draft mode.
- Mark the live action as blocked.
- Show the missing approval or connector state.
- Record an activity log item.
- Avoid retries that could cause external side effects.
