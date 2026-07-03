# AG OS Job Queue

This folder stores future AG OS job queue records.

Current status: foundation only.

Rules:
- Use templates until runtime exists.
- Do not store credentials, secrets, customer data, or production payloads.
- Do not trigger live services, deployments, or connector actions from this folder.
- A job record describes intended work state; it is not permission to execute gated work.
