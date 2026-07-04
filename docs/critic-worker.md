# Critic Worker

The Critic Worker is an adversarial review worker for AG OS plans. AG OS remains the head; the critic can only produce advisory critique records.

The critic reviews a plan against:

- selected product archetype
- archetype quality checklist
- known pitfalls
- approval gates
- stop conditions
- Cost OS limits
- owner preferences
- quality score records, when available
- accepted lessons and lesson candidates, when available

The critic cannot:

- edit the source plan directly
- approve live actions
- bypass approval gates
- create approval locks
- create accepted lessons automatically
- create permanent memory automatically
- use credentials
- call live services
- deploy
- change domain or DNS
- activate n8n or Netlify

## Inputs

`scripts/process-plan-critique.mjs` accepts:

- `--plan`: required source plan record path
- `--command`: optional command intake record path
- `--quality-score`: optional quality score record path
- `--owner-preferences`: optional owner preferences record path
- `--out`: optional output path
- `--now`: optional deterministic timestamp

The processor loads the selected active archetype from `.codex/archetypes` using the plan basis.

## Output

Critique records live in `.codex/critiques/` and validate against `schemas/plan-critique.schema.json`.

Each critique includes:

- critique id
- source plan id and path
- archetype id and file
- reviewer type `critic_worker`
- advisory-only authority
- findings with severity
- required fixes
- optional improvements
- pass, review, or fail status
- evidence references
- limitations

## Build-Mode Gate

`reviewStatus: fail` means the plan must not move toward build mode until the planner revises it or the owner explicitly overrides the finding.

`reviewStatus: review` means the plan needs human or planner review before promotion. The critique still does not authorize execution.

`reviewStatus: pass` means the critic found no blocking issue in the reviewed evidence. It still does not authorize live actions, deployment, paid tools, credentials, production data, or connector use.
