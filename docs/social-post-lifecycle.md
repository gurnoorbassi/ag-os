# Social Post Lifecycle

Canonical post lifecycle states:

| State | Meaning |
| --- | --- |
| `draft` | Content exists as a draft only. |
| `owner_approved_draft` | Owner approved draft content, not publishing. |
| `ready_for_oauth` | Content can wait for account connection, but cannot publish. |
| `connected_draft_only` | Account connection exists, but posting remains blocked. |
| `ready_for_live_publish_approval` | Post can be submitted for exact owner publish approval. |
| `owner_approved_for_single_publish` | Exact post has owner approval for one publish action. |
| `publish_in_progress` | Publish operation is running under approved scope. |
| `published` | Exact post was published and recorded. |
| `publish_failed` | Publish attempt failed and must be audited. |
| `scheduled_pending_approval` | Schedule exists but lacks owner approval. |
| `scheduled` | Exact approved schedule exists. |
| `cancelled` | Post or schedule was cancelled. |
| `blocked` | A safety gate blocks the post. |

Draft approval never advances directly to live publishing.

The first AG Digitalz content sprint has 21 owner-approved draft posts. Those posts remain draft-only until exact publish approval exists.
