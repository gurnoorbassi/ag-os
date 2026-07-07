# Memory Learning Policy

## Purpose

Memory/Learning OS defines how AG OS stores decisions, lessons, patterns, and working context without turning casual notes into permanent operating truth.

## Memory Scopes

- `personal`: owner preferences, learning style, and durable personal operating preferences.
- `project`: project-specific decisions, risks, patterns, and runbooks.
- `client`: client-specific lessons that must not be generalized without owner approval.
- `company`: AG Digitalz-wide rules, defaults, and operating decisions.
- `agent_shared`: lessons that approved agents can reuse across work.
- `worker_specific`: guidance for one worker type or connector path.

## Short-Term Casual Memory

Short-term casual memory:

- Is retained for `30` days.
- Is refreshed if referenced again.
- Is deleted after `30` days if unused.
- Must not be promoted to permanent memory without owner approval or a valid source.

Short-term memory is not a source of truth unless verified current.

## Permanent Memory

Permanent memory may include:

- Owner-approved decisions.
- Merged PR lessons.
- Customer feedback.
- Production incidents.
- Repeated proven patterns.

Permanent memory must include source, scope, owner or responsible system, and verification status.

## Agent Learning

Agents learn from each other through `agent_shared` lessons.

Agent-shared lessons must be source-backed. One-off brainstorming, guesses, and casual ideas must not become shared lessons.

Candidate lessons are not shared truth. Workers may cite them as advisory evidence, but only accepted lessons may be loaded into planner, critic, builder, or worker runtime guidance.

## Commitment Rule

No random brainstorming becomes permanent memory.

No casual idea creates work without a commitment signal such as an owner command, approved project, task record, or scoped PR.
