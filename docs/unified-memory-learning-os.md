# Unified Memory + Learning OS v1

## Purpose

Unified Memory + Learning OS governs how AG OS turns observations into reusable knowledge without letting unreviewed lessons become operating truth.

This system is a learning layer, not a permission layer. It cannot approve live services, credentials, deployments, domain changes, paid tools, production data, customer data, Lead Gen changes, AI Receptionist changes, or Constitution changes.

## Source of Truth

The canonical memory registry is `.codex/memory/registry.json`.

Memory records are separated by state:

- Accepted lessons: `.codex/memory/accepted/`
- Candidate lessons: `.codex/memory/lessons/candidates/`
- Rejected lessons: `.codex/memory/rejected/`
- Conflicting lessons: `.codex/memory/conflicts/`
- Skills derived from accepted lessons: `.codex/skills/`

The older `.codex/memory/lessons/` directory remains a legacy accepted-lesson location for existing conventions. New accepted lessons should use `.codex/memory/accepted/`.

## Memory Scopes

- `personal`: owner preference or learning style.
- `project`: project-specific lesson.
- `client`: client-specific lesson that must not be generalized without owner approval.
- `company`: AG Digitalz-wide rule or operating lesson.
- `agent_shared`: reusable lesson for approved AG OS workers.
- `worker_specific`: guidance for one worker type or tool path.

## Runtime Loading

`scripts/load-accepted-lessons.mjs` loads only accepted lessons. It does not load candidates or rejected lessons as truth.

Planner, critic, builder, Codex, Fable, and future workers may read the accepted lesson briefing. They must treat it as advisory guidance only.

Runtime memory loading must preserve:

- `candidatesLoadedAsTruth: false`
- `rejectedLoadedAsTruth: false`
- `memoryGrantsPermission: false`
- `skillsGrantPermission: false`

## Promotion and Rejection

`scripts/process-lesson-promotion.mjs` supports local promotion and rejection workflows.

Promotion requires:

- candidate lesson record
- owner approval
- approval id
- approver id
- evidence
- conflict check
- safety check

Rejection requires:

- candidate lesson record
- reviewer id
- reason

Rejected lessons remain source-controlled evidence but do not influence runtime.

## Conflict Handling

Conflicting lessons block promotion. Conflicts are detected when a candidate overlaps an accepted lesson in scope and applies-to context but changes the meaning.

Conflict records may be stored in `.codex/memory/conflicts/`. A conflict must be resolved by review before promotion.

## Skills

Skills may be created from accepted lessons only after owner approval. A skill is procedural memory, not permission.

Skills must not:

- authorize live actions
- bypass approval gates
- relax Cost OS limits
- override Security OS
- change Constitution authority
- store credentials

## Dashboard

Dashboard Control Center must show:

- candidate lessons
- accepted lessons
- rejected lessons
- stale lessons
- conflicting lessons
- review-needed lesson decisions
- accepted lesson runtime loading state
- candidate isolation state

The dashboard remains read-only.

## Stop Conditions

Stop memory promotion if the lesson:

- conflicts with the Constitution or authority order
- relaxes approval gates
- grants live-action permission
- implies credentials or tokens may be stored in source control
- includes private client data, customer data, or production data
- changes Lead Gen or AI Receptionist boundaries
- requires a live service call
- requires deployment, domain, DNS, OAuth, posting, scheduling, analytics, or n8n activation

## Validation

Validation must ensure:

- memory registry exists and is active
- candidates are not loaded as truth
- accepted lessons validate against schema
- rejected lessons validate against schema
- conflict records validate when present
- memory cannot grant permission
- skills cannot grant permission
- secrets remain blocked
