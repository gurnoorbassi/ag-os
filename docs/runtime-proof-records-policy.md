# Runtime Proof Records Policy

## Purpose

Runtime proof records show that AG OS processors, validators, routers, planners, ledgers, or connectors behaved as expected during a dry run or controlled milestone. They are evidence, not authority.

## Commit Rules

- Milestone proof records may be committed only when the owner approves the exact proof set.
- Routine dry-run churn should not be committed.
- Generated proof records must be reviewed before commit.
- Old bug proof must not be committed as readiness proof.
- Proof records must never include credentials, customer data, production data, private client data, live-action payloads, or paid-service payloads.
- Proof records must pass the same schema validation as any other active record before they can be committed.

## Local Scratch Naming

Local scratch proof records should use one of these naming shapes:

```text
.codex/**/runtime-*-scratch-*.json
.codex/**/local-*
```

These patterns are ignored by Git so short-lived local runs do not pollute source control.

Do not use scratch names for source-of-truth evidence. Source-of-truth records must use the normal record naming rules for their directory and schema.

## Existing Runtime Proof Sets

Large proof batches, such as brain-suite runtime records, stay untracked until the owner chooses one of these outcomes:

- commit the reviewed proof set as milestone evidence
- regenerate a cleaner proof set and commit only that set
- delete local throwaway proof after confirming it is no longer needed
- rename future local runs to the scratch naming convention

AG OS must not silently delete untracked proof records. Cleanup requires a clear milestone decision or owner instruction.

## Relationship To Validation

Validation may inspect untracked runtime records in the working tree. Passing validation does not mean a proof record should be committed. Commit readiness requires owner approval, source-of-truth naming, schema validity, and a safety review.
