# Validation Limits

## Purpose

This document defines what AG Digitalz OS validation does and does not prove.

Passing validation is required for safe merge, but it is not the same as production readiness, security approval, owner approval, or live-service approval.

## Current Validation Covers

`npm run validate` currently checks:

- Required foundation paths.
- JSON schema metadata.
- Template structure for project, task, and agent templates.
- Structure and selected safety rules for current registries and policies.
- Empty foundation Project Registry.
- Forbidden credential and live-connection marker patterns in source-controlled text files.

## Current Validation Does Not Prove

Validation does not prove:

- Full JSON Schema compliance for every advanced keyword.
- Absence of all secrets or sensitive data.
- GitHub branch protection or repository setting correctness.
- Live service safety.
- Deployment readiness.
- Domain or DNS safety.
- Database migration safety.
- Billing or paid-action safety.
- Production data safety.
- Customer data safety.
- Connector permission correctness outside recorded metadata.
- Documentation completeness.
- Constitution readiness by itself.

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

## Missing Or Failed CI

Missing, failed, queued indefinitely, skipped, or inconclusive CI blocks automatic merge. Local validation may support review, but it cannot replace required CI for safe merge unless the owner explicitly approves a scoped exception.

## Validation Rule Changes

Changes to validation scripts, CI workflows, branch protection expectations, or safe-merge rules are governance-sensitive. They require explicit review because they can weaken every future gate.

## Validation Upgrade Rule

Validation may be expanded through safe PRs. Any validation that calls live services, reads production systems, spends money, deploys, sends messages, or mutates external state requires owner approval before use.
