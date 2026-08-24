# Mission Control runtime v1

Mission Control turns an owner software outcome into a persisted, bounded local mission. It is intentionally separate from deployment, publishing, production data, credentials, and other protected external actions.

## Runtime flow

1. The authenticated command API recognizes a software-delivery request and resolves its local Git repository.
2. When the approved Anthropic planner is ready, it returns the mission-native summary, roles, assigned tasks, dependencies, acceptance criteria, validation strategy, integration order, risks, and approval requirements. Mission Control rejects unknown dependencies, cycles, unsupported roles, unsafe validation commands, and malformed integration order, then uses the valid graph directly. When planner approval is unavailable, it records use of the deterministic local fallback.
3. The commander creates the validated dependency graph and role-specific agent runs. Real producer-consumer relationships are explicit: for example, UI design feeds dependent frontend work and database design feeds dependent backend work, while genuinely independent work remains concurrent.
4. Each task executes in its own Git worktree and branch through a bounded tool loop. Before the agent runs, the coordinator detects npm, pnpm, or Yarn from `packageManager` and lockfiles and performs an immutable, lifecycle-script-disabled dependency bootstrap. Agents cannot install packages. Tools restrict file paths, secret-bearing content, commands, output size, duration, model turns, and spend.
5. Every AgentRun receives a role-specific tool set, and the executor checks that permission again before use. QA, Security Reviewer, and Code Reviewer cannot use source-editing tools; coding roles can; Commander has no coding tools. The scheduler admits at most one active task for each AgentRun.
6. Successful task commits are cherry-picked into the mission integration worktree in dependency order. Conflicts and failed validation create bounded repair tasks.
7. QA records every command in the declared validation strategy, deduplicating command evidence without omitting commands. A failure creates a bounded Fixer task and returns to QA. Final integration reruns the complete strategy and secret scan; its first failure receives the same bounded repair and revalidation cycle before a terminal failure.

The default concurrency limit is three. Mission commands use asynchronous child processes so the owner API and event stream remain responsive. `supervised` missions require an explicit run control; `balanced` and `autonomous` missions can start local work automatically. Every autonomy level still requires exact owner approval for protected external actions.

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

A passing local mission proves only the recorded integration revision, local validation, and secret-scan evidence. It does not authorize or claim a production release. Cancellation aborts active provider calls and command process trees, persists terminal state before returning, safely removes mission worktrees, and prevents late task or event mutation; source commits and audit history remain recoverable.
