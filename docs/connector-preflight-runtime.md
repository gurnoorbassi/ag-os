# Connector Preflight Runtime v1

Connector Preflight Runtime v1 is a local, read-only readiness check that runs before any future live connector action.

It does not call GitHub, Netlify, n8n, social platforms, Gmail, Hetzner, Postgres, or any other live service. It reads source-controlled AG OS records and reports whether an action is ready or blocked.

## Supported Checks

The preflight checks:

- connector is registered
- connector is marked connected in `.codex/connectors/registry.json`
- requested action is listed in connector capabilities or approval-required actions
- approval lock exists
- approval lock is active and not expired
- approval lock matches the requested action
- approval lock matches the exact target
- credential-store requirement is known
- cost estimate is within the `$5` per-task limit
- rollback plan exists
- stop conditions are listed

## Command

```powershell
npm.cmd run connector:preflight -- --input path\to\connector-preflight-input.json
```

The command exits with:

- `0` when the preflight status is `ready`
- `2` when the preflight status is `blocked`
- `1` for invalid input or runtime errors

## Safety Boundary

Connector Preflight Runtime v1 is advisory. It cannot approve work, cannot bypass approval gates, and cannot execute a connector action.

Blocked preflight results must stop execution until the owner resolves the blocker with a scoped approval, credential-store decision, connector authorization, or source-of-truth update as appropriate.
