# Opportunity Director V1

Opportunity Director is AG OS's persistent, owner-controlled opportunity discovery and validation system. It converts public, normalized evidence into scored opportunities, cheap validation proposals, experiments, outcomes, and—only after the normal owner proposal gate—supervised Mission Control work.

## Safety boundary

- The Constitution is code-owned and hash-pinned. Model output cannot change it, the owner objective, Cost OS limits, Security OS rules, approval requirements, or execution safeguards.
- Research providers are read-only. The V1 live-provider adapter fails closed; deterministic fixtures are the only verification path.
- The Director cannot contact anyone, publish, purchase, spend, create accounts, access customer data, approve its own work, or move real money.
- `validation_ready` creates an ordinary owner proposal. It grants no permission. Existing authenticated proposal acceptance and Mission Control supervision remain authoritative.
- Treasury V1 is simulation-only, begins at USD 0, rejects negative balances, and accepts revenue attribution only with owner-confirmed evidence.
- Stored decisions contain concise evidence-linked rationale, not hidden chain-of-thought.

## Persistent model

State lives below `.codex/opportunity/`: the Director, evidence, signals, research runs, opportunities, people, experiments, outcomes, tactical rules, decisions, wakes, daily briefs, treasury, and Mission Control links. Verified observations and hypotheses are separate. Duplicate opportunities collapse under a stable opportunity key, while time-sensitive signals decay.

The deterministic score totals 100 points across pain, economic value, evidence, reachability, AG capability fit, validation speed/cost, competitive whitespace, and network/reputation value. Economics always state assumptions, ranges, probabilities, validation spend, owner time, and estimate classification.

## Local verification

Run the realistic three-company world in an isolated checkout or temporary root:

```powershell
npm.cmd run opportunity:wake:fixture
npm.cmd run opportunity:brief
npm.cmd run opportunity:verify
```

The fixture proves discovery, seven specialized research roles, evidence normalization, a skeptic downgrade, a watch decision, a kill decision, a validation-ready proposal, a no-change wake with zero model calls/cost, and bounded one-call reasoning. It does not browse or call a live model.

The owner console exposes Overview, Opportunities, People, Experiments, Learned, and Activity. Opportunity actions use the authenticated API. “Spawn build mission” remains blocked until the matching proposal has been explicitly accepted; the bridge then calls the existing supervised Mission Control runtime and links result/cancellation/resume state back to the opportunity.

## Required repository gates

```powershell
npm.cmd test
npm.cmd run validate
npm.cmd run boot:check
npm.cmd run security:scan
npm.cmd run audit:v1
git diff --check
```

The verification artifact is written to `docs/evidence/opportunity-director-v1-verification-2026-08-24.json`. No live Anthropic or web-provider smoke belongs in this V1 verification path.
