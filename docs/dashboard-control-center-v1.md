# Dashboard Control Center v1

Dashboard Control Center v1 is the private owner operating view for AG OS. Source-controlled evidence stays read-only while authenticated command, project, and approval controls call the coordinator API.

## Owner workspace model

- **Home** is the immediate command cockpit. The owner connects the private session, states one outcome, watches current runs, and handles only immediate attention.
- **Projects** are durable system workspaces. They hold a system's goal, scope, jobs, evidence, quality history, lessons, and operating status across many Home commands.
- **Work** contains runs, reviews, connector activity, and exact approvals.
- **Memory** contains quality, lessons, cost, and reusable operating knowledge.
- **System** contains health, registries, capabilities, and safeguards.

The visual hierarchy keeps Home quiet and command-first. Project creation and project history no longer compete with the owner command composer.

## Private owner session

The owner token remains browser-session-only. A missing or mismatched token is handled before command submission and produces an explicit reconnect instruction; authentication is never bypassed or silently downgraded.

## Registered draft-only connector transports

- n8n can create one exact disabled, credential-free workflow after an immutable one-job approval. It verifies the saved workflow remains inactive and does not execute it.
- Netlify can create one exact secret-scanned draft preview after an immutable one-job approval. It verifies the deploy remains draft-only and does not publish to production.
- Workflow activation, production publish, domains, DNS, environment changes, credentials, messaging, posting, and paid actions remain separate approval classes.

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

## Client Management State

Before real owner-approved client records exist, client management must show zero counts. After the owner approves active records, the dashboard must switch from zero state to source-of-truth client state without inventing metrics.

The first registered client is AG Digitalz as an internal owned brand in draft/staging mode:

- clients: 1
- engagements: 1
- deliverables: 6
- access requests: 4
- pending client approvals: 4

This does not authorize social OAuth, credentials, posting, scheduling, analytics API access, n8n activation, paid tools, production data, or customer private data. It only shows the owner-approved internal client configuration already present in `.codex/client-management/`.

## Validation

Dashboard Control Center v1 is validated by:

- `npm.cmd run dashboard:build`
- `npm.cmd run validate`
- `npm.cmd run boot:check`
- `node --test tests/*.test.mjs`

`scripts/check-dashboard.mjs` must fail if the generated data is stale, the dashboard is not read-only, required sections are missing, Social Media blocked defaults are missing, AG Digitalz client-management counts drift from the active source records, n8n active workflows are inferred from live systems, or skills appear to grant permission.
