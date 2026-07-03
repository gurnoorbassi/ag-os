# Live GitHub Repo Creation Approval Package

## Purpose

This package prepares the owner approval required before AG OS may create the first real GitHub repository from the dry-run command:

`make me a simple construction website repo`

This document and the related templates do not authorize or execute the live action. They define the exact scope the owner may approve later.

## Approval Package Files

- Approval lock template: `.codex/approvals/approval-20260703-github-repo-create.template.json`
- Future audit event template: `.codex/audit/audit-20260703-github-repo-create-approval.template.json`
- Dry-run GitHub plan evidence: `.codex/github/github-plan-runtime-github-construction-website-repo-20260703.json`
- Dry-run GitHub MCP gate evidence: `.codex/github/github-mcp-gate-runtime-github-construction-website-repo-20260703.json`
- Dry-run audit evidence: `.codex/audit/audit-runtime-github-construction-website-repo-20260703-github-dry-run.json`

## Exact Action Allowed After Approval

Only this action may be allowed by the future active approval lock:

- Create exactly one private GitHub repository.
- Use only the repository name explicitly approved by the owner.
- Record the approval lock and audit event before execution.
- Keep cost at `$0`.
- Keep data classification as `internal`.

Starter README creation is not authorized by this package unless the owner explicitly adds that action to the active approval lock before execution. If approved, the README must be starter-only and must not contain credentials, customer data, production data, deployment hooks, private endpoints, or live service instructions.

## Actions Not Allowed

This package does not allow:

- Creating more than one repository.
- Creating a public repository.
- Creating branches.
- Creating or updating files beyond a separately approved starter README.
- Opening pull requests.
- Polling CI.
- Merging pull requests.
- Deploying to Netlify or any other host.
- Connecting Netlify, n8n, Hetzner, Postgres, domains, DNS, billing, or paid services.
- Adding credentials, secrets, tokens, environment variables, private URLs, production data, or customer data.
- Touching the Lead Generation System.
- Touching the AI Receptionist repository.

## Owner Approval Instructions

To approve the future live action, the owner must provide exact text containing:

- Approval ID: `approval-20260703-github-repo-create`
- Approved repository name.
- Confirmation that the repository must be private.
- Whether starter README creation is approved.
- Expiration timestamp or expiration window.
- Confirmation that prohibited actions remain blocked.

Suggested approval format:

`Owner approval granted for approval-20260703-github-repo-create. Create exactly one private GitHub repository named <OWNER_APPROVED_NAME>. Starter README creation is <approved/not approved>. No deployment, Netlify, n8n, domain/DNS, paid service, credentials, production data, customer data, branch, PR, CI polling, or merge is approved. Approval expires at <TIMESTAMP>.`

AG OS must convert the approval-lock template into an active approved record only after receiving exact owner approval. The template is `revoked` by default and cannot authorize execution. The active record must replace every `REQUIRED_` placeholder before execution.

## Live GitHub Execution Checklist

Before any live GitHub repo creation:

- Boot sequence returns `ready`.
- `npm.cmd run validate` passes.
- Approval lock exists as an active approved record, not a template.
- Approval lock status is `approved`.
- Approval lock is unexpired and unrevoked.
- Approval lock target matches the owner-approved repository name.
- Approved action is exactly `create_repo`.
- Repository visibility is private.
- Cost budget impact is `$0`.
- Audit event is prepared and written before execution.
- Safety checklist below passes.

## Safety Checklist

The future executor must confirm:

- No credentials are read, printed, generated, committed, or stored.
- No live service other than the scoped GitHub repo creation call is touched.
- No deployment is triggered.
- No domain or DNS change is made.
- No paid service is used.
- No production data is read or written.
- No customer data is read or written.
- No Lead Gen source, VPS, Postgres, n8n workflow, domain, or deployment path is touched.
- No AI Receptionist repository action is performed.
- No starter README is created unless explicitly approved in the active lock.

## Rollback Plan For Accidental Repo Creation

If a repository is created outside the approved scope:

1. Stop all further execution immediately.
2. Do not create branches, files, PRs, deployments, secrets, collaborators, webhooks, or integrations.
3. If the repository is public, make it private if platform permissions allow immediate privacy mitigation.
4. Record an audit event with the repository name, timestamp, action attempted, actual result, and scope mismatch.
5. Notify the owner in the current thread.
6. Ask the owner whether to delete, archive, transfer, or keep the repository.
7. Delete or archive the repository only after explicit owner approval for that rollback action.
8. Record rollback completion or owner decision in audit.

## Current Status

The package is not active. Live GitHub repo creation remains blocked until the owner grants exact approval and the approval lock is converted into an active approved record.
