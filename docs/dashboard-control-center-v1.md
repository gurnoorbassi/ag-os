# Dashboard Control Center v1

Dashboard Control Center v1 is the read-only operating view for AG OS.

It turns source-controlled AG OS records into a practical status surface for:

- system and boot posture
- project status
- proven and blocked capabilities
- client-management zero state
- Social Media Management System v1 staging status
- Social Media Management System v1.1 milestone and latest staging deploy status
- owner-attention items such as first-client intake-needed state
- approvals and stale approval warnings
- GitHub, Netlify, and n8n proof records
- critiques, quality scores, and lesson candidates
- recorded costs and budget posture
- draft skill library status

## Scope

The dashboard is visibility only. It must not execute commands, call live connectors, deploy, post, schedule, connect accounts, write credentials, or create active client records.

Dashboard v1 reads committed AG OS records and generated dashboard data only. Missing records must be shown as zero, unknown, or blocked. The dashboard must not invent metrics or infer live system status from outside AG OS source-of-truth records.

## Required Sections

Dashboard Control Center v1 must show:

- System status: boot posture, validation availability, safety posture, blocked actions, and active warnings.
- Owner attention: first-client intake blockers, stale or blocked approvals, review-required critiques, and live-integration blocks.
- Capabilities: proven capabilities, draft/advisory-only capabilities, blocked capability areas, last proven dates, and proof record counts.
- Projects: AG OS, Lead Gen, AI Receptionist, Social Media Management System v1, and any registered projects.
- Client management: client, engagement, deliverable, access request, and pending approval counts.
- Social Media System v1: target repo, staging URL, draft/staging mode, and blocked live-action status.
- Social Media System v1.1: target PR, target merge SHA, latest deploy ID/status, HTTP verification, and first-client readiness.
- Approvals: active approvals, expired/archived approvals, blocked approvals, and recent approved actions.
- GitHub, Netlify, and n8n: source-controlled connector proof records only.
- Quality and review: critique counts, quality score counts, candidate lessons, accepted lessons, and candidate/truth separation.
- Costs: ledger count, latest ledgers, total recorded actual cost, and budget limits.
- Skills: draft skill count, active skill count, skill names/statuses, and `skillsGrantPermission: false`.

## Safety Rules

The dashboard must keep these actions visibly blocked unless a separate owner-approved workflow explicitly authorizes them:

- production deployment
- domain or DNS changes
- custom domains
- paid services
- credentials or secrets in records
- production, customer, or real client data
- social OAuth or account connection
- social posting or scheduling
- analytics API usage
- n8n workflow activation
- Lead Gen production changes
- AI Receptionist repository changes
- Constitution changes

## Social Media System v1

The Social Media Management System panel must show:

- target repo: `gurnoorbassi/ag-social-media-management-system`
- staging URL, when recorded
- current version, such as `v1.1`, when a target merge record proves it
- target pull request URL and target merge SHA when recorded
- latest Netlify staging deploy ID, status, source SHA, HTTP status, and staging-only interpretation
- current mode: draft/staging only
- live posting blocked
- social OAuth not connected
- scheduling blocked
- analytics blocked
- n8n live activation blocked
- client config not yet added

The panel must not imply that social accounts are connected, scheduling is approved, posting is available, analytics APIs are connected, or n8n live automation is active.

## Owner Attention

Dashboard Control Center v1.1 adds an owner-attention read model. It should surface only source-controlled blockers or decisions, including:

- first-client intake fields that still use `REQUIRED_*` placeholders
- blocked or stale approval locks
- review-required or failed critiques
- live social integration blocks that require future approval packages

Owner-attention items are not commands, approvals, or write actions. They are visibility-only prompts showing what is needed before AG OS can move to the next gated step.

## Client Management Zero State

Until real owner-approved client records exist, client management must show zero counts:

- clients: 0
- engagements: 0
- deliverables: 0
- access requests: 0
- pending client approvals: 0

The zero state is intentional. It proves the structure is ready without creating fake or demo client data.

## Validation

Dashboard Control Center v1 is validated by:

- `npm.cmd run dashboard:build`
- `npm.cmd run validate`
- `npm.cmd run boot:check`
- `node --test tests/*.test.mjs`

`scripts/check-dashboard.mjs` must fail if the generated data is stale, the dashboard is not read-only, required sections are missing, Social Media blocked defaults are missing, client counts are no longer zero without records, n8n active workflows are inferred from live systems, or skills appear to grant permission.
