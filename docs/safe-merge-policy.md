# Safe Merge Policy

## Purpose

This policy defines when Codex may merge a pull request through the GitHub MCP/API after GitHub native auto-merge is unavailable.

Codex-controlled merging is allowed only for small, clearly safe changes that pass validation and have no production side effects.

## Required Checks Before Merge

Before merging, Codex must confirm:

- GitHub CI status is successful.
- `npm run validate` passed locally or in CI for the PR head.
- The PR has no credentials, secrets, tokens, passwords, keys, or certificates.
- The PR has no live service connections.
- The PR has no deployment changes.
- The PR has no domain or DNS changes.
- The PR has no production data or customer data.
- The PR has no paid actions, billing changes, paid tools, or spending paths.
- The PR has no risky files changed.
- The PR has no merge conflicts.
- The PR scope is clear.

## Allowed Automatic Merge Tiers

### Tier 0

Docs, templates, schemas, metadata, and source-controlled structure.

Examples:

- Documentation
- JSON schemas
- Empty registries
- Placeholder-only templates
- README files that preserve folders

### Tier 1

Validation and test infrastructure that does not connect to live services.

Examples:

- Local validation scripts
- CI checks
- Offline schema checks
- Static safety scans

### Tier 2

Fake-only or demo-only code when it cannot reach live systems, spend money, send messages, mutate production data, deploy, or expose customer data.

Tier 2 requires extra scrutiny because code can drift into side effects faster than docs or schemas.

## Stop For Owner Approval

Codex must stop and request owner approval when a PR includes or suggests:

- Credentials
- Live services
- Deployments
- Domain or DNS changes
- Paid tools or paid actions
- Production data
- Customer data
- Database migrations
- Merge conflicts
- Failed CI
- Unclear scope
- Risky files changed

## Risky Files

Treat these as risky unless a future operating rule narrows the list:

- `.env` files
- Secret or credential files
- Deployment configs
- Infrastructure configs
- DNS configs
- Database migrations
- n8n workflow activation files
- Netlify deploy hooks
- Payment or billing configs
- Production data exports

## Merge Method

When all checks pass, Codex may merge through the GitHub MCP/API. The merge action must use the PR head SHA when available so GitHub rejects the merge if the branch changed after validation.

## Reporting

After a Codex-controlled merge, report:

- PR number and link
- Merge result
- Branch
- Files changed
- CI result
- Local validation result
- Safe-merge tier
- Any skipped check and why it was not applicable
