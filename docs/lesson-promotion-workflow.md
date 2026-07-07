# Lesson Promotion Workflow

## Purpose

AG OS should learn from repeated work without letting unreviewed observations become rules. Lesson promotion defines how a useful pattern becomes reusable guidance.

## Promotion Path

1. Observation: A command, review, test, incident, or dry run exposes a reusable pattern.
2. Candidate: AG OS records the pattern as a lesson candidate with evidence and scope.
3. Review: The candidate is checked against Constitution v1.0, source of truth order, safety rules, and the relevant archetype.
4. Accepted Lesson: A reviewed PR promotes the candidate to an accepted lesson record.
5. Applied Guidance: The accepted lesson may update docs, archetypes, templates, validation, or planner behavior through a separate reviewed PR when needed.
6. Governance Change: If the lesson changes Constitution, authority, approvals, safe-merge rules, or owner model, it requires owner approval and the governance amendment path.

The local promotion helper is `scripts/process-lesson-promotion.mjs`. It supports promotion, rejection, and conflict checks, but it does not remove the requirement for owner approval and reviewed source-control changes.

## Evidence Requirements

A lesson candidate should include:

- What happened.
- Why it matters.
- Which command, PR, test, incident, or dry run produced the evidence.
- Which product archetype or OS domain it affects.
- Recommended scope.
- Risks if applied too broadly.
- Whether owner approval is required.

## Rules

- Lessons do not override the Constitution.
- Lessons do not create approval locks.
- Lessons do not authorize live services, credentials, deployment, domain or DNS changes, paid actions, production data, customer data, outreach, posting, or phone and voice actions.
- Lessons that touch protected projects must keep Lead Gen read-only and AI Receptionist separate unless separately approved.
- Lessons must not turn a one-off preference into a global rule unless the owner explicitly states it.
- Accepted lessons are loaded through `scripts/load-accepted-lessons.mjs` as advisory runtime context only.
- Candidate and rejected lessons must not be loaded as runtime truth.

## Quality Checks

Before promotion, confirm:

- The lesson is specific enough to apply safely.
- The evidence is real and source-controlled.
- The lesson does not duplicate an existing rule.
- The lesson does not conflict with an archetype, policy, registry, or schema.
- The lesson has a rollback path if it updates validation or runtime behavior.

## Stop Conditions

Stop promotion before:

- Constitution amendments without owner approval.
- Validation behavior changes without scoped approval.
- Runtime behavior changes without tests and review.
- Any live action, credential, deployment, paid service, protected-project change, production data, or customer data handling.
