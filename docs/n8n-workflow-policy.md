# n8n Workflow Policy

## Purpose

This document defines how AG OS should design, source-control, back up, and change n8n workflows.

It does not create, update, activate, or connect live n8n workflows.

## Design Rules

- Map the full pipeline before building.
- Use modular workflows when useful.
- Prefer one working pipeline over many partial workflows.
- Use fake or test payloads before live payloads.
- Keep credentials out of workflow JSON.
- No live activation without owner approval.

## Source Control

Workflow JSON exports should be committed to GitHub when safe and sanitized.

Exports must not contain credentials, production data, customer data, private URLs, or live secrets.

## Backup Rules

Before editing working workflows:

- Export current JSON.
- Record known-good version.
- Record restore steps.
- Confirm rollback path.

Backup is not valid until restore steps are documented.

## Rollback Rules

Workflow changes require rollback steps before live activation or mutation.

Rollback should identify the previous known-good export, trigger behavior, credential assumptions, and owner approval reference.
