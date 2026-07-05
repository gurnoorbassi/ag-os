# Live Posting Approval Model

Status: planning only. Not approved for execution.

This model defines the future approval chain required before Social Media Management System v1 can publish content. It does not authorize posting, scheduling, messaging, comments, OAuth, credentials, analytics, or n8n activation.

## Approval Layers

Live posting requires all of the following:

- owner approval
- active approval lock
- client approval for the exact post package
- platform account approval
- per-post approval
- final preflight check
- audit event before and after execution
- rollback or removal plan

No single approval can authorize every post indefinitely unless a separate standing approval is created under AG OS standing-approval rules.

## Required Scope

The future approval lock must define:

- client ID
- brand ID
- platform account ID
- platform name
- post package ID
- post variant IDs
- scheduled or immediate posting mode
- allowed publish window
- exact media and caption artifacts
- rollback/removal path
- expiration
- revocation path

## Blocked Until Future Approval

The following remain blocked:

- live posting
- scheduling
- direct messages
- comments
- account connection
- credential handling
- analytics API
- n8n activation
- paid tools
- production/customer data handling beyond approved post artifacts

## Rollback or Removal

Every future live post approval must include:

- who can request removal
- how removal is executed
- evidence captured before removal
- audit record path
- owner notification rule
- incident path if a post is wrong, unauthorized, or exposes data

## Stop Conditions

Stop immediately if:

- the approved artifact differs from the artifact to publish
- platform account scope differs from the approval lock
- client approval is missing
- owner approval is missing
- rollback/removal path is missing
- a paid feature or broader platform permission is required
- Lead Gen, AI Receptionist, deployment, domain/DNS, or Constitution scope appears

