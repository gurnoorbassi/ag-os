# Social Media System v1.1 Feature Plan

Status: planning package only.

Social Media System v1.1 should make the staged app easier to use for draft-only client operations without adding backend services, credentials, live social APIs, or automation activation.

## Build Priorities

1. Client config workflow
   - Show placeholder fields clearly.
   - Group client, brand, platform, handle, posting volume, content pillars, brand voice, and reporting cadence.
   - Keep real client data out until owner approval.

2. Content intake form UI
   - Collect draft-only content metadata.
   - Represent video/source asset slots without uploading private files.
   - Keep all fields local/static.

3. Content calendar view
   - Show draft dates and statuses.
   - Make scheduling blocked state visible.
   - Do not schedule or connect platform APIs.

4. Post package builder UI
   - Organize platform variants, hooks, captions, story/carousel/short-form fields, and approval notes.
   - Allow draft export only if static and local.

5. Approval queue status
   - Show pending, approved-for-draft, revision-needed, and blocked states.
   - Do not treat client approval as AG OS owner approval.

6. Weekly report draft
   - Show placeholder reporting cadence and sections.
   - Do not pull analytics APIs.

7. Blocked live actions panel
   - Keep live posting, scheduling, social OAuth, analytics, n8n activation, credentials, paid tools, and production deployment visibly blocked.

## Files Likely To Change In The Future Target Repo

- `README.md`
- `index.html`
- `src/main.js`
- `src/styles.css`
- `src/data/templates.js`
- `src/lib/safety.js`
- `src/lib/status.js`

Package files or build config should change only if the owner-approved execution package names them.

## Quality Bar

- static and lightweight
- no unnecessary dependencies
- responsive enough for laptop and mobile review
- clear zero-state and placeholder-state UX
- no live connector or credential path
- safety blocks visible from the first screen
- easy future Netlify staging validation

## Stop Conditions

Stop if the upgrade needs live social connection, credentials, posting, scheduling, analytics API usage, n8n activation, production deployment, domain or DNS changes, paid tools, real client private data, Lead Gen production changes, AI Receptionist production changes, Constitution changes, or changes outside the owner-approved file list.
