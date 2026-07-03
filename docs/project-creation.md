# Project Creation

## Purpose

Projects turn ideas into controlled work. A project should be small enough to review and large enough to produce a useful outcome.

## Project Intake Flow

1. Capture the idea in `.codex/ideas/`.
2. Classify the idea by domain, expected value, risk, urgency, and dependencies.
3. Decide whether it should become a project.
4. Create a project record in `.codex/projects/`.
5. Create tasks in `.codex/tasks/`.
6. Add any required agent roles in `.codex/agents/`.
7. Add cost, quality, security, and deployment records as needed.
8. Run local validation before committing.

## Required Project Fields

A project must define:

- `id`
- `name`
- `status`
- `owner`
- `goal`
- `scope`
- `outOfScope`
- `trustLevel`
- `stack`
- `risks`
- `approvalRequiredFor`
- `qualityGates`
- `securityReview`
- `costTracking`
- `deploymentPlan`
- `createdAt`
- `updatedAt`

## Status Values

| Status | Meaning |
| --- | --- |
| `idea` | Captured but not approved as a project |
| `planned` | Approved for planning |
| `active` | Work is in progress |
| `blocked` | Waiting on approval or external dependency |
| `paused` | Intentionally stopped |
| `complete` | Outcome delivered and verified |
| `archived` | No longer active |

## Trust Level Selection

Start every new project at the lowest trust level that can produce evidence:

- Use Trust Level 0 for docs, schemas, folders, and rules.
- Use Trust Level 1 for local simulations and fake payload tests.
- Use Trust Level 2 only after read-only integration is explicitly approved.
- Use Trust Level 3 only for gated writes with approval and rollback.
- Use Trust Level 4 only for monitored production automation.

## Project Template

```json
{
  "id": "project-example",
  "name": "Example Project",
  "status": "planned",
  "owner": "AG Digitalz",
  "goal": "Describe the exact outcome.",
  "scope": ["Local docs and schemas only."],
  "outOfScope": ["Live service connections.", "Production data changes."],
  "trustLevel": 0,
  "stack": ["GitHub"],
  "risks": [
    {
      "risk": "Scope expands into live integration too early.",
      "mitigation": "Keep approval gates in .codex/locks/."
    }
  ],
  "approvalRequiredFor": ["live_service_connection", "deployment"],
  "qualityGates": ["npm run validate"],
  "securityReview": "required-before-live-integration",
  "costTracking": "estimate-before-paid-service",
  "deploymentPlan": "none",
  "createdAt": "2026-07-03T00:00:00Z",
  "updatedAt": "2026-07-03T00:00:00Z"
}
```

## First Safe Project After This Scaffold

The next safe PR should add example records for one fake internal project, one fake task, and one fake agent. That PR should prove the schemas are usable without connecting any live services.
