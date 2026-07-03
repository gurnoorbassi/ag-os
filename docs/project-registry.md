# Project Registry

## Purpose

The Project Registry is the source-controlled index of AG Digitalz OS project records. It exists so future projects can be discovered, reviewed, and validated without connecting to live services.

## Current Status

The registry is in foundation mode. It contains no project records.

Current registry file:

```text
.codex/projects/registry.json
```

Current schema:

```text
schemas/project-registry.schema.json
```

## Registry Rules

The registry must stay production-clean:

- No example project records
- No customer records
- No product records until explicitly approved
- No lead generation records until explicitly approved
- No AI receptionist records until explicitly approved
- No credentials
- No live service connection details
- No deployment instructions

## Adding A Future Project

A future project registry change must be its own reviewed PR unless a later operating rule explicitly allows a larger scoped PR.

Before a project can be added:

1. Create or update the project record under `.codex/projects/`.
2. Validate the project record against `schemas/project.schema.json`.
3. Add the project to `.codex/projects/registry.json`.
4. Run `npm run validate`.
5. Include approval context in the PR body when the project touches production-sensitive systems.

## Foundation Lock

While `status` is `foundation`, validation requires `projects` to stay empty.
