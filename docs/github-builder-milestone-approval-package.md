# GitHub Builder Milestone Approval Package

## Purpose

This package prepares the owner approval required before AG OS may perform the first real builder milestone in the existing test repository:

`gurnoorbassi/ag-test-construction-website`

This document and the related records do not authorize or execute the live action. They define the exact scope the owner may approve later.

## Approval Package Files

- Approval lock proposal: `.codex/approvals/approval-20260704-github-builder-pr.template.json`
- GitHub execution plan: `.codex/github/github-plan-20260704-test-construction-builder-pr.json`
- Future audit event draft: `.codex/audit/audit-20260704-github-builder-pr-approval.template.json`

## Exact Future Live Action

After owner approval, AG OS may do only this in `gurnoorbassi/ag-test-construction-website`:

- Create one branch named `ag-os/starter-construction-website-v1`.
- Add or update the approved starter construction website files.
- Open one pull request to `main`.
- Stop after reporting the pull request link.

## Actions Not Allowed

This package does not allow:

- Creating another repository.
- Creating more than one branch.
- Opening more than one pull request.
- Merging the pull request.
- Polling CI unless separately approved.
- Deploying to Netlify or any other host.
- Connecting Netlify, n8n, Hetzner, Postgres, domains, DNS, billing, analytics, tracking, or paid services.
- Adding credentials, secrets, tokens, environment variables, private endpoints, production data, customer data, or real client data.
- Wiring forms to live services.
- Touching the Lead Generation System.
- Touching the AI Receptionist repository.
- Changing the Constitution.

## Bootstrap Mode Stack

Use a static website foundation:

- HTML for the page structure.
- CSS for responsive styling.
- Small local JavaScript only if useful.
- Zero runtime dependencies.
- `package.json` only if useful for local check scripts.

Do not add a framework unless the owner explicitly approves a larger builder step. The starter should remain easy to deploy later to Netlify staging, but this package does not allow Netlify activation or deployment.

## Expected Starter Files

- `README.md`: project purpose, local commands, safety boundaries, and future approval gates.
- `package.json`: optional zero-dependency local scripts.
- `index.html`: homepage with hero, services, and contact CTA sections.
- `src/styles.css`: simple responsive styling.
- `src/main.js`: local-only progressive enhancement with no tracking or live service calls.

## Risk Assessment

Risk tier: `R4`

The risk is live GitHub repository writes in a real repository. The risk is controlled because the future action is limited to one branch, approved starter files, and one pull request. No deployment, merge, credential access, paid action, production data, customer data, Netlify, n8n, domain, or DNS action is allowed.

## Why This Is Safe

- The target repository is an existing test repository.
- The future action writes only starter website files.
- The future action stops at an unmerged pull request.
- The starter site has no live backend, no paid API, no tracking script, and no wired form submission.
- The action requires an active owner approval lock before execution.
- Local validation, boot check, and safety review must pass immediately before execution.

## Validation Plan

Before execution:

- Run `npm.cmd run validate` in AG OS.
- Run `npm.cmd run boot:check` in AG OS.
- Run `node --test tests/*.test.mjs` in AG OS.
- Confirm the active approval lock exactly matches this package.
- Confirm no credentials, production data, customer data, paid actions, domain or DNS changes, deployments, Netlify, n8n, Lead Gen changes, AI Receptionist changes, or Constitution changes are included.

For the target repo file set:

- Check the planned file manifest before writing.
- Check for credential-like strings before opening the PR.
- Run `git diff --check` on the target repo branch if available locally.
- If `package.json` is added, run its local zero-dependency check script before opening the PR.

## Rollback Plan

If the branch or files are created outside the approved scope:

1. Stop all further execution immediately.
2. Do not open extra pull requests, merge, deploy, add secrets, connect services, or change settings.
3. Record an audit event with the attempted action, actual result, repository, branch, timestamp, and scope mismatch.
4. Notify the owner in the current thread.
5. If a pull request was opened, close it only after owner approval unless closing is required to stop an immediate risk.
6. If a branch was created, delete it only after owner approval unless deletion is required to stop an immediate risk.
7. Record the rollback decision and final state in audit.

## Stop Conditions

Stop before execution if:

- The approval lock is missing, expired, revoked, or does not exactly match this package.
- The target repository is not `gurnoorbassi/ag-test-construction-website`.
- The branch name is not `ag-os/starter-construction-website-v1`.
- More than one pull request is needed.
- The file list expands beyond the approved starter files.
- Validation, boot check, or safety review fails.
- Credentials, live services, deployment, Netlify, n8n, domain or DNS, paid action, production data, customer data, tracking scripts, wired live forms, Lead Gen changes, AI Receptionist changes, or Constitution changes become necessary.

## Exact Owner Approval Needed

To execute this future live GitHub builder milestone, the owner must provide exact approval text like:

`Owner approval granted for approval-20260704-github-builder-pr. AG OS may create one branch named ag-os/starter-construction-website-v1 in gurnoorbassi/ag-test-construction-website, add or update only the approved starter construction website files listed in docs/github-builder-milestone-approval-package.md, and open one pull request to main. No merge, deployment, Netlify, n8n, domain/DNS, paid action, credentials, production data, customer data, tracking scripts, wired live forms, Lead Gen change, AI Receptionist change, or Constitution change is approved. Approval expires in 24 hours.`

AG OS must convert the approval-lock proposal into an active approved record only after receiving exact owner approval. The current template is `revoked` by default and cannot authorize execution.
