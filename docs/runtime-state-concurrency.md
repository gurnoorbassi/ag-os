# Runtime state isolation and concurrency

AG OS source and live runtime state are separate in production:

- `/opt/ag-os` contains the exact deployed source commit.
- `/var/lib/ag-os/state` is mounted over the coordinator's `.codex` runtime path.
- Deployments replace source without replacing the state mount.

The coordinator remains file-backed for its single-owner workload. Atomic file replacement protects individual records. A shared mutation lock at `.codex/.runtime-locks/state-mutations` now serializes the autonomous queue and approval archival across separate Node processes. The lock has bounded waiting, owner-token release, and stale-lock recovery after ten minutes.

This closes the known queue-versus-maintenance lost-update race. A future Postgres migration is an optional scale change, not a prerequisite for the current single-coordinator deployment. Any such migration must run behind a disabled-by-default backend flag, copy and verify records before cutover, and preserve rollback to the file store until record counts and hashes match.
