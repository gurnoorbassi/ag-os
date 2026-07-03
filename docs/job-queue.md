# Job Queue Foundation

The Job Queue tracks owner commands and AG OS work items through a controlled lifecycle before any execution engine exists.

This foundation is read-only metadata. It does not run jobs, call connectors, deploy code, modify production systems, or spend money.

## Purpose

The queue provides a common structure for work state across AG OS:

- command intake
- planning
- approval waiting
- safe execution steps
- blocked work
- failed work
- completed work
- cancelled work

## Canonical Job States

Job records must use one of these states:

- `queued`: accepted into the queue but not planned yet.
- `planning`: being converted into a structured plan.
- `waiting_approval`: blocked on a required approval lock.
- `running`: executing an allowed safe step.
- `blocked`: stopped by a safety gate, missing context, failed dependency, or owner decision.
- `failed`: attempted safe work failed and needs review.
- `done`: completed with expected output recorded.
- `cancelled`: intentionally stopped before completion.

## Required Fields

Future job records must identify:

- job ID
- related command ID
- project ID
- command type
- risk level
- assigned OS domain or agent
- current status
- approval requirement
- expected output
- timestamps
- safety limits

Unknown values must use `REQUIRED_` placeholders in templates only. Active runtime records must replace placeholders with real values before they are considered executable.

## Safety Rules

The Job Queue does not grant execution authority.

A queued job must stop before any gated action unless the active Constitution, action matrix, approval workflow, and approval lock allow it.

Jobs must not include:

- credentials or secrets
- production/customer data payloads
- live connector outputs
- deployment targets
- domain or DNS instructions
- paid action confirmations

## Relationship To Other OS Domains

The Job Queue consumes owner commands from Command OS and feeds structured records to:

- Task Router
- Planner
- Approval Ledger
- Execution Engine
- Audit Trail
- Cost Ledger
- Watchdog Engine

State Management may summarize queue health, but the queue remains the canonical home for job lifecycle records once runtime exists.
