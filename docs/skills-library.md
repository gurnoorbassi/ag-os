# Skills Library

## Purpose

The Skills Library records proven, reusable procedures — how AG OS does a category of work well. A lesson is one observation; a skill is a validated procedure with evidence. Skills sit one level above lessons in the memory hierarchy:

```text
lesson candidate -> accepted lesson -> (promotion) -> skill
```

This document is policy only. A skill never authorizes execution. It describes how, not whether. Every gated action still requires the approval demanded by the Constitution and action matrix.

## Records

```text
.codex/skills/<skill-id>.json
schemas/skill.schema.json
```

One JSON record per skill. Records validate under `npm run validate` as a knowledge record directory. Allowed statuses: `draft`, `active`, `deprecated`.

## Record Rules

- Skill ids match `^skill-[a-z0-9-]+$`.
- `evidence.proofRecords` must cite at least one record path that exists in this repository. Skills without evidence are not skills; they are guesses and must not be recorded.
- `evidence.sourceLessons` cites the lesson records the skill was distilled from, when they exist.
- `riskNotes` must name the gates and approvals the procedure touches, or state that it touches none.
- No credentials, no customer data, no production data, and no personal contact information appear in skill records.

## Lifecycle

### Creation (draft)

A worker may draft a skill when either condition holds:

1. Two or more accepted lessons describe the same procedure or topic, or
2. One accepted lesson plus one proven capability or runtime record cover the same action.

The worker writes the skill with `status: "draft"` and cites the evidence by path. Drafts carry no weight in briefings beyond being listed as drafts.

### Promotion (draft to active)

Promotion is owner-gated. The draft skill is submitted in a PR; owner review and merge of a change flipping `status` to `active` is the promotion. There is no auto-promotion.

When a lesson is consumed by a skill, the lesson record gains `promotedToSkill: "<skill-id>"` so the same lesson is not double-promoted and the audit trail is bidirectional.

### Application

Each time a skill is applied in real work, the applying worker updates `evidence.timesApplied` and `evidence.lastAppliedDate` in the same PR as the work it guided, citing the new proof record.

### Deprecation

If new lessons contradict a skill, or its `commonFailures` fire repeatedly, a worker proposes `status: "deprecated"` with `deprecatedReason` set and the contradicting lesson cited. Same PR gate as promotion. Deprecated skills stay in the repository as history; they are never silently deleted.

## Briefing Integration

`npm run boot:check` includes skills in the worker briefing: active skills are listed for use, drafts are counted as pending review. Briefing inclusion is intelligence delivery, not authorization.

## Seed Skills

The library seeds with draft skills distilled from already-proven capability runs: target PR review with quality score, GitHub branch/PR creation under approval gate, and Netlify staging deploy on the staging-only site. Each cites its runtime proof records. They remain drafts until owner promotion.
