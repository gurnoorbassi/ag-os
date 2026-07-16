# Operational execution transports

AG OS supports two separately approval-gated live transports beyond draft creation.

## n8n workflow control

`n8n-workflow-control` activates or deactivates one exact workflow only. The execution request must name the API base URL, workflow ID, workflow name, definition digest, and operation. AG OS reads the workflow first, rejects definition drift and prohibited host-execution nodes, applies only the approved state change, verifies the final state, and deactivates again if activation verification fails. It never manually runs the workflow or stores credential references in evidence.

## Production deployment runner

`production-deployment` sends one exact repository commit to a loopback or HTTPS runner. The request cannot include shell commands, filesystem paths, or arbitrary health checks. The root-owned runner matches the repository, profile, and expected service against `/etc/ag-os/deployment-profiles.json`, then runs only the preconfigured backup, deploy, verify, and rollback commands with `shell: false`.

The runner requires:

- `AG_OS_DEPLOYMENT_RUNNER_URL` and `AG_OS_DEPLOYMENT_RUNNER_TOKEN` in the root-only coordinator environment.
- A separate root-only runner environment file containing the same runner token.
- A root-owned, mode `0600` deployment profile file.
- An exact single-job owner approval naming the profile, repository, commit, environment, and service.

Installing or changing the runner, profile file, token, systemd service, deployment target, or production application remains a separate production action. Source support alone grants no permission and does not activate the runner.
