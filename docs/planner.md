# Planner Foundation

The Planner turns owner commands into structured plans before execution is considered.

This foundation is planning metadata only. It does not execute steps, modify services, deploy code, connect credentials, or spend money.

## Plan Inputs

Future plans must be built from:

- owner command
- project registry entry
- command registry category
- action matrix risk level
- connector registry permissions
- capability registry status
- cost limits
- approval workflow
- relevant project rules

## Plan Contents

A plan must describe:

- plan ID
- source job and command
- affected project
- risk level
- estimated cost
- tools required
- task list
- approval gates
- expected output
- stop conditions
- safety limits

## Commitment Gate

A plan is not a commitment to execute. AG OS must pass the commitment gate before work begins:

- scope is clear
- files or systems affected are identified
- risk tier is understood
- cost estimate is within limits
- required approvals are known
- validation expectations are known
- rollback or recovery expectations are known when applicable

## Cost Rules

Plans must estimate cost against:

- `$5` per task
- `$10` per day
- `$50` per month

Paid services and live API usage require owner approval unless the active approval workflow already records a valid approval lock for the exact scope.

## Safety Rules

Planner output must stop before execution if:

- credentials are needed
- live services are needed
- deployment is requested
- domain or DNS changes are requested
- production/customer data is required
- paid actions are required
- approval locks are missing or invalid
- validation or CI requirements are unclear

## Relationship To Other OS Domains

The Planner consumes queued and routed jobs, then produces structured plans for:

- Approval Ledger
- Execution Engine
- Cost Ledger
- Audit Trail
- Watchdog Engine

State Management may summarize planning status, but plan records remain the canonical planning artifacts once runtime exists.
