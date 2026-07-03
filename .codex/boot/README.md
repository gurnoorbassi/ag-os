# AG OS Boot Sequence Runner

This folder stores future boot sequence check records.

Current status: foundation only.

Rules:
- Use templates until runtime exists.
- Boot checks are mandatory before command execution.
- Do not perform live service checks, deployments, connector actions, or credential access from this folder.
- Record blocked status when required context, validation, approvals, incidents, or cost checks are not clean.
