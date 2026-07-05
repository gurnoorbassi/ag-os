# Monitoring Foundation v1

Status: source-record-only foundation.

Monitoring Foundation v1 defines what AG OS should watch later, without calling live systems or making fixes. The current version reads only existing source-of-truth records.

## Monitoring Areas

- site uptime later
- Netlify deploy status later
- n8n workflow status later
- connector authorization status later
- failed jobs
- stale or expired approvals
- failed PR checks
- quality drops
- cost spikes
- blocked actions
- protected project boundaries

## v1 Read Scope

Allowed v1 inputs are local AG OS records only:

- approval locks
- audit events
- connector execution results
- cost ledgers
- quality scores
- critiques
- project registry
- capability registry
- dashboard read model
- boot-check output

No live connector call is part of Monitoring Foundation v1.

## Output Types

Monitoring may prepare templates for:

- monitoring checks
- incidents
- blocked actions

It must not create a real incident record unless owner approval specifically allows it.

## Stop Conditions

Stop immediately if monitoring requires live HTTP checks, Netlify API calls, n8n API calls, GitHub write actions, credential access, production changes, domain or DNS changes, paid tools, customer data, Lead Gen production changes, AI Receptionist production changes, or Constitution changes.
