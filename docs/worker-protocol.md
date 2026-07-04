# Worker Protocol

## Purpose

The Worker Protocol defines how AG OS coordinates model workers, deterministic scripts, MCP connectors, and the owner so that intelligence is captured as records while safety stays deterministic.

This document is policy only. It does not execute work, call connectors, store credentials, deploy, or grant new permissions. It operates under AG OS Constitution v1.0 and the action matrix.

## Roles

- AG OS is the main coordinator. It owns command understanding, planning, routing, approvals, project management, memory, learning, quality, cost, security, and execution decisions. AG OS is expressed through this repository: the Constitution, registries, schemas, records, and validation scripts.
- The owner is the final authority. The owner approves gated actions, accepts or rejects worker output, and sets direction.
- Model workers decide and reason. They produce understanding, plans, designs, implementations, and reviews as structured output.
- Deterministic scripts verify. They validate record shapes, enforce gates, check budgets, and run boot checks. They never invent content and never authorize gated actions.
- MCP connectors execute only through gates. A connector action requires the applicable gate checks and, when gated, a valid approval lock.

Rule of thumb:

Model decides. Script verifies. MCP executes. Owner approves.

## Worker Definitions

- Fable is a manual external worker used through the Claude app by the owner. Fable is not connected by API or MCP. Fable handles understanding, architecture, product judgment, UX, review, hard planning, and high-agency builder thinking. Fable output enters AG OS only as reviewed records, PRs, or documented recommendations.
- Codex is a repo execution worker. Codex handles implementation, file edits, local validation, PR creation, and MCP execution when the action matrix and approvals allow it.
- Future workers must be registered under `.codex/agents/` with scope, limits, and allowed output types before they operate.

Workers are stateless and interchangeable. The repository is the only shared brain. Workers must not rely on chat history, session memory, or another worker's unrecorded context.

## Parallel Operation

Fable and Codex may run at the same time on the same repository. To prevent one worker from moving another's checkout, each worker operates in its own git worktree over the shared repository history:

- Codex uses the primary checkout (the repository root directory).
- Fable uses a separate worktree directory (for example a sibling `AG-OS-fable` directory) created with `git worktree add`.

Rules for parallel operation:

- Each worker branches only under its own prefix: Codex uses `codex/*`, Fable uses `fable/*`. Git refuses to check out the same branch in two worktrees, which enforces this boundary at the filesystem level.
- No worker switches, resets, or rebases a branch it does not own, and no worker touches another worker's worktree directory.
- Coordination happens through merged records on `main`, never through a shared working tree. A worker reads the other's output only after it is merged.
- Division of labor follows `docs/executor-selection-policy.md`: Fable takes understanding, architecture, judgment, planning, and review; Codex takes implementation, file edits, validation runs, PRs, and gated MCP execution.
- The owner remains the coordinator. When two workers would touch the same records or the same gated action, the owner sequences them; workers do not self-negotiate ordering.

The repository has zero runtime dependencies, so a fresh worktree needs no install and can run `npm run validate` and `npm run boot:check` immediately.

## Worker Session Contract

At session start, a worker must read, in order:

1. The active Constitution and the action matrix.
2. Boot check output (`npm run boot:check`) or the latest boot record.
3. The registries relevant to the task: project, command, connector, capability.
4. Owner preferences when present under `.codex/owners/`.
5. The relevant product archetype under `.codex/archetypes/` when the task maps to a product category.
6. Accepted lessons under `.codex/memory/lessons/` scoped to the task.

At session end, a worker must leave behind:

1. Structured records for any decision that future work depends on.
2. Evidence: diffs, validation output, CI status, PR links, commit SHAs.
3. Lesson candidates for anything learned that could improve future runs.
4. A clear stop report when a gate blocked the work.

Work that exists only in a chat transcript does not exist for AG OS.

## Output Acceptance Rules

- Worker output is advisory until accepted by AG OS.
- Acceptance means the output passes deterministic validation and, when required, owner review.
- Accepted worker output becomes a PR, a record, a lesson, or a skill.
- Rejected worker output is recorded only when useful, as a lesson candidate describing what was rejected and why. Useless rejections are discarded.
- No worker output can bypass validation, CI, safe-merge policy, approval gates, or the Constitution.

## Safety Boundaries

Workers must stop and report instead of proceeding when work would touch:

- credentials or secrets
- live services without a valid approval lock
- deployments, domains, or DNS
- production or customer data
- paid actions
- Lead Gen production systems
- the AI Receptionist repository, unless it is the explicit approved target
- Constitution changes without explicit owner approval

A worker that is unsure whether a gate applies must treat the gate as applying.

## Relationship To Other OS Domains

The Worker Protocol is consumed by Command Intake, Planner, Task Router, Execution Engine, and Connector Executor. Tool and executor choice is defined in `docs/executor-selection-policy.md`. Approval mechanics are defined in `docs/approval-workflow.md` and `docs/approval-ledger.md`.
