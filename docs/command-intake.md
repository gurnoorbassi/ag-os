# Command Intake Foundation

Command Intake defines how owner commands are classified and turned into plans.

This foundation is plan-only. It does not add a frontend command bar, execute commands, call connectors, deploy code, change domains, access credentials, or spend money.

## Purpose

Command Intake converts owner requests into structured metadata for:

- command category
- project context
- risk level
- required plan
- approval requirement
- blocked conditions
- next job or plan records

## Two-Phase Intake

Command Intake runs in two phases. Regex and keyword matching is a safety mechanism, not understanding.

### Phase A: Deterministic Safety Scan

Phase A is produced by deterministic scripts. It scans the raw command for risk signals, approval gates, live-action requests, credential mentions, paid actions, production danger, and blocked command categories. Phase A decides risk level, command category defaults, and gate flags. Phase A never infers business intent.

### Phase B: Worker Understanding Block

Phase B is produced by a model worker under `docs/worker-protocol.md` and validated by scripts against `schemas/command-intake.schema.json`. The `understanding` block must include:

- `producedBy`: which worker produced the block.
- `inferredBusinessObjective`: the real business goal behind the command.
- `productArchetype`: the matching archetype from `.codex/archetypes/`, or a stated none.
- `targetUser`: who the output serves.
- `successCriteria`: what makes the result a success.
- `criticalUnknowns`: at most 3 questions that genuinely require the owner.
- `confidence`: low, medium, or high.
- `assumptions`: inferred decisions the owner can veto at plan review.
- `ownerConstraints`: constraints extracted from the command itself, such as volumes, platforms, account counts, or frequencies.

Workers must infer aggressively and ask minimally: everything inferable goes into `assumptions`, and only the missing critical information goes into `criticalUnknowns`. An intake record without an understanding block can support `plan_only` classification but must not advance to a build plan.

Phase B output is advisory until it passes deterministic validation. Scripts enforce shape, the 3-unknown limit, and confidence values; they never author understanding content.

## Command Categories

Command Intake must classify commands using the Command Registry categories:

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

## Plan-Only Command Bar Model

The first command bar model is plan-only.

It may:

- classify owner commands
- identify project scope
- identify risk level
- identify approval gates
- create a plan proposal once runtime support exists
- report blocked status

It must not:

- execute commands directly
- call live connectors
- deploy
- send messages
- change domains or DNS
- handle credentials
- access production/customer data
- perform paid actions

## Classification Requirements

Each future intake record must identify:

- command intake ID
- raw command
- normalized command
- command category
- project ID when known
- risk level
- approval requirement
- live-service requirement
- planned output
- blocked reason when applicable
- next job or plan IDs when created

## Stop Conditions

Command Intake must stop before execution when:

- command scope is unclear
- project ownership is unclear
- risk level is unclear
- live services are requested
- credentials are requested
- deployment is requested
- domain or DNS changes are requested
- production/customer data is needed
- paid actions are requested
- approval gates are missing
- validation or CI requirements are unclear

## Relationship To Other OS Domains

Command Intake reads from:

- Command Registry
- Project Registry
- Action Matrix
- Boot Sequence Runner
- Cost Ledger
- Approval Ledger
- Connector Registry

It sends structured work to Job Queue, Task Router, Planner, and Audit Trail once runtime exists.
