# AG OS Coordinator Deployment Runbook

Status: deployment-ready procedure; no deployment or credential action is authorized by this file.

## Verified target profile

Read-only preflight on 2026-07-12 verified `agdigitalz-prod` at `5.78.87.188`: Ubuntu kernel 6.8, Docker 29.1.3, Docker Compose 2.40.3, Node.js 18.19.1, 47 GiB available disk, 2.3 GiB available memory, no swap, and no `/opt/ag-os` directory. Ports 80 and 443 are owned by `infra-proxy-1`; Caddy v2.9.1 runs inside that container from `/opt/ai-lead-command-center/infra/Caddyfile`. Port 8787 is unused and not publicly reachable.

The first activation must use `ops/docker-compose.hetzner.yml`, bind only `127.0.0.1:8787`, and use an SSH tunnel. Do not upgrade host Node, attach to `infra_default`, edit Caddy, edit the existing `.env`, recreate an `infra-*` container, open firewall ports, or change DNS.

## Exact activation inputs

Before any VPS mutation, record and approve:

- exact Hetzner host identifier and existing secure SSH path
- exact reviewed Git commit SHA
- owner-approved SSH-tunnel route for first activation; public hostname and DNS remain out of scope
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
4. Place the approved source SHA in `/opt/ag-os` without touching unrelated services or repositories. The reviewed Docker base is pinned to the verified linux/amd64 digest in `Dockerfile`.
5. Install `/etc/ag-os/ag-os.env` with root ownership and mode `0600`; store only approved runtime values.
6. Build only `ops/docker-compose.hetzner.yml`; never run Compose against `/opt/ai-lead-command-center` for this deployment.
7. Confirm the Compose rendering contains only `127.0.0.1:8787:8787`, the AG OS state bind, and no `infra_default` network before starting it.
8. Start only `ag-os-coordinator`, verify localhost `/healthz`, and keep all access behind the SSH tunnel.
9. Run `ops/post-deploy-check.mjs`; acceptance requires health 200, unauthenticated API 401, authenticated status 200, fail-closed production state, and no secret output.
10. Rely on the container healthcheck first. Enable the separate passive monitoring timer only if the approval includes live monitoring.
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

## Owner access after activation

From an authorized computer, open the tunnel with `ssh -N -L 8787:127.0.0.1:8787 root@5.78.87.188`, then browse to `http://127.0.0.1:8787`. Enter the owner API token only in the AG OS session field. Closing the SSH process closes remote access; no public listener or DNS record is created.
