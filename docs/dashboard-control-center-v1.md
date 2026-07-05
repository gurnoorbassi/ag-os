# Dashboard Control Center v1

Dashboard Control Center v1 is the read-only operating view for AG OS.

It turns source-controlled AG OS records into a practical status surface for:

- system and boot posture
- project status
- proven and blocked capabilities
- client-management zero state
- Social Media Management System v1 staging status
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
- Capabilities: proven capabilities, draft/advisory-only capabilities, blocked capability areas, last proven dates, and proof record counts.
- Projects: AG OS, Lead Gen, AI Receptionist, Social Media Management System v1, and any registered projects.
- Client management: client, engagement, deliverable, access request, and pending approval counts.
- Social Media System v1: target repo, staging URL, draft/staging mode, and blocked live-action status.
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

The Social Media Management System v1 panel must show:

- target repo: `gurnoorbassi/ag-social-media-management-system`
- staging URL, when recorded
- current mode: draft/staging only
- live posting blocked
- social OAuth not connected
- scheduling blocked
- analytics blocked
- n8n live activation blocked
- client config not yet added

The panel must not imply that social accounts are connected, scheduling is approved, posting is available, analytics APIs are connected, or n8n live automation is active.

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
