# AG OS Coordinator Deployment Runbook

Status: deployment-ready procedure; no deployment or credential action is authorized by this file.

## Exact activation inputs

Before any VPS mutation, record and approve:

- exact Hetzner host identifier and existing secure SSH path
- exact reviewed Git commit SHA
- private HTTPS hostname or an owner-approved no-DNS private-network route
- confirmation that existing capacity adds no new charge
- state backup path and successful integrity result
- prior known-good source SHA
- owner API token creation path and separate Caddy password-hash path
- monitoring activation and rollback scope

Never paste secret values into chat, Git, logs, command history, PRs, or dashboard data.

## Deployment sequence

1. Verify the target identity, free disk, Node.js 20+, systemd, Caddy, and current service state without changing them.
2. Create an integrity-hashed `.codex` state snapshot outside `/opt/ag-os` with `node ops/state-backup.mjs create --workspace /opt/ag-os --backup-root /var/backups/ag-os --backup-id <approved-id>`, then verify it with `node ops/state-backup.mjs verify --backup /var/backups/ag-os/<approved-id>`.
3. Record the current source SHA as the rollback target.
4. Place the approved source SHA in `/opt/ag-os` without touching unrelated services or repositories.
5. Install `/etc/ag-os/ag-os.env` with root ownership and mode `0600`; store only approved runtime values.
6. Install the reviewed service templates but do not enable them until the exact activation approval covers service and monitor activation.
7. Validate Caddy configuration and keep the separate password gate. A public unauthenticated dashboard is forbidden.
8. Start the coordinator, verify localhost `/healthz`, then activate the approved private route.
9. Run `ops/post-deploy-check.mjs`; acceptance requires health 200, unauthenticated API 401, authenticated status 200, fail-closed production state, and no secret output.
10. Enable the passive monitoring timer only if the approval includes live monitoring.
11. Record source SHA, target, timestamps, non-secret check output, backup identifier, and residual blockers in the audit trail.

## Credential rotation and revocation

Credential work requires exact approval. Generate the owner API token and Caddy password/hash on the target or another approved secure device. Store them only in root-owned environment locations. Rotation uses a new value, validates the new session, invalidates the old session, and records only non-secret evidence. Emergency revocation stops external access first, then replaces or removes the approved secret under incident scope.

## Rollback

Rollback is separately approval-gated unless the activation approval explicitly includes the exact automatic rollback condition.

1. Disable `ag-os-monitor.timer` and stop `ag-os.service`.
2. Preserve current logs and state without exposing secrets.
3. Verify the selected backup manifest before touching `.codex`.
4. Restore the previous source SHA and integrity-verified state snapshot. The destructive state restore command requires the explicit `--confirm-live-restore` flag and must match the approved backup path.
5. Re-run local validation and localhost health checks.
6. Restart only after the rollback acceptance checks pass.
7. Keep external access disabled if authentication, state integrity, or fail-closed behavior is uncertain.

## Stop conditions

Stop without deployment if the target is ambiguous, secure access is unavailable, the candidate SHA differs, a new charge appears, backup verification fails, another production service would be affected, credentials could leak, Caddy would expose the dashboard publicly, CI/security gates fail, or exact approval is missing.
