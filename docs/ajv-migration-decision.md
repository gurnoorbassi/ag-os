# AJV Migration Decision

Status: Decision complete — defer migration.

Decision date: 2026-07-13.

## Decision

AG OS will not add AJV or another JSON Schema dependency now. The current hand-written validator remains the active offline validator while its documented subset is sufficient for active record paths.

## Why

- Current validation fails loudly when an enforced schema uses unsupported structural keywords.
- Warning-only `format` handling and metadata-only schemas are documented in `docs/validation-limits.md`.
- The current completion work is not blocked by missing full JSON Schema support.
- Adding AJV would be a dependency and supply-chain change requiring its own scoped approval and review.

## Reconsideration Triggers

Reopen this decision when at least one condition is true:

1. An active source-of-truth record requires `$ref`, conditional schemas, or another unsupported keyword.
2. Warning-only date-time validation causes a real quality or safety defect.
3. Validator maintenance cost becomes higher than a reviewed dependency migration.
4. The owner approves a scoped dependency and validator migration package.

## Migration Gate If Reopened

Any future migration must include dependency provenance, lockfile review, validator parity tests, failure-mode tests, rollback to the current validator, secret scanning, full local gates, CI, and explicit approval for the dependency and validator changes. This decision authorizes no dependency installation or validator change.
