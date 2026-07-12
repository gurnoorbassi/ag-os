# Live Operator Runtime

AG OS now includes a dependency-free authenticated coordinator and owner command console. This turns the source-controlled control plane into an operable internal product while preserving fail-closed action gates.

## What the owner can do

- Open the dashboard and connect it to the coordinator.
- Enter one owner command in natural language.
- Automatically create boot, intake, job, route, plan, cost, connector-gate, and audit records.
- See whether the request is planned or waiting for an exact approval.
- Refresh the dashboard from the new evidence.

The console does not silently execute connectors. Posting, messages, paid actions, credentials, production/customer data, deployment, DNS, merges, and destructive actions retain their separate action approvals.

## Local start

1. Generate a long random owner token and store it outside Git and chat.
2. Set `AG_OS_OWNER_TOKEN` in the shell or a local ignored `.env` loader.
3. Run `npm.cmd run dashboard:build` and `npm.cmd run live:start`.
4. Open `http://127.0.0.1:8787`, enter the same token, and connect.

The server refuses to start without `AG_OS_OWNER_TOKEN`. It binds to localhost by default.

## VPS target

The verified first production target is the existing Hetzner VPS using `ops/docker-compose.hetzner.yml`. It runs the pinned Node 20 container on loopback port 8787 and is accessed through an SSH tunnel. This deliberately avoids the host's Node 18 runtime and the production Caddy/n8n Compose stack. Store the owner API token in `/etc/ag-os/ag-os.env` with root-only permissions and never commit it.

For the first owner-only activation, serve both the dashboard and coordinator through the loopback-only VPS endpoint. A public Netlify copy remains unsuitable for internal operational evidence unless an independently reviewed access-control layer protects it. A Caddy hostname and DNS route are a later, separately approved promotion.

Before activation, prove the exact source commit, backup, rollback, monitoring, credential revocation, CI/security gates, and exact deployment approval. A deployed coordinator still does not authorize posting, spending, DNS, credentials, production data, or other gated actions.

The coordinator-specific activation record is `.codex/production/production-readiness-ag-os-coordinator-v1.json`. It is separate from Social Media Management System readiness. Use `docs/ag-os-coordinator-deployment-runbook.md` for the exact owner-only deployment and rollback sequence.
