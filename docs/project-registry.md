# Owner Project Registry

## Purpose

The active registry is the owner-facing list of real products AG OS can target. It is not a list of AG OS internals, historical proofs, staging packages, or every repository ever observed.

The source of truth is `.codex/projects/registry.json`, validated against `schemas/project-registry.schema.json`. Each active entry points to a structured project record validated against `schemas/project.schema.json`.

## Active owner projects

| Project | Live application | Source control | Record |
| --- | --- | --- | --- |
| Quote Builder | `https://foreman-quote-studio.netlify.app/` | Setup needed: structured local application, no isolated repository/remote | `.codex/projects/quote-builder.json` |
| AI Lead Command Center | `https://app.agdigitalz.net/` | Setup needed: live VPS application, no canonical Git remote attached to deployed source | `.codex/projects/ai-lead-command-center.json` |

These are the only active owner projects. AG OS core, Lead Generation System, AI Receptionist, and Social Media Management records remain historical evidence, not selectable owner workspaces.

## Owner workspace rules

- A project must be real, structured, and explicitly registered.
- The Command screen requires the owner to choose a project; AG OS does not guess.
- The Projects screen must expose a working full-app link and a project-targeted command control.
- A live app may open in a new tab when its security policy blocks embedding. AG OS must not weaken `frame-ancestors` or `X-Frame-Options` to simulate an inline preview.
- Source-control status must be honest. `setup_needed` blocks repository and deployment automation until a canonical source is connected.
- Historical records may continue to support audits and read models without appearing as active owner projects.
- Credentials, customer or production data, deployments, messaging, paid actions, DNS, and other permanent live-action gates still require their exact approvals.

## Adding another project

There is no generic dashboard project-creation control. A third project requires a reviewed source change that provides its real structure, live-access posture, source-control state, boundaries, quality gates, and owner workspace metadata.
