# Plan Critiques

This directory stores source-controlled critique records produced by the Critic Worker.

Rules:

- Critiques are advisory review artifacts only.
- Critiques do not approve live actions, deployments, paid tools, credential use, production data use, or connector execution.
- Critiques do not bypass approval gates or owner authority.
- Critiques do not create accepted lessons or permanent memory automatically.
- Failed critiques block build-mode promotion until the planner revises the plan or the owner explicitly overrides the finding.
- Critique records must validate against `schemas/plan-critique.schema.json`.
