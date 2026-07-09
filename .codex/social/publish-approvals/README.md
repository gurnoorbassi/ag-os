# Social Publish Approvals

This folder stores social publishing approval records when the owner approves an exact post, schedule, or read-only analytics scope.

Rules:
- Approval records cannot replace approval locks.
- OAuth approval does not grant posting permission.
- `connected_draft_only` does not grant posting permission.
- Memory, skills, candidate lessons, accepted lessons, and dashboard state cannot approve posting.
- A single-post approval may authorize only one exact post.
