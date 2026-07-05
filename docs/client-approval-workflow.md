# Client Approval Workflow

Status: source-of-truth workflow only.

Client approvals track decisions needed before work advances. They do not replace AG OS owner approval locks and do not authorize live actions.

## Approval Types

- client configuration approval
- deliverable approval
- staging review approval
- content package approval
- report approval
- access request approval
- scope or priority change approval

## Workflow

1. Create a client-approval-needed template with placeholders.
2. Link the approval to an engagement, deliverable, PR, staging URL, report, critique, or quality score when available.
3. State the exact decision needed.
4. Keep status as `pending` until an approved real record is allowed.
5. Record blockers without storing private client data.
6. Escalate to owner approval if the decision would enable live action.

## AG OS Approval Still Wins

Client approval is not AG OS owner approval. Live services, credentials, deployment, social posting, scheduling, analytics, n8n activation, paid tools, production data, domain changes, and protected project changes still require the AG OS approval workflow.
