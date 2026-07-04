# n8n Draft Workflow Approval Package

## Purpose

This package prepares the owner approval required before AG OS may create one inactive n8n draft workflow for a construction website lead intake follow-up proof.

This package does not create, activate, execute, or update any n8n workflow. It does not connect credentials, call real external services, send messages, deploy, change domains or DNS, touch production workflows, touch Lead Gen workflows, touch AI Receptionist workflows, or change the Constitution.

## Approval Package Files

- Approval lock proposal: `.codex/approvals/approval-20260704-n8n-draft-workflow-proof.template.json`
- Future approval audit template: `.codex/audit/audit-20260704-n8n-draft-workflow-approval.template.json`
- n8n draft workflow plan: `.codex/n8n/n8n-plan-20260704-construction-lead-draft-proof.json`
- Human-readable package: `docs/n8n-draft-workflow-approval-package.md`

## Proposed Future n8n Action

After separate owner approval, AG OS may do only this:

- Create one inactive n8n draft workflow for construction website lead intake follow-up proof.
- Use placeholder and test payloads only.
- Export the workflow JSON.
- Validate the exported workflow JSON.
- Record the n8n connector result in AG OS.
- Record an audit event in AG OS.
- Record a cost ledger entry in AG OS.
- Stop before activation, credentials, outbound messaging, real API calls, production workflow changes, Lead Gen workflow changes, AI Receptionist workflow changes, deployment, domain or DNS changes, paid tools, customer data, production data, or Constitution changes.

## Draft Workflow Purpose

The future inactive draft workflow would model this path:

1. Receive a future website contact form payload.
2. Validate required fields.
3. Create an in-workflow draft lead object or placeholder task object.
4. Create an internal follow-up task object.
5. Log the event in the workflow path.
6. Stop before sending any outbound message.

This is a workflow proof only. It must not become a live intake system without a separate owner-approved activation package.

## Expected Nodes

The draft workflow should include only local, safe workflow-shaping nodes:

- Webhook intake node for test payload shape only.
- Validation node for required fields.
- Set/Edit Fields node for a draft lead object.
- Set/Edit Fields node for an internal follow-up task object.
- Local log/no-op node for event tracking.
- Final no-op or response node that stops before outbound messaging.

No node may send email, SMS, WhatsApp, social posts, live outreach, phone calls, voice calls, or real external API requests.

## Placeholder Test Payload

The draft workflow may use this placeholder/test payload shape only:

```json
{
  "fullName": "TEST_REQUIRED_FULL_NAME",
  "email": "TEST_REQUIRED_EMAIL",
  "phone": "TEST_OPTIONAL_PHONE",
  "serviceInterest": "TEST_OPTIONAL_SERVICE_INTEREST",
  "message": "TEST_REQUIRED_MESSAGE",
  "source": "TEST_CONSTRUCTION_WEBSITE_CONTACT_FORM",
  "submittedAt": "TEST_ISO_TIMESTAMP"
}
```

Do not use real customer data, production data, private contact details, real form submissions, or Lead Gen data.

## Draft-Only Scope

- Workflow activation: blocked.
- Credential connection: blocked.
- Real external API calls: blocked.
- Outbound email, SMS, WhatsApp, posting, live outreach, phone, or voice: blocked.
- Production n8n workflow changes: blocked.
- Lead Gen workflow changes: blocked.
- AI Receptionist workflow changes: blocked.
- Deployments: blocked.
- Domain or DNS changes: blocked.
- Paid tools: blocked.
- Customer data and production data: blocked.

## Credential And Secrets Policy

- Do not connect n8n credentials.
- Do not create, store, export, or print credentials in AG OS, n8n workflow JSON, docs, logs, memory, or PR text.
- Do not use Postgres, email, SMS, WhatsApp, CRM, form provider, domain, or production credentials.
- If a credential is required, stop and request a new approval package.

## Cost Estimate

- Estimated task cost: `$0`.
- Paid tools: not allowed.
- Billing changes: not allowed.
- If n8n requires a paid feature, paid connector, billing change, or third-party paid action, stop before action.

## Risk Assessment

Risk tier: `R4`.

The future action would touch a connected n8n system by creating one inactive draft workflow. Risk is controlled because the workflow must remain inactive, no credentials are allowed, no outbound messages are allowed, no real external services are allowed, no production workflows are touched, and no customer or production data is used.

## Validation Plan

Before any future approved n8n action:

- Confirm active approval lock `approval-20260704-n8n-draft-workflow-proof` exists, is approved, is unexpired, and matches this exact scope.
- Run `npm.cmd run validate` in AG OS.
- Run `npm.cmd run boot:check` in AG OS.
- Run `node --test tests/*.test.mjs` in AG OS.
- Confirm the draft workflow name is owner-approved.
- Confirm the workflow is draft-only and inactive.
- Confirm no credentials, activation, outbound messages, real external API calls, production workflow references, Lead Gen workflow references, AI Receptionist workflow references, deployment, domain or DNS change, paid tool, customer data, production data, or Constitution change is present.

After any future approved n8n action:

- Export workflow JSON.
- Validate exported workflow JSON.
- Record n8n connector result in AG OS.
- Record audit event in AG OS.
- Record cost ledger in AG OS.
- Verify the workflow remains inactive.
- Verify no credentials were connected.
- Verify no outbound messages or real external API calls occurred.

## Rollback Plan

If the inactive draft workflow is created outside this scope:

1. Stop all further execution immediately.
2. Do not activate the workflow.
3. Do not connect credentials.
4. Do not send messages or call real external services.
5. Record an audit event with the actual n8n result and scope mismatch.
6. Notify the owner in the current thread.
7. If the workflow is accidentally active, deactivate it if safe, record an incident, and notify the owner.
8. Archive or delete the draft workflow only after owner approval unless immediate exposure risk exists.
9. Preserve exported workflow JSON and validation output as evidence.

## Stop Conditions

Stop before n8n execution if:

- The approval lock is missing, expired, revoked, or does not exactly match this package.
- The workflow name is not owner-approved.
- n8n requires credentials.
- Workflow activation is required.
- Outbound email, SMS, WhatsApp, posting, live outreach, phone, or voice becomes necessary.
- A real external API call becomes necessary.
- A production n8n workflow would be touched.
- A Lead Gen workflow would be touched.
- An AI Receptionist workflow would be touched.
- A deployment, domain or DNS change, paid tool, customer data, production data, credential, or Constitution change becomes necessary.
- AG OS validation, boot check, runtime tests, export, or workflow JSON validation fails.

## Exact Owner Approval Needed

To execute the future n8n draft workflow proof, the owner must provide exact approval text like:

`Owner approval granted for approval-20260704-n8n-draft-workflow-proof. AG OS may create one inactive n8n draft workflow named <OWNER_APPROVED_N8N_DRAFT_WORKFLOW_NAME> for construction website lead intake follow-up proof, export the workflow JSON, validate the workflow JSON, record audit, connector result, and cost ledger records, and stop. No workflow activation, credentials, outbound messages, email, SMS, WhatsApp, posting, live outreach, phone, voice, real external APIs, production n8n workflows, Lead Gen workflows, AI Receptionist workflows, deployments, domain/DNS changes, paid tools, customer data, production data, or Constitution changes are approved. Approval expires in 24 hours.`

AG OS must convert the approval-lock proposal into an active approved record only after receiving exact owner approval. The current template is `revoked` by default and cannot authorize execution.
