# Task Router Foundation

The Task Router maps queued work to the correct AG OS domain, agent, or system based on command type, project context, risk level, connector needs, and approval gates.

This foundation is metadata only. It does not execute routed work, call tools, change project files, or trigger external systems.

## Routing Inputs

Future routing decisions must consider:

- command type
- project ID
- risk level from the action matrix
- connector requirements
- approval gates
- owner restrictions
- project management mode
- relevant OS domain
- agent eligibility

## Routing Outputs

A route record identifies:

- route ID
- source job ID
- target OS domain
- target agent or system
- connector needs
- approval gates
- routing reason
- blockers
- safety limits

## Safety Rules

Routing is advisory until the Execution Engine checks the active Constitution, action matrix, approvals, and validation status.

The Task Router must stop before routing to execution when:

- credentials are needed
- live services are needed
- deployment is requested
- domain or DNS changes are requested
- production/customer data is required
- paid actions are required
- connector permissions are unclear
- project rules block modification
- approval locks are missing or invalid

## Relationship To Other OS Domains

The router consumes jobs from the Job Queue and sends structured work toward:

- Planner
- Approval Ledger
- Execution Engine
- Connector Executor
- Audit Trail
- Watchdog Engine

State Management may summarize route status, but route records remain the canonical routing artifacts once runtime exists.
