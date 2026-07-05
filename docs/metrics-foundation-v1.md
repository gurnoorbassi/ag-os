# Metrics Foundation v1

Status: template foundation only.

Metrics Foundation v1 defines what AG OS should measure over time without inventing totals. Until metric processors exist, AG OS stores templates only.

## Metrics To Track Later

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

Metric records should not become active until a schema and deterministic processor exist. This foundation only prepares template shapes for later validation.
