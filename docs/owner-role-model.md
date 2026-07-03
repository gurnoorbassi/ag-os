# Owner Role Model

## Purpose

This document defines owner authority, delegated approver rules, emergency fallback, owner-unavailable behavior, and high-risk override logging.

It does not add owner records or name real delegates.

## Roles

- `OWNER`: final business and operating authority for AG OS.
- `REQUIRED_DELEGATE_PLACEHOLDER`: future delegated approver for a specific scope.
- `INCIDENT_COMMANDER_PLACEHOLDER`: future incident commander for approved incident response.
- `REVIEWER_PLACEHOLDER`: future reviewer with review-only authority.

Only the owner has final authority until delegated approver records are explicitly added.

## Final Authority

The owner has final authority over:

- Constitution activation and amendment.
- Production systems.
- Live service connections.
- Deployments.
- Domains and DNS.
- Credentials and secret-store decisions.
- Paid tools, billing, and budgets.
- Customer data and production data.
- Protected product migration.
- Risk acceptance and waiver.

Owner authority does not permit credentials, secrets, or customer data to be committed to the repository.

## Delegated Approvers

Delegated approval is not active by default.

A future delegate must have:

- Owner-approved scope.
- Owner-approved expiration or review date.
- Allowed actions.
- Prohibited actions.
- Maximum risk tier.
- Audit trail.
- Revocation path.

Delegates cannot approve Constitution activation, Constitution amendments, owner record changes, authority-order changes, branch-protection changes, production data access, credentials, domain changes, billing changes, or protected product migration unless the owner explicitly grants that exact authority.

## Owner-Unavailable Procedure

If the owner is unavailable:

1. Continue only `R0` and safe `R1` work.
2. Stop all gated actions.
3. Preserve local evidence.
4. Prepare an approval packet.
5. Do not execute live actions, deploy, spend money, change domains, handle credentials, or touch production/customer data.

## Emergency Fallback

Emergency fallback is plan-only until a future owner-approved delegate exists.

AG OS may prepare incident notes, rollback options, and stop plans. It must not mutate live systems without explicit owner approval or a future approved delegate scope.

## High-Risk Override Logging

Any high-risk owner override must record:

- Who approved.
- What risk was accepted.
- Exact action allowed.
- Exact actions still prohibited.
- Expiration.
- Evidence.
- Rollback or recovery path.
- Audit event when audit records are active.
