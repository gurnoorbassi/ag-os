# Capability Registry

## Purpose

The Capability Registry will track AG Digitalz OS capabilities, their owners, safety tiers, approval requirements, and allowed execution scope.

This foundation is registry structure only. It does not register real capabilities yet, create fake capabilities, connect services, run live actions, deploy, or trigger paid actions.

## Current Registry

```text
.codex/capabilities/registry.json
```

Schema:

```text
schemas/capability-registry.schema.json
```

## Foundation Status

The registry is in foundation mode and contains no capability records.

Future capability records must include:

- Capability ID
- Capability name
- Capability type
- Owner
- Status
- Safety tier
- Approval requirement

## Allowed Capability Types

- `discussion`
- `planning`
- `local_build`
- `validation`
- `registry_management`
- `documentation`
- `approval_packet`

## Registry Rules

By default:

- Credentials are not allowed.
- Live actions are not allowed.
- Live actions require owner approval.
- Paid actions require owner approval.
- Production data is not allowed.
- Customer data is not allowed.
- Deployments are not allowed.

## Validation

`npm run validate` checks that:

- The Capability Registry files exist.
- The registry validates against its schema.
- Foundation mode contains no capability records.
- Credentials are disallowed.
- Live actions are disallowed by default.
- Live and paid actions require owner approval.

This validation is local and offline.
