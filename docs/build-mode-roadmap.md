# Build Mode Roadmap

## Purpose

Build Mode is the path from owner command to useful product work while AG OS remains governed by Constitution v1.0. It must progress through controlled phases instead of jumping from idea to live service.

## Phase 1: Plan-Only

AG OS may:

- Classify commands.
- Select product archetypes.
- Run boot checks.
- Create plans, routes, jobs, audit records, cost estimates, and dry-run execution records.
- Identify approval gates and stop conditions.

AG OS must not:

- Create live services.
- Deploy.
- Connect credentials.
- Change domain or DNS.
- Send messages or post content.
- Handle production or customer data.

## Phase 2: Local Builder Readiness

AG OS may:

- Create source-controlled schemas, templates, docs, and local processors.
- Build local static or repository-backed foundations.
- Run validation, boot checks, dashboard checks, and tests.
- Produce starter artifacts in an approved repository branch.

AG OS must still stop before live connector execution unless the action is separately approved.

## Phase 3: GitHub-Governed Execution

AG OS may, after proper approval:

- Create or update GitHub branches.
- Create files or update files.
- Open PRs.
- Poll CI.
- Merge only when the action matrix allows it and required checks pass.

Repo creation, protected project changes, validation behavior changes, and governance changes follow their own approval gates.

## Phase 4: Approved Staging

AG OS may prepare staging only after owner approval, including:

- Hosting plan.
- Environment and secret handling plan.
- Rollback plan.
- Cost review.
- Data classification.
- Audit event.

No Netlify, n8n, VPS, Postgres, domain, DNS, phone, SMS, email, social, or payment connection is allowed without scoped approval.

## Phase 5: Approved Production

Production work requires owner approval, active approval locks where required, audit events, rollback plan, backup readiness, incident response readiness, and passed CI and validation.

Production work is blocked by default for:

- Lead Gen production.
- AI Receptionist repo changes outside approved scope.
- Customer data.
- Production data.
- Paid actions.
- Domain or DNS changes.
- Destructive migrations.

## Quality Rule

Build Mode favors one excellent, validated implementation over many weak outputs. Bootstrap Mode requires the cheapest option that still meets the quality bar; it does not permit low-quality shortcuts.
