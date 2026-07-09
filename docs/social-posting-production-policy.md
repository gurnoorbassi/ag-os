# Social Posting Production Policy

AG OS may only publish through a production social connector after all gates pass:

1. Target account is registered.
2. A repo-safe credential reference and external secure credential store path are approved.
3. OAuth is approved and completed without storing tokens in the repo.
4. The account is not revoked, expired, or blocked.
5. The post content is owner-approved for live publishing, not merely approved as a draft.
6. An approval lock authorizes the exact publish action.
7. Audit, connector result, and cost records are written.
8. Validation, boot check, security scan, and tests pass before source-of-truth updates.

## Forbidden By Default

- Credentials, tokens, passwords, OAuth codes, API keys, or secrets in source control.
- Posting without exact owner approval.
- Scheduling without separate owner approval.
- Analytics without separate owner approval.
- DMs/comments without separate owner approval.
- n8n activation without separate owner approval.
- Paid tools without separate owner approval.
- Domain/DNS, Lead Gen, AI Receptionist, or Constitution changes.

## Current Production Posture

The production posting path is not active. The Instagram credential reference is ready for OAuth preflight, but OAuth has not executed, the account is not connected, and no live posting permission exists.
