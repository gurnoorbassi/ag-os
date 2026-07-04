# Social Media Management System v1 Build Plan

## Build Principle

Build the complete architecture in draft/staging mode first. The system should feel like a real operations tool, but every live path must remain blocked until owner approval unlocks it through a separate approval lock.

## Phase 1: Approval Package Only

Current phase.

Deliverables:

- Project record in AG OS.
- Approval lock template.
- Audit event template.
- Build plan.
- Data model.
- Safety gates.
- Future connector plan.
- Dashboard readiness plan.
- Skills and pattern notes.

No live action is allowed in this phase.

## Phase 2: GitHub Repo and Starter App PR

Requires separate owner approval.

Allowed future work:

- Create one private GitHub repo named `ag-social-media-management-system`.
- Create one starter branch.
- Add draft/staging-only starter files.
- Open one PR to `main`.

Expected starter files:

- `README.md`
- `package.json`
- `index.html` or lightweight app entrypoint.
- `src/styles.css`
- `src/main.js`
- `src/data/placeholders.js` or equivalent source-controlled placeholder data.
- `src/model/` or equivalent model definitions if the chosen stack needs it.

Blocked:

- No deployment.
- No Netlify connection.
- No social account connection.
- No credentials.
- No n8n activation.
- No posting or scheduling.
- No paid services.

## Phase 3: Review, Critique, Quality Score, and Merge

Requires separate owner approval before merge.

AG OS should:

- Review the target repo PR for scope and safety.
- Run available local checks.
- Generate critique record.
- Generate quality score record.
- Generate lesson candidates only if meaningful.
- Record audit, connector, and cost records.
- Stop before merge unless owner approves the merge.

Quality bar:

- Uses the social media content operations archetype.
- Supports all required v1 models.
- Clearly blocks live actions.
- Uses draft-only data.
- Has no credentials, tracking, paid API, or live platform integration.

## Phase 4: Netlify Staging

Requires separate owner approval.

Allowed future work:

- Create or connect one dedicated staging-only Netlify site.
- Deploy from the reviewed main SHA.
- Record site, deploy, audit, connector, and cost records.

Blocked:

- No production domain.
- No DNS changes.
- No custom domain.
- No paid Netlify feature.
- No secrets in source control.
- No forms wired to live services.

## Phase 5: n8n Draft Workflow

Requires separate owner approval.

Allowed future work:

- Create one inactive n8n draft workflow.
- Use placeholder payloads only.
- Export workflow JSON.
- Validate exported workflow JSON.
- Record audit, connector result, and cost ledger.

Potential draft workflows:

- Content intake queue from future form payload.
- Draft post package creation from an uploaded content item.
- Approval notification placeholder that stops before sending any outbound message.
- Weekly report assembly from local/source-controlled placeholder records.

Blocked:

- No workflow activation.
- No credentials.
- No outbound messages.
- No external platform API calls.
- No production n8n workflow changes.
- No Lead Gen workflow changes.
- No AI Receptionist workflow changes.

## Phase 6: Future Social OAuth and Posting

Requires separate owner approval and a new risk review.

No OAuth, scheduling, analytics API, or live posting can happen until:

- Project data model has passed review.
- Approval model has passed review.
- Audit model has passed review.
- Credential policy has been approved.
- Rollback procedure exists.
- Owner approves exact platform accounts and actions.

## First Build Target

The first product PR should build:

- Dashboard overview.
- Clients view.
- Accounts view.
- Content intake queue.
- Content calendar.
- Post packages view.
- Approval queue.
- Weekly reports view.
- Settings/config status.
- Blocked live actions panel.

The first build should not include:

- Social OAuth.
- Live posting.
- Scheduling activation.
- Analytics API ingestion.
- Direct messages or comments.
- Media rendering pipelines.
- Paid integrations.
- Client portal authentication.
- Production database wiring.

## Validation Plan

Every future PR must run:

```text
npm.cmd run validate
npm.cmd run boot:check
node --test tests/*.test.mjs
git diff --check
```

Product repo PRs should also run the target repo's safe local checks when scripts exist.
