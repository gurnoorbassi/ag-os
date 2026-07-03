# Approvals

Approval lock records live here when a gated action has an approved, scoped authorization.

This folder is for scoped owner approvals only. Do not store credentials, customer data, production data, private contact details, live payloads, or unscoped blanket approvals here.

This folder may contain zero approval records when no gated action is approved. Any JSON approval lock in this folder must follow `schemas/approval-lock.schema.json` and is validated by `npm run validate`.
