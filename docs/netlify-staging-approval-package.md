# Netlify Staging Approval Package

## Purpose

This package prepares the owner approval required before AG OS may create or connect a Netlify staging site for the test construction website.

This package does not deploy, connect Netlify, create a site, create a deploy hook, change DNS, add credentials, or modify the target repository.

## Target

- Target repository: `gurnoorbassi/ag-test-construction-website`
- Target branch: `main`
- Target main SHA: `8c635538d7d5b7bb9918d2ea900c8f934ee98d49`
- Source milestone: `gurnoorbassi/ag-test-construction-website#1`
- Reviewed head SHA before merge: `6af3574df8ef93bb04010e3757587dc3b904afcf`

## Approval Package Files

- Approval lock proposal: `.codex/approvals/approval-20260704-netlify-staging-test-construction.template.json`
- Future approval audit template: `.codex/audit/audit-20260704-netlify-staging-approval.template.json`
- Netlify staging plan: `.codex/netlify/netlify-plan-20260704-test-construction-staging.json`
- Human-readable package: `docs/netlify-staging-approval-package.md`

## Proposed Future Netlify Action

After separate owner approval, AG OS may do only this:

- Create or connect one Netlify staging site for `gurnoorbassi/ag-test-construction-website`.
- Deploy staging from `main` at `8c635538d7d5b7bb9918d2ea900c8f934ee98d49`.
- Record the Netlify deploy result in AG OS.
- Stop before production, custom domain, DNS, paid features, credentials in the repository, n8n, Lead Gen, AI Receptionist, or Constitution changes.

## Staging-Only Scope

The future action is staging-only:

- No production deploy.
- No custom domain.
- No DNS change.
- No paid Netlify feature.
- No deploy hook.
- No Netlify Forms.
- No analytics or tracking.
- No environment variables unless a later owner-approved package adds them.
- No credentials, tokens, or private keys in source control, docs, logs, memory, or PR text.

## Bootstrap Mode Build Settings

The current target site is a static website with `index.html` at the repository root and static assets under `src/`.

Expected Netlify settings:

- Base directory: `.`
- Build command: not configured for the static site
- Publish directory: `.`
- Node version: not required
- Environment variables required: none

If Netlify requires a build command, AG OS must stop and ask the owner before changing the package. A local target-repo check command may be run before deployment if available, but it must not become a Netlify build setting unless separately approved.

## Credential And Secrets Policy

- Do not add credentials, tokens, private keys, deploy hooks, or environment values to the target repository.
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

The future action would create or connect a live staging hosting surface. Risk is controlled because the site is a test static website, the deploy is staging-only, no production domain or DNS change is allowed, no paid feature is allowed, and no credentials or customer data are required.

## Validation Plan

Before any future approved Netlify action:

- Confirm active approval lock `approval-20260704-netlify-staging-test-construction` exists, is approved, is unexpired, and matches this exact scope.
- Run `npm.cmd run validate` in AG OS.
- Run `npm.cmd run boot:check` in AG OS.
- Run `node --test tests/*.test.mjs` in AG OS.
- Confirm the target repo is `gurnoorbassi/ag-test-construction-website`.
- Confirm the target branch is `main`.
- Confirm the target main SHA is `8c635538d7d5b7bb9918d2ea900c8f934ee98d49`.
- Confirm the publish directory remains `.`, no build command is needed, and no environment variables are required.
- Confirm no deploy, domain, DNS, paid, credential, customer-data, n8n, Lead Gen, AI Receptionist, or Constitution scope expansion is present.

After any future approved Netlify action:

- Record Netlify deployment result in AG OS.
- Record audit event in AG OS.
- Record cost ledger in AG OS.
- Verify no production deploy, custom domain, DNS, paid action, credential, customer data, n8n, Lead Gen, AI Receptionist, or Constitution change occurred.

## Rollback Plan

If the staging site or deploy is created outside this scope:

1. Stop all further execution immediately.
2. Do not create production deploys, custom domains, DNS records, deploy hooks, paid features, or environment variables.
3. Record an audit event with the actual Netlify result, deploy URL if available, repository, commit SHA, and scope mismatch.
4. Notify the owner in the current thread.
5. Disable, delete, or roll back the staging site only after owner approval unless immediate exposure risk exists.
6. Record the rollback decision and final state in AG OS.

## Stop Conditions

Stop before Netlify execution if:

- The approval lock is missing, expired, revoked, or does not exactly match this package.
- The target repository is not `gurnoorbassi/ag-test-construction-website`.
- The target branch is not `main`.
- The target main SHA is not `8c635538d7d5b7bb9918d2ea900c8f934ee98d49`.
- A build command, environment variable, deploy hook, custom domain, DNS change, paid feature, production deploy, tracking script, analytics, Netlify Forms wiring, credential, customer data, production data, n8n change, Lead Gen change, AI Receptionist change, or Constitution change becomes necessary.
- AG OS validation, boot check, runtime tests, or target repo checks fail.

## Exact Owner Approval Needed

To execute the future Netlify staging milestone, the owner must provide exact approval text like:

`Owner approval granted for approval-20260704-netlify-staging-test-construction. AG OS may create or connect one Netlify staging site named <OWNER_APPROVED_NETLIFY_STAGING_SITE_NAME> for gurnoorbassi/ag-test-construction-website and deploy staging from main at 8c635538d7d5b7bb9918d2ea900c8f934ee98d49. No production deploy, custom domain, DNS, paid action, credentials, environment variables, deploy hooks, tracking scripts, live forms, customer data, production data, n8n, Lead Gen, AI Receptionist, or Constitution change is approved. Approval expires in 24 hours.`

AG OS must convert the approval-lock proposal into an active approved record only after receiving exact owner approval. The current template is `revoked` by default and cannot authorize execution.
