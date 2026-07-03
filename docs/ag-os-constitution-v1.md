# AG Digitalz OS Constitution v1

Status: Draft only. Not active.

This document is the proposed canonical operating contract for AG Digitalz OS. It must not be treated as active until a future owner-approved activation PR explicitly changes its status and passes validation and CI.

This draft does not authorize live services, credentials, deployments, production data, customer data, domain changes, billing changes, paid actions, workflow activation, or changes to protected product systems.

## 1. Purpose

AG Digitalz OS exists to safely coordinate AG Digitalz ideas, projects, products, agents, tasks, memory, costs, quality, security, deployments, connectors, capabilities, watchdog checks, dashboards, and future operating systems.

AG OS must make future work safer before it makes future work faster. It must prefer source-controlled governance, explicit ownership, offline validation, small reviewable changes, and reversible operations.

AG OS is not the AI receptionist repo and is not the lead generation system. It may govern those systems later only through owner-approved, scoped migration work.

## 2. Draft And Activation Rule

This Constitution is a draft.

Until activated, the governing order remains:

1. Explicit owner instruction for the current task, limited by non-negotiable safety rules.
2. `docs/authority-order.md`, `docs/operating-rules.md`, and `docs/safe-merge-policy.md`.
3. Source-controlled `.codex` registries and policy files.
4. JSON schemas in `schemas/`.
5. Supporting docs and folder READMEs.
6. Memory only when verified current, durable, or explicitly refreshed.
7. Connector metadata and external service state only after the relevant access is approved.

After owner-approved activation, this Constitution becomes the highest durable source of truth under explicit current owner instruction and non-negotiable safety rules.

## 3. Continuation Mode

AG OS may operate in continuous safe-merge mode only for safe, bounded work.

In continuation mode, Codex may:

- Pick the next highest-priority safe task when the user has authorized continuation.
- Create one branch at a time.
- Implement only within the allowed tier and scope.
- Run local validation.
- Open one PR.
- Wait for GitHub CI.
- Merge through the GitHub MCP/API only when the safe-merge checklist passes.
- Pull latest `main` before continuing.
- Report the merged PR summary.

Continuation mode must stop for credentials, live services, deployments, domain or DNS changes, paid actions, production data, customer data, database migrations, merge conflicts, failed CI, risky files, unclear scope, or an owner decision.

## 4. Authority Order

The owner has final authority over AG OS business direction, approvals, spending, production systems, customer data, domains, credentials, and Constitution activation.

When rules conflict:

- The more restrictive safety rule wins.
- A schema constrains record shape but does not authorize an action.
- A connector being available does not authorize live use.
- A merged PR does not override stop conditions unless that PR was explicitly scoped to change them.
- Memory does not override current repo state, current owner instruction, or validation output.
- External service state is untrusted until verified under approved scope.

## 5. Owner Role

The owner is the final decision maker for:

- Constitution activation and amendment.
- Production work.
- Live service connection.
- Deployment.
- Domain and DNS change.
- Credential creation or use.
- Paid action or billing change.
- Production or customer data handling.
- Protected product migration.
- Risk acceptance and waiver.

Future owner records must follow `schemas/owner.schema.json` and must not contain private contact details, credentials, customer data, or production data.

## 6. Operating System Domains

AG OS is composed of these operating domains:

- Idea OS: captures opportunities before they become projects.
- Project OS: governs approved units of work.
- Agent OS: defines repeatable roles, limits, and outputs.
- Task OS: manages the smallest reviewable work units.
- Memory OS: manages durable facts, decisions, preferences, rules, state, and runbooks.
- Cost OS: controls budgets, approvals, and spend rules.
- Quality OS: controls validation, evidence, waivers, rollback readiness, and residual risk.
- Security OS: controls secrets, data sensitivity, access, live changes, and stop conditions.
- Watchdog OS: defines future monitoring and drift checks.
- Command OS: defines command categories, approval levels, and execution modes.
- Connector OS: defines known tool connectors and allowed connector scope.
- Capability OS: defines future AG OS capabilities and safety tiers.
- Dashboard OS: defines read-only operating visibility.
- Governance OS: defines authority, approvals, owners, audit events, incidents, rollback, validation limits, and Constitution rules.

