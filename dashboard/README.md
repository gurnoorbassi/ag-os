# AG OS Dashboard

Dashboard v1 is a read-only static interface generated from source-controlled AG OS records.

## Scope

- Uses existing repository metadata only.
- Does not call live services.
- Does not store credentials.
- Does not deploy.
- Does not provide write, send, deploy, or destructive controls.

## Local Commands

```text
npm.cmd run dashboard:build
npm.cmd run dashboard:check
```

Open `dashboard/index.html` locally after building.
