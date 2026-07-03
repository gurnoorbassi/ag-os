# Audit

Audit event records live here when a governance event, approval decision, safe merge, incident, rollback, or validation event needs durable source-controlled evidence.

Use this folder for source-controlled governance history such as approval decisions, safe merges, policy changes, incident records, rollback records, and validation evidence.

Do not store credentials, customer data, production exports, private logs, or live service payloads here.

This folder may contain zero audit records before governed events are recorded. Any JSON audit event in this folder must follow `schemas/audit-event.schema.json` and is validated by `npm run validate`.
