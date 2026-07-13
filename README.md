# AG Digitalz OS

AG Digitalz OS is the master operating foundation for AG Digitalz products, projects, agents, tasks, memory, costs, quality, security, deployments, and future internal systems.

This repository is a source-controlled control plane with an authenticated owner-operated coordinator and dashboard command console. Live connector actions remain separately approval-gated.

## Current Scope

Included now:

- Operating architecture and safety rules
- Project, agent, task, memory, cost, quality, security, governance, and deployment schemas
- `.codex/` operating folders for planning and state artifacts
- Local validation, dashboard, boot, test, and secret-scanning gates
- GitHub CI that runs local validation only
- Authenticated owner command API and operator console
- Fail-closed command-to-intake/job/plan/cost/gate/audit pipeline

Blocked unless separately approved:

- Live service connections
- Credentials, tokens, API keys, or secrets
- Production deployments
- Production database access
- Lead generation system changes
- n8n workflow activation
- Netlify project creation or DNS changes

## Current Stack Assumptions

AG Digitalz OS is designed around the current stack:

- Hetzner VPS for persistent runtime services
- Existing Postgres for future structured system state
- n8n for future workflow orchestration
- Netlify for future static and front-end hosting
- GitHub for source control, reviews, and CI
- AG Digitalz domain for future public routing
- Base44 only for UI prototypes when it helps exploration

The coordinator is packaged for an always-on VPS runtime, but deployment, credentials, databases, n8n activation, and domains remain separately gated.

## Repository Layout

```text
.
|-- .codex/
|   |-- agents/
|   |-- approvals/
|   |-- audit/
|   |-- capabilities/
|   |-- commands/
|   |-- connectors/
|   |-- costs/
|   |-- ideas/
|   |-- locks/
|   |-- memory/
|   |-- owners/
|   |-- projects/
|   |-- quality/
|   |-- security/
|   |-- tasks/
|   `-- watchdog/
|-- .github/workflows/
|-- docs/
|-- schemas/
`-- scripts/
```

## Validation

Run the local foundation check:

```powershell
npm run validate
```

Run the authenticated operator runtime after setting `AG_OS_OWNER_TOKEN` outside source control:

```powershell
npm.cmd run dashboard:build
npm.cmd run live:start
```

See `docs/live-operator-runtime.md` for the local and VPS operating path.

See `docs/documentation-map.md` for the canonical document for each AG OS operating subject.

The optional Anthropic planning worker is dependency-free and fail-closed. It needs a root-only `ANTHROPIC_API_KEY`, explicit enablement, configured token pricing, and a live scoped paid-action approval before the dashboard can select it.

The validation script checks required folders, required docs, valid JSON schemas, and obvious forbidden live-service markers.

## First Operating Principle

AG Digitalz OS should make future work safer before it makes future work faster. Any real integration must start disabled, documented, reviewable, and reversible.
