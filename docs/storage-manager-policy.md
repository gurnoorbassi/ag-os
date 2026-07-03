# Storage Manager Policy

## Purpose

Storage Manager rules protect Hetzner disk space and future runtime storage without deleting important state.

This policy does not connect to Hetzner or inspect live disk usage.

## Storage Thresholds

- `70%`: internal warning.
- `80%`: safe cleanup allowed after review.
- `90%`: pause new builds and alert owner.
- `95%`: emergency mode.

## Safe Cleanup Candidates

Safe cleanup may include:

- Temporary files.
- Old build cache.
- Old logs past retention.
- Stale test artifacts.

Cleanup must stay inside the approved target path.

## Never Auto-Delete

Never auto-delete:

- Databases.
- Git repositories.
- `.env` files.
- Credentials.
- Workflow exports.
- Production configs.
- Customer data.
- Important backups.

## Approval Rules

Automated cleanup requires an approved cleanup policy, path allowlist, dry-run evidence, and rollback or restore plan.

Emergency cleanup at `95%` may prepare commands and owner approval packets, but must not delete protected assets without approval.
