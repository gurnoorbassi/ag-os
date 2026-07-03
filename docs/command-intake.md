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
