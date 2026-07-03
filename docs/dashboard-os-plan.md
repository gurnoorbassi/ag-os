# Dashboard OS Plan

## Purpose

Dashboard OS will give AG Digitalz OS a read-only operating view across ideas, projects, agents, tasks, memory, costs, quality, security, watchdog status, deployments, and future products.

This plan defines Dashboard OS and now has a static Dashboard v1 foundation. It does not connect live services, deploy, use Base44, read production systems, or activate monitoring.

## Foundation Scope

The first dashboard must be source-controlled and local-first. It should read only validated repository metadata until live connectors are explicitly approved.

Dashboard v1 runtime direction is Netlify. Staging deploys require owner approval or an approved staging capability. Production deploys, domain changes, and DNS changes require owner approval.

Allowed foundation inputs:

- Project registry
- Connector registry
- Command registry
- Capability registry
- Cost budget
- Quality policy
- Security policy
- Watchdog policy
- Memory policy
- Template records
- Local validation output

Blocked foundation inputs:

- Credentials
- Live APIs
- Production databases
- Customer data
- Billing data
- Domain or DNS providers
- Deployment systems
- External messaging systems

## Planned Views

- Overview: current AG OS foundation status and validation status
- Projects: registered projects and lifecycle state
- Tasks: task queue state once task records are approved
- Agents: approved agent roles and limits
- Commands: command category and approval level reference
- Connectors: connected and available connector status
- Capabilities: approved AG OS capabilities
- Memory: memory freshness and 30-day short-term window status
- Costs: budget limits and approval gates
- Quality: required gates and evidence status
- Security: controls, stop conditions, and approval gates
- Watchdog: planned checks and disabled/enabled state

## Dashboard v1 Foundation

Current dashboard files:

```text
dashboard/index.html
dashboard/styles.css
dashboard/app.js
dashboard/dashboard-data.js
```

Current local commands:

```text
npm.cmd run dashboard:build
npm.cmd run dashboard:check
```

Dashboard v1 is read-only. The generated data file is built from source-controlled AG OS records and docs. It must not fetch live services, connect credentials, deploy, change domains, write records, send messages, mutate connectors, or touch product systems.

## Design Rules

- Read-only by default
- Local metadata first
- No live service calls without owner approval
- No credentials in code or configuration
- No production or customer data
- No deploy button in foundation mode
- No send-message controls in foundation mode
- No paid actions in foundation mode

## Prototype Rule

Base44 may be considered later for UI prototypes only, but this plan does not connect Base44 or create a prototype. Any prototype must use fake-free production-clean placeholders and must not connect to live services.

## Validation

`npm run validate` requires this plan to exist. Dashboard v1 adds offline build and check commands. Future dashboard work should keep validation local until live integrations are explicitly approved.
