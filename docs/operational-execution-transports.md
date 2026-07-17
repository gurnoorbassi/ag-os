# Operational execution transports

AG OS supports separately approval-gated live transports beyond draft creation.

## n8n workflow control

`n8n-workflow-control` activates or deactivates one exact workflow only. The execution request must name the API base URL, workflow ID, workflow name, definition digest, and operation. AG OS reads the workflow first, rejects definition drift and prohibited host-execution nodes, applies only the approved state change, verifies the final state, and deactivates again if activation verification fails. It never manually runs the workflow or stores credential references in evidence.

## Production deployment runner

`production-deployment` sends one exact repository commit to a loopback, the fixed AG OS private Docker bridge, or an HTTPS runner. The request cannot include shell commands, filesystem paths, arbitrary health checks, or unknown fields. The root-owned runner matches the repository, profile, and expected service against `/etc/ag-os/deployment-profiles.json`, then runs only the preconfigured backup, deploy, verify, and rollback commands with `shell: false`.

The runner requires:

- `AG_OS_DEPLOYMENT_RUNNER_URL` and `AG_OS_DEPLOYMENT_RUNNER_TOKEN` in the root-only coordinator environment.
- A separate root-only runner environment file containing the same runner token.
- A root-owned, mode `0600` deployment profile file.
- An exact single-job owner approval naming the profile, repository, commit, environment, and service.

On the Hetzner Compose runtime, the coordinator uses the dedicated `ag-os-private-runner` bridge at `172.30.79.0/24`. The host runner binds only to the bridge gateway `172.30.79.1:8790`; the port is not published on the VPS public interface. Authenticated HTTP is accepted only for loopback and this exact bridge gateway. Every other non-HTTPS runner address remains rejected.

Installing or changing the runner, profile file, token, systemd service, deployment target, or production application remains a separate production action. Source support alone grants no permission and does not activate the runner.

## Instagram publishing

`social-publishing` supports one immediate Instagram image post. The request locks the account ID, expected username, public HTTPS media URL, caption, and a SHA-256 content digest. The adapter verifies account identity, creates and verifies one media container, rechecks the exact approval, publishes once, and verifies the public permalink. Scheduling, messages, comments, ads, deletion, and additional posts are prohibited. Because a publish has no guaranteed transactional rollback, the approval must acknowledge that deletion would require a separate action.

## Cloudflare DNS

`dns-change` supports one exact Cloudflare record upsert. The request locks the zone, optional record ID, type, name, value, TTL, proxy setting, and SHA-256 digest. The adapter snapshots the prior record, rechecks approval, performs one mutation, verifies every approved value, and restores or deletes the changed record if verification fails. Nameserver, zone, registration, TLS, and unrelated record changes are not implemented.

## Network safety

Every external transport uses a bounded request timeout. The default is 30 seconds and may be reduced through `AG_OS_PROVIDER_TIMEOUT_MS`; invalid or excessive values fall back to the safe default. A timeout fails the job closed and records conservative connector-touch evidence so the owner knows to verify provider state before retrying.
