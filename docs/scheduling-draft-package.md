# Scheduling Draft Package

Status: planning only. Not approved for execution.

This package defines the future path for scheduling draft content without live posting. It does not connect schedulers, queue live posts, activate automations, call platform APIs, or publish content.

## Future Scope

A future owner-approved action may create an internal draft schedule for approved post packages. The schedule may show intended dates, channels, format, owner approval status, and blocked live action state.

Allowed future draft fields:

- client ID
- brand ID
- post package ID
- platform account ID
- intended publish window
- approval status
- scheduling status
- live posting blocked state
- rollback or cancellation path

## Required Approval

Moving from internal draft schedule to a live scheduler requires a separate future package and approval. A content approval does not authorize scheduling.

Draft scheduling records require:

- owner approval if active client records are created or changed
- source-controlled audit event
- explicit blocked live action state
- no platform API call
- no scheduler connection

## Stop Conditions

Stop immediately if:

- a platform scheduler would be connected
- a post would be queued to a live platform
- a retry loop could publish externally
- credentials, OAuth, analytics, DMs, comments, outbound messages, n8n activation, paid tools, production deployment, domain/DNS, Lead Gen, AI Receptionist, or Constitution scope appears

## Validation Before Future Execution

Before any future scheduling step:

- `npm.cmd run validate`
- `npm.cmd run boot:check`
- `node --test tests/*.test.mjs`
- target records must show `live_posting_blocked: true`
- account connection status must not exceed the approved state