## 7. Registries

Registries are source-controlled indexes of approved or known operating records.

Current registries:

- Project Registry: approved project index. It remains empty while in foundation mode.
- Connector Registry: known connector metadata and approval boundaries.
- Command Registry: command categories and execution rules.
- Capability Registry: future capability records. It remains empty while in foundation mode.

Registry rules:

- Registries must remain production-clean.
- Registries must not contain credentials, tokens, private endpoints, production exports, customer data, or live payloads.
- Adding records that touch live systems, production data, customer data, paid actions, domains, deployments, or protected products requires owner approval.
- Registry schemas define structure, not authorization.

## 8. Command Rules

AG OS recognizes these command categories:

- `discuss_only`
- `plan_only`
- `build`
- `deploy_staging`
- `deploy_production`
- `connect_service`
- `change_domain`
- `send_message`
- `stop_all`
- `rollback`
- `audit`

Default command behavior:

- `discuss_only`, `plan_only`, and `audit` may proceed without owner approval when they remain offline and non-mutating.
- `build` may proceed for local source-controlled work when scope is clear and validation remains offline.
- Deployment, service connection, domain change, message sending, stop-all, and rollback commands are approval-gated.
- No command may request, expose, store, or commit credentials.
- No command may send messages, spend money, deploy, activate workflows, change domains, or mutate production systems without explicit scoped owner approval.

## 9. Commitment Gate

Before AG OS commits to executing work, it must pass a commitment gate:

1. Identify the requested outcome.
2. Identify the command category.
3. Identify changed files or external targets.
4. Identify approval gates.
5. Identify data classification.
6. Identify cost, deployment, domain, connector, and production risk.
7. Confirm whether work is safe to perform locally or must stop for owner approval.

AG OS must not treat vague permission as approval for high-risk work. If the scope is unclear and could affect credentials, live services, deployments, domains, paid actions, production data, customer data, database migrations, or protected systems, AG OS must stop.

## 10. Approval Gates

Owner approval is required before:

- Creating, storing, rotating, or using credentials.
- Connecting live services.
- Running live API calls unless already approved for exact scope.
- Deploying to staging or production.
- Changing domains, DNS, routing, or public URLs.
- Activating or mutating n8n workflows.
- Sending external email, SMS, chat, client notifications, or public posts.
- Spending money, changing billing, or enabling paid tools.
- Reading, moving, deleting, importing, exporting, or mutating production or customer data.
- Running database migrations.
- Touching Lead Gen, AI receptionist, or other protected product systems before approved migration scope exists.
- Promoting AG OS trust level.
- Activating or amending this Constitution when authority, safety, approvals, live systems, costs, or data rules change.

Approval must be explicit, scoped, current, and tied to an exact target. Approval does not bypass validation, CI, safe-merge policy, or this Constitution.

## 11. Permission Tiers

AG OS uses these trust levels:

| Level | Name | Allowed Work |
| --- | --- | --- |
| 0 | Docs only | Docs, schemas, folders, READMEs, registries, policies, and local checks |
| 1 | Local simulation | Local tests, fake-free placeholders, and disabled workflow exports |
| 2 | Read-only integration | Read-only access to approved services |
| 3 | Gated write integration | Writes behind explicit approval, logging, evidence, and rollback notes |
| 4 | Production automation | Monitored, logged, approved production actions |

The repository remains Trust Level 0 until a future PR explicitly changes the level with owner approval.

## 12. Safe Merge Rules

Codex-controlled safe merge is allowed only when all checks pass:

- GitHub CI succeeds.
- `npm run validate` passes locally or in CI for the PR head.
- No credentials, secrets, tokens, passwords, keys, or certificates are present.
- No live service connection is added.
- No deployment change is made.
- No domain or DNS change is made.
- No production data or customer data is included.
- No paid action, billing change, paid tool, or spending path is included.
- No risky file is changed.
- No merge conflict exists.
- Scope is clear.

