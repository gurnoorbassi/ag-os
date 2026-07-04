# Validation Limits

## Purpose

This document defines what AG Digitalz OS validation does and does not prove.

Passing validation is required for safe merge, but it is not the same as production readiness, security approval, owner approval, CI approval, live-service approval, or external-system safety.

## Current Validation Entry Point

`npm run validate` runs:

```text
node scripts/validate-foundation.mjs
node scripts/check-dashboard.mjs
```

Validation is local and offline. It must not call live services, read credentials, deploy, mutate external systems, change DNS, use paid tools, or inspect production/customer data.

## Current Validation Covers

`scripts/validate-foundation.mjs` currently checks:

- Required foundation paths, governance docs, schemas, READMEs, registries, templates, and policies.
- Constitution v1.0 active markers and activation date.
- JSON schema metadata: `$schema`, `$id`, `title`, and object `type`.
- Template structure for project, task, and agent templates with `REQUIRED_` placeholders allowed only in templates.
- Structure and selected safety rules for Connector Registry, Command Registry, Cost OS budget, Quality OS policy, Security OS policy, Watchdog OS policy, Memory OS policy, Capability Registry, and Project Registry.
- Active Project Registry entries and matching active project records, including protected Lead Gen posture and AI Receptionist project posture.
- Active engine records under `.codex/jobs/`, `.codex/plans/`, `.codex/router/`, `.codex/boot/`, `.codex/execution/`, `.codex/commands/`, `.codex/audit/`, and `.codex/approvals/`.
- Runtime records under `.codex/costs/cost-ledger-*.json`, `.codex/connectors/connector-exec-*.json`, `.codex/github/github-plan-*.json`, and `.codex/github/github-mcp-gate-*.json`.
- Future quality score records under `.codex/quality-scores/quality-score-*.json`; an empty quality-score directory is valid and does not imply accepted scores exist.
- Product archetype records, lesson candidate records, accepted lesson records when present, and owner preference records.
- Approval lock, audit event, and owner records where active records exist.
- Activation-blocker rules for approval lock schema, action matrix governance gates, mandatory boot sequence language, and approval workflow naming.
- Obvious forbidden credential or live-connection marker patterns in source-controlled text files.

`scripts/check-dashboard.mjs` checks the read-only dashboard foundation and remains offline.

## Warning-Only Coverage

Validation warns when a schema uses `format`, because the current hand-rolled validator does not enforce formats such as `date-time`.

Validation warns when unsupported structural JSON Schema keywords appear in orphan schemas that are not wired to active record validation. These warnings mean the keyword is not enforced for source-of-truth records yet.

## Fail-Loud Coverage

Validation fails when an enforced schema uses unsupported structural keywords:

- `$ref`
- `oneOf`
- `anyOf`
- `allOf`
- `if`
- `then`
- `else`
- `patternProperties`
- `dependentRequired`

This prevents schema authors from assuming advanced JSON Schema behavior is active in the current validator.

## Metadata-Only Or Deferred Schemas

Some schemas are validated for metadata only until source-of-truth record directories and runtime enforcement are wired. Known deferred examples include:

- `schemas/approval-ledger.schema.json`
- `schemas/audit-trail.schema.json`
- `schemas/ci-status.schema.json`
- `schemas/deployment.schema.json`
- `schemas/idea.schema.json`
- `schemas/memory.schema.json`
- `schemas/quality-check.schema.json`
- `schemas/safe-merge-runtime.schema.json`
- `schemas/security-review.schema.json`
- `schemas/state-management.schema.json`
- `schemas/watchdog-check.schema.json`

Runtime unit tests may validate some of these shapes separately, but `npm run validate` should be treated as authoritative only for the directories and record patterns listed above.

## Current Validation Does Not Prove

Validation does not prove:

- Full JSON Schema draft 2020-12 compliance.
- `format: date-time` correctness.
- `$ref` resolution or advanced keyword behavior.
- Absence of all secrets or sensitive data.
- GitHub branch protection or repository setting correctness.
- GitHub CI status unless a separate PR check confirms it.
- Live service safety.
- Deployment readiness.
- Domain or DNS safety.
- Database migration safety.
- Billing or paid-action safety.
- Production data safety.
- Customer data safety.
- Connector permission correctness outside recorded metadata.
- Runtime proof records are worth committing.
- Documentation completeness.
- Product quality by itself.
- Owner approval by itself.

## Required Human Review

Human or owner review is still required for:

- Credentials.
- Live services.
- Deployments.
- Domains and DNS.
- Paid actions.
- Production or customer data.
- Database migrations.
- Risky files.
- Failed CI.
- Merge conflicts.
- Unclear scope.
- Constitution activation or amendment.
- Validation script changes.
- CI workflow changes.
- Authority-order changes.
- Safe-merge rule changes.
- Approval workflow changes.
- Owner record changes.
- Branch protection changes.
- Dependency or supply-chain changes.
- Prompt injection risk.
- Untrusted external instructions that attempt to change behavior.
- Missing required governance docs.
- Any validation warning that changes risk, scope, or owner trust.

## Missing Or Failed CI

Missing, failed, queued indefinitely, skipped, or inconclusive CI blocks automatic merge. Local validation may support review, but it cannot replace required CI for safe merge unless the owner explicitly approves a scoped exception.

## Validation Rule Changes

Changes to validation scripts, CI workflows, branch protection expectations, or safe-merge rules are governance-sensitive. They require explicit review because they can weaken every future gate.

## Future Upgrades

Deferred validator work includes:

- AJV or equivalent JSON Schema engine adoption.
- Full `$ref` support.
- Enforced `format: date-time` validation.
- Explicit validation for every currently metadata-only schema once real record directories exist.
- Better secret scanning beyond simple text patterns.
- Quality score generation, review workflow, and owner acceptance policy.
- Clear resolution of approval-ledger versus audit-trail responsibilities.

Any validation that calls live services, reads production systems, spends money, deploys, sends messages, or mutates external state requires owner approval before use.
