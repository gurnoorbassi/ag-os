# AG OS v1 autonomy layer

AG OS v1 turns one authenticated owner outcome into bounded work while preserving the Constitution's exact approval boundaries.

## Operating loop

1. The proposal engine reads AG OS records and queues bounded recommendations. It cannot execute its own proposals or grant permission.
2. An accepted recommendation becomes a normal owner command and passes through the same classification, budget, approval, and adapter gates as a typed command.
3. The planner and builder use separate scoped standing approvals. The builder writes only bounded files in the isolated work-product workspace.
4. The independent critic uses a separate approval, budget reservation, model call, and evidence record. A failed or substandard critique produces `needs_revision`, never `done`.
5. Deterministic local validation and quality scoring must pass before completion can be claimed.
6. External actions remain paused until the owner approves one exact job. Production deployment resumes only through the private authenticated allowlisted runner.
7. Every completed job records a quality score and lesson candidates. The owner can add a 1–5 outcome rating, which is retrieved only for future work in the same project.

## Mobile decisions

The mobile decision route uses a signed, expiring, single-use bearer link for one job. Plaintext tokens are never persisted. Opening a link performs no action; only an explicit POST of Approve or Reject can consume it. The link is removed from browser history immediately after page load. When Telegram delivery is configured, AG OS automatically sends the link as soon as a job reaches `waiting_approval`; every notification consumes one separately scoped, revocable `mobile_approval_notification` approval use. Telegram credentials, chat identifiers, and signed links are excluded from persisted audit evidence.

Phone use requires a secure URL reachable by the owner's phone. AG OS accepts HTTPS or loopback only. Configuring Tailscale or authenticated HTTPS is deployment activation, not repository code, and requires its own exact approval.

## Failure behavior

- Planner, builder, critic, validation, and artifact-write failures close the job as `failed` or `needs_revision` and record an audit event.
- A paid provider request that was accepted by Anthropic remains counted even if its returned body is malformed or truncated.
- JSON and generated work-product files use atomic replace writes.
- Retry and replan are explicit, bounded owner actions that carry the previous error as context.
- Memory, lessons, skills, proposals, critiques, and outcomes are evidence only. None grants permission.

## Activation variables

- `AG_OS_AI_CRITIC_ENABLED=true`
- `AG_OS_AI_CRITIC_REQUIRED=true`
- `AG_OS_AI_CRITIC_APPROVAL_ID=<exact scoped approval>`
- `ANTHROPIC_CRITIC_MODEL=<approved model>`
- `ANTHROPIC_CRITIC_INPUT_COST_PER_MILLION_USD=<current configured price>`
- `ANTHROPIC_CRITIC_OUTPUT_COST_PER_MILLION_USD=<current configured price>`
- `AG_OS_MOBILE_APPROVAL_SIGNING_KEY=<at least 32 random bytes>`
- `AG_OS_MOBILE_APPROVAL_BASE_URL=<private HTTPS or loopback URL>`
- `AG_OS_MOBILE_APPROVAL_DELIVERY=telegram`
- `AG_OS_TELEGRAM_BOT_TOKEN=<root-only bot credential>`
- `AG_OS_TELEGRAM_CHAT_ID=<owner chat identifier>`
- `AG_OS_MOBILE_NOTIFICATION_APPROVAL_ID=<exact scoped messaging approval>`
- `AG_OS_NETLIFY_PREVIEW_SITE_ID=<allowlisted draft-preview site>`

Credentials and signing keys belong only in root-owned deployment environment files. They must never enter Git, audit records, dashboard data, or logs. The one-time decision token appears only in the URL fragment delivered to the owner's approved private chat and is removed from browser history on load.
