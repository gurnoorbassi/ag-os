# Cross-Worker Memory Sync

## Purpose

Codex, Fable, and future AG OS workers must use the same accepted lessons without treating candidate lessons as truth.

## Worker Rules

Workers may read:

- `.codex/memory/registry.json`
- `.codex/memory/accepted/`
- `.codex/skills/`
- dashboard read-model summaries

Workers may cite candidate lessons only as advisory evidence, not as accepted guidance.

## Sync Contract

Before planning, critique, build review, or connector execution preflight, a worker should load a relevance-ranked accepted-memory briefing using `scripts/load-accepted-lessons.mjs --project <project-id> --archetype <archetype-id> --output <output-type> --worker <worker-type>` or the dashboard read model.

The briefing may include high-quality source-controlled examples from similar projects. Examples are evidence only; candidate scores are not accepted lessons and do not grant permission.

The worker must preserve:

- candidate lessons are advisory
- rejected lessons are excluded
- skills do not grant permission
- memory does not grant permission
- owner authority and approval locks win over memory

## Fable/Codex Coordination

Fable may produce candidate lessons and skill suggestions, but Codex or an AG OS reviewer must gate them before merge.

Codex may load accepted lessons into planning and review, but it must not promote lessons automatically.

Cross-worker sync is source-controlled. Chat-only memory, browser state, or local unsaved notes are not source of truth.
