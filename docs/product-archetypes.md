# Product Archetypes

## Purpose

Product archetypes stop AG OS from starting every project from blank. An archetype records what a high-quality product in its category should include: professional expectations, minimum quality bar, common modules and features, UX expectations, recommended Bootstrap Mode stack, phase breakdown, known pitfalls, approval gates, quality checklist, first-build guidance, early overbuild warnings, and stop conditions.

Archetypes are knowledge records, not authorization. They never grant live access, deployments, domain changes, credentials, data access, external messaging, posting, paid actions, or spending.

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
- The Planner cites the archetype and inherits its phases, quality bar, stop conditions, and approval gates.
- Quality OS scores finished work against the archetype's quality checklist.
- Dashboard views may summarize archetype coverage from source-controlled records.
- Lessons that improve a category are promoted back into its archetype through reviewed PRs.

Workers must read the relevant archetype before planning work in that category. Deviating from an archetype is allowed when justified, and the deviation must be recorded as a plan assumption.

## Required Shape

Every active archetype must define:

- Professional expectations.
- Minimum quality bar.
- Common modules or features.
- UX expectations.
- Recommended Bootstrap Mode stack.
- Phase breakdown.
- Known pitfalls.
- Approval gates.
- Quality checklist.
- What to build first.
- What not to overbuild early.
- Stop conditions.

These fields are validated by `schemas/product-archetype.schema.json`.

## Rules

- Archetypes must be production-clean: no credentials, client records, customer data, production data, standing approval locks, or live connector state.
- Archetypes describe categories, not clients. Client-specific detail belongs in project records.
- Recommended stacks must respect Bootstrap Mode: existing tools first, no new paid tools without owner approval.
- Archetype approval gates restate Constitution gates for the category. They can add gates, never remove them.
- New or changed archetypes go through reviewed PRs and `npm.cmd run validate`.
- Archetype records must not modify Lead Gen production or the AI Receptionist repo.
- Base44 may be mentioned only as an optional prototyping tool, never as source of truth.

## Current Archetypes

- `archetype-website`: Business Website.
- `archetype-social-media-content-operations-system`: Social Media Content Operations System.
- `archetype-crm`: CRM System.
- `archetype-lead-generation`: Lead Generation System.
- `archetype-training-platform`: Employee Training Platform.
- `archetype-ai-tool`: AI Receptionist System.
- `archetype-automation`: Automation Workflow System.
- `archetype-presentation`: PowerPoint Deck.
- `archetype-dashboard`: Dashboard Internal Tool.
- `archetype-client-portal`: Client Portal.
- `archetype-ecommerce-store`: Ecommerce Store.

## Builder Readiness

The Archetype Pack v1 records are enough for plan-only and local builder-readiness work across the common AG Digitalz product categories. They do not make AG OS ready for live deployments, domain work, Netlify activation, n8n activation, phone or voice actions, social account connections, live outreach, payment processing, or production data handling.

Future archetype changes should be small, evidence-backed updates driven by owner commands, quality reviews, or promoted lessons. Accepted lessons enter through draft records under `.codex/memory/archetype-updates/`; proposals never auto-apply and require a separate reviewed PR.
