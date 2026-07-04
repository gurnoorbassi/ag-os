# Capability Registry

## Purpose

The Capability Registry will track AG Digitalz OS capabilities, their owners, safety tiers, approval requirements, and allowed execution scope.

The registry records proven AG OS capabilities, their evidence, approval requirements, risk tiers, and hard boundaries. A capability record is not standing permission to execute; every gated action still needs the approval required by the Constitution and action matrix.

## Current Registry

```text
.codex/capabilities/registry.json
```

Schema:

```text
schemas/capability-registry.schema.json
```

## Current Status

The registry is active and records proven capabilities honestly.

Registered proven capabilities:

- `capability-github-private-repo-creation-approved`: GitHub private repository creation with scoped owner approval.
- `capability-github-branch-pr-creation-approved`: GitHub branch creation, starter file creation/update, and PR opening with scoped owner approval.
- `capability-target-pr-review-critique-quality-score`: target repository PR review with advisory critique, quality score, cost record, and candidate lesson support.
- `capability-target-pr-merge-approved`: target repository PR merge with scoped owner approval and unchanged reviewed head SHA.
- `capability-netlify-staging-deploy-approved`: Netlify staging deploy on a dedicated staging-only site with scoped owner approval.
- `capability-n8n-inactive-draft-workflow-export-approved`: inactive n8n draft workflow creation and source-controlled workflow export with scoped owner approval.
- `capability-quality-score-generation`: local candidate quality score generation.
- `capability-lesson-candidate-generation`: local candidate-only lesson generation.
- `capability-critic-review-generation`: local advisory critique generation.

Not proven and blocked:

- Production deployment.
- Domain or DNS changes.
- Custom domains.
- Paid Netlify features.
- n8n workflow activation.
- n8n workflow credentials.
- Outbound email, SMS, WhatsApp, posting, or live outreach.
- Real external API workflow calls.
- Live social posting, social account connections, or analytics API pulls.
- Production data or customer data handling.
- Lead Gen production management.
- AI Receptionist production management.

Draft-only areas must remain planning or approval-package work until a future approved proof records execution evidence. A capability record never authorizes execution by itself.

Future capability records must include:

- Capability ID
- Capability name
- Capability type
- Proof records
- Approval requirement
- Risk tier
- Boundaries
- Blocked capabilities
- Last proven date
- Source records
- Owner
- Status
- Safety tier

## Allowed Capability Types

- `discussion`
- `planning`
- `local_build`
- `validation`
- `registry_management`
- `documentation`
- `approval_packet`
- `connector_execution`

`connector_execution` capabilities are approval-gated. They are allowed as recorded capability types only when their record keeps live actions blocked by default and requires owner approval for future execution.

## Registry Rules

By default:

- Credentials are not allowed.
- Live actions are not allowed.
- Live actions require owner approval.
- Paid actions require owner approval.
- Production data is not allowed.
- Customer data is not allowed.
- Deployments are not allowed.

## Validation

`npm run validate` checks that:

- The Capability Registry files exist.
- The registry validates against its schema.
- Foundation mode contains no capability records.
- Credentials are disallowed.
- Live actions are disallowed by default.
- Live and paid actions require owner approval.
- Capability records match the schema, including explicit proof/source records and risk fields.

This validation is local and offline.
