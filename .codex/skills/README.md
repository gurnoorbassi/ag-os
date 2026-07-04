# Skills

Reusable, evidence-cited procedures. One JSON record per skill, validated against `schemas/skill.schema.json`.

A skill records how AG OS does something well. It never grants permission: gated actions still require the approval demanded by the Constitution and action matrix.

Rules:

- Every skill must cite at least one proof record that actually exists in this repository.
- New skills enter as `status: "draft"`. Only owner-reviewed PR merge flips a skill to `active`.
- Contradicted skills are deprecated with the contradicting lesson cited, never silently deleted.

See `docs/skills-library.md` for the promotion path from lessons to skills.
