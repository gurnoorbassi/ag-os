# Social Media Management System v1 Future Connectors

## Connector Rule

Every connector starts blocked or not connected. A future connector can only be used after owner approval, a scoped approval lock, validation, audit recording, and Cost OS review when needed.

## GitHub

Future approved use:

- Create one private product repo.
- Create one branch.
- Add draft/staging starter files.
- Open one PR.
- Review and merge only after separate owner approval.

Blocked by default:

- Extra repos.
- Unapproved branches.
- Unreviewed merges.
- Production/customer data.
- Credentials in repository.

## Netlify

Future approved use:

- Create or connect one dedicated staging-only site.
- Deploy from an approved main SHA.
- Record deploy result.

Blocked by default:

- Production deployment.
- Custom domain.
- Domain/DNS changes.
- Paid features.
- Secrets in source control.
- Live forms or tracking scripts.

## n8n

Future approved use:

- Create inactive draft workflow.
- Use placeholder payloads.
- Export workflow JSON.
- Validate workflow JSON.

Potential draft workflows:

- Content intake from a future form payload.
- Draft post package creation.
- Approval reminder placeholder that stops before outbound messaging.
- Weekly report assembly from local records.

Blocked by default:

- Workflow activation.
- Workflow credentials.
- Production workflow edits.
- Lead Gen workflow edits.
- AI Receptionist workflow edits.
- Outbound email, SMS, WhatsApp, or platform messages.
- External platform API calls.

## Social OAuth

Future approved use:

- Request access to explicitly approved platform accounts.
- Store credential metadata only in approved secure storage, never in Git.
- Keep account status at `connected_draft_only` until scheduling or live posting gets separate approval.

Blocked by default:

- OAuth in v1 package.
- Access tokens in source control.
- Live posting permissions.
- Scheduling permissions.
- Direct messages or comments.
- Account-level analytics pulls.

## Analytics APIs

Future approved use:

- Pull approved metrics for approved accounts after connector, credential, and data-handling approvals.

Blocked by default:

- Unapproved account analytics.
- Customer/private data.
- Paid analytics services.
- Bulk historical imports without owner approval.

## Scheduling

Future approved use:

- Queue approved drafts into a scheduler only after explicit approval.

Blocked by default:

- Any schedule pushed to a live platform.
- Any automated publish action.
- Any retry loop that could publish or message externally.

## Client Portal

Future approved use:

- Read-only review portal for clients after separate approval.
- Approval comments and status viewing after auth model approval.

Blocked by default:

- Client authentication.
- Production customer data.
- Public links with private content.
- Client-triggered live posting.
