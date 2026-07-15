# Live Operator Runtime

AG OS now includes a dependency-free authenticated coordinator and owner command console. This turns the source-controlled control plane into an operable internal product while preserving fail-closed action gates.

## What the owner can do

- Open the dashboard and connect it to the coordinator.
- Enter one owner command in natural language.
- Automatically create boot, intake, job, route, plan, cost, connector-gate, and audit records.
- See whether the request is planned or waiting for an exact approval.
- Refresh the dashboard from the new evidence.

The console does not silently execute connectors. Posting, messages, paid actions, credentials, production/customer data, deployment, DNS, merges, and destructive actions retain their separate action approvals.

## Anthropic planning worker

AG OS can replace the deterministic fallback plan with a schema-constrained Anthropic plan. It uses the Messages API through built-in Node `fetch`, so no SDK or dependency installation is required. The worker can only author the plan; it cannot use connectors, edit external repositories, deploy, publish, message, change DNS, or access production/customer data.

The worker remains disabled unless all of these are true:

- `ANTHROPIC_API_KEY` exists in the root-only runtime environment.
- `AG_OS_AI_PLANNER_ENABLED=true`.
- `ANTHROPIC_MODEL` names the reviewed model (the default is `claude-sonnet-5`).
- `ANTHROPIC_INPUT_COST_PER_MILLION_USD` and `ANTHROPIC_OUTPUT_COST_PER_MILLION_USD` record the current prices used by the cost ledger.
- `AG_OS_AI_PLANNER_APPROVAL_ID` points to an active, unexpired approval for target `anthropic:messages-api`, action `anthropic_plan_generation`, and `paid_actions`, with a positive per-use budget no greater than USD $5.

Every successful call records the approval use, model, token counts, and computed cost. The API key is never returned by the status endpoint or written to AG OS evidence. A model call does not authorize any downstream live action.

## Local start

1. Generate a long random owner recovery token and store it outside Git and chat.
2. Generate a salted scrypt owner-password hash with the reviewed `hashOwnerPassword` helper and store only the resulting `scrypt-v1` value. Never store the plaintext password.
3. Set `AG_OS_OWNER_TOKEN`, `AG_OS_OWNER_PASSWORD_HASH`, and optionally `AG_OS_OWNER_SESSION_DAYS` (1-30, default 30) in the shell or a local ignored `.env` loader. If enabling Anthropic planning, set its variables in the same ignored/root-only environment and never paste a key or password into chat or source control.
4. Run `npm.cmd run dashboard:build` and `npm.cmd run live:start`.
5. Open `http://127.0.0.1:8787` and sign in with the owner password. The password is exchanged once for a signed, HttpOnly, SameSite=Strict session cookie and is never stored by the dashboard. The recovery token remains available as a tab-scoped fallback.

The server refuses to start without `AG_OS_OWNER_TOKEN`, and refuses a malformed configured password hash. Password login is rate-limited to five failed attempts per 15-minute window. Password sessions last no more than 30 days, are invalidated by password-hash or recovery-token rotation, and require a trusted same-origin browser request for state-changing API calls. The coordinator binds to localhost by default.

## VPS target

The verified first production target is the existing Hetzner VPS using `ops/docker-compose.hetzner.yml`. It runs the pinned Node 20 container on loopback port 8787 and is accessed through an SSH tunnel. This deliberately avoids the host's Node 18 runtime and the production Caddy/n8n Compose stack. Store the owner recovery token and password hash in `/etc/ag-os/ag-os.env` with root-only permissions and never commit them.

For the first owner-only activation, serve both the dashboard and coordinator through the loopback-only VPS endpoint. A public Netlify copy remains unsuitable for internal operational evidence unless an independently reviewed access-control layer protects it. A Caddy hostname and DNS route are a later, separately approved promotion.

Before activation, prove the exact source commit, backup, rollback, monitoring, credential revocation, CI/security gates, and exact deployment approval. A deployed coordinator still does not authorize posting, spending, DNS, credentials, production data, or other gated actions.

The coordinator-specific activation record is `.codex/production/production-readiness-ag-os-coordinator-v1.json`. It is separate from Social Media Management System readiness. Use `docs/ag-os-coordinator-deployment-runbook.md` for the exact owner-only deployment and rollback sequence.
