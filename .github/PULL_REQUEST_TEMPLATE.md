# AG OS Pull Request

## Purpose

<!-- One paragraph: what this PR does and why. -->

## Gatekeeper Checklist

- Expected base branch:
- Files changed (summary):
- Records created or modified:
- Approval locks created / expired / archived / revoked:
- Risk tier (R1-R5):
- Behavior changed (runtime):
- Validation changed:
- Dashboard changed:
- Security changed:

## Checks run locally

- [ ] `npm run dashboard:build`
- [ ] `npm run dashboard:check`
- [ ] `npm run validate`
- [ ] `npm run boot:check`
- [ ] `npm run security:scan`
- [ ] `node --test tests/*.test.mjs`
- [ ] `git diff --check`

## Safety confirmations

- [ ] No credentials, tokens, or secret values
- [ ] No live service calls
- [ ] No deployments
- [ ] No domain / DNS changes
- [ ] No paid actions
- [ ] No customer, private, or production data
- [ ] No Lead Gen production changes
- [ ] No AI Receptionist repo changes
- [ ] No Constitution changes
- [ ] No approval gates weakened
- [ ] No fake or demo records

## Owner approval

<!-- What decision the owner is being asked to make by merging this PR. -->
