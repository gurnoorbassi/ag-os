# Incident Response

## Purpose

This document defines incident levels and response rules for AG Digitalz OS.

Foundation mode allows documentation, local review, validation, and approval-packet preparation only. It does not authorize live containment, production access, deployments, workflow changes, customer communication, or paid monitoring.

## Incident Levels

| Level | Name | Definition | Default Action |
| --- | --- | --- | --- |
| `I0` | Observation | A low-risk note, gap, or improvement with no known failure. | Track in docs or future audit records. |
| `I1` | Local issue | A docs, schema, validation, or PR issue with no live impact. | Fix through normal PR flow. |
| `I2` | Governance risk | A policy gap, approval ambiguity, validation gap, or unsafe ownership conflict. | Stop risky work, document scope, request owner decision when needed. |
| `I3` | Live-system risk | A possible issue involving live service access, deployment, credentials, domains, billing, or production data. | Stop and request owner approval before any live action. |
| `I4` | Production or customer incident | Confirmed or likely impact to production systems, customer data, security, billing, or public availability. | Stop AG OS automation and escalate to owner immediately. |

## Response Process

1. Classify the incident level.
2. Preserve relevant local evidence without collecting secrets or customer data.
3. Stop actions that could expand risk.
4. Identify affected project, owner, connector, command category, and data class.
5. Prepare containment options that stay within approved scope.
6. Request owner approval for any live, production, customer, credential, billing, deployment, or domain action.
7. Document resolution and follow-up.

## Authority

The owner has final authority for I3 and I4 decisions. Codex may not perform live containment or customer communication without explicit approval.

## Post-Incident Requirements

After an incident is resolved, the follow-up should include:

- Root cause summary.
- Impact summary.
- Actions taken.
- Rollback or recovery notes.
- Remaining risk.
- Preventive follow-up.
- Audit event when audit records become active.
