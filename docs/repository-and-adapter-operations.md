# Repository and adapter operations

## Starting a project

The owner starts a project from **Workspaces → Start new project**. AG OS creates the local workspace and queues one exact `github-private-repository` job. The repository is always requested as private. The owner approves that exact job from **Activity**; AG OS then creates or verifies the named private repository and binds its URL back into the workspace.

Project creation alone never authorizes a deployment, production-data access, messaging, posting, DNS, paid action, or another connector mutation.

## Current product bindings

- Quote Builder source: `gurnoorbassi/Foreman-Quote-Maker`
- Quote Builder live site: `foreman-quote-studio`
- AI Lead source: `gurnoorbassi/AI-Lead-Command-Center`
- AI Lead n8n target: `https://n8n.agdigitalz.net`
- AI Lead production target: `root@5.78.87.188:/opt/ai-lead-command-center`

The n8n adapter is implemented for exact, disabled, credential-free workflow creation after owner approval. Publishing, activation, execution, credential mutation, and production-data access remain separate approvals.

The production deployment adapter is registered but intentionally reports its missing coordinator-side transport. It must not claim execution readiness until a commit-pinned, backup-first, environment-preserving, rollback-capable transport is installed and tested.

## Netlify continuous deployment

The `netlify-continuous-deployment` adapter validates an exact site UUID, GitHub numeric repository ID, repository path, branch, build command, publish directory, and project record. Private repositories additionally require the exact Netlify GitHub App installation ID.

The Foreman link attempt on 2026-07-16 proved that Netlify account authentication alone does not grant GitHub repository clone access. AG OS rolled the binding back and preserved the current published deployment. Retry requires either:

1. owner-authorized Netlify GitHub App access to the repository; or
2. a separately approved, least-privilege read-only deploy key.
