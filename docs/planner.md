# Planner Foundation

The Planner turns owner commands into structured plans before execution is considered.

This foundation is planning metadata only. It does not execute steps, modify services, deploy code, connect credentials, or spend money.

## Assembler Model

The Planner is a validator and assembler, not an author. Plan content is authored by a model worker as a plan draft under `docs/worker-protocol.md`; the planner script deterministically verifies the draft, merges in mandatory approval gates and stop conditions that no draft can remove, enforces the `$5` per-task cost limit, and writes the plan record.

A worker plan draft must provide `summary`, `tasks`, `tools`, and `expectedOutput`, and should provide a `basis` block that cites:

- `productArchetype`: the archetype the plan follows, or a stated none.
- `appliedLessons`: accepted lessons used, when any.
- `relevantMemory`: deterministic accepted-lesson and high-quality-example paths selected for the same project, archetype, or output type. Candidates are never loaded as truth and examples never grant permission.
- `ownerPreferencesUsed`: owner preferences applied, when any.
- `stackChoice`: the Bootstrap Mode stack decision and why.
- `qualityBar`: the quality bar inherited from the archetype.
- `assumptions`: inferred decisions the owner can veto at plan review.

When no draft is provided, the planner emits only a plan-only scaffold whose tasks are to produce the understanding block and the plan draft. Hardcoded per-category task lists are not allowed in planner code; category knowledge lives in archetypes.

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
