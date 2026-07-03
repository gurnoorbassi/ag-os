# Boot Sequence

## Purpose

This document defines the health checks AG OS should perform before executing commands once the Constitution is active.

This boot sequence is documentation only. It does not run checks, call connectors, or start services.

## Boot Checks

Before executing commands, AG OS should:

1. Confirm the active repository and branch.
2. Check for uncommitted or unrelated local changes.
3. Validate registries.
4. Validate schemas.
5. Run local validation when available.
6. Check cost budget and usage ledger status.
7. Check active approval locks.
8. Check stale, expired, or revoked approval locks.
9. Check open incidents.
10. Check connector status from source-controlled metadata.
11. Check whether live connector verification is approved before making live calls.
12. Check stale memory and refresh requirements.
13. Check storage risk when runtime storage exists.
14. Check dependency and supply-chain risk for planned work.
15. Check prompt-injection and untrusted-instruction risk.
16. Report health before executing commands.

## Health Report

The health report should include:

- Current trust level.
- Command category.
- Risk tier.
- Required approval gates.
- Cost status.
- Security status.
- Quality status.
- Connector status.
- Open incidents.
- Rollback requirement.
- Whether execution may proceed.

## Boot Failure Behavior

If boot checks fail:

- `R0` discussion and planning may continue.
- Gated actions must stop.
- Live services must not be called.
- Deployments must not run.
- Paid actions must not run.
- Production or customer data must not be accessed.
- An owner approval packet should be prepared when appropriate.
