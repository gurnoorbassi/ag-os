# Cost OS

## Purpose

Cost OS defines AG Digitalz OS budget limits, approval rules, and sourcing rules before the system performs expensive work.

This foundation is metadata and policy only. It does not make live API calls, change billing, store credentials, deploy, or trigger paid actions.

## Current Budget

```text
.codex/costs/budget.json
```

Schema:

```text
schemas/cost-budget.schema.json
```

## Budget Limits

- Monthly maximum: `$50`
- Daily maximum: `$10`
- Per-task maximum: `$5`

These limits are hard foundation defaults. Raising them requires a future scoped PR and explicit owner approval.

## Approval Rules

- Paid tools require owner approval.
- Live API usage requires owner approval unless the specific usage is already approved.
- Billing changes require owner approval.
- New recurring spend requires owner approval.

## Sourcing Rules

- Prefer existing tools and infrastructure.
- Use the cheapest option that still meets the required quality.
- Never sacrifice quality for tiny cost savings.

Bootstrap Mode adds these defaults until disabled by the owner or AG OS revenue exists:

- Use existing Hetzner VPS, Postgres, n8n, GitHub, Netlify, domain, and Claude credits where practical.
- Do not add new paid tools without owner approval.
- Prefer high-quality low-cost options.

## Default Restrictions

By default, AG OS may not:

- Make live API calls
- Change billing
- Store credentials
- Deploy
- Trigger paid actions

## Validation

`npm run validate` checks that:

- The Cost OS budget file exists.
- The Cost OS budget schema exists.
- Monthly, daily, and per-task caps match the approved limits.
- Paid tools require owner approval.
- Live API usage requires owner approval unless already approved.
- Existing tools and infrastructure are preferred.
- Cheapest acceptable options are preferred.
- Quality is not sacrificed for tiny cost savings.

This validation is local and offline.

See also `docs/bootstrap-mode.md` and `docs/usage-ledger-policy.md`.
