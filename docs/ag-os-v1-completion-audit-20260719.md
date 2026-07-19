# AG OS v1 completion audit — 2026-07-19

## Scope and method

This audit starts from exact `origin/main` commit `214e114ec2f699007d25cecab5672ecf06f09b31` and covers the v1 autonomy implementation on `codex/ag-os-v1-autonomy-completion-20260719`.

`npm.cmd run audit:v1` performs five independent full-source passes. Each pass reads the complete repository text set; the final run covered 849 repository files, 841 text files, 72,599 lines, and 163 JavaScript files. This is repeatable automated coverage, not a claim that a person manually memorized every line five times.

1. Encoding and hygiene: invalid UTF-8, NUL bytes, replacement characters, and merge-conflict damage.
2. Secrets: maintained credential/token scanner over the complete source set.
3. Executable safety: JavaScript parse checks plus dynamic-code and shell escape detection.
4. Wiring: JSON schema targets and every static dashboard button handler.
5. Supply chain and authority: zero-dependency invariant, generated dashboard exclusion, and memory/skill permission escalation.

The five source passes are supplemented by the full Node test suite, Foundation validation, dashboard generation/checking, the secret scan, focused autonomy tests, boot checks, and a rendered browser walkthrough.

## Confirmed defects repaired

- The production deployment adapter existed but the command-intake schema could not represent it. All registered adapter requests now validate.
- A quality score below the deterministic bar could still permit `done`. It now produces `needs_revision`.
- Builder-reported quality could mark its own work complete. A separately approved independent critic now blocks completion.
- Planner, builder, critic, artifact-write, or validation failures could leave jobs runnable in `queued`. They now fail closed with recoverable job state and audit evidence.
- A provider-accepted but malformed/truncated paid response could be reversed out of budget evidence. It now remains counted as an unreconciled billed estimate until successful usage is reconciled.
- Runtime JSON and generated files used non-atomic writes. They now use flush-and-rename replacement writes.
- The custom validator ignored `format`, `maxLength`, and nested object/array validation in union types. Those checks are now enforced without breaking production-clean templates.
- Runtime proposal, outcome, deliverable-critique, and mobile-decision records were initially outside validator coverage. They now have schemas and directory accounting.
- The dashboard crashed when older generated data lacked the new outcome metric. Rendering is backward compatible.
- The proposal GET route generated records. GET is now read-only; proposal generation occurs at coordinator startup and after automatic work cycles.
- Project cost summaries read the wrong cost-ledger fields and successful reservation ledgers could double-count spend. Project and global metrics now use operational ledger summaries and exclude reservation/block records.
- Critic workspace containment used a path-prefix comparison that could accept a sibling prefix. It now requires the exact workspace root or a path below it.
- The package still described AG OS as documentation-only. Its metadata now describes the deployed coordinator runtime.
- A plain owner command could request a preview but could not construct the exact adapter request, forcing the owner to choose implementation details. Explicit Netlify preview commands now derive only a draft request from the generated workspace and one allowlisted site ID; unsafe or ambiguous external actions block instead of being guessed.
- Mobile approval links required a desktop click and had no delivery transport. A separately approved Telegram transport now sends them automatically, counts every use, and persists no credential, chat identifier, or signed link.

## Four v1 milestones

| Milestone | Repository implementation | Automated proof | Live activation |
|---|---|---|---|
| Proposal engine | Complete | Bounded proposal, exact accept/reject, no permission grant | Deploy required |
| Independent critic and outcome feedback | Complete | Critic blocks completion; 1–5 outcome is single-use and retrieved by project | Separate critic approval and environment activation required |
| One-tap mobile approvals | Complete | Signed, expiring, single-use token; GET is inert; Telegram delivery needs its own approval and leaks no secret into evidence | Secure phone URL, bot credential, signing key, and notification approval required |
| Full autonomous proof | Complete | One plain command derives a bounded Netlify draft request, builds, independently reviews, waits for one exact approval, deploys a mocked accessible preview, verifies, scores, and learns | Deploy plus one real owner-approved live proof required |

## Browser verification

- Recovery-token owner sign-in reached the authenticated live read model.
- Command, Projects, Activity, Memory, and System navigation each opened a distinct operational view.
- Both registered product workspaces exposed their live application, repository, adapter status, jobs, evidence, quality, lessons, and cost controls.
- Recommendations populated from real stored evidence and exposed Start/Dismiss decisions.
- The mobile page rendered without credentials, removed the bearer fragment from browser history, and rejected an invalid signature.
- A browser-only dashboard crash in the outcome metric was found and repaired during this pass.

## Supply-chain result

The package has no runtime or development dependencies and intentionally has no package lock. `npm audit` is therefore not applicable; the maintained repository secret scan and JavaScript parse pass are the relevant local gates.

## Remaining authority boundary

Repository code is ready for publication, CI, merge, private deployment, critic activation, Telegram mobile activation, and one real proof. Those are external/paid/production mutations and are not authorized by the implementation request alone. They require one exact owner approval naming the unchanged branch head, deployment target, critic limits, mobile-notification limits, secure phone access, and proof-call budget.
