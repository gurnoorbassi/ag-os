# AG OS Dashboard Netlify Staging Approval Package

## Purpose

This package prepares the owner approval required before AG OS may create or connect a dedicated Netlify staging-only site for the AG OS Dashboard.

This package does not deploy, call Netlify, create a site, change DNS, add credentials, perform live connector writes, activate n8n, touch Lead Gen, touch AI Receptionist, or change the Constitution.

## Target

- Target repository: `gurnoorbassi/ag-os`
- Target branch: `main`
- Target main SHA at package creation: `e536a018dacb87e20904d29854b078cda4907815`
- Dashboard entry file: `dashboard/index.html`
- Proposed staging site name: `ag-os-dashboard-staging`

## Approval Package Files

- Approval lock proposal: `.codex/approvals/approval-20260705-ag-os-dashboard-netlify-staging.template.json`
- Future approval audit template: `.codex/audit/audit-20260705-ag-os-dashboard-netlify-staging-approval.template.json`
- Netlify staging plan: `.codex/netlify/netlify-plan-20260705-ag-os-dashboard-staging.json`
- Human-readable package: `docs/ag-os-dashboard-netlify-staging-approval-package.md`

## Proposed Future Netlify Action

After active owner approval, AG OS may do only this:

- Build the dashboard locally with `npm.cmd run dashboard:build`.
- Create or connect one dedicated Netlify staging-only site named `ag-os-dashboard-staging`.
- Publish the generated `dashboard` directory.
- Verify the staging URL returns HTTP 200.
- Record the Netlify deploy result in AG OS.
- Stop before custom domain, DNS, paid features, secrets, credentials, production deployment, private client data exposure, production customer data exposure, live connector writes, social actions, n8n activation, Lead Gen changes, AI Receptionist changes, or Constitution changes.

## Staging-Only Scope

The future action is staging-only:

- No custom domain.
- No DNS change.
- No paid Netlify feature.
- No production AG Digitalz/customer domain.
- No secrets or credentials.
- No environment variables.
- No private client data.
- No production customer data.
- No live connector writes other than the approved Netlify staging deploy.
- No social account connection, posting, scheduling, analytics API, or OAuth.
- No n8n activation.
- No Lead Gen, AI Receptionist, or Constitution changes.

Netlify may label the deploy context as production because it is the primary deploy context of a dedicated staging-only site. That label must be recorded as Netlify context only, not as an AG Digitalz production deployment.

## Bootstrap Mode Build Settings

Expected local settings:

- Local build command: `npm.cmd run dashboard:build`
- Publish directory: `dashboard`
- Entry file: `dashboard/index.html`
- Environment variables required: none

If a future Netlify-connected repository build is configured instead of local static deploy, use the cross-platform Netlify build command `npm run dashboard:build`. Do not add environment variables, deploy hooks, custom domains, paid features, or repository configuration changes without separate owner approval.

## Security Check

Before any future approved deploy, AG OS must scan:

- `dashboard/dashboard-data.js`
- `dashboard/app.js`
- `dashboard/index.html`
- `dashboard/styles.css`

The deploy must stop if any scan finds secrets, tokens, credentials, passwords, private keys, private client data, or production customer data.

Current dashboard data is internal operational metadata. It is acceptable for a staging-only control center only if no unsafe payloads are present and no claim is made that the Netlify URL is production or custom-domain protected.

## Cost Estimate

- Estimated task cost: `$0`.
- Paid tools or paid Netlify features: not allowed.
- If Netlify requires a paid plan, paid add-on, team upgrade, bandwidth purchase, or billing change, stop before action.

## Risk Assessment

Risk tier: `R4`.

The future action creates a live web-accessible staging surface for AG OS operational status. Risk is controlled by using a dedicated staging-only Netlify site, publishing only generated dashboard files, requiring a pre-deploy security scan, using no environment variables, using no custom domain or DNS, and recording all results in AG OS.

## Validation Plan

Before any future approved Netlify action:

- Confirm active approval lock `approval-20260705-ag-os-dashboard-netlify-staging` exists, is approved, is unexpired, and matches this exact scope.
- Run `npm.cmd run dashboard:build`.
- Run `npm.cmd run dashboard:check`.
- Run `npm.cmd run validate`.
- Run `npm.cmd run boot:check`.
- Run `node --test tests/*.test.mjs`.
- Run `git diff --check`.
- Run the dashboard security scan.
- Confirm no environment variables are required.
- Confirm no custom domain, DNS, paid feature, secret, credential, private client data, production customer data, live connector write, social action, n8n activation, Lead Gen change, AI Receptionist change, or Constitution change is present.

After any future approved Netlify action:

- Verify staging URL HTTP 200.
- Record Netlify deployment result in AG OS.
- Record audit event in AG OS.
- Record connector execution result in AG OS.
- Record cost ledger in AG OS.
- Verify no production deploy, custom domain, DNS, paid action, credential, private client data exposure, production customer data exposure, live connector write, social action, n8n activation, Lead Gen change, AI Receptionist change, or Constitution change occurred.

## Rollback Plan

If the staging site or deploy is created outside this scope:

1. Stop all further execution immediately.
2. Do not create production deploys, custom domains, DNS records, deploy hooks, paid features, credentials, environment variables, social actions, or n8n activation.
3. Record an audit event with the actual Netlify result, deploy URL if available, repository, commit SHA, and scope mismatch.
4. Notify the owner in the current thread.
5. Disable, delete, or roll back the staging site only after owner approval unless immediate exposure risk exists.
6. Record the rollback decision and final state in AG OS.

## Stop Conditions

Stop before Netlify execution if:

- The approval lock is missing, expired, revoked, or does not exactly match this package.
- The target repository is not `gurnoorbassi/ag-os`.
- The target branch is not `main`.
- The target main SHA differs from the approved source without renewed approval.
- A custom domain, DNS change, paid feature, production deploy, credential, secret, environment variable, private client data exposure, production customer data exposure, live connector write, social action, n8n activation, Lead Gen change, AI Receptionist change, or Constitution change becomes necessary.
- AG OS dashboard build, dashboard check, validation, boot check, runtime tests, diff check, or security scan fails.

## Exact Owner Approval Needed

To execute the future Netlify staging milestone, the owner must provide exact approval text like:

`Owner approval granted for approval-20260705-ag-os-dashboard-netlify-staging. AG OS may create or connect one dedicated Netlify staging-only site named ag-os-dashboard-staging for gurnoorbassi/ag-os and deploy the generated dashboard directory after npm.cmd run dashboard:build. Verify staging URL HTTP 200 and record the result. No custom domain, DNS, paid action, credentials, secrets, environment variables, production deployment, private client data exposure, production customer data exposure, live connector writes, social actions, n8n activation, Lead Gen, AI Receptionist, or Constitution change is approved. Approval expires in 24 hours.`

The current template is `revoked` by default and cannot authorize execution until converted into an active approved record.
