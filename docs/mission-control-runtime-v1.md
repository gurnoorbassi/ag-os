# Mission Control runtime v1

Mission Control turns an owner software outcome into a persisted, bounded local mission. It is intentionally separate from deployment, publishing, production data, credentials, and other protected external actions.

## Runtime flow

1. The authenticated command API recognizes a software-delivery request and resolves its local Git repository.
2. When the approved Anthropic planner is ready, it produces the planning draft and records its Cost OS usage. Otherwise, Mission Control records that it used the deterministic local fallback.
3. The commander creates a dependency graph and role-specific agent runs.
4. Each task executes in its own Git worktree and branch through a bounded tool loop. Tools restrict file paths, secret-bearing content, commands, output size, duration, model turns, and spend.
5. Successful task commits are cherry-picked into the mission integration worktree in dependency order. Conflicts and failed validation create bounded repair tasks.
6. Final target validation and the repository secret scan must pass before the mission is complete. A safe local preview is exposed when an HTML entry file exists.

The default concurrency limit is three. `supervised` missions require an explicit run control; `balanced` and `autonomous` missions can start local work automatically. Every autonomy level still requires exact owner approval for protected external actions.

## Persistence

Mission records live under `.codex/missions/<mission-id>/` with separate agent, task, handoff, artifact, and append-only JSONL event records. Worktrees live outside the target checkout under `.ag-os-mission-worktrees/` in its parent directory.

## Authenticated API

- `GET /api/v1/missions`
- `GET /api/v1/missions/:missionId`
- `GET /api/v1/missions/:missionId/{agents,tasks,events,handoffs,artifacts}`
- `GET /api/v1/missions/:missionId/events/stream`
- `GET /api/v1/missions/:missionId/preview/:file`
- `POST /api/v1/missions/:missionId/controls` with `run`, `resume`, or `cancel`

Mission creation uses the existing authenticated command endpoint. The response contains the mission ID, actual planning mode, agent/task counts, worker readiness, and confirmation that no protected external action was executed.

## Operational boundary

A passing local mission proves only the recorded integration revision, local validation, and secret-scan evidence. It does not authorize or claim a production release. Mission cancellation persists terminal state and removes the mission worktrees; source commits and audit history remain recoverable.