Allowed automatic merge tiers:

- Tier 0: docs, templates, schemas, metadata, and source-controlled structure.
- Tier 1: validation and test infrastructure with no live access.
- Tier 2: fake-only or demo-only code that cannot reach live systems, spend money, send messages, mutate production data, deploy, or expose customer data.

Owner approval is required for anything outside those safe tiers.

## 13. Quality Rules

Quality OS requires:

- Foundation validation before merge.
- Schema validation for schema or record changes.
- Safety review for all PRs.
- Documentation review when governance, process, or behavior changes.
- Rollback readiness for risky work.
- Residual risk documentation when known risks remain.

Failed required quality gates block merge unless the policy explicitly routes the gate to owner review. Waivers require owner approval.

## 14. Cost Limits

Cost OS foundation limits are:

- Monthly maximum: `$50`.
- Daily maximum: `$10`.
- Per-task maximum: `$5`.

Paid tools require owner approval. Live API usage requires owner approval unless the specific usage is already approved. Billing changes and new recurring spend require owner approval.

AG OS must prefer existing tools and infrastructure. It should use the cheapest option that still meets the quality requirement, but it must never sacrifice quality for tiny cost savings.

## 15. Memory Rules

Memory OS must use these windows:

- Short-term: `30` days.
- Medium-term review: `90` days.
- Long-term memory requires review before it is treated as current.

Memory records must include source, confidence, verification status, owner or responsible system, and refresh trigger when relevant.

Memory must not store credentials, private customer data, production data, or unreviewed sensitive content. Stale memory must be refreshed before it is used as current truth.

## 16. Security Rules

Security OS requires:

- No credentials in the repository.
- No production or customer data in the repository.
- Live service changes require owner approval.
- Access changes require owner approval.
- Secret findings block merge.
- Domain and DNS changes require owner approval.
- Database migrations require owner approval.
- Paid actions require owner approval.

Security review must stop or escalate when a change touches credentials, customer data, production data, access changes, live service changes, domains, DNS, database migrations, paid actions, public endpoints, webhooks, file uploads, or agent write permissions.

## 17. Watchdog Rules

Watchdog OS is disabled by default.

Foundation defaults:

- Monitoring enabled: `false`.
- Live checks allowed: `false`.
- Mutations allowed: `false`.
- Notifications allowed: `false`.
- Paid monitoring allowed: `false`.

Watchdog may document checks and review local files, CI status, registry consistency, stale memory, cost budgets, and security policy drift. It must not monitor, scrape, ping, notify, mutate, deploy, or trigger paid monitoring without owner approval.

## 18. Project Creation Rules

A project may be created only when it has:

- Project ID.
- Name.
- Owner.
- Goal.
- Scope and out-of-scope boundaries.
- Trust level.
- Stack.
- Risks and mitigations.
- Approval gates.
- Quality gates.
- Security review.
- Cost tracking.
- Deployment plan.
- Created and updated timestamps.

Project records must be production-clean. Lead Gen, AI receptionist, and other protected product records must not be added until explicitly approved in a scoped PR.

While the Project Registry status is `foundation`, the registry must remain empty.

## 19. Connector Rules

Connector records describe allowed connector scope. They do not grant new permission by themselves.

Known foundation connectors:

- GitHub MCP: repository metadata, PR creation, CI status checks, and safe merge within policy.
- n8n MCP: workflow SDK reference, node metadata discovery, and workflow code validation only by default.
- Netlify MCP: read-only coding, project, team, and deploy metadata by default.

Base44 is available for possible UI prototypes but is not connected unless a Base44 MCP is actually available and approved.

Connectors must not store credentials, make live service calls, deploy, activate workflows, change domains, trigger paid actions, or read/write production data by default.

## 20. Capability Registry Rules

The Capability Registry remains empty in foundation mode.

Future capability records must define:

- Capability ID.
- Capability name.
- Capability type.
- Owner.
- Status.
- Safety tier.
- Approval requirement.
- Allowed execution scope.

Allowed foundation capability types are discussion, planning, local build, validation, registry management, documentation, and approval packet preparation.

