# Connector Executor Foundation

The Connector Executor defines how AG OS may use GitHub MCP, n8n MCP, Netlify MCP, and future connectors safely.

This foundation is template and schema metadata only. It does not call connectors, activate workflows, deploy sites, connect credentials, change domains, or spend money.

## Connector Execution Inputs

Future connector execution records must identify:

- connector execution ID
- connector ID
- requested action
- project ID
- risk level
- required permissions
- approval requirement
- approval ID when required
- evidence required
- safety limits

## Known Connector Rules

The Connector Registry remains the source of truth for connected tools and permissions.

The current known connector direction is:

- GitHub MCP may support repository, PR, CI, and merge workflows within approved scope.
- n8n MCP may support workflow inspection or future workflow management only after approval.
- Netlify MCP may support dashboard hosting or deployment workflows only after approval.
- Base44 may be used as an optional UI prototype builder only when explicitly approved and connected; it is not a source of truth.

## Hard Stops

The Connector Executor must stop before:

- credentials are needed
- live service actions are needed
- n8n workflow activation is requested
- deployment is requested
- Netlify production deploy is requested
- domain or DNS changes are requested
- production/customer data access is requested
- paid actions are requested
- connector permission scope is unclear
- approval lock is missing for a gated action

## Evidence

Safe connector execution must produce evidence such as:

- PR link
- commit SHA
- CI status
- validation result
- approval ID
- audit event ID when runtime exists
- redacted connector action summary

## Relationship To Other OS Domains

The Connector Executor reads from:

- Connector Registry
- Command Registry
- Project Registry
- Approval Ledger
- Audit Trail
- Cost Ledger
- Security OS
- Watchdog Engine

It reports results to State Management, Audit Trail, and Watchdog Engine once runtime exists.
