# Stale Approval Manager v1

The stale approval manager is a local/offline utility for keeping approval locks from blocking the mandatory boot sequence after their approved work is complete or their `expiresAt` time has passed.

It does not authorize work. It does not call live services. It only reads and writes source-controlled AG OS approval records.

## Commands

List stale direct approval locks:

```powershell
npm.cmd run approvals:stale
```

Archive expired direct approval locks:

```powershell
node scripts/manage-stale-approvals.mjs --archive-stale
```

Archive a completed one-time approval before it becomes stale:

```powershell
node scripts/manage-stale-approvals.mjs --archive-consumed .codex/approvals/approval-YYYYMMDD-example.json
```

## Archive Behavior

Archived approvals are moved from `.codex/approvals/` to `.codex/approvals/archive/`, marked `expired`, and updated with a revocation path explaining that the approval is no longer valid for gated actions.

Historical evidence remains in the approval record and related audit, connector, and cost records. Future work requires a new scoped owner approval lock.

## Safety Rules

The stale approval manager must stop before any live action, credential handling, OAuth, social account connection, posting, scheduling, analytics API use, n8n activation, deployment, domain or DNS change, paid action, production/customer data access, Lead Gen change, AI Receptionist change, or Constitution change.