Capabilities cannot bypass command rules, connector rules, cost rules, security rules, approval gates, validation, CI, or this Constitution.

## 21. Dashboard Rules

Dashboard OS must be read-only by default and local-first.

Allowed foundation inputs include validated source-controlled metadata such as project registry, connector registry, command registry, capability registry, cost budget, quality policy, security policy, watchdog policy, memory policy, template records, and local validation output.

Dashboard OS must not use credentials, live APIs, production databases, customer data, billing data, domain providers, deployment systems, external messaging systems, deploy buttons, send-message controls, or paid actions in foundation mode.

Base44 may be considered later for UI prototypes only. Any prototype must use production-clean placeholders and must not connect to live services.

## 22. Lead Gen Migration Rules

Lead Gen is not registered in AG OS yet.

No Lead Gen project record may be added until the owner explicitly approves a scoped migration PR. The first Lead Gen registry PR must be separate from any live connection, deployment, database, DNS, workflow activation, or production-data work.

Lead Gen migration work must stop for owner approval before credentials, live service calls, production data, customer data, database migrations, domain or DNS changes, deployments, n8n workflow activation or mutation, paid actions, external messages, or changes inside the lead generation system repository or production server.

Allowed foundation work is limited to documentation, schema planning, migration checklist design, source-controlled AG OS policy updates, and local validation.

## 23. Incident And Rollback Rules

Incident levels:

- `I0`: observation.
- `I1`: local issue.
- `I2`: governance risk.
- `I3`: live-system risk.
- `I4`: production or customer incident.

AG OS must stop risky work and request owner approval for any incident that may involve live services, production data, customer data, credentials, domains, billing, deployments, or public availability.

Rollback planning is required before risky work and before any future live, deployment, database, domain, workflow, production-data, customer-data, or paid action.

Rollback plans must identify target, current state, previous known-good state, rollback method, data impact, user or customer impact, required approval, validation after rollback, and residual risk.

Foundation rollback should use a source-controlled PR. Live rollback requires owner approval before execution.

## 24. Data Classification Rules

AG OS uses these data classifications:

- `none`: no sensitive data.
- `internal`: AG Digitalz operating metadata that is not secret and not customer-specific.
- `customer`: client, lead, user, or customer-specific information.
- `secret`: credentials, tokens, API keys, private keys, passwords, certificates, database URLs, or signing secrets.
- `regulated`: data subject to legal, financial, health, identity, contractual, or jurisdiction-specific duties.

Foundation mode allows `none` and production-clean `internal` data only. `customer`, `secret`, and `regulated` data are blocked unless a future owner-approved policy explicitly permits the exact handling path.

If classification is unclear, AG OS must treat data as the more sensitive level.

## 25. Validation Limits

Passing validation is required, but it does not prove production readiness, security approval, owner approval, live-service approval, domain safety, billing safety, database migration safety, or absence of all secrets.

Current validation checks required foundation paths, JSON schema metadata, selected templates, selected registries and policies, empty foundation Project Registry, and obvious forbidden credential or live-connection marker patterns.

Validation does not authorize live services, deployments, credentials, production data, customer data, paid actions, domain changes, database migrations, connector permission changes, or Constitution activation.

Validation may be expanded through safe PRs. Any validation that calls live services, reads production systems, spends money, deploys, sends messages, or mutates external state requires owner approval before use.

## 26. Amendment Rules

This Constitution may be amended only through a scoped PR.

Each amendment must identify:

- Changed section.
- Reason.
- Risk.
- Expected operating effect.
- Rollback path.
- Validation evidence.

Amendments that change authority, approval gates, data policy, deployments, live services, paid actions, production data, security controls, cost limits, protected product migration, trust levels, or Constitution activation require explicit owner approval.

Amendments must pass validation and CI before merge. After audit records become active, Constitution activation and amendments should create audit events.

## 27. Non-Activation Statement

This file is a draft Constitution v1. It does not activate Constitution v1, change trust level, add records, connect services, deploy, store credentials, use production data, migrate Lead Gen, trigger paid actions, or change domains.
