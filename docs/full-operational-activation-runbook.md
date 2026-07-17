# Full operational activation

AG OS source support is designed to be complete before live privileges are granted. This runbook separates implemented mechanics from the exact external activations that the Constitution requires the owner to approve independently.

## Implemented mechanics

- Professional Anthropic file generation with bounded files, cost reservation, quality scoring, lesson candidates, and audit evidence.
- Truthful job states: planning evidence becomes `plan_ready`; only owner-usable deliverables become `done`.
- General-archetype fallback for new product types plus authenticated Retry and Replan controls with lineage to the original job.
- GitHub repository, GitHub draft PR, Netlify preview and continuous deployment, n8n draft/control, allowlisted production deployment, Instagram image publishing, and Cloudflare DNS transports.
- Thirty-second bounded external requests by default through `AG_OS_PROVIDER_TIMEOUT_MS`.
- In-container Watchdog plus an out-of-container systemd health timer with root-only local evidence.
- Authenticated HTTPS reverse-proxy templates while the coordinator remains bound to `127.0.0.1:8787`.

None of these mechanics grants permission by existing. Every live adapter rechecks an exact, revocable, one-job approval immediately before mutation.

## Exact live activations still required

### Professional builder

The owner must grant a separate Anthropic work-product approval naming its expiry, maximum uses, and maximum USD per use. The activation stores only the approval ID and existing root-only key in the coordinator environment. Planning approval cannot activate building.

### Deployment runner

Install the root-owned runner service, generate one separate runner token, create `/etc/ag-os/deployment-profiles.json` with exact allowlisted commands for each product, and configure the coordinator loopback URL. Installing the service, writing profiles, creating the token, and performing the first deployment require an exact production activation approval.

### Secure access anywhere

Choose one exact HTTPS hostname. The approved activation may add the Caddy site from `ops/ag-os-private-access.Caddyfile.template`, set `AG_OS_PRIVATE_ORIGIN`, use `ops/docker-compose.remote-access.yml`, and preserve the coordinator's loopback binding. DNS and Caddy changes remain separate exact actions. A private-network alternative such as Tailscale may be selected instead, but AG OS must not install or enroll it without approval.

### Social and DNS

Social publishing requires a least-privilege Instagram token in `AG_OS_SOCIAL_API_TOKEN`; each post still needs one digest-locked approval. DNS requires a Cloudflare token limited to the exact zone in `AG_OS_DNS_API_TOKEN`; each record change still needs one digest-locked approval. Tokens stay only in root-owned runtime configuration and never enter evidence.

### Independent monitoring

Install and enable `ops/ag-os-monitor.service.template` and `ops/ag-os-monitor.timer.template`. The monitor writes only `/var/lib/ag-os-monitor/last-check.json` and the system journal. A separately approved root-only `/etc/ag-os/monitor.env` may route threshold and recovery events to one HTTPS webhook using `AG_OS_MONITOR_ALERT_WEBHOOK_URL` and an optional bearer token. No webhook is called when that setting is absent; email, SMS, Slack, or paging activation remains a separate messaging approval.

## Verification gates

For every activation: create a fresh backup, confirm exact source commit, preserve state and existing credentials, run health and authentication checks, run dashboard/validator/boot/secret gates, verify unrelated services are unchanged, and roll back only the activated component if verification fails.
