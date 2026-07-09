# Social Permission Matrix

| Action | Required Account State | Approval Required | Still Blocked |
| --- | --- | --- | --- |
| OAuth connection | `access_requested` or `oauth_ready` | `approval-instagram-oauth-execution` plus credential reference `credential-ref-instagram-agdigitalz-oauth` | posting, scheduling, analytics, DMs/comments, n8n activation |
| Single publish | `approved_for_single_publish` | exact post approval | scheduling, analytics, DMs/comments, n8n activation |
| Scheduling | `approved_for_scheduling` | exact schedule approval | analytics, DMs/comments, n8n activation |
| Analytics read-only | `connected_draft_only` or stronger | analytics read-only approval | posting, scheduling, DMs/comments, n8n activation |
| DMs/comments | future explicit state | future explicit approval | all until separately designed |
| n8n activation | future explicit state | future explicit approval | all until separately designed |

## Non-Permission Sources

The following can inform planning or visibility but cannot approve social actions:

- dashboard state
- connector auth status
- memory records
- candidate lessons
- accepted lessons
- skills
- content draft approval
- OAuth approval
- `connected_draft_only`

Only an active scoped approval lock can authorize the gated action named in that lock.
