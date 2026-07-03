# Project Registry

## Purpose

The Project Registry is the source-controlled index of AG Digitalz OS project records. It exists so future projects can be discovered, reviewed, and validated without connecting to live services.

## Current Status

The registry is active. It contains production-clean project records approved through scoped PRs.

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
- No fake project records
- No demo project records
- No customer records
- No product records until explicitly approved in a scoped PR
- No lead generation records until explicitly approved in a scoped PR
- No AI receptionist records until explicitly approved in a scoped PR
- No credentials
- No live service connection details
- No deployment instructions

## Registered Projects

Current registered projects:

| Project ID | Name | Status | Management Mode | Record |
| --- | --- | --- | --- | --- |
| `project-lead-generation-system` | Lead Generation System | `complete` | `observe_only` | `.codex/projects/lead-generation-system.json` |
| `project-ag-digitalz-ai-receptionist` | AG Digitalz AI Receptionist | `active` | `active_build` | `.codex/projects/ag-digitalz-ai-receptionist.json` |

The Lead Generation System record is observe-only. AG OS must not touch source code, VPS, Postgres, n8n workflows, domain or DNS, deployments, credentials, production data, or customer data.

The AG Digitalz AI Receptionist record marks it as a separate product project, not AG OS core. AG OS must not infer live service status beyond known repository records.

## Adding A Future Project

A future project registry change must be its own reviewed PR unless a later operating rule explicitly allows a larger scoped PR.

Before a project can be added:

1. Create or update the project record under `.codex/projects/`.
2. Validate the project record against `schemas/project.schema.json`.
3. Add the project to `.codex/projects/registry.json`.
4. Run `npm run validate`.
5. Include approval context in the PR body when the project touches production-sensitive systems.

Protected product projects such as Lead Gen and AI Receptionist must follow `docs/product-project-policy.md`.

## Foundation Lock

While `status` is `foundation`, validation requires `projects` to stay empty. When `status` is `active`, validation requires each project entry to point to an existing project record that validates against `schemas/project.schema.json`.
