# Social Media Netlify Staging Approval Package

## Purpose

This package prepares the owner approval required before AG OS may create or connect a dedicated Netlify staging-only site for Social Media Management System v1.

This package does not deploy, call Netlify, create a site, create a deploy hook, change DNS, add credentials, connect social accounts, post, schedule, activate n8n, or modify the target repository.

## Target

- Target repository: `gurnoorbassi/ag-social-media-management-system`
- Target branch: `main`
- Target main SHA: `d3fcd8c6435433169686c2ec404a5f00c6cc62bd`
- Source milestone: `gurnoorbassi/ag-social-media-management-system#1`
- Reviewed head SHA before merge: `bf57520a6b08bf5fab9986adc2c9f7ae54b1e5bf`
- Proposed staging site name: `ag-social-media-management-system-staging`

## Approval Package Files

- Approval lock proposal: `.codex/approvals/approval-20260704-social-media-netlify-staging.template.json`
- Future approval audit template: `.codex/audit/audit-20260704-social-media-netlify-staging-approval.template.json`
- Netlify staging plan: `.codex/netlify/netlify-plan-20260704-social-media-staging.json`
- Human-readable package: `docs/social-media-netlify-staging-approval-package.md`

## Proposed Future Netlify Action

After separate owner approval, AG OS may do only this:

- Create or connect one dedicated Netlify staging-only site named `ag-social-media-management-system-staging`.
- Deploy staging from `main` at `d3fcd8c6435433169686c2ec404a5f00c6cc62bd`.
- Verify the staging URL returns HTTP 200.
- Record the Netlify deploy result in AG OS.
- Stop before production, custom domain, DNS, paid features, secrets, social account connection, social credentials, posting, scheduling, n8n activation, real client data, Lead Gen, AI Receptionist, or Constitution changes.

## Staging-Only Scope

The future action is staging-only:

- No AG Digitalz production system.
- No customer production system.
- No production deploy.
- No custom domain.
- No DNS change.
- No paid Netlify feature.
- No deploy hook.
- No Netlify Forms.
- No analytics or tracking.
- No social OAuth connection.
- No social credentials.
- No posting.
- No scheduling.
- No n8n activation.
- No environment variables unless a later owner-approved package adds them.
- No credentials, tokens, private keys, or secrets in source control, docs, logs, memory, or PR text.

## Bootstrap Mode Build Settings

The current target app is a static starter with `index.html` at the repository root and static assets under `src/`.

Expected Netlify settings:

- Base directory: `.`
- Build command: not configured for the static site
- Publish directory: `.`
- Node version: not required
- Environment variables required: none

If Netlify requires a build command, environment variable, framework configuration, or repository file change, AG OS must stop and ask the owner before changing the package. A local target-repo check command may be run before deployment if available, but it must not become a Netlify build setting unless separately approved.

## Credential And Secrets Policy

- Do not add credentials, tokens, private keys, deploy hooks, social credentials, analytics credentials, or environment values to the target repository.
- Do not write Netlify authentication material into AG OS records, logs, docs, or memory.
- Do not expose any credential value in PR text or command output.
- If Netlify requires a credential or environment variable for this static staging site, stop and request a new approval package.

## Cost Estimate

- Estimated task cost: `$0`.
- Approved budget impact: none.
- Paid tools or paid Netlify features: not allowed.
- If Netlify requires a paid plan, paid add-on, bandwidth purchase, team upgrade, or billing change, stop before action.

## Risk Assessment

Risk tier: `R4`.

The future action would create or connect a live staging hosting surface. Risk is controlled because the site is a staging-only static starter, no production domain or DNS change is allowed, no paid feature is allowed, no credentials or environment variables are required, no social accounts are connected, and no real client data is present.

## Validation Plan

Before any future approved Netlify action:

- Confirm active approval lock `approval-20260704-social-media-netlify-staging` exists, is approved, is unexpired, and matches this exact scope.
- Run `npm.cmd run validate` in AG OS.
- Run `npm.cmd run boot:check` in AG OS.
- Run `node --test tests/*.test.mjs` in AG OS.
- Confirm the target repo is `gurnoorbassi/ag-social-media-management-system`.
- Confirm the target branch is `main`.
- Confirm the target main SHA is `d3fcd8c6435433169686c2ec404a5f00c6cc62bd`.
- Confirm the publish directory remains `.`, no build command is needed, and no environment variables are required.
- Confirm no deploy, domain, DNS, paid, credential, social connection, posting, scheduling, analytics API, real client data, n8n activation, Lead Gen, AI Receptionist, or Constitution scope expansion is present.

After any future approved Netlify action:

- Verify staging URL HTTP 200.
- Record Netlify deployment result in AG OS.
- Record audit event in AG OS.
- Record connector execution result in AG OS.
- Record cost ledger in AG OS.
- Verify no production deploy, custom domain, DNS, paid action, credential, real client data, n8n activation, social connection, posting, scheduling, analytics API, Lead Gen, AI Receptionist, or Constitution change occurred.

## Rollback Plan

If the staging site or deploy is created outside this scope:

1. Stop all further execution immediately.
2. Do not create production deploys, custom domains, DNS records, deploy hooks, paid features, social connections, social credentials, analytics connections, environment variables, or n8n activation.
3. Record an audit event with the actual Netlify result, deploy URL if available, repository, commit SHA, and scope mismatch.
4. Notify the owner in the current thread.
5. Disable, delete, or roll back the staging site only after owner approval unless immediate exposure risk exists.
6. Record the rollback decision and final state in AG OS.

## Stop Conditions

Stop before Netlify execution if:

- The approval lock is missing, expired, revoked, or does not exactly match this package.
- The target repository is not `gurnoorbassi/ag-social-media-management-system`.
- The target branch is not `main`.
- The target main SHA is not `d3fcd8c6435433169686c2ec404a5f00c6cc62bd`.
- A build command, environment variable, deploy hook, custom domain, DNS change, paid feature, production deploy, tracking script, analytics, Netlify Forms wiring, credential, secret, social account connection, social credential, posting, scheduling, real client data, customer data, production data, n8n activation, Lead Gen change, AI Receptionist change, or Constitution change becomes necessary.
- AG OS validation, boot check, runtime tests, or target repo checks fail.

## Exact Owner Approval Needed

To execute the future Netlify staging milestone, the owner must provide exact approval text like:

`Owner approval granted for approval-20260704-social-media-netlify-staging. AG OS may create or connect one dedicated Netlify staging-only site named ag-social-media-management-system-staging for gurnoorbassi/ag-social-media-management-system and deploy staging from main at d3fcd8c6435433169686c2ec404a5f00c6cc62bd. Verify staging URL HTTP 200 and record the result. No production deploy, custom domain, DNS, paid action, credentials, secrets, environment variables, deploy hooks, tracking scripts, live forms, social account connection, social credentials, posting, scheduling, analytics API, real client data, production data, customer data, n8n activation, Lead Gen, AI Receptionist, or Constitution change is approved. Approval expires in 24 hours.`

AG OS must convert the approval-lock proposal into an active approved record only after receiving exact owner approval. The current template is `revoked` by default and cannot authorize execution.
