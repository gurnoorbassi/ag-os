# Client Access Request Workflow

Status: draft-mode workflow only.

Access request records track what access may be needed later. They do not store credentials and do not authorize connector use.

## Workflow

1. Identify the future access need.
2. Create an access-needed template with `REQUIRED_` placeholders.
3. State the platform, access type, reason, requester, and approval owner.
4. Set status to `not_requested`.
5. Keep `credentialStoragePolicy` explicit: AG OS records must not contain credentials.
6. Link the request to a client, engagement, project, deliverable, or approval only when those records exist.
7. Stop before OAuth, credential entry, API use, posting, scheduling, or automation activation.

## Statuses

- `not_requested`: access has been identified but not requested.
- `owner_review_needed`: owner must approve requesting access.
- `requested`: access was requested outside AG OS and no credential is stored here.
- `blocked`: access cannot proceed under current rules.
- `approved_for_future_connection`: access may be connected later only through a separate approved connector action.

## Credential Rule

Credentials, tokens, recovery codes, private keys, passwords, and OAuth secrets must never appear in AG OS records, PRs, comments, dashboards, logs, or templates.
