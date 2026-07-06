# Runtime Proof Writer v1

Runtime Proof Writer v1 reduces manual JSON work after a scoped, owner-approved action completes. It creates local source-of-truth proof records from explicit input.

It does not execute actions. It does not call connectors. It does not approve work.

## Records Generated

Given a safe input file, the writer can generate:

- approval lock record
- audit event
- connector execution result
- cost ledger
- dashboard proof summary
- references to critique and quality score records when supplied

The dashboard summary is written under `.codex/proofs/` and points to the generated records. It is read-model evidence, not authority.

## Command

Preview records without writing:

```powershell
npm.cmd run proof:write -- --input path\to\proof-input.json --dry-run
```

Write local source-of-truth records:

```powershell
npm.cmd run proof:write -- --input path\to\proof-input.json
```

## Input Requirements

The input must explicitly include:

- `proofId`
- `projectId`
- scoped approval fields, including `approvalId`, `approvedBy`, `scope`, `approvedActions`, `prohibitedActions`, `evidence`, `expiresAt`, and `revocationPath`
- connector execution metadata
- cost ledger metadata
- summary fields
- safety booleans for every blocked category

All safety booleans must be `false`.

## Refusal Rules

The writer refuses input that includes credentials, OAuth execution, social account connection, posting, scheduling, analytics API, n8n activation, deployment, production deployment, domain/DNS changes, paid action, customer data, production data, Lead Gen changes, AI Receptionist changes, or Constitution changes.

It also refuses proof input with actual or estimated cost above the `$5` per-task limit.

## Safety Boundary

Runtime Proof Writer v1 only writes local files in the AG OS repository. It cannot make a live connector call, deploy, post, schedule, connect accounts, access credentials, or change production systems.
