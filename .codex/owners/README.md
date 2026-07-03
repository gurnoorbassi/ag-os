# Owners

Owner and role records live here when AG OS needs source-controlled owner, delegate, reviewer, or role metadata.

Use this folder to define business owners, project owners, technical owners, security owners, cost owners, agent owners, and reviewers.

Do not store private contact details, credentials, customer data, production data, or personal sensitive data here.

This folder may contain zero owner records while the owner is represented by current task instruction and repository history. Any JSON owner record in this folder must follow `schemas/owner.schema.json` and is validated by `npm run validate`.
