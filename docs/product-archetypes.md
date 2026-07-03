# Product Archetypes

## Purpose

Product archetypes stop AG OS from starting every project from blank. An archetype records what a high-quality product in its category should include: professional expectations, minimum quality bar, UX expectations, recommended Bootstrap Mode stack, phase breakdown, known pitfalls, approval gates, and a quality checklist.

Archetypes are knowledge records, not authorization. They never grant live access, deployments, domain changes, credentials, or spending.

## Storage

```text
.codex/archetypes/
```

Schema:

```text
schemas/product-archetype.schema.json
```

## How Archetypes Are Used

- Command Intake maps a command to an archetype in the worker understanding block.
- The Planner cites the archetype and inherits its phases, quality bar, and approval gates.
- Quality OS scores finished work against the archetype's quality checklist.
- Lessons that improve a category are folded back into its archetype through reviewed PRs.

Workers must read the relevant archetype before planning work in that category. Deviating from an archetype is allowed when justified, and the deviation must be recorded as a plan assumption.

## Rules

- Archetypes must be production-clean: no credentials, client records, customer data, or production data.
- Archetypes describe categories, not clients. Client-specific detail belongs in project records.
- Recommended stacks must respect Bootstrap Mode: existing tools first, no new paid tools without owner approval.
- Archetype approval gates restate Constitution gates for the category. They can add gates, never remove them.
- New or changed archetypes go through reviewed PRs and `npm run validate`.

## Current Archetypes

- `archetype-website`: Business Website, grounded in the construction website dry runs of 2026-07-03.

Future archetypes should follow the same shape: CRM, lead generation, social media system, AI tool, presentation, dashboard, automation, and training platform.
