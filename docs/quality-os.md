# Quality OS

## Purpose

Quality OS defines the quality gates, evidence requirements, waiver rules, rollback readiness, and residual risk handling for AG Digitalz OS work.

This foundation is metadata and policy only. It does not create project records, run live checks, connect services, deploy, or change external systems.

## Current Policy

```text
.codex/quality/policy.json
```

Schema:

```text
schemas/quality-policy.schema.json
```

## Required Gates

- `foundation_validation`
- `schema_validation`
- `safety_review`
- `documentation_review`
- `rollback_readiness`
- `residual_risk_review`

Required gate failures block safe merge unless the policy explicitly routes the gate to owner review.

## Quality Rules

- Validation is required before merge.
- Passing status requires evidence.
- Waivers require owner approval.
- Failed required gates block merge.
- Risky changes require rollback notes.
- Known residual risks must be documented.

## Evidence Types

Quality evidence may include:

- Validation output
- CI status
- Diff review
- Safety checklist
- Rollback notes
- Residual risk notes

## Validation

`npm run validate` checks that:

- The Quality OS policy file exists.
- The Quality OS schema exists.
- Every required gate is present.
- Validation is required before merge.
- Passing status requires evidence.
- Waivers require owner approval.
- Failed required gates block merge.
- Rollback notes are required for risky changes.

This validation is local and offline.
