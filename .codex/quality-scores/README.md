# Quality Scores

This directory stores source-controlled AG OS quality score records when the owner approves committing milestone evidence.

Allowed records must:

- use the `quality-score-*.json` filename pattern
- match `schemas/quality-score.schema.json`
- include evidence
- avoid credentials, customer data, production data, and private client data

No quality score is accepted merely because it exists. Scores are evidence only; they never bypass approval gates, validation, CI, security review, or owner approval.

Current status: no accepted quality score records are present.
