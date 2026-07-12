# Metrics Foundation v1

Status: active deterministic read model.

Metrics Foundation v1 computes cost variance, quality trend, rework signals, and lesson/example reuse from source-controlled AG OS records. `scripts/lib/runtime/metrics-processor.mjs` is the deterministic processor and the dashboard is its read-only presentation layer.

## Metrics Tracked

- commands received
- plans created
- PRs created
- PRs reviewed
- PRs merged
- staging deploys
- inactive n8n drafts
- recorded costs
- quality score trend
- critique pass, fail, and review-needed counts
- lesson candidates
- accepted lessons
- active and draft skills
- blocked actions
- stale approvals
- client, engagement, deliverable, and access request counts

The completion dashboard emphasizes four operating signals:

- estimated versus actual recorded cost and variance;
- average quality, pass count, and recent-versus-prior trend;
- critiques requiring fixes, total required fixes, and failed-job signals;
- accepted-lesson reuse, similar-quality-example reuse, and recorded skill applications.

## Rules

- Do not invent numbers.
- Do not backfill counts by guess.
- Do not change cost ledgers.
- Do not change quality scores.
- Do not change proof records.
- If a value is not computed from source records yet, leave `REQUIRED_` placeholders.
- Every future metric snapshot must cite source records or a deterministic processor.

## Source Records

Future metrics may read:

- command intake records
- job records
- route records
- plan records
- audit events
- connector execution results
- cost ledgers
- quality scores
- critiques
- lesson candidates
- accepted lessons
- skill records
- client management records
- approval locks
- monitoring records

## Validation Gate

Dashboard validation fails when the four operating metric groups are missing, are not source-record-derived, or report non-zero lesson reuse while no accepted lessons exist. Metrics never grant approval or authorize live operations.
