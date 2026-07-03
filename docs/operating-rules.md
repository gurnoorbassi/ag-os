# Operating Rules

## Non-Negotiable Safety Rules

1. Do not commit credentials, API keys, tokens, private certificates, database URLs, or `.env` files.
2. Do not connect live services without an approved project record and explicit user approval.
3. Do not deploy from this repository until a deployment project exists and CI validates the exact deploy path.
4. Do not modify the lead generation system from this repository during the foundation phase.
5. Do not activate n8n workflows from source-controlled exports by default.
6. Do not use production customer data in local tests, examples, schemas, or fixtures.
7. Do not let agents spend money, send messages, post publicly, delete data, or mutate production systems without an approval lock.
8. Do not treat memory as confirmed current truth unless it was verified during the current work or clearly marked as durable.

## Approval Gates

Approval is required before:

- Creating or rotating credentials
- Adding a live service connection
- Adding a database connection string
- Running a migration against production data
- Activating an n8n workflow
- Deploying to Hetzner, Netlify, or any public domain
- Sending outbound email, SMS, DMs, or public posts
- Spending money or enabling paid APIs
- Deleting, overwriting, or bulk-moving business data
- Touching the existing lead generation system

Approval workflow details live in `docs/approval-workflow.md`. Source-of-truth and conflict rules live in `docs/authority-order.md`.

## Safe Merge Policy

Codex-controlled merging is governed by `docs/safe-merge-policy.md`.

Tier 0 docs, templates, schemas, and metadata may be merged automatically after CI, local validation, and safety checks pass. Tier 1 validation and test infrastructure may also be merged automatically when it has no live service access. Credentials, live services, deployments, DNS, paid tools, production data, customer data, database migrations, merge conflicts, failed CI, unclear scope, or risky file changes require owner approval before merge.

## Agent Rules

Agents must have:

- A named role
- A clear purpose
- Allowed inputs
- Explicit prohibited actions
- Output format
- Required approval gates
- Escalation conditions
- Evidence requirements

Agents should prefer:

- Local files before live systems
- Fake payloads before real payloads
- Read-only checks before writes
- Small reviewable tasks before broad changes
- Explicit state updates before implied memory

## Task Rules

Every task should answer:

- What project does this belong to?
- What will change?
- What must not change?
- What is the risk level?
- What evidence proves it worked?
- What rollback or cleanup path exists?

## Memory Rules

Memory records must include:

- Source
- Date
- Confidence
- Verification status
- Expiry or refresh trigger when relevant
- Owner or responsible system

Memory must not include secrets or private customer data.

## Cost Rules

Cost records must include:

- Service or vendor
- Cost type
- Expected monthly range
- Spend owner
- Approval status
- Kill switch or cancellation path

No paid service should move from estimate to active cost without approval.

## Quality Rules

Quality gates should be proportional to risk:

- Docs-only changes require local validation.
- Schema changes require valid JSON and example compatibility.
- Automation changes require fake payload tests and disabled exports.
- UI changes require screenshots.
- Production changes require rollback notes and post-change verification.

## Security Rules

Security review is required for:

- Credentials and secrets
- Authentication or authorization
- Customer data
- Webhooks
- Public endpoints
- Database migrations
- File uploads
- Agent write permissions
- Paid API actions

## Current Foundation Lock

This repository is locked to Trust Level 0 until a future PR explicitly changes that level.
