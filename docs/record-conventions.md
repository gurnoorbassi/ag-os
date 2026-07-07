# Record Conventions

## Purpose

Small conventions that keep AG OS records consistent as they multiply.
These rules apply to new records and to records being modified. Historical
records are never mass-rewritten to satisfy a convention; history is proof.

## Timestamps

- All `createdAt` and `updatedAt` values are ISO 8601 UTC strings produced by
  `isoTimestamp()` from `scripts/lib/runtime/common.mjs`.
- When a script writes or updates a record, it must use `isoTimestamp()` rather
  than hand-formatting a date.
- When a worker edits a record by hand, `updatedAt` must be refreshed in the
  same change. A record whose content changed but whose `updatedAt` did not is
  a review finding.
- Date-only knowledge (for example "owner reported this on 2026-07-06") belongs
  in notes or evidence text; `createdAt`/`updatedAt` always carry the full
  timestamp of the record write.

## Record identity

- Record ids match the pattern their schema enforces and are never reused,
  even after a record is archived.
- One JSON file per record. File name matches the record id.

## Honesty rules

- Unknown facts are recorded as unknown (`pending_owner_input`, `unknown`,
  `not_provided`), never guessed.
- Records cite their evidence: a record path, a PR link, or an owner report
  with its date.
- No placeholder or demo values in non-template records. Template records
  use the `REQUIRED_` placeholder pattern and live in template directories.
