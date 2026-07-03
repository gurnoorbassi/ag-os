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

## Incident Commander

The incident commander is the person or role coordinating the response.

Foundation default:

- Owner is incident commander for I3 and I4.
- `INCIDENT_COMMANDER_PLACEHOLDER` may be added later by owner-approved record.
- Codex may prepare notes, timelines, and options, but must not execute live containment without approval.

## Recovery Targets

RTO and RPO targets are placeholders until each production project defines them:

- `RTO_PLACEHOLDER`: maximum acceptable time to restore service.
- `RPO_PLACEHOLDER`: maximum acceptable data loss window.

No production project should reach Trust Level 4 without explicit RTO and RPO values.

## Credential-Compromise Procedure

If credentials may be exposed:

1. Stop work.
2. Do not print, copy, commit, summarize, or store the secret.
3. Preserve non-secret evidence.
4. Notify the owner.
5. Prepare rotation and revocation steps.
6. Execute rotation or revocation only with owner approval.
7. Record an audit event when audit records are active.

## CI Outage Procedure

If CI is missing, failed, unavailable, or inconclusive:

1. Stop safe merge.
2. Run local validation if available.
3. Preserve CI status evidence.
4. Do not merge automatically.
5. Request owner review or wait for CI recovery.

## Connector Outage Procedure

If a connector is unavailable, inconsistent, or returns unexpected state:

1. Stop connector-dependent work.
2. Treat connector state as untrusted.
3. Use local source-controlled metadata only.
4. Do not retry with broader permissions.
5. Request owner approval before changing connector scope.

## Communication Rules

AG OS may draft incident communications, but must not send email, SMS, chat, client notifications, public posts, or support updates without explicit owner approval.

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
- Postmortem for I2 or higher incidents.
- Audit event when audit records become active.

Postmortems must include timeline, root cause, impact, corrective actions, owner decisions, and remaining risk.
