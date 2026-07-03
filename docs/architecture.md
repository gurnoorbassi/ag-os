# AG Digitalz OS Architecture

## Purpose

AG Digitalz OS is the internal control plane for building and operating AG Digitalz systems. It is intended to coordinate ideas, products, projects, agents, tasks, durable memory, costs, quality gates, security review, deployment intent, and future automation.

The first version is intentionally file-based. GitHub is the source of truth until the schemas and workflows are stable enough to justify database-backed state.

## Boundaries

AG Digitalz OS is not the AI receptionist repo. It should be able to govern that product later, but it must not import, deploy, or modify the lead generation or receptionist systems during this foundation phase.

This repository must not contain:

- Production credentials
- Service tokens
- Live webhook URLs
- Database connection strings
- Private customer data
- Activated workflow exports
- Deployment credentials

## Core Domains

### Ideas

Ideas are raw opportunities, experiments, product concepts, system improvements, or internal process changes. Ideas become projects only after they have a clear owner, scope, risk profile, and expected outcome.

### Projects

Projects are approved units of work with a goal, status, owner, artifacts, safety level, costs, quality gates, security posture, and deployment plan.

### Agents

Agents are role definitions for repeatable work. An agent should have a purpose, allowed inputs, prohibited actions, approval requirements, escalation rules, and expected outputs.

### Tasks

Tasks are the smallest reviewable units of work. Tasks should be assigned to a project, include acceptance criteria, define risk, and point to evidence after completion.

### Memory

Memory records durable decisions, facts, preferences, rules, and system state that should survive a single session. Memory must distinguish verified current facts from older notes that may be stale.

### Costs

Costs track expected, actual, recurring, and usage-based spend. Cost tracking must cover hosting, APIs, automations, model usage, contractors, tools, and experiments.

### Quality

Quality records checks before work ships: validation, tests, review, screenshots, docs, customer-impact notes, rollback notes, and open risks.

### Security

Security records threat models, access reviews, secret handling, data sensitivity, least-privilege checks, and production-change approvals.

### Watchdog

Watchdog records future monitoring plans and local checks. It must not ping, scrape, mutate, or monitor live services until explicitly authorized.

## Current System Shape

```text
GitHub repo
  |
  |-- docs: operating intent and runbooks
  |-- schemas: JSON contracts for future state
  |-- .codex: file-based operating artifacts
  |-- scripts: local validation
  `-- CI: local validation in GitHub Actions
```

## Future Runtime Shape

```text
GitHub
  |
  |-- validates and reviews changes
  |
  v
AG Digitalz OS
  |
  |-- Postgres: durable structured state
  |-- n8n: disabled-first workflow orchestration
  |-- Hetzner VPS: persistent services
  |-- Netlify: public and internal front ends
  |-- Domain: routed product surfaces
  `-- Base44: optional UI prototypes
```

Future runtime work must be introduced through reviewed projects and disabled-by-default integrations.

## Data Flow Principles

1. GitHub is the source of truth for foundation artifacts.
2. Schemas define data before databases store data.
3. Disabled workflow exports come before live automation.
4. Fake payload tests come before real payloads.
5. Local validation comes before CI.
6. CI comes before deployment.
7. Read-only integration comes before write access.
8. Manual approval comes before live side effects.

## Trust Levels

| Level | Name | Allowed Work |
| --- | --- | --- |
| 0 | Docs only | Docs, schemas, folders, and local checks |
| 1 | Local simulation | Fake payloads, local tests, disabled workflow exports |
| 2 | Read-only integration | Read-only access to approved services |
| 3 | Gated write integration | Writes behind explicit approval and rollback notes |
| 4 | Production automation | Monitored, logged, approved production actions |

The repository currently operates at Trust Level 0.
