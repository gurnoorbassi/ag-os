# Connector Registry

## Purpose

The Connector Registry tracks which external tool connectors are known to AG Digitalz OS and what each connector is allowed to do by default.

It is a policy registry, not a credential store. It must not contain secrets, tokens, private endpoints, customer data, or deployment instructions.

## Current Registry

```text
.codex/connectors/registry.json
```

Schema:

```text
schemas/connector-registry.schema.json
```

## Connected MCPs

The current foundation registry includes only MCP connectors exposed in Codex tool metadata:

- GitHub MCP
- n8n MCP
- Netlify MCP

These records describe allowed capabilities and approval gates. They do not grant new permissions and do not connect services from this repository.

## Base44

Base44 is available as a possible UI prototyping tool, but it is not listed as a connected connector because no Base44 MCP namespace was exposed during registry creation.

Base44 must stay in `availableButNotConnected` until a Base44 MCP is actually available and explicitly approved for registry promotion.

Base44 is not source of truth. GitHub remains source of truth. Base44 output must be exported or documented where possible before it can influence source-controlled implementation.

## Default Rules

By default, connectors may not:

- Store credentials
- Make live service calls
- Deploy
- Activate workflows
- Change domains
- Trigger paid actions
- Read or write production data

Any exception requires a future reviewed PR and explicit approval.

## Connector Promotion

To add or promote a connector:

1. Confirm the connector is exposed in Codex tool metadata.
2. Define safe default capabilities.
3. Define approval-required actions.
4. Define prohibited actions.
5. Update `.codex/connectors/registry.json`.
6. Run `npm run validate`.
7. Use the safe merge policy only if the change remains Tier 0 or Tier 1.
8. Stop for owner approval if the connector introduces credentials, live services, deployments, domain changes, paid actions, production data, or unclear scope.
