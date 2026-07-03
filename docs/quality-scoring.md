# Quality Scoring

## Purpose

Quality scoring turns Quality OS from gate-only into gate-plus-signal. Gates decide whether work may merge; scores measure how good finished work actually is, so lessons and archetypes improve with every project.

This document is policy only. Scoring is offline and creates no live actions.

## Scope

Quality scores apply to every AG OS output type: websites, apps, CRMs, social media systems, PowerPoints and presentations, dashboards, automations, workflows, prompts, code, docs, and deployments.

## Schema

```text
schemas/quality-score.schema.json
```

Score records are produced after a project or major deliverable completes. A model worker proposes the score with evidence; deterministic validation enforces shape and ranges; the owner can override any dimension.

## Dimensions

Each dimension is scored 0-10:

- `completeness`: everything the plan and archetype promised exists.
- `craft`: the work is well made, not merely present.
- `maintainability`: the next worker can extend it without archaeology.
- `ux`: the end user can succeed without instructions.
- `security`: no credentials, data exposure, or unsafe defaults.
- `performance`: fast enough for its real audience and platform.
- `ownerAcceptance`: the owner's actual verdict on the result.
- `archetypeFit`: the output meets its archetype's quality checklist.
- `costDiscipline`: delivered within Cost OS limits and estimates.

`overallScore` is the average unless a policy for the output type weights differently. The default quality bar is: no dimension below 5 and overall at least 7. `meetsBar` records the verdict.

## Below-Bar Rule

A below-bar score must produce at least one of:

- `improvementRecommendations`: concrete fixes for this deliverable.
- `lessonCandidates`: lesson candidate records under `.codex/memory/lessons/candidates/` so the gap is not repeated.

Below-bar work is not hidden. The score record stays in the repo as evidence.

## Rules

- Scores require evidence: validation output, CI links, review notes, or owner feedback references.
- Scores never authorize anything. A high score does not bypass approval gates.
- Owner acceptance below 5 forces `meetsBar: false` regardless of other dimensions.
- Score records must be production-clean: no credentials, customer data, or production data.
