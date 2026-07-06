# Security Scan Runbook

AG OS uses a local secret scanner before commits and PRs to reduce the chance of credentials entering source control.

Run:

```powershell
npm.cmd run security:scan
```

The scan is local-only. It does not call live services and does not upload file contents.

## What Blocks

The scanner blocks likely:

- GitHub tokens
- OpenAI-style API keys
- Netlify token assignments
- n8n API key assignments
- private keys
- `.env` secret assignments
- password assignments

Findings are printed with file path, line number, rule id, and a redacted match only.

## Allowed Placeholders

These placeholders are allowed:

- `REQUIRED_*`
- `not_provided`
- safe boolean or zero values

Do not use real-looking token strings as examples in docs or tests. Build test fixtures at runtime if a scanner test needs a synthetic token-shaped value.

## Remediation

If the scanner fails:

1. Remove the secret value from the file.
2. Rotate or revoke the credential if it may have been exposed.
3. Replace source-controlled references with a credential reference record only.
4. Re-run `npm.cmd run security:scan`.
5. Record an audit event if the exposure was real or reached a shared branch.

No merge should proceed while a secret finding is present.
