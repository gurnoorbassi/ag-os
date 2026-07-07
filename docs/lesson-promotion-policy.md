# Lesson Promotion Policy

## Purpose

Lesson promotion moves a candidate lesson into accepted runtime memory only after review and owner approval.

## Promotion Requirements

Every promotion requires:

- a source candidate lesson
- `approvalId`
- `approvedBy`
- non-empty evidence
- conflict scan
- safety scan
- reviewed PR before source-of-truth merge

Promotion creates an accepted lesson record under `.codex/memory/accepted/`.

## Rejection Requirements

Rejection requires:

- source candidate lesson
- reviewer id
- reason

Rejected lessons are written under `.codex/memory/rejected/` and must not be loaded by runtime.

## Conflict Rules

A candidate must not be promoted when it conflicts with an accepted lesson in the same scope and context.

Conflicts must be recorded or reported with:

- candidate lesson id
- existing lesson id
- reason
- evidence
- required action

## Permission Boundary

Accepted lessons may guide planning, critique, and build review.

Accepted lessons never approve:

- live connectors
- OAuth
- credentials
- deployment
- production data
- customer data
- domain or DNS changes
- paid tools
- posting
- scheduling
- analytics
- n8n activation

## Skill Creation

Accepted lessons may become skills only through a separate owner-approved PR.

Skills remain procedural memory. They do not grant permission.
