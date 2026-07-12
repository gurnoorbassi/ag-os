# Quality Score + Lesson Candidate Loop

Status: active completion policy v1.

This loop lets AG OS turn source-controlled work evidence into reviewable quality signals and candidate lessons without creating authority by automation.

## Purpose

The loop exists to make planning and execution improve over time while preserving owner authority. It can generate:

- `plan_quality_score` records from source-controlled plan-only work.
- `product_quality_score` records from source-controlled product output evidence when that exists later.
- `candidate` lesson records that point back to the score and source evidence.

Quality scores and lesson candidates are records, not commands, approval, memory truth, or permission to execute.

## Mechanical Job Completion

For jobs completed on or after `2026-07-09T20:06:25.029Z`, `done` is a guarded state. The execution processor must successfully create:

- one candidate quality score tied to the job's source-controlled plan; and
- at least one source-linked candidate lesson generated from that score.

The completed job stores the score and lesson paths in `completionEvidence`. Validation fails when a new completed job omits that evidence, references missing files, crosses project scope, or points to lessons that do not cite the completion score.

Historical jobs completed before policy activation remain immutable evidence. They are not silently rewritten or presented as mechanically closed. New processors must use `scripts/lib/runtime/job-completion-processor.mjs` before writing `status: "done"`.

If scoring or lesson generation fails, the job must not become `done`. Partial local records may be inspected and cleaned up before retry, but they grant no authority.

## Quality Score Timing

Generate a quality score only after a source-controlled plan, job, or output record exists.

For plan-only work, the score must:

- cite the source plan record;
- cite the active product archetype;
- evaluate the archetype checklist and minimum quality bar;
- use `plan_quality_score`;
- state that no product output was inspected;
- avoid owner-acceptance claims.

For product output work, future scoring must:

- use `product_quality_score`;
- cite actual output evidence;
- keep cost, security, approval, and production-data gates intact;
- stop if output evidence is missing, sensitive, or not source-controlled.

## Score Contents

A quality score should include:

- score ID and candidate status;
- source plan path;
- archetype ID and archetype file;
- checklist items evaluated;
- dimension scores;
- overall score;
- review status;
- evidence references;
- recommendations;
- generated timestamp;
- generator name;
- limitations.

The score must never mark work accepted by the owner unless a later owner-approved workflow explicitly supports that state.

## Lesson Candidates

Lesson candidates can be generated from quality scores and related source records.

Candidate lessons are useful when there is a meaningful signal, such as:

- below-bar quality dimensions;
- validation failures;
- cost variance;
- repeated approval or gate friction;
- archetype gaps;
- planner weakness;
- a successful pattern worth reusing.

Do not create lessons from silence.

## Candidates Are Not Truth

Candidate lessons must remain in `.codex/memory/lessons/candidates/` until reviewed. They are not loaded as accepted planning truth by the boot briefing.

Accepted lessons live separately in `.codex/memory/lessons/` and require owner promotion.

Candidate lessons must not:

- relax security, approval, or cost rules;
- create permanent memory;
- update archetypes automatically;
- authorize live service use;
- authorize deployment;
- authorize paid tools;
- authorize production or customer data handling.

## Owner Promotion

The future promotion workflow must require:

- owner approval;
- source references;
- reason for promotion;
- scope selection;
- audit event;
- validation;
- no conflict with Constitution v1.0, Security OS, Cost OS, or approval gates.

Until that workflow exists, AG OS may create candidate lessons only.

## Boot Briefing

Boot check may report:

- quality score count;
- latest quality score summary;
- candidate lesson count;
- accepted lesson count;
- whether candidates are loaded as truth.

Candidate lessons must always report `candidatesLoadedAsTruth: false`.

## Never Automatic

The following must never happen automatically:

- accepted lesson creation;
- permanent memory creation;
- Constitution changes;
- approval-rule changes;
- safety gate relaxation;
- cost-limit relaxation;
- security policy relaxation;
- archetype updates;
- live connector action;
- deployment;
- domain or DNS changes;
- paid action;
- production or customer data handling.
