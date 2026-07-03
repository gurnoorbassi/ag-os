# Cost Ledger Foundation

The Cost Ledger tracks estimated and actual costs against AG OS budget limits.

This foundation is template and schema metadata only. It does not create billing changes, call paid APIs, activate paid tools, or spend money.

## Budget Limits

The Cost Ledger must track work against the active Cost OS limits:

- `$5` per task
- `$10` per day
- `$50` per month

Paid tools and live API usage require owner approval unless an active approval lock covers the exact scope.

## Ledger Entries

Future cost entries must identify:

- cost entry ID
- job ID
- project ID
- cost type
- amount in USD
- approval requirement
- approval ID when required
- status

Cost type must be one of:

- `estimated`
- `actual`
- `reserved`
- `reversed`

Status must be one of:

- `planned`
- `approved`
- `blocked`
- `recorded`
- `reversed`

## Hard Stop Rules

The Cost Ledger must block work when:

- estimated task cost exceeds `$5`
- daily projected cost exceeds `$10`
- monthly projected cost exceeds `$50`
- paid services are requested without owner approval
- live API usage is requested without approval
- vendor caps have not been reviewed for a paid action
- cost records are missing for paid or live usage

Quality must not be sacrificed for tiny cost savings, but budget overruns still require owner approval.

## Relationship To Other OS Domains

The Cost Ledger is consulted by:

- Planner
- Execution Engine
- Approval Ledger
- Connector Executor
- Watchdog Engine

State Management may summarize cost health, but cost ledger entries remain the canonical usage records once runtime exists.
