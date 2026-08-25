# Opportunity Director V1.1 live discovery

V1.1 preserves the accepted Opportunity Director architecture and adds one bounded, read-only public research cycle. Search and page retrieval implement provider-neutral `search(query)` and `fetchPublicPage(url)` interfaces. The concrete adapter is configured for a Brave-compatible search endpoint, but provider details do not leak into scoring, evidence normalization, research roles, or scheduling.

## Runtime boundary

A meaningful wake deterministically derives themes and queries from the owner objective, active theses, watches, and owner seeds. It considers at most 60 search results, fetches at most 20 public HTTPS pages, sends at most 12 normalized pages to synthesis, creates at most 10 candidates, and applies the seven specialized research roles to at most three candidates. Default cadence is eight hours with no more than three meaningful cycles per UTC day. Cheap scheduler ticks persist `skipped_no_change` with zero model cost.

Pages behind authentication, local/private hosts, credentials in URLs, copied page bodies, customer data, and sensitive personal information are rejected. Search credentials are sent only to the configured search endpoint and are never persisted or returned by the API. Public people remain `identified` until the owner explicitly confirms a relationship.

Every paid search or synthesis call reserves global Cost OS capacity before transport execution and finalizes actual or conservative cost afterward. Opportunity Director's USD $1.50 research-provider ceiling and USD $0.15 synthesis ceiling are subordinate to global daily, monthly, and per-task limits. The maximum combined configured ceiling for one cycle is USD $1.65. Actual provider spend is also constrained by the exact approval budget and configured per-search price.

## Configuration

Live public discovery is fail-closed and requires:

- `AG_OS_OPPORTUNITY_DISCOVERY_ENABLED=true`
- `AG_OS_OPPORTUNITY_SEARCH_ENDPOINT` set to the approved HTTPS search endpoint
- `AG_OS_OPPORTUNITY_SEARCH_KEY` supplied only through the runtime environment
- `AG_OS_OPPORTUNITY_SEARCH_COST_USD` set to the provider's per-search cost, or `0` for a genuinely free call
- for paid search, `AG_OS_OPPORTUNITY_RESEARCH_APPROVAL_ID` naming an active standing approval targeted to `public-research:brave-search`, allowing `public_opportunity_research`, with remaining uses and a positive maximum budget no greater than USD $1.50

Optional Claude synthesis additionally requires:

- `AG_OS_OPPORTUNITY_ANTHROPIC_ENABLED=true`
- the existing Anthropic runtime settings, including `ANTHROPIC_API_KEY`, model, and input/output pricing
- `AG_OS_OPPORTUNITY_ANTHROPIC_APPROVAL_ID` naming an active exact approval targeted to `anthropic:messages-api`, allowing `anthropic_opportunity_synthesis`, covering paid actions, with remaining uses and a positive per-use budget no greater than USD $0.15

`AG_OS_OPPORTUNITY_SCHEDULER_ENABLED=true` enables coordinator scheduling. `AG_OS_OPPORTUNITY_SCHEDULER_TICK_MS` may increase the tick interval; the coordinator enforces a minimum tick interval of 60 seconds and the Director's much slower meaningful-cycle cadence independently.

## Owner controls and non-permissions

The authenticated dashboard can wake the Director, seed a company/person/industry/problem/URL/observation/idea, confirm a public relationship, and record an outcome. These actions grant no permission for outreach, publishing, paid ads, account creation, contracts, deployment, external changes, or real-money movement. Any downstream protected validation remains separately owner-gated under its real action class.

## Mocked verification

Run `npm run opportunity:verify:v1-1`. Tests use injected transports only and cover provider search/fetch, URL and opportunity deduplication, query/page/candidate/deep-research caps, timeouts and provider failures, source normalization and unsupported-claim rejection, provenance, owner seeds, scheduling, stale watches, relationship confirmation, protected validation classification, signed P&L, persisted truth flags, and Cost OS cumulative/concurrent reservation behavior.

No live or paid request is authorized by this document or by the V1.1 implementation itself.
