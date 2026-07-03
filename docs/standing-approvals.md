# Standing Approvals

## Purpose

A standing approval is a reusable, scoped approval lock that covers a class of repeated safe actions instead of one single action. Standing approvals reduce owner micromanagement without weakening any Constitution v1.0 gate: they are ordinary approval locks under Constitution section 13, with a class-shaped scope.

This document is policy only. No standing approval lock exists yet. Creating the first one requires explicit owner approval, an approval lock record, and an audit event, exactly like any gated action.

## What A Standing Approval Is

A standing approval lock follows `schemas/approval-lock.schema.json` and must define everything a single-action lock defines, plus class boundaries:

- `approvalId` in the standard `approval-YYYYMMDD-slug` format.
- An action class, such as "create private GitHub repositories for approved AG OS project records".
- Exact inclusion criteria: which targets qualify, decided by deterministic checks, never by worker judgment.
- Exact exclusions: what remains outside the class no matter what.
- An expiration date. Standing approvals must expire; ninety days is the default ceiling.
- A usage budget when relevant: maximum uses, maximum cost, or both.
- Evidence requirements per use: each use still produces its own audit event and connector result record.
- A revocation path the owner can trigger at any time.

## What A Standing Approval Is Not

- It is not a permission tier change. Trust levels move only through their own owner-approved path.
- It is not transferable across action classes. A repo-creation standing approval says nothing about deploys.
- It is not a bypass of boot checks, validation, CI, safe-merge policy, or stop conditions. Every use runs the full gate chain except the per-action owner prompt.
- It never covers: credentials, production data, customer data, domain or DNS changes, production deploys, external messages, paid actions above Cost OS limits, Lead Gen production, or Constitution changes. These stay per-action approvals permanently.

## Use Rules

Before relying on a standing approval, AG OS must verify the lock exists, is approved, is unexpired, is unrevoked, matches the exact action class, covers the target under the inclusion criteria, has remaining usage budget, and does not exclude the requested action. Any failed check means stop and request per-action owner approval.

Every use must record: the `approvalId` used, the target, the deterministic inclusion-check result, an audit event, and evidence of the result.

## Creation Path

1. Owner states the action class to pre-approve.
2. A standing approval lock record is drafted under `.codex/approvals/` with class scope, exclusions, expiry, and usage budget.
3. Owner approves the exact record.
4. Audit event records the grant.
5. `npm run validate` passes with the new lock.

Revocation is one owner instruction plus a status change to `revoked` and an audit event.
