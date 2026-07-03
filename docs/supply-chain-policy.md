# Supply Chain Policy

## Purpose

This document defines dependency, CI, action, package, and branch-protection expectations for AG OS.

This policy is docs-only and does not install packages, change CI, or change repository settings.

## Dependency Review

Owner review is required before:

- Adding runtime dependencies.
- Adding build dependencies.
- Adding GitHub Actions.
- Updating package managers or lockfile behavior.
- Adding binaries, generated vendor code, or remote install scripts.
- Adding packages that make network calls, handle credentials, deploy, process customer data, or execute untrusted code.

## Allowed Low-Risk Changes

Docs-only and schema-only changes do not require dependency review unless they change dependency policy, CI behavior, validation behavior, or security expectations.

## CI Workflow Protection

CI workflow changes are risky by default.

Before changing CI, AG OS must identify:

- Permissions requested.
- Secrets accessed.
- Network access.
- Deployment behavior.
- Third-party actions.
- Pinning strategy.
- Rollback path.

CI changes that add secret access, deployment, paid actions, package publishing, external writes, or elevated repository permissions require owner approval.

## Branch Protection Expectations

AG OS should expect:

- `main` protected from direct high-risk changes.
- CI required before merge when branch protection is available.
- No bypass of safe-merge rules.
- No force push to protected branches.
- No branch deletion for active PRs without owner approval.

Repository settings are not managed by this repo yet. Changing them requires owner approval.

## Least Privilege

Dependencies, actions, and connectors must request the smallest practical permission set. If a tool needs broad permission, owner approval and a documented reason are required.

## Supply Chain Stop Conditions

Stop for owner approval when a change includes:

- New dependency.
- New GitHub Action.
- CI workflow permission change.
- Branch protection change.
- Remote install script.
- Binary artifact.
- Package that handles credentials, customer data, production data, deployment, billing, or external writes.
