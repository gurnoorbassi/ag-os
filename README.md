# AG Digitalz OS

AG Digitalz OS is the master operating foundation for AG Digitalz products, projects, agents, tasks, memory, costs, quality, security, deployments, and future internal systems.

This repository starts as a control plane, not a live application. The current foundation is docs, schemas, folder contracts, validation checks, and CI only.

## Current Scope

Included now:

- Operating architecture and safety rules
- Project, agent, task, memory, cost, quality, security, and deployment schemas
- `.codex/` operating folders for planning and state artifacts
- Local validation placeholders
- GitHub CI that runs local validation only

Explicitly excluded now:

- Live service connections
- Credentials, tokens, API keys, or secrets
- Deployments
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

None of those services are connected by this scaffold.

## Repository Layout

```text
.
|-- .codex/
|   |-- agents/
|   |-- costs/
|   |-- ideas/
|   |-- locks/
|   |-- memory/
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

The validation script checks required folders, required docs, valid JSON schemas, and obvious forbidden live-service markers.

## First Operating Principle

AG Digitalz OS should make future work safer before it makes future work faster. Any real integration must start disabled, documented, reviewable, and reversible.
