window.AG_OS_DASHBOARD_DATA = {
  "meta": {
    "title": "AG OS Control Center",
    "version": 1,
    "mode": "read_only",
    "dataSource": "source-controlled AG OS repository records",
    "generatedBy": "scripts/build-dashboard.mjs"
  },
  "constitution": {
    "status": "Active Constitution v1.0.",
    "version": "v1.0",
    "activationDate": "2026-07-03",
    "source": "docs/ag-os-constitution-v1.md"
  },
  "systemStatus": {
    "bootStatus": "ready",
    "validationStatus": "available via npm.cmd run validate",
    "safetyPosture": "read_only_no_live_actions",
    "blockedActions": [
      "Production deployment",
      "Domain or DNS changes",
      "Custom domains",
      "Paid services",
      "Credentials or secrets in records",
      "Production/customer/client data",
      "Social posting or scheduling",
      "Social OAuth/account connection",
      "n8n workflow activation",
      "Lead Gen production changes",
      "AI Receptionist repo changes",
      "Constitution changes"
    ],
    "activeWarnings": [],
    "sourceRecords": [
      "scripts/boot-check.mjs",
      "scripts/validate-foundation.mjs",
      "docs/ag-os-constitution-v1.md"
    ]
  },
  "projectRegistry": {
    "status": "active",
    "count": 4,
    "source": ".codex/projects/registry.json",
    "projects": [
      {
        "id": "project-ag-os",
        "name": "AG OS",
        "status": "active",
        "managementMode": "core_operating_system",
        "projectType": "operating_system",
        "riskLevel": "medium",
        "owner": "owner-gurnoor-bassi",
        "recordPath": "README.md",
        "boundary": "Canonical AG OS source-of-truth repository and dashboard/control-plane records."
      },
      {
        "id": "project-lead-generation-system",
        "name": "Lead Generation System",
        "status": "complete",
        "managementMode": "observe_only",
        "projectType": "product_project",
        "riskLevel": "high",
        "owner": "owner-gurnoor-bassi",
        "recordPath": ".codex/projects/lead-generation-system.json",
        "boundary": "No source, VPS, Postgres, n8n, domain, DNS, deployment, credential, production data, or customer data changes."
      },
      {
        "id": "project-ag-digitalz-ai-receptionist",
        "name": "AG Digitalz AI Receptionist",
        "status": "active",
        "managementMode": "active_build",
        "projectType": "product_project",
        "riskLevel": "medium",
        "owner": "owner-gurnoor-bassi",
        "recordPath": ".codex/projects/ag-digitalz-ai-receptionist.json",
        "boundary": "Separate product project; no live service status inferred beyond repository records."
      },
      {
        "id": "project-social-media-management-system-v1",
        "name": "Social Media Management System v1",
        "status": "active",
        "managementMode": "managed_staging",
        "projectType": "product_project",
        "riskLevel": "medium",
        "owner": "owner-gurnoor-bassi",
        "recordPath": ".codex/projects/social-media-management-system-v1.json",
        "boundary": "Do not create or mutate a repository, branch, file set, or pull request outside a separately approved scope."
      },
      {
        "id": "project-ag-os-coordinator-runtime",
        "name": "AG OS Coordinator Runtime",
        "status": "active",
        "managementMode": "managed_staging",
        "projectType": "ag_os_core",
        "riskLevel": "high",
        "owner": "owner-gurnoor-bassi",
        "recordPath": ".codex/projects/ag-os-coordinator-runtime.json",
        "boundary": "Do not deploy without exact approval naming the target and source commit."
      }
    ]
  },
  "leadGenerationSystem": {
    "id": "project-lead-generation-system",
    "name": "Lead Generation System",
    "status": "complete",
    "managementMode": "observe_only",
    "projectType": "product_project",
    "riskLevel": "high",
    "owner": "owner-gurnoor-bassi",
    "recordPath": ".codex/projects/lead-generation-system.json",
    "boundary": "No source, VPS, Postgres, n8n, domain, DNS, deployment, credential, production data, or customer data changes."
  },
  "aiReceptionist": {
    "id": "project-ag-digitalz-ai-receptionist",
    "name": "AG Digitalz AI Receptionist",
    "status": "active",
    "managementMode": "active_build",
    "projectType": "product_project",
    "riskLevel": "medium",
    "owner": "owner-gurnoor-bassi",
    "recordPath": ".codex/projects/ag-digitalz-ai-receptionist.json",
    "boundary": "Separate product project; no live service status inferred beyond repository records."
  },
  "socialMediaSystem": {
    "id": "project-social-media-management-system-v1",
    "name": "Social Media Management System v1",
    "status": "active",
    "managementMode": "managed_staging",
    "projectType": "product_project",
    "riskLevel": "medium",
    "owner": "owner-gurnoor-bassi",
    "recordPath": ".codex/projects/social-media-management-system-v1.json",
    "boundary": "Do not create or mutate a repository, branch, file set, or pull request outside a separately approved scope.",
    "currentVersion": "v1.8 manual posting pack",
    "lifecycleStatus": "Manual posting pack merged and staged; OAuth and AG OS automated posting remain blocked",
    "targetRepo": "gurnoorbassi/ag-social-media-management-system",
    "targetPullRequestUrl": "https://github.com/gurnoorbassi/ag-social-media-management-system/pull/9",
    "targetPullRequestMerged": true,
    "targetMergeSha": "eaa05e5fcf9fa64e2ae85ace52f7c0949e00841d",
    "reviewedHeadSha": "1f4b35d1db6b36b0a67cd172d0d2e71bd3b85a2c",
    "stagingUrl": "https://ag-social-media-management-system-staging.netlify.app",
    "stagingStatus": "ready",
    "latestDeployId": "6a4ac78160b0ee09bacf9015",
    "latestDeploySourceSha": "eaa05e5fcf9fa64e2ae85ace52f7c0949e00841d",
    "latestDeployVerifiedAt": "2026-07-05T21:08:30Z",
    "latestDeployHttpStatus": 200,
    "netlifyDeployContext": "production",
    "stagingInterpretation": "This is the primary deploy context of the dedicated Netlify staging-only site, not an AG Digitalz production domain, customer production domain, or production customer system.",
    "currentMode": "draft/staging only",
    "firstClientReadiness": {
      "status": "active_draft_configured",
      "sourceRecord": ".codex/client-management/clients/client-ag-digitalz-internal.json",
      "activeClientRecordsCreated": true,
      "activeRecordCount": 14,
      "missingRequiredFieldCount": 0,
      "missingRequiredFields": [],
      "canCreateActiveRecords": true,
      "currentMode": "draft/staging only",
      "nextOwnerDecision": "Provide official platform handles or approve a separate Social OAuth readiness package. OAuth, posting, scheduling, analytics, and n8n activation remain blocked.",
      "safetyDefaults": [
        "platform accounts remain not_connected",
        "posting mode remains draft_only",
        "approval_required remains true",
        "live_posting_blocked remains true",
        "no credentials or social OAuth",
        "no posting, scheduling, analytics API, or n8n activation"
      ]
    },
    "safetyBlocks": {
      "livePostingBlocked": true,
      "socialOauthConnected": false,
      "schedulingBlocked": true,
      "analyticsBlocked": true,
      "n8nLiveActivationBlocked": true,
      "clientConfigAdded": true
    },
    "contentSprint": {
      "sprintId": "content-sprint-ag-digitalz-first-content-sprint-v1",
      "status": "owner_approved_draft_content_staged_oauth_readiness_prepared",
      "mode": "draft_only",
      "targetRepo": "gurnoorbassi/ag-social-media-management-system",
      "targetBranch": "ag-os/ag-digitalz-draft-approval-v1",
      "targetPullRequestUrl": "https://github.com/gurnoorbassi/ag-social-media-management-system/pull/6",
      "targetPullRequestNumber": 6,
      "targetHeadSha": "4a8b28972ae5f5ddf733d149fcd8048ddbba83a9",
      "calendarDays": 7,
      "draftPostPackageCount": 21,
      "weeklyReportDraftCount": 1,
      "postsReviewedCount": 21,
      "postsRevisedCount": 21,
      "approvedDraftCount": 21,
      "ownerApprovedDraftCount": 21,
      "weeklyReportApprovalStatus": "owner_approved_draft",
      "needsRevisionCount": 0,
      "blockedByMissingProofCount": 0,
      "blockedByMissingHandleCount": 0,
      "pendingDraftApprovalCount": 0,
      "ownerDraftApproval": {
        "status": "owner_approved_draft",
        "approvedAt": "2026-07-05T06:32:26Z",
        "approvedBy": "owner-gurnoor-bassi",
        "scope": "Owner approved 21 revised post packages and one weekly report as draft content only.",
        "doesNotAuthorize": [
          "live_posting",
          "scheduling",
          "social_oauth",
          "account_connection",
          "analytics_api",
          "dms_or_comments",
          "n8n_activation"
        ],
        "nextDecision": "Provide official handles or approve a separate Social OAuth readiness package before any account connection work."
      },
      "platforms": [
        {
          "platform": "Instagram",
          "handle": "@agdigitalz",
          "handleStatus": "public_handle_provided",
          "connectionStatus": "not_connected",
          "postingMode": "draft_only",
          "approvalRequired": true,
          "livePostingBlocked": true,
          "credentialsStored": false
        },
        {
          "platform": "TikTok",
          "handle": "not_provided",
          "handleStatus": "pending_owner_input",
          "connectionStatus": "not_connected",
          "postingMode": "draft_only",
          "approvalRequired": true,
          "livePostingBlocked": true,
          "credentialsStored": false
        },
        {
          "platform": "YouTube Shorts",
          "handle": "not_provided",
          "handleStatus": "pending_owner_input",
          "connectionStatus": "not_connected",
          "postingMode": "draft_only",
          "approvalRequired": true,
          "livePostingBlocked": true,
          "credentialsStored": false
        },
        {
          "platform": "LinkedIn",
          "handle": "not_provided",
          "handleStatus": "pending_owner_input",
          "connectionStatus": "not_connected",
          "postingMode": "draft_only",
          "approvalRequired": true,
          "livePostingBlocked": true,
          "credentialsStored": false
        }
      ],
      "safety": {
        "socialOauthConnected": false,
        "credentialsStored": false,
        "postingTriggered": false,
        "schedulingTriggered": false,
        "analyticsApiUsed": false,
        "dmOrCommentUsed": false,
        "n8nActivated": false,
        "paidToolsUsed": false,
        "productionDeployTriggered": false,
        "domainOrDnsChanged": false,
        "leadGenTouched": false,
        "aiReceptionistTouched": false,
        "constitutionChanged": false,
        "acceptedLessonsCreated": false,
        "permanentMemoryCreated": false
      },
      "updatedAt": "2026-07-05T08:30:00Z",
      "recordPath": ".codex/client-management/content-sprints/content-sprint-ag-digitalz-first-content-sprint-v1.json",
      "livePostingBlocked": true,
      "schedulingBlocked": true,
      "socialOauthConnected": false,
      "credentialsStored": false,
      "analyticsApiUsed": false,
      "n8nActivated": false
    },
    "firstClient": {
      "clientId": "client-ag-digitalz-internal",
      "clientName": "AG Digitalz",
      "status": "active_draft",
      "brandNames": [
        "AG Digitalz"
      ],
      "systemsPurchased": [
        "Social Media Management System v1"
      ],
      "privacyLevel": "internal",
      "recordPath": ".codex/client-management/clients/client-ag-digitalz-internal.json"
    },
    "sourceRecords": [
      ".codex/projects/social-media-management-system-v1.json",
      ".codex/connectors/connector-exec-20260704-ag-digitalz-draft-approval-build-live-result.json",
      ".codex/connectors/connector-exec-20260704-ag-digitalz-first-content-sprint-build-live-result.json",
      ".codex/connectors/connector-exec-20260704-target-pr-merge-ag-digitalz-first-content-sprint-v1-live-result.json",
      ".codex/connectors/connector-exec-20260704-ag-digitalz-first-content-sprint-netlify-staging-live-result.json",
      ".codex/connectors/connector-exec-20260704-ag-digitalz-content-review-build-live-result.json",
      ".codex/connectors/connector-exec-20260704-target-pr-merge-ag-digitalz-content-review-v1-live-result.json",
      ".codex/connectors/connector-exec-20260704-ag-digitalz-content-review-netlify-staging-live-result.json",
      ".codex/connectors/connector-exec-20260705-social-media-interactive-draft-ui-build-live-result.json",
      ".codex/connectors/connector-exec-20260705-social-media-interactive-draft-ui-netlify-staging-live-result.json",
      ".codex/connectors/connector-exec-20260705-ag-digitalz-instagram-handle-build-live-result.json",
      ".codex/connectors/connector-exec-20260705-ag-digitalz-instagram-handle-netlify-staging-live-result.json",
      ".codex/connectors/connector-exec-20260705-ag-digitalz-manual-posting-pack-v1-build-live-result.json",
      ".codex/connectors/connector-exec-20260705-ag-digitalz-manual-posting-pack-v1-netlify-staging-live-result.json",
      ".codex/connectors/connector-exec-20260704-target-pr-merge-ag-digitalz-draft-approval-v1-live-result.json",
      ".codex/connectors/connector-exec-20260705-ag-digitalz-manual-posting-pack-v1-netlify-staging-live-result.json",
      ".codex/client-management/content-sprints/content-sprint-ag-digitalz-first-content-sprint-v1.json"
    ]
  },
  "connectorRegistry": {
    "status": "foundation",
    "connectedCount": 3,
    "connectors": [
      "GitHub MCP: connected",
      "n8n MCP: connected",
      "Netlify MCP: connected"
    ]
  },
  "commandRegistry": {
    "status": "foundation",
    "categoryCount": 11,
    "gatedCategories": [
      "deploy_staging: approval-gated",
      "deploy_production: approval-gated",
      "connect_service: approval-gated",
      "change_domain: approval-gated",
      "send_message: approval-gated",
      "stop_all: approval-gated",
      "rollback: approval-gated"
    ]
  },
  "costOs": {
    "status": "foundation",
    "monthlyMax": "USD $50",
    "dailyMax": "Daily max: USD $10",
    "perTaskMax": "Per-task max: USD $5",
    "paidTools": "Paid tools require owner approval"
  },
  "capabilityRegistry": {
    "status": "active",
    "count": 9,
    "allowedTypes": [
      "discussion: local-safe capability type",
      "planning: local-safe capability type",
      "local_build: local-safe capability type",
      "validation: local-safe capability type",
      "registry_management: local-safe capability type",
      "documentation: local-safe capability type",
      "approval_packet: local-safe capability type",
      "connector_execution: approval-gated capability type"
    ],
    "proven": [
      {
        "id": "capability-github-private-repo-creation-approved",
        "name": "GitHub private repository creation with approval",
        "status": "proven",
        "riskTier": "R4",
        "approvalRequired": true,
        "lastProvenDate": "2026-07-03",
        "proofRecords": [
          ".codex/approvals/archive/approval-20260703-github-repo-create.json",
          ".codex/audit/audit-20260703-github-repo-create-owner-approved.json",
          ".codex/audit/audit-20260703-github-repo-create-executed.json",
          ".codex/connectors/connector-exec-20260703-github-repo-create-live-result.json"
        ],
        "blockedCapabilities": [
          "production deployment",
          "domain or DNS changes",
          "custom domains",
          "paid tools",
          "credential handling",
          "production/customer data handling"
        ],
        "boundaries": [
          "Proven only for creating one private GitHub repository after owner approval.",
          "Does not authorize creating additional repositories without a new approval lock.",
          "Does not authorize deployment, Netlify connection, n8n workflow changes, domain/DNS changes, paid tools, credentials, or production/customer data."
        ]
      },
      {
        "id": "capability-github-branch-pr-creation-approved",
        "name": "GitHub branch and pull request creation with approval",
        "status": "proven",
        "riskTier": "R4",
        "approvalRequired": true,
        "lastProvenDate": "2026-07-04",
        "proofRecords": [
          ".codex/approvals/approval-20260704-github-builder-pr.json",
          ".codex/audit/audit-20260704-github-builder-pr-approval.json",
          ".codex/audit/audit-20260704-github-builder-pr-executed.json",
          ".codex/connectors/connector-exec-20260704-github-builder-pr-live-result.json",
          ".codex/costs/cost-ledger-20260704-github-builder-pr.json"
        ],
        "blockedCapabilities": [
          "unapproved repository edits",
          "automatic PR merge",
          "deployment",
          "domain or DNS changes",
          "tracking scripts",
          "live form wiring"
        ],
        "boundaries": [
          "Proven only for creating one branch, adding/updating approved starter files, and opening one PR in the test repository.",
          "Does not authorize merging the PR without separate approval.",
          "Does not authorize deployments, Netlify connection, n8n activation, domain/DNS changes, paid tools, credentials, tracking scripts, live forms, or production/customer data."
        ]
      },
      {
        "id": "capability-target-pr-review-critique-quality-score",
        "name": "Target repository PR review with critique and quality score",
        "status": "proven",
        "riskTier": "R2",
        "approvalRequired": true,
        "lastProvenDate": "2026-07-04",
        "proofRecords": [
          ".codex/audit/audit-runtime-target-pr-review-construction-website-20260704.json",
          ".codex/critiques/critique-runtime-target-pr-review-construction-website-20260704.json",
          ".codex/quality-scores/quality-score-runtime-target-pr-review-construction-website-20260704.json",
          ".codex/costs/cost-ledger-runtime-target-pr-review-construction-website-20260704.json"
        ],
        "blockedCapabilities": [
          "automatic target PR merge",
          "accepted lesson creation",
          "permanent memory creation",
          "production/customer data review without explicit approval"
        ],
        "boundaries": [
          "Proven for advisory review of a target repo PR with source-controlled audit, critique, quality score, and candidate lesson records.",
          "Critique output is advisory and cannot approve live action.",
          "Quality score status remains candidate unless separately promoted by an approved process."
        ]
      },
      {
        "id": "capability-target-pr-merge-approved",
        "name": "Target repository PR merge with approval",
        "status": "proven",
        "riskTier": "R4",
        "approvalRequired": true,
        "lastProvenDate": "2026-07-04",
        "proofRecords": [
          ".codex/approvals/approval-20260704-target-pr-merge-construction-website.json",
          ".codex/audit/audit-20260704-target-pr-merge-approval.json",
          ".codex/audit/audit-20260704-target-pr-merge-executed.json",
          ".codex/connectors/connector-exec-20260704-target-pr-merge-live-result.json",
          ".codex/costs/cost-ledger-20260704-target-pr-merge-construction-website.json"
        ],
        "blockedCapabilities": [
          "unreviewed target PR merge",
          "automatic merge after critique",
          "deployment",
          "domain or DNS changes",
          "production/customer data handling"
        ],
        "boundaries": [
          "Proven only for merging one reviewed PR after AG OS review records were merged into source of truth.",
          "Requires confirming reviewed files and head SHA are unchanged before merge.",
          "Does not authorize deployment, Netlify activation, domain/DNS changes, n8n changes, paid tools, credentials, or production/customer data."
        ]
      },
      {
        "id": "capability-netlify-staging-deploy-approved",
        "name": "Netlify staging deployment on dedicated staging-only site with approval",
        "status": "proven",
        "riskTier": "R4",
        "approvalRequired": true,
        "lastProvenDate": "2026-07-04",
        "proofRecords": [
          ".codex/approvals/approval-20260704-netlify-staging-test-construction.json",
          ".codex/audit/audit-20260704-netlify-staging-approval.json",
          ".codex/audit/audit-20260704-netlify-staging-executed.json",
          ".codex/connectors/connector-exec-20260704-netlify-staging-live-result.json",
          ".codex/costs/cost-ledger-20260704-netlify-staging-test-construction.json"
        ],
        "blockedCapabilities": [
          "production deployment",
          "custom domains",
          "domain or DNS changes",
          "paid Netlify features",
          "environment variable value management",
          "customer production system deployment"
        ],
        "boundaries": [
          "Proven only for a dedicated staging-only Netlify site.",
          "Netlify production context is recorded only as the primary context of the dedicated staging-only site.",
          "Does not authorize AG Digitalz production deployment, custom domains, DNS changes, paid Netlify features, environment variable values, forms, tracking, or production/customer data."
        ]
      },
      {
        "id": "capability-n8n-inactive-draft-workflow-export-approved",
        "name": "n8n inactive draft workflow creation and export with approval",
        "status": "proven",
        "riskTier": "R4",
        "approvalRequired": true,
        "lastProvenDate": "2026-07-04",
        "proofRecords": [
          ".codex/approvals/approval-20260704-n8n-draft-workflow-proof.json",
          ".codex/audit/audit-20260704-n8n-draft-workflow-executed.json",
          ".codex/connectors/connector-exec-20260704-n8n-draft-workflow-live-result.json",
          ".codex/costs/cost-ledger-20260704-n8n-draft-workflow-proof-success.json",
          ".codex/n8n/exports/n8n-export-20260704-construction-lead-draft-proof-success.json"
        ],
        "blockedCapabilities": [
          "n8n workflow activation",
          "n8n credential connection",
          "outbound email/SMS/WhatsApp",
          "real external API workflow calls",
          "production n8n workflow management",
          "Lead Gen workflow management",
          "AI Receptionist workflow management"
        ],
        "boundaries": [
          "Proven only for creating one inactive draft workflow and exporting source-controlled workflow JSON.",
          "Workflow active status must remain false.",
          "Does not authorize workflow activation, workflow credentials, outbound email/SMS/WhatsApp, real external API calls, production n8n workflow changes, Lead Gen workflow changes, or AI Receptionist workflow changes."
        ]
      },
      {
        "id": "capability-quality-score-generation",
        "name": "Quality score generation",
        "status": "proven",
        "riskTier": "R1",
        "approvalRequired": false,
        "lastProvenDate": "2026-07-04",
        "proofRecords": [
          ".codex/quality-scores/quality-score-20260704-runtime-closed-loop-crm-proof-20260704.json",
          ".codex/quality-scores/quality-score-20260704-runtime-quality-loop-crm-20260704.json",
          ".codex/quality-scores/quality-score-runtime-target-pr-review-construction-website-20260704.json"
        ],
        "blockedCapabilities": [
          "automatic live action approval",
          "accepted lesson creation",
          "permanent memory creation",
          "production/customer data scoring without explicit approval"
        ],
        "boundaries": [
          "Proven for source-controlled candidate quality score records.",
          "Quality scores cannot approve live actions, bypass gates, create accepted lessons, or write permanent memory.",
          "Scores remain advisory unless a separate approved workflow promotes their use."
        ]
      },
      {
        "id": "capability-lesson-candidate-generation",
        "name": "Lesson candidate generation",
        "status": "proven",
        "riskTier": "R1",
        "approvalRequired": false,
        "lastProvenDate": "2026-07-04",
        "proofRecords": [
          ".codex/memory/lessons/candidates/lesson-20260704-runtime-closed-loop-crm-proof-20260704-01.json",
          ".codex/memory/lessons/candidates/lesson-20260704-runtime-closed-loop-crm-proof-20260704-02.json",
          ".codex/memory/lessons/candidates/lesson-20260704-runtime-closed-loop-crm-proof-20260704-03.json",
          ".codex/memory/lessons/candidates/lesson-20260704-runtime-quality-loop-crm-20260704-01.json",
          ".codex/memory/lessons/candidates/lesson-20260704-runtime-quality-loop-crm-20260704-02.json",
          ".codex/memory/lessons/candidates/lesson-20260704-runtime-quality-loop-crm-20260704-03.json"
        ],
        "blockedCapabilities": [
          "automatic accepted lessons",
          "automatic permanent memory",
          "lesson-based approval bypass",
          "security or cost rule weakening"
        ],
        "boundaries": [
          "Proven only for candidate lesson records.",
          "Candidate lessons are not accepted truth and are not permanent memory.",
          "Candidate lessons cannot relax security rules, approval gates, cost limits, or live-action restrictions."
        ]
      },
      {
        "id": "capability-critic-review-generation",
        "name": "Critic review generation",
        "status": "proven",
        "riskTier": "R1",
        "approvalRequired": false,
        "lastProvenDate": "2026-07-04",
        "proofRecords": [
          ".codex/critiques/critique-20260704-runtime-closed-loop-crm-proof-20260704.json",
          ".codex/critiques/critique-runtime-target-pr-review-construction-website-20260704.json"
        ],
        "blockedCapabilities": [
          "critic-approved live action",
          "approval gate bypass",
          "direct plan mutation by critic",
          "accepted lesson creation",
          "permanent memory creation"
        ],
        "boundaries": [
          "Proven only for advisory critique records.",
          "Critique is not approval and cannot bypass approval gates.",
          "Critic cannot edit plans directly, activate live actions, create accepted lessons, or write permanent memory."
        ]
      }
    ],
    "provenCount": 9,
    "draftOnly": [
      {
        "id": "capability-target-pr-review-critique-quality-score",
        "name": "Target repository PR review with critique and quality score",
        "status": "proven",
        "riskTier": "R2",
        "approvalRequired": true,
        "lastProvenDate": "2026-07-04",
        "proofRecords": [
          ".codex/audit/audit-runtime-target-pr-review-construction-website-20260704.json",
          ".codex/critiques/critique-runtime-target-pr-review-construction-website-20260704.json",
          ".codex/quality-scores/quality-score-runtime-target-pr-review-construction-website-20260704.json",
          ".codex/costs/cost-ledger-runtime-target-pr-review-construction-website-20260704.json"
        ],
        "blockedCapabilities": [
          "automatic target PR merge",
          "accepted lesson creation",
          "permanent memory creation",
          "production/customer data review without explicit approval"
        ],
        "boundaries": [
          "Proven for advisory review of a target repo PR with source-controlled audit, critique, quality score, and candidate lesson records.",
          "Critique output is advisory and cannot approve live action.",
          "Quality score status remains candidate unless separately promoted by an approved process."
        ]
      },
      {
        "id": "capability-n8n-inactive-draft-workflow-export-approved",
        "name": "n8n inactive draft workflow creation and export with approval",
        "status": "proven",
        "riskTier": "R4",
        "approvalRequired": true,
        "lastProvenDate": "2026-07-04",
        "proofRecords": [
          ".codex/approvals/approval-20260704-n8n-draft-workflow-proof.json",
          ".codex/audit/audit-20260704-n8n-draft-workflow-executed.json",
          ".codex/connectors/connector-exec-20260704-n8n-draft-workflow-live-result.json",
          ".codex/costs/cost-ledger-20260704-n8n-draft-workflow-proof-success.json",
          ".codex/n8n/exports/n8n-export-20260704-construction-lead-draft-proof-success.json"
        ],
        "blockedCapabilities": [
          "n8n workflow activation",
          "n8n credential connection",
          "outbound email/SMS/WhatsApp",
          "real external API workflow calls",
          "production n8n workflow management",
          "Lead Gen workflow management",
          "AI Receptionist workflow management"
        ],
        "boundaries": [
          "Proven only for creating one inactive draft workflow and exporting source-controlled workflow JSON.",
          "Workflow active status must remain false.",
          "Does not authorize workflow activation, workflow credentials, outbound email/SMS/WhatsApp, real external API calls, production n8n workflow changes, Lead Gen workflow changes, or AI Receptionist workflow changes."
        ]
      },
      {
        "id": "capability-quality-score-generation",
        "name": "Quality score generation",
        "status": "proven",
        "riskTier": "R1",
        "approvalRequired": false,
        "lastProvenDate": "2026-07-04",
        "proofRecords": [
          ".codex/quality-scores/quality-score-20260704-runtime-closed-loop-crm-proof-20260704.json",
          ".codex/quality-scores/quality-score-20260704-runtime-quality-loop-crm-20260704.json",
          ".codex/quality-scores/quality-score-runtime-target-pr-review-construction-website-20260704.json"
        ],
        "blockedCapabilities": [
          "automatic live action approval",
          "accepted lesson creation",
          "permanent memory creation",
          "production/customer data scoring without explicit approval"
        ],
        "boundaries": [
          "Proven for source-controlled candidate quality score records.",
          "Quality scores cannot approve live actions, bypass gates, create accepted lessons, or write permanent memory.",
          "Scores remain advisory unless a separate approved workflow promotes their use."
        ]
      },
      {
        "id": "capability-lesson-candidate-generation",
        "name": "Lesson candidate generation",
        "status": "proven",
        "riskTier": "R1",
        "approvalRequired": false,
        "lastProvenDate": "2026-07-04",
        "proofRecords": [
          ".codex/memory/lessons/candidates/lesson-20260704-runtime-closed-loop-crm-proof-20260704-01.json",
          ".codex/memory/lessons/candidates/lesson-20260704-runtime-closed-loop-crm-proof-20260704-02.json",
          ".codex/memory/lessons/candidates/lesson-20260704-runtime-closed-loop-crm-proof-20260704-03.json",
          ".codex/memory/lessons/candidates/lesson-20260704-runtime-quality-loop-crm-20260704-01.json",
          ".codex/memory/lessons/candidates/lesson-20260704-runtime-quality-loop-crm-20260704-02.json",
          ".codex/memory/lessons/candidates/lesson-20260704-runtime-quality-loop-crm-20260704-03.json"
        ],
        "blockedCapabilities": [
          "automatic accepted lessons",
          "automatic permanent memory",
          "lesson-based approval bypass",
          "security or cost rule weakening"
        ],
        "boundaries": [
          "Proven only for candidate lesson records.",
          "Candidate lessons are not accepted truth and are not permanent memory.",
          "Candidate lessons cannot relax security rules, approval gates, cost limits, or live-action restrictions."
        ]
      },
      {
        "id": "capability-critic-review-generation",
        "name": "Critic review generation",
        "status": "proven",
        "riskTier": "R1",
        "approvalRequired": false,
        "lastProvenDate": "2026-07-04",
        "proofRecords": [
          ".codex/critiques/critique-20260704-runtime-closed-loop-crm-proof-20260704.json",
          ".codex/critiques/critique-runtime-target-pr-review-construction-website-20260704.json"
        ],
        "blockedCapabilities": [
          "critic-approved live action",
          "approval gate bypass",
          "direct plan mutation by critic",
          "accepted lesson creation",
          "permanent memory creation"
        ],
        "boundaries": [
          "Proven only for advisory critique records.",
          "Critique is not approval and cannot bypass approval gates.",
          "Critic cannot edit plans directly, activate live actions, create accepted lessons, or write permanent memory."
        ]
      }
    ],
    "draftOnlyCount": 5,
    "blocked": [
      "production deployment",
      "domain or DNS changes",
      "custom domains",
      "paid tools",
      "credential handling",
      "production/customer data handling",
      "unapproved repository edits",
      "automatic PR merge",
      "deployment",
      "tracking scripts",
      "live form wiring",
      "automatic target PR merge",
      "accepted lesson creation",
      "permanent memory creation",
      "production/customer data review without explicit approval",
      "unreviewed target PR merge",
      "automatic merge after critique",
      "paid Netlify features",
      "environment variable value management",
      "customer production system deployment",
      "n8n workflow activation",
      "n8n credential connection",
      "outbound email/SMS/WhatsApp",
      "real external API workflow calls",
      "production n8n workflow management",
      "Lead Gen workflow management",
      "AI Receptionist workflow management",
      "automatic live action approval",
      "production/customer data scoring without explicit approval",
      "automatic accepted lessons",
      "automatic permanent memory",
      "lesson-based approval bypass",
      "security or cost rule weakening",
      "critic-approved live action",
      "approval gate bypass",
      "direct plan mutation by critic"
    ],
    "blockedCount": 36
  },
  "watchdog": {
    "status": "foundation",
    "monitoring": "Disabled",
    "plannedChecks": [
      "local_validation: planned",
      "ci_status_review: planned",
      "registry_consistency: planned",
      "stale_memory_review: planned",
      "cost_budget_review: planned",
      "security_policy_review: planned"
    ]
  },
  "memoryOs": {
    "status": "foundation",
    "shortTermDays": 30,
    "rules": [
      "Secrets blocked",
      "Customer data blocked",
      "Production data blocked"
    ]
  },
  "qualityOs": {
    "status": "foundation",
    "rules": [
      "Quality rule not recorded",
      "Owner production review not recorded",
      "Validation required before merge"
    ]
  },
  "securityOs": {
    "status": "foundation",
    "rules": [
      "Secrets block merge",
      "Least privilege not recorded",
      "Production data block not recorded"
    ]
  },
  "clientManagement": {
    "directoryExists": true,
    "clientCount": 1,
    "engagementCount": 1,
    "deliverableCount": 6,
    "contentSprintCount": 1,
    "accessRequestCount": 4,
    "pendingApprovalCount": 2,
    "clients": [
      {
        "clientId": "client-ag-digitalz-internal",
        "clientName": "AG Digitalz",
        "status": "active_draft",
        "brandNames": [
          "AG Digitalz"
        ],
        "systemsPurchased": [
          "Social Media Management System v1"
        ],
        "privacyLevel": "internal",
        "recordPath": ".codex/client-management/clients/client-ag-digitalz-internal.json"
      }
    ],
    "engagements": [
      {
        "engagementId": "engagement-ag-digitalz-social-media-v1",
        "clientId": "client-ag-digitalz-internal",
        "projectId": "project-social-media-management-system-v1",
        "systemType": "social_media_management_system",
        "currentPhase": "staging",
        "paymentStatus": "internal",
        "recordPath": ".codex/client-management/engagements/engagement-ag-digitalz-social-media-v1.json"
      }
    ],
    "deliverables": [
      {
        "deliverableId": "deliverable-ag-digitalz-approval-record",
        "engagementId": "engagement-ag-digitalz-social-media-v1",
        "deliverableType": "approval_record",
        "status": "draft",
        "reviewStatus": "not_reviewed",
        "recordPath": ".codex/client-management/deliverables/deliverable-ag-digitalz-approval-record.json"
      },
      {
        "deliverableId": "deliverable-ag-digitalz-client-config",
        "engagementId": "engagement-ag-digitalz-social-media-v1",
        "deliverableType": "client_config",
        "status": "draft",
        "reviewStatus": "not_reviewed",
        "recordPath": ".codex/client-management/deliverables/deliverable-ag-digitalz-client-config.json"
      },
      {
        "deliverableId": "deliverable-ag-digitalz-content-calendar",
        "engagementId": "engagement-ag-digitalz-social-media-v1",
        "deliverableType": "content_calendar",
        "status": "ready_for_review",
        "reviewStatus": "pass",
        "recordPath": ".codex/client-management/deliverables/deliverable-ag-digitalz-content-calendar.json"
      },
      {
        "deliverableId": "deliverable-ag-digitalz-post-package",
        "engagementId": "engagement-ag-digitalz-social-media-v1",
        "deliverableType": "post_package",
        "status": "approved",
        "reviewStatus": "pass",
        "recordPath": ".codex/client-management/deliverables/deliverable-ag-digitalz-post-package.json"
      },
      {
        "deliverableId": "deliverable-ag-digitalz-staging-site",
        "engagementId": "engagement-ag-digitalz-social-media-v1",
        "deliverableType": "staging_site",
        "status": "planned",
        "reviewStatus": "not_reviewed",
        "recordPath": ".codex/client-management/deliverables/deliverable-ag-digitalz-staging-site.json"
      },
      {
        "deliverableId": "deliverable-ag-digitalz-weekly-report",
        "engagementId": "engagement-ag-digitalz-social-media-v1",
        "deliverableType": "weekly_report",
        "status": "approved",
        "reviewStatus": "pass",
        "recordPath": ".codex/client-management/deliverables/deliverable-ag-digitalz-weekly-report.json"
      }
    ],
    "contentSprints": [
      {
        "sprintId": "content-sprint-ag-digitalz-first-content-sprint-v1",
        "status": "owner_approved_draft_content_staged_oauth_readiness_prepared",
        "mode": "draft_only",
        "targetRepo": "gurnoorbassi/ag-social-media-management-system",
        "targetBranch": "ag-os/ag-digitalz-draft-approval-v1",
        "targetPullRequestUrl": "https://github.com/gurnoorbassi/ag-social-media-management-system/pull/6",
        "targetPullRequestNumber": 6,
        "targetHeadSha": "4a8b28972ae5f5ddf733d149fcd8048ddbba83a9",
        "calendarDays": 7,
        "draftPostPackageCount": 21,
        "weeklyReportDraftCount": 1,
        "postsReviewedCount": 21,
        "postsRevisedCount": 21,
        "approvedDraftCount": 21,
        "ownerApprovedDraftCount": 21,
        "weeklyReportApprovalStatus": "owner_approved_draft",
        "needsRevisionCount": 0,
        "blockedByMissingProofCount": 0,
        "blockedByMissingHandleCount": 0,
        "pendingDraftApprovalCount": 0,
        "ownerDraftApproval": {
          "status": "owner_approved_draft",
          "approvedAt": "2026-07-05T06:32:26Z",
          "approvedBy": "owner-gurnoor-bassi",
          "scope": "Owner approved 21 revised post packages and one weekly report as draft content only.",
          "doesNotAuthorize": [
            "live_posting",
            "scheduling",
            "social_oauth",
            "account_connection",
            "analytics_api",
            "dms_or_comments",
            "n8n_activation"
          ],
          "nextDecision": "Provide official handles or approve a separate Social OAuth readiness package before any account connection work."
        },
        "platforms": [
          {
            "platform": "Instagram",
            "handle": "@agdigitalz",
            "handleStatus": "public_handle_provided",
            "connectionStatus": "not_connected",
            "postingMode": "draft_only",
            "approvalRequired": true,
            "livePostingBlocked": true,
            "credentialsStored": false
          },
          {
            "platform": "TikTok",
            "handle": "not_provided",
            "handleStatus": "pending_owner_input",
            "connectionStatus": "not_connected",
            "postingMode": "draft_only",
            "approvalRequired": true,
            "livePostingBlocked": true,
            "credentialsStored": false
          },
          {
            "platform": "YouTube Shorts",
            "handle": "not_provided",
            "handleStatus": "pending_owner_input",
            "connectionStatus": "not_connected",
            "postingMode": "draft_only",
            "approvalRequired": true,
            "livePostingBlocked": true,
            "credentialsStored": false
          },
          {
            "platform": "LinkedIn",
            "handle": "not_provided",
            "handleStatus": "pending_owner_input",
            "connectionStatus": "not_connected",
            "postingMode": "draft_only",
            "approvalRequired": true,
            "livePostingBlocked": true,
            "credentialsStored": false
          }
        ],
        "safety": {
          "socialOauthConnected": false,
          "credentialsStored": false,
          "postingTriggered": false,
          "schedulingTriggered": false,
          "analyticsApiUsed": false,
          "dmOrCommentUsed": false,
          "n8nActivated": false,
          "paidToolsUsed": false,
          "productionDeployTriggered": false,
          "domainOrDnsChanged": false,
          "leadGenTouched": false,
          "aiReceptionistTouched": false,
          "constitutionChanged": false,
          "acceptedLessonsCreated": false,
          "permanentMemoryCreated": false
        },
        "updatedAt": "2026-07-05T08:30:00Z",
        "recordPath": ".codex/client-management/content-sprints/content-sprint-ag-digitalz-first-content-sprint-v1.json"
      }
    ],
    "accessRequests": [
      {
        "accessRequestId": "access-request-ag-digitalz-instagram",
        "clientId": "client-ag-digitalz-internal",
        "platform": "Instagram",
        "accessType": "social_oauth",
        "status": "not_requested",
        "recordPath": ".codex/client-management/access-requests/access-request-ag-digitalz-instagram.json"
      },
      {
        "accessRequestId": "access-request-ag-digitalz-linkedin",
        "clientId": "client-ag-digitalz-internal",
        "platform": "LinkedIn",
        "accessType": "social_oauth",
        "status": "not_requested",
        "recordPath": ".codex/client-management/access-requests/access-request-ag-digitalz-linkedin.json"
      },
      {
        "accessRequestId": "access-request-ag-digitalz-tiktok",
        "clientId": "client-ag-digitalz-internal",
        "platform": "TikTok",
        "accessType": "social_oauth",
        "status": "not_requested",
        "recordPath": ".codex/client-management/access-requests/access-request-ag-digitalz-tiktok.json"
      },
      {
        "accessRequestId": "access-request-ag-digitalz-youtube-shorts",
        "clientId": "client-ag-digitalz-internal",
        "platform": "YouTube Shorts",
        "accessType": "social_oauth",
        "status": "not_requested",
        "recordPath": ".codex/client-management/access-requests/access-request-ag-digitalz-youtube-shorts.json"
      }
    ],
    "pendingApprovals": [
      {
        "approvalId": "client-approval-ag-digitalz-draft-workflow-setup",
        "clientId": "client-ag-digitalz-internal",
        "itemType": "other",
        "status": "pending",
        "blockerLevel": "medium",
        "recordPath": ".codex/client-management/approvals/client-approval-ag-digitalz-draft-workflow-setup.json"
      },
      {
        "approvalId": "client-approval-ag-digitalz-first-content-calendar-draft",
        "clientId": "client-ag-digitalz-internal",
        "itemType": "content_calendar",
        "status": "pending",
        "blockerLevel": "medium",
        "recordPath": ".codex/client-management/approvals/client-approval-ag-digitalz-first-content-calendar-draft.json"
      }
    ],
    "zeroState": "Owner-approved client records are registered."
  },
  "firstClientReadiness": {
    "status": "active_draft_configured",
    "sourceRecord": ".codex/client-management/clients/client-ag-digitalz-internal.json",
    "activeClientRecordsCreated": true,
    "activeRecordCount": 14,
    "missingRequiredFieldCount": 0,
    "missingRequiredFields": [],
    "canCreateActiveRecords": true,
    "currentMode": "draft/staging only",
    "nextOwnerDecision": "Provide official platform handles or approve a separate Social OAuth readiness package. OAuth, posting, scheduling, analytics, and n8n activation remain blocked.",
    "safetyDefaults": [
      "platform accounts remain not_connected",
      "posting mode remains draft_only",
      "approval_required remains true",
      "live_posting_blocked remains true",
      "no credentials or social OAuth",
      "no posting, scheduling, analytics API, or n8n activation"
    ]
  },
  "socialPosting": {
    "status": "foundation_active",
    "mode": "source_controlled_read_model",
    "targetPlatform": "Instagram",
    "targetHandle": "@agdigitalz",
    "handleStatus": "public_handle_provided",
    "accountId": "social-account-ag-digitalz-instagram",
    "accountState": "access_requested",
    "connectionMode": "draft_only",
    "oauthStatus": "ready_after_approval",
    "credentialRefId": "credential-ref-instagram-agdigitalz-oauth",
    "credentialStorageStatus": "approved_reference",
    "credentialReferenceStatus": "approved_reference",
    "credentialReferenceProvider": "instagram",
    "credentialStorageBackend": "future_secure_connector_credential_store",
    "credentialReferenceRepoSafe": true,
    "credentialReferenceSecretStoredInRepo": false,
    "credentialStoreReadiness": "reference_ready",
    "oauthPreflightStatus": "blocked",
    "oauthPreflightBlockedReasons": [
      "final_owner_approval_missing",
      "social_oauth_connector_missing",
      "oauth_not_executed",
      "posting_blocked",
      "scheduling_blocked",
      "analytics_blocked",
      "dm_comments_blocked",
      "n8n_activation_blocked"
    ],
    "oauthConnectorPathAvailable": false,
    "oauthExecutionReady": false,
    "credentialsStoredInRepo": false,
    "postingMode": "draft_only",
    "ownerApprovalRequired": true,
    "livePostingBlocked": true,
    "schedulingBlocked": true,
    "analyticsBlocked": true,
    "dmCommentsBlocked": true,
    "n8nActivationBlocked": true,
    "paidToolsAllowed": false,
    "approvedDraftPostsCount": 21,
    "weeklyReportApprovalStatus": "owner_approved_draft",
    "postsReadyForPublishApproval": 0,
    "exactSinglePostApprovalCount": 0,
    "connectorPreflightCount": 1,
    "blockedPublishReasons": [
      "account_not_connected",
      "oauth_not_executed",
      "final_owner_approval_missing",
      "social_oauth_connector_missing",
      "exact_single_post_publish_approval_missing",
      "live_posting_blocked",
      "scheduling_blocked",
      "analytics_blocked",
      "n8n_activation_blocked"
    ],
    "productionReadiness": {
      "readinessId": "production-readiness-social-media-management-system-v1",
      "status": "blocked",
      "activationAllowed": false,
      "blockers": [
        "rollback_restore_drill",
        "monitoring_active",
        "credential_rotation_revocation_ready",
        "validation_security_ci_passed",
        "exact_production_approval_active"
      ],
      "passedCheckCount": 6,
      "requiredCheckCount": 11,
      "liveActionPerformed": false,
      "permissionGrantedByReadiness": false
    },
    "nextRequiredOwnerApproval": "Owner must approve approval-instagram-oauth-execution before any Instagram OAuth flow can start. Credential reference credential-ref-instagram-agdigitalz-oauth is source-controlled as a reference only and contains no secret value. OAuth approval still does not authorize posting, scheduling, analytics, DMs/comments, or n8n activation.",
    "permissionModel": {
      "oauthDoesNotAuthorizePosting": true,
      "connectedDraftOnlyDoesNotAuthorizePosting": true,
      "draftApprovalDoesNotAuthorizePosting": true,
      "singlePostRequiresExactOwnerApproval": true,
      "schedulingRequiresSeparateOwnerApproval": true,
      "analyticsRequiresSeparateOwnerApproval": true,
      "memoryCanGrantPermission": false,
      "skillsCanGrantPermission": false,
      "candidateLessonsCanGrantPermission": false
    },
    "requestedPermissions": [
      "instagram_business_basic"
    ],
    "excludedPermissions": [
      "instagram_business_content_publish",
      "instagram_content_publish",
      "instagram_business_manage_insights",
      "instagram_business_manage_comments",
      "instagram_manage_comments",
      "instagram_business_manage_messages",
      "instagram_manage_messages",
      "ads_management",
      "webhook_subscription"
    ],
    "blockedActions": [
      "execute_oauth",
      "connect_account",
      "post_content",
      "schedule_content",
      "pull_analytics",
      "read_dms",
      "read_comments",
      "activate_n8n",
      "store_credentials_in_repo",
      "use_paid_tools"
    ],
    "sourceRecords": [
      ".codex/social/accounts/ag-digitalz-instagram.json",
      ".codex/social/policies/production-posting-policy.json",
      ".codex/client-management/content-sprints/content-sprint-ag-digitalz-first-content-sprint-v1.json",
      ".codex/credentials/credential-ref-instagram-agdigitalz-oauth.json",
      ".codex/social/preflight/social-preflight-instagram-oauth-agdigitalz.json",
      "docs/social-posting-os.md",
      "docs/social-posting-production-policy.md",
      "docs/instagram-oauth-execution-preflight.md",
      "docs/social-permission-matrix.md",
      ".codex/production/production-readiness-social-media-management-system-v1.json"
    ]
  },
  "ownerAttention": [
    {
      "id": "live-social-integrations-blocked",
      "status": "blocked",
      "presentationStatus": "protected",
      "title": "Live social integrations protected",
      "detail": "OAuth, credentials, posting, scheduling, analytics API, and n8n activation require separate scoped approval.",
      "action": "No failure: the Constitution is holding these actions until an exact approval is active.",
      "sourceRecord": "docs/social-media-management-system-v1-future-connectors.md"
    },
    {
      "id": "instagram-oauth-execution-needed",
      "status": "blocked",
      "presentationStatus": "approval_gated",
      "title": "Instagram OAuth approval gate",
      "detail": "@agdigitalz remains access_requested; automated posting cannot start.",
      "action": "Owner must approve approval-instagram-oauth-execution before any Instagram OAuth flow can start. Credential reference credential-ref-instagram-agdigitalz-oauth is source-controlled as a reference only and contains no secret value. OAuth approval still does not authorize posting, scheduling, analytics, DMs/comments, or n8n activation.",
      "sourceRecord": ".codex/social/accounts/ag-digitalz-instagram.json"
    },
    {
      "id": "manual-posting-available",
      "status": "ready",
      "title": "Manual posting available",
      "detail": "AG Digitalz approved drafts can be copied/exported for owner manual use while AG OS automation posting remains blocked.",
      "action": "Use the staged Social Media Manual Posting Pack manually, or approve a future OAuth package separately.",
      "sourceRecord": ".codex/connectors/connector-exec-20260705-ag-digitalz-manual-posting-pack-v1-netlify-staging-live-result.json"
    }
  ],
  "connectorAuth": {
    "records": [
      {
        "connectorId": "connector-github-mcp",
        "authStatus": "authenticated",
        "lastObservedAt": "2026-07-13T22:26:28Z",
        "observationSource": "gated_execution_record",
        "recordPath": ".codex/connectors/connector-auth-github-mcp.json"
      },
      {
        "connectorId": "connector-n8n-mcp",
        "authStatus": "authenticated",
        "lastObservedAt": "2026-07-13T22:26:28Z",
        "observationSource": "gated_execution_record",
        "recordPath": ".codex/connectors/connector-auth-n8n-mcp.json"
      },
      {
        "connectorId": "connector-netlify-mcp",
        "authStatus": "authenticated",
        "lastObservedAt": "2026-07-13T22:26:28Z",
        "observationSource": "gated_execution_record",
        "recordPath": ".codex/connectors/connector-auth-netlify-mcp.json"
      }
    ],
    "notAuthenticatedCount": 0,
    "authStatusGrantsPermission": false
  },
  "dashboardActionQueue": {
    "status": "ready",
    "mode": "read_only",
    "ownerDecisionCount": 2,
    "blockingCoreDecisionCount": 0,
    "featureDecisionCount": 2,
    "protectedActionCount": 5,
    "protectedActions": [
      {
        "id": "social-oauth",
        "status": "protected",
        "reason": "No approved secure credential store or OAuth execution connector.",
        "sourceRecord": "docs/instagram-oauth-readiness-package.md"
      },
      {
        "id": "automated-posting",
        "status": "protected",
        "reason": "Posting and scheduling are outside current approval scope.",
        "sourceRecord": ".codex/client-management/content-sprints/content-sprint-ag-digitalz-first-content-sprint-v1.json"
      },
      {
        "id": "analytics-api",
        "status": "protected",
        "reason": "Analytics API use needs separate connector, credential, and owner approval gates.",
        "sourceRecord": "docs/social-oauth-readiness-package.md"
      },
      {
        "id": "n8n-live-activation",
        "status": "protected",
        "reason": "n8n proof is inactive draft only; activation requires separate approval.",
        "sourceRecord": "docs/n8n-draft-workflow-approval-package.md"
      },
      {
        "id": "production-domain",
        "status": "protected",
        "reason": "Production deployment, custom domain, and DNS changes require separate owner approval.",
        "sourceRecord": "docs/action-matrix.md"
      }
    ],
    "blockedActionCount": 5,
    "approvalPackageCount": 14,
    "staleApprovalCount": 0,
    "manualPostingAvailable": true,
    "manualPostingDetail": "21 owner-approved draft post package(s) can be used manually while automation remains blocked.",
    "oauthBlockedReason": "OAuth is blocked until secure credential storage and an approved connector path exist.",
    "credentialStoreMissingReason": "No approved credential store record is active; tokens remain forbidden in repo, chat, and source-controlled files.",
    "nextSafeCommand": "Connector sessions are authenticated; use an exact scoped approval before any mutating connector action.",
    "latestStagingUrl": "https://ag-social-media-management-system-staging.netlify.app",
    "ownerDecisionsNeeded": [
      {
        "id": "missing-social-handles",
        "status": "optional_input",
        "scope": "social_activation",
        "blockingCore": false,
        "decision": "Provide remaining public platform handles",
        "detail": "TikTok, YouTube Shorts, LinkedIn can be added when those channels are activated; they do not block AG OS core use.",
        "sourceRecord": ".codex/client-management/content-sprints/content-sprint-ag-digitalz-first-content-sprint-v1.json"
      },
      {
        "id": "credential-store-decision",
        "status": "feature_setup",
        "scope": "social_activation",
        "blockingCore": false,
        "decision": "Choose secure credential store before OAuth",
        "detail": "Needed only when Instagram OAuth is activated; it does not block private AG OS project automation.",
        "sourceRecord": "docs/instagram-oauth-readiness-package.md"
      }
    ],
    "blockedActions": [
      {
        "id": "social-oauth",
        "status": "protected",
        "reason": "No approved secure credential store or OAuth execution connector.",
        "sourceRecord": "docs/instagram-oauth-readiness-package.md"
      },
      {
        "id": "automated-posting",
        "status": "protected",
        "reason": "Posting and scheduling are outside current approval scope.",
        "sourceRecord": ".codex/client-management/content-sprints/content-sprint-ag-digitalz-first-content-sprint-v1.json"
      },
      {
        "id": "analytics-api",
        "status": "protected",
        "reason": "Analytics API use needs separate connector, credential, and owner approval gates.",
        "sourceRecord": "docs/social-oauth-readiness-package.md"
      },
      {
        "id": "n8n-live-activation",
        "status": "protected",
        "reason": "n8n proof is inactive draft only; activation requires separate approval.",
        "sourceRecord": "docs/n8n-draft-workflow-approval-package.md"
      },
      {
        "id": "production-domain",
        "status": "protected",
        "reason": "Production deployment, custom domain, and DNS changes require separate owner approval.",
        "sourceRecord": "docs/action-matrix.md"
      }
    ],
    "approvalPackagesReady": [
      {
        "approvalId": "approval-20260703-github-repo-create",
        "status": "template_ready",
        "commandCategory": "connect_service",
        "requestedAction": "Create one private GitHub repository only.",
        "target": "REQUIRED_OWNER_APPROVED_REPOSITORY_NAME",
        "riskLevel": "R4",
        "recordPath": ".codex/approvals/approval-20260703-github-repo-create.template.json"
      },
      {
        "approvalId": "approval-20260704-github-builder-pr",
        "status": "template_ready",
        "commandCategory": "build",
        "requestedAction": "Create one branch, add starter construction website files, and open one pull request in gurnoorbassi/ag-test-construction-website.",
        "target": "github:gurnoorbassi/ag-test-construction-website#ag-os/starter-construction-website-v1",
        "riskLevel": "R4",
        "recordPath": ".codex/approvals/approval-20260704-github-builder-pr.template.json"
      },
      {
        "approvalId": "approval-20260704-instagram-oauth-readiness",
        "status": "template_ready",
        "commandCategory": "connect_service",
        "requestedAction": "Prepare future Instagram OAuth connection readiness for @agdigitalz in connected_draft_only mode.",
        "target": "instagram:@agdigitalz",
        "riskLevel": "R4",
        "recordPath": ".codex/approvals/approval-20260704-instagram-oauth-readiness.template.json"
      },
      {
        "approvalId": "approval-20260704-n8n-draft-workflow-proof",
        "status": "template_ready",
        "commandCategory": "connect_service",
        "requestedAction": "Create one inactive n8n draft workflow for construction website lead intake follow-up proof, export its workflow JSON, validate the exported JSON, record the result, and stop before activation or outbound messaging.",
        "target": "n8n:REQUIRED_OWNER_APPROVED_DRAFT_WORKFLOW_NAME",
        "riskLevel": "R4",
        "recordPath": ".codex/approvals/approval-20260704-n8n-draft-workflow-proof.template.json"
      },
      {
        "approvalId": "approval-20260704-netlify-staging-test-construction",
        "status": "template_ready",
        "commandCategory": "deploy_staging",
        "requestedAction": "Create or connect one Netlify staging site for gurnoorbassi/ag-test-construction-website and deploy staging from main.",
        "target": "netlify:REQUIRED_OWNER_APPROVED_NETLIFY_STAGING_SITE_NAME",
        "riskLevel": "R4",
        "recordPath": ".codex/approvals/approval-20260704-netlify-staging-test-construction.template.json"
      },
      {
        "approvalId": "approval-20260704-social-media-netlify-staging",
        "status": "template_ready",
        "commandCategory": "deploy_staging",
        "requestedAction": "Create or connect one dedicated Netlify staging-only site for gurnoorbassi/ag-social-media-management-system and deploy from main.",
        "target": "netlify:ag-social-media-management-system-staging",
        "riskLevel": "R4",
        "recordPath": ".codex/approvals/approval-20260704-social-media-netlify-staging.template.json"
      },
      {
        "approvalId": "approval-20260704-social-media-system-v1-1-upgrade",
        "status": "template_ready",
        "commandCategory": "build",
        "requestedAction": "Create one branch, update approved Social Media Management System v1.1 starter files, and open one pull request in gurnoorbassi/ag-social-media-management-system.",
        "target": "github:gurnoorbassi/ag-social-media-management-system#REQUIRED_BRANCH_NAME",
        "riskLevel": "R4",
        "recordPath": ".codex/approvals/approval-social-media-system-v1-1-upgrade.template.json"
      },
      {
        "approvalId": "approval-20260704-social-media-system-v1-package",
        "status": "template_ready",
        "commandCategory": "plan_only",
        "requestedAction": "Approve merging the Social Media Management System v1 draft/staging approval and build package into AG OS source of truth.",
        "target": "ag-os:project-social-media-management-system-v1",
        "riskLevel": "R2",
        "recordPath": ".codex/approvals/approval-20260704-social-media-system-v1-package.template.json"
      },
      {
        "approvalId": "approval-20260704-social-oauth-readiness",
        "status": "template_ready",
        "commandCategory": "connect_service",
        "requestedAction": "Prepare future per-platform OAuth connection readiness for Instagram, TikTok, YouTube Shorts, and LinkedIn in connected_draft_only mode.",
        "target": "social-oauth:ag-digitalz-social-media-management-system-v1",
        "riskLevel": "R4",
        "recordPath": ".codex/approvals/approval-social-oauth-readiness.template.json"
      },
      {
        "approvalId": "approval-20260705-ag-os-dashboard-netlify-staging",
        "status": "template_ready",
        "commandCategory": "deploy_staging",
        "requestedAction": "Create or connect one dedicated Netlify staging-only site named ag-os-dashboard-staging and deploy the AG OS dashboard from gurnoorbassi/ag-os.",
        "target": "netlify:ag-os-dashboard-staging",
        "riskLevel": "R4",
        "recordPath": ".codex/approvals/approval-20260705-ag-os-dashboard-netlify-staging.template.json"
      },
      {
        "approvalId": "approval-20260708-instagram-analytics-readonly",
        "status": "template_ready",
        "commandCategory": "audit",
        "requestedAction": "Read Instagram analytics for @agdigitalz in read-only mode.",
        "target": "instagram:@agdigitalz:analytics-readonly",
        "riskLevel": "R4",
        "recordPath": ".codex/approvals/approval-instagram-analytics-readonly.template.json"
      },
      {
        "approvalId": "approval-20260708-instagram-oauth-execution",
        "status": "template_ready",
        "commandCategory": "connect_service",
        "requestedAction": "Execute owner-controlled Instagram OAuth for @agdigitalz in connected_draft_only mode only.",
        "target": "instagram:@agdigitalz",
        "riskLevel": "R4",
        "recordPath": ".codex/approvals/approval-instagram-oauth-execution.template.json"
      },
      {
        "approvalId": "approval-20260708-instagram-scheduling",
        "status": "template_ready",
        "commandCategory": "send_message",
        "requestedAction": "Schedule owner-approved Instagram posts for @agdigitalz within an exact approved schedule.",
        "target": "instagram:@agdigitalz:REQUIRED_SCHEDULE_ID",
        "riskLevel": "R5",
        "recordPath": ".codex/approvals/approval-instagram-scheduling.template.json"
      },
      {
        "approvalId": "approval-20260708-instagram-single-post-publish",
        "status": "template_ready",
        "commandCategory": "send_message",
        "requestedAction": "Publish one exact owner-approved Instagram post for @agdigitalz.",
        "target": "instagram:@agdigitalz:REQUIRED_SOCIAL_POST_ID",
        "riskLevel": "R5",
        "recordPath": ".codex/approvals/approval-instagram-single-post-publish.template.json"
      }
    ],
    "approvalBatch": {
      "mode": "read_only",
      "standingApprovals": [
        {
          "approvalId": "approval-20260712-anthropic-planning",
          "status": "approved",
          "riskLevel": "R3",
          "expiresAt": "2026-08-13T06:59:59.000Z",
          "approvedBy": "owner-gurnoor-bassi",
          "approvalKind": "standing",
          "actionClass": "anthropic_plan_generation",
          "maxUses": 20,
          "budget": {
            "required": true,
            "maxUsd": 0.25,
            "usageLedgerRef": ".codex/costs"
          },
          "target": "anthropic:messages-api",
          "approvedActions": [
            "anthropic_plan_generation"
          ],
          "revocableImmediately": true,
          "recordPath": ".codex/approvals/approval-20260712-anthropic-planning.json",
          "archived": false,
          "usesRecorded": 0,
          "remainingUses": 20
        },
        {
          "approvalId": "approval-20260709-ag-os-codex-draft-pr-standing",
          "status": "approved",
          "riskLevel": "R4",
          "expiresAt": "2026-08-09T06:59:59.000Z",
          "approvedBy": "owner-gurnoor-bassi",
          "approvalKind": "standing",
          "actionClass": "push_codex_branch_and_open_draft_pull_request",
          "maxUses": 10,
          "budget": {
            "required": false,
            "maxUsd": 0
          },
          "target": "github.com/gurnoorbassi/ag-os",
          "approvedActions": [
            "push_codex_branch",
            "open_draft_pull_request"
          ],
          "revocableImmediately": true,
          "recordPath": ".codex/approvals/approval-20260709-ag-os-codex-draft-pr-standing.json",
          "archived": false,
          "usesRecorded": 5,
          "remainingUses": 5
        }
      ],
      "ownerDecisions": [
        {
          "id": "missing-social-handles",
          "status": "optional_input",
          "scope": "social_activation",
          "blockingCore": false,
          "decision": "Provide remaining public platform handles",
          "detail": "TikTok, YouTube Shorts, LinkedIn can be added when those channels are activated; they do not block AG OS core use.",
          "sourceRecord": ".codex/client-management/content-sprints/content-sprint-ag-digitalz-first-content-sprint-v1.json"
        },
        {
          "id": "credential-store-decision",
          "status": "feature_setup",
          "scope": "social_activation",
          "blockingCore": false,
          "decision": "Choose secure credential store before OAuth",
          "detail": "Needed only when Instagram OAuth is activated; it does not block private AG OS project automation.",
          "sourceRecord": "docs/instagram-oauth-readiness-package.md"
        }
      ],
      "approvalPackages": [
        {
          "approvalId": "approval-20260703-github-repo-create",
          "status": "template_ready",
          "commandCategory": "connect_service",
          "requestedAction": "Create one private GitHub repository only.",
          "target": "REQUIRED_OWNER_APPROVED_REPOSITORY_NAME",
          "riskLevel": "R4",
          "recordPath": ".codex/approvals/approval-20260703-github-repo-create.template.json"
        },
        {
          "approvalId": "approval-20260704-github-builder-pr",
          "status": "template_ready",
          "commandCategory": "build",
          "requestedAction": "Create one branch, add starter construction website files, and open one pull request in gurnoorbassi/ag-test-construction-website.",
          "target": "github:gurnoorbassi/ag-test-construction-website#ag-os/starter-construction-website-v1",
          "riskLevel": "R4",
          "recordPath": ".codex/approvals/approval-20260704-github-builder-pr.template.json"
        },
        {
          "approvalId": "approval-20260704-instagram-oauth-readiness",
          "status": "template_ready",
          "commandCategory": "connect_service",
          "requestedAction": "Prepare future Instagram OAuth connection readiness for @agdigitalz in connected_draft_only mode.",
          "target": "instagram:@agdigitalz",
          "riskLevel": "R4",
          "recordPath": ".codex/approvals/approval-20260704-instagram-oauth-readiness.template.json"
        },
        {
          "approvalId": "approval-20260704-n8n-draft-workflow-proof",
          "status": "template_ready",
          "commandCategory": "connect_service",
          "requestedAction": "Create one inactive n8n draft workflow for construction website lead intake follow-up proof, export its workflow JSON, validate the exported JSON, record the result, and stop before activation or outbound messaging.",
          "target": "n8n:REQUIRED_OWNER_APPROVED_DRAFT_WORKFLOW_NAME",
          "riskLevel": "R4",
          "recordPath": ".codex/approvals/approval-20260704-n8n-draft-workflow-proof.template.json"
        },
        {
          "approvalId": "approval-20260704-netlify-staging-test-construction",
          "status": "template_ready",
          "commandCategory": "deploy_staging",
          "requestedAction": "Create or connect one Netlify staging site for gurnoorbassi/ag-test-construction-website and deploy staging from main.",
          "target": "netlify:REQUIRED_OWNER_APPROVED_NETLIFY_STAGING_SITE_NAME",
          "riskLevel": "R4",
          "recordPath": ".codex/approvals/approval-20260704-netlify-staging-test-construction.template.json"
        },
        {
          "approvalId": "approval-20260704-social-media-netlify-staging",
          "status": "template_ready",
          "commandCategory": "deploy_staging",
          "requestedAction": "Create or connect one dedicated Netlify staging-only site for gurnoorbassi/ag-social-media-management-system and deploy from main.",
          "target": "netlify:ag-social-media-management-system-staging",
          "riskLevel": "R4",
          "recordPath": ".codex/approvals/approval-20260704-social-media-netlify-staging.template.json"
        },
        {
          "approvalId": "approval-20260704-social-media-system-v1-1-upgrade",
          "status": "template_ready",
          "commandCategory": "build",
          "requestedAction": "Create one branch, update approved Social Media Management System v1.1 starter files, and open one pull request in gurnoorbassi/ag-social-media-management-system.",
          "target": "github:gurnoorbassi/ag-social-media-management-system#REQUIRED_BRANCH_NAME",
          "riskLevel": "R4",
          "recordPath": ".codex/approvals/approval-social-media-system-v1-1-upgrade.template.json"
        },
        {
          "approvalId": "approval-20260704-social-media-system-v1-package",
          "status": "template_ready",
          "commandCategory": "plan_only",
          "requestedAction": "Approve merging the Social Media Management System v1 draft/staging approval and build package into AG OS source of truth.",
          "target": "ag-os:project-social-media-management-system-v1",
          "riskLevel": "R2",
          "recordPath": ".codex/approvals/approval-20260704-social-media-system-v1-package.template.json"
        },
        {
          "approvalId": "approval-20260704-social-oauth-readiness",
          "status": "template_ready",
          "commandCategory": "connect_service",
          "requestedAction": "Prepare future per-platform OAuth connection readiness for Instagram, TikTok, YouTube Shorts, and LinkedIn in connected_draft_only mode.",
          "target": "social-oauth:ag-digitalz-social-media-management-system-v1",
          "riskLevel": "R4",
          "recordPath": ".codex/approvals/approval-social-oauth-readiness.template.json"
        },
        {
          "approvalId": "approval-20260705-ag-os-dashboard-netlify-staging",
          "status": "template_ready",
          "commandCategory": "deploy_staging",
          "requestedAction": "Create or connect one dedicated Netlify staging-only site named ag-os-dashboard-staging and deploy the AG OS dashboard from gurnoorbassi/ag-os.",
          "target": "netlify:ag-os-dashboard-staging",
          "riskLevel": "R4",
          "recordPath": ".codex/approvals/approval-20260705-ag-os-dashboard-netlify-staging.template.json"
        },
        {
          "approvalId": "approval-20260708-instagram-analytics-readonly",
          "status": "template_ready",
          "commandCategory": "audit",
          "requestedAction": "Read Instagram analytics for @agdigitalz in read-only mode.",
          "target": "instagram:@agdigitalz:analytics-readonly",
          "riskLevel": "R4",
          "recordPath": ".codex/approvals/approval-instagram-analytics-readonly.template.json"
        },
        {
          "approvalId": "approval-20260708-instagram-oauth-execution",
          "status": "template_ready",
          "commandCategory": "connect_service",
          "requestedAction": "Execute owner-controlled Instagram OAuth for @agdigitalz in connected_draft_only mode only.",
          "target": "instagram:@agdigitalz",
          "riskLevel": "R4",
          "recordPath": ".codex/approvals/approval-instagram-oauth-execution.template.json"
        },
        {
          "approvalId": "approval-20260708-instagram-scheduling",
          "status": "template_ready",
          "commandCategory": "send_message",
          "requestedAction": "Schedule owner-approved Instagram posts for @agdigitalz within an exact approved schedule.",
          "target": "instagram:@agdigitalz:REQUIRED_SCHEDULE_ID",
          "riskLevel": "R5",
          "recordPath": ".codex/approvals/approval-instagram-scheduling.template.json"
        },
        {
          "approvalId": "approval-20260708-instagram-single-post-publish",
          "status": "template_ready",
          "commandCategory": "send_message",
          "requestedAction": "Publish one exact owner-approved Instagram post for @agdigitalz.",
          "target": "instagram:@agdigitalz:REQUIRED_SOCIAL_POST_ID",
          "riskLevel": "R5",
          "recordPath": ".codex/approvals/approval-instagram-single-post-publish.template.json"
        }
      ],
      "writeActionsAllowed": false,
      "batchApprovalGrantsPermission": false
    },
    "staleApprovals": [],
    "safeNextMilestones": [
      {
        "id": "connector-preflight-runtime-v1",
        "status": "complete",
        "detail": "GitHub, Netlify, and n8n connectivity was verified through read-only connector calls on 2026-07-13."
      },
      {
        "id": "business-loop-v1",
        "status": "safe_source_next",
        "detail": "Formalize the AG Digitalz content loop from idea through manual posting pack and weekly report without live social actions."
      },
      {
        "id": "secure-credential-store-readiness",
        "status": "planning_only",
        "detail": "Prepare credential-store policy before OAuth or token handling."
      }
    ],
    "sourceRecords": [
      ".codex/approvals/",
      ".codex/client-management/content-sprints/content-sprint-ag-digitalz-first-content-sprint-v1.json",
      ".codex/connectors/connector-exec-20260705-ag-digitalz-manual-posting-pack-v1-netlify-staging-live-result.json",
      "docs/dashboard-action-queue.md"
    ]
  },
  "approvals": {
    "activeCount": 3,
    "expiredCount": 25,
    "blockedCount": 0,
    "staleWarningCount": 0,
    "activeApprovals": [
      {
        "approvalId": "approval-20260712-anthropic-planning",
        "status": "approved",
        "riskLevel": "R3",
        "expiresAt": "2026-08-13T06:59:59.000Z",
        "approvedBy": "owner-gurnoor-bassi",
        "approvalKind": "standing",
        "actionClass": "anthropic_plan_generation",
        "maxUses": 20,
        "budget": {
          "required": true,
          "maxUsd": 0.25,
          "usageLedgerRef": ".codex/costs"
        },
        "target": "anthropic:messages-api",
        "approvedActions": [
          "anthropic_plan_generation"
        ],
        "revocableImmediately": true,
        "recordPath": ".codex/approvals/approval-20260712-anthropic-planning.json",
        "archived": false,
        "usesRecorded": 0,
        "remainingUses": 20
      },
      {
        "approvalId": "approval-20260709-ag-os-codex-draft-pr-standing",
        "status": "approved",
        "riskLevel": "R4",
        "expiresAt": "2026-08-09T06:59:59.000Z",
        "approvedBy": "owner-gurnoor-bassi",
        "approvalKind": "standing",
        "actionClass": "push_codex_branch_and_open_draft_pull_request",
        "maxUses": 10,
        "budget": {
          "required": false,
          "maxUsd": 0
        },
        "target": "github.com/gurnoorbassi/ag-os",
        "approvedActions": [
          "push_codex_branch",
          "open_draft_pull_request"
        ],
        "revocableImmediately": true,
        "recordPath": ".codex/approvals/approval-20260709-ag-os-codex-draft-pr-standing.json",
        "archived": false,
        "usesRecorded": 5,
        "remainingUses": 5
      },
      {
        "approvalId": "approval-20260713-h3-compounding-proof",
        "status": "approved",
        "riskLevel": "R2",
        "expiresAt": "2026-07-14T09:32:19.851Z",
        "approvedBy": "owner-gurnoor-bassi",
        "approvalKind": "single_action",
        "actionClass": null,
        "maxUses": null,
        "budget": null,
        "target": "gurnoorbassi/ag-os local accepted memory and milestone proof records",
        "approvedActions": [
          "promote_named_lesson",
          "create_followup_reuse_proof",
          "create_draft_archetype_proposal",
          "commit_exact_milestone_proof_sets"
        ],
        "revocableImmediately": false,
        "recordPath": ".codex/approvals/approval-20260713-h3-compounding-proof.json",
        "archived": false,
        "usesRecorded": 0,
        "remainingUses": null
      }
    ],
    "expiredApprovals": [
      {
        "approvalId": "approval-20260705-ag-digitalz-manual-posting-pack-v1",
        "status": "expired",
        "riskLevel": "R4",
        "expiresAt": "2026-07-06T20:55:00Z",
        "approvedBy": "owner-gurnoor-bassi",
        "approvalKind": "single_action",
        "actionClass": null,
        "maxUses": null,
        "budget": {
          "required": false,
          "maxUsd": 0,
          "usageLedgerRef": ".codex/costs/cost-ledger-20260705-ag-digitalz-manual-posting-pack-v1.json"
        },
        "target": "github:gurnoorbassi/ag-social-media-management-system; netlify:ag-social-media-management-system-staging; ag-os:proof-records",
        "approvedActions": [
          "create_branch",
          "update_files",
          "open_pr",
          "review_pr",
          "merge_pr",
          "redeploy_netlify_staging",
          "record_proof"
        ],
        "revocableImmediately": false,
        "recordPath": ".codex/approvals/archive/approval-20260705-ag-digitalz-manual-posting-pack-v1.json",
        "archived": true
      },
      {
        "approvalId": "approval-20260705-ag-digitalz-instagram-handle-live-update",
        "status": "expired",
        "riskLevel": "R4",
        "expiresAt": "2026-07-06T19:00:00Z",
        "approvedBy": "owner-gurnoor-bassi",
        "approvalKind": "single_action",
        "actionClass": null,
        "maxUses": null,
        "budget": {
          "required": false,
          "maxUsd": 0,
          "usageLedgerRef": ".codex/costs/cost-ledger-20260705-ag-digitalz-instagram-handle-live-update.json"
        },
        "target": "ag-os:client-management-dashboard-records; github:gurnoorbassi/ag-social-media-management-system; netlify:ag-social-media-management-system-staging",
        "approvedActions": [
          "record_public_handle",
          "create_branch",
          "update_files",
          "open_pr",
          "review_pr",
          "merge_pr",
          "redeploy_netlify_staging",
          "record_proof"
        ],
        "revocableImmediately": false,
        "recordPath": ".codex/approvals/archive/approval-20260705-ag-digitalz-instagram-handle-live-update.json",
        "archived": true
      },
      {
        "approvalId": "approval-20260705-ag-os-dashboard-netlify-staging",
        "status": "expired",
        "riskLevel": "R4",
        "expiresAt": "2026-07-06T08:08:00Z",
        "approvedBy": "owner-gurnoor-bassi",
        "approvalKind": "single_action",
        "actionClass": null,
        "maxUses": null,
        "budget": {
          "required": false,
          "maxUsd": 0,
          "usageLedgerRef": ".codex/costs/cost-ledger-20260705-ag-os-dashboard-netlify-staging.json"
        },
        "target": "netlify:ag-os-dashboard-staging; ag-os:dashboard",
        "approvedActions": [
          "create_netlify_staging_site",
          "deploy_dashboard_staging",
          "verify_http_200",
          "record_proof"
        ],
        "revocableImmediately": false,
        "recordPath": ".codex/approvals/archive/approval-20260705-ag-os-dashboard-netlify-staging.json",
        "archived": true
      },
      {
        "approvalId": "approval-20260705-social-media-interactive-draft-ui",
        "status": "expired",
        "riskLevel": "R4",
        "expiresAt": "2026-07-06T07:25:00Z",
        "approvedBy": "owner-gurnoor-bassi",
        "approvalKind": "single_action",
        "actionClass": null,
        "maxUses": null,
        "budget": {
          "required": false,
          "maxUsd": 0,
          "usageLedgerRef": ".codex/costs/cost-ledger-20260705-social-media-interactive-draft-ui.json"
        },
        "target": "github:gurnoorbassi/ag-social-media-management-system; netlify:ag-social-media-management-system-staging; ag-os:proof-records",
        "approvedActions": [
          "create_branch",
          "update_files",
          "open_pr",
          "review_pr",
          "merge_pr",
          "redeploy_netlify_staging",
          "record_proof"
        ],
        "revocableImmediately": false,
        "recordPath": ".codex/approvals/archive/approval-20260705-social-media-interactive-draft-ui.json",
        "archived": true
      },
      {
        "approvalId": "approval-20260704-ag-digitalz-draft-approval-oauth-readiness",
        "status": "expired",
        "riskLevel": "R4",
        "expiresAt": "2026-07-06T06:32:26Z",
        "approvedBy": "owner-gurnoor-bassi",
        "approvalKind": "single_action",
        "actionClass": null,
        "maxUses": null,
        "budget": {
          "required": false,
          "maxUsd": 0,
          "usageLedgerRef": ".codex/costs/cost-ledger-20260704-ag-digitalz-draft-approval-netlify-staging.json"
        },
        "target": "github:gurnoorbassi/ag-social-media-management-system; netlify:ag-social-media-management-system-staging; ag-os:social-oauth-readiness-package",
        "approvedActions": [
          "record_draft_content_approval",
          "create_branch",
          "update_files",
          "open_pr",
          "review_pr",
          "merge_pr",
          "redeploy_netlify_staging",
          "prepare_social_oauth_readiness"
        ],
        "revocableImmediately": false,
        "recordPath": ".codex/approvals/archive/approval-20260704-ag-digitalz-draft-approval-oauth-readiness.json",
        "archived": true
      },
      {
        "approvalId": "approval-20260704-ag-digitalz-content-review-netlify-staging",
        "status": "expired",
        "riskLevel": "R4",
        "expiresAt": "2026-07-06T05:55:37Z",
        "approvedBy": "owner-gurnoor-bassi",
        "approvalKind": "single_action",
        "actionClass": null,
        "maxUses": null,
        "budget": {
          "required": false,
          "maxUsd": 0,
          "usageLedgerRef": ".codex/costs/cost-ledger-20260704-ag-digitalz-content-review-netlify-staging.json"
        },
        "target": "netlify:ag-social-media-management-system-staging",
        "approvedActions": [
          "redeploy_netlify_staging"
        ],
        "revocableImmediately": false,
        "recordPath": ".codex/approvals/archive/approval-20260704-ag-digitalz-content-review-netlify-staging.json",
        "archived": true
      },
      {
        "approvalId": "approval-20260704-target-pr-merge-ag-digitalz-content-review-v1",
        "status": "expired",
        "riskLevel": "R4",
        "expiresAt": "2026-07-06T05:48:00Z",
        "approvedBy": "owner-gurnoor-bassi",
        "approvalKind": "single_action",
        "actionClass": null,
        "maxUses": null,
        "budget": {
          "required": false,
          "maxUsd": 0,
          "usageLedgerRef": ".codex/costs/cost-ledger-20260704-target-pr-merge-ag-digitalz-content-review-v1.json"
        },
        "target": "github:gurnoorbassi/ag-social-media-management-system#5",
        "approvedActions": [
          "merge_pr"
        ],
        "revocableImmediately": false,
        "recordPath": ".codex/approvals/archive/approval-20260704-target-pr-merge-ag-digitalz-content-review-v1.json",
        "archived": true
      },
      {
        "approvalId": "approval-20260704-ag-digitalz-content-review-build",
        "status": "expired",
        "riskLevel": "R4",
        "expiresAt": "2026-07-06T05:26:42Z",
        "approvedBy": "owner-gurnoor-bassi",
        "approvalKind": "single_action",
        "actionClass": null,
        "maxUses": null,
        "budget": {
          "required": false,
          "maxUsd": 0,
          "usageLedgerRef": ".codex/costs/cost-ledger-20260704-ag-digitalz-content-review-build.json"
        },
        "target": "github:gurnoorbassi/ag-social-media-management-system#ag-os/ag-digitalz-content-review-v1",
        "approvedActions": [
          "create_branch",
          "update_files",
          "open_pr"
        ],
        "revocableImmediately": false,
        "recordPath": ".codex/approvals/archive/approval-20260704-ag-digitalz-content-review-build.json",
        "archived": true
      },
      {
        "approvalId": "approval-20260704-ag-digitalz-first-content-sprint-netlify-staging",
        "status": "expired",
        "riskLevel": "R4",
        "expiresAt": "2026-07-06T04:58:46Z",
        "approvedBy": "owner-gurnoor-bassi",
        "approvalKind": "single_action",
        "actionClass": null,
        "maxUses": null,
        "budget": {
          "required": false,
          "maxUsd": 0,
          "usageLedgerRef": ".codex/costs/cost-ledger-20260704-ag-digitalz-first-content-sprint-netlify-staging.json"
        },
        "target": "netlify:ag-social-media-management-system-staging",
        "approvedActions": [
          "redeploy_netlify_staging"
        ],
        "revocableImmediately": false,
        "recordPath": ".codex/approvals/archive/approval-20260704-ag-digitalz-first-content-sprint-netlify-staging.json",
        "archived": true
      },
      {
        "approvalId": "approval-20260704-target-pr-merge-ag-digitalz-first-content-sprint-v1",
        "status": "expired",
        "riskLevel": "R4",
        "expiresAt": "2026-07-06T04:52:30Z",
        "approvedBy": "owner-gurnoor-bassi",
        "approvalKind": "single_action",
        "actionClass": null,
        "maxUses": null,
        "budget": {
          "required": false,
          "maxUsd": 0,
          "usageLedgerRef": ".codex/costs/cost-ledger-20260704-target-pr-merge-ag-digitalz-first-content-sprint-v1.json"
        },
        "target": "github:gurnoorbassi/ag-social-media-management-system#4",
        "approvedActions": [
          "merge_pr"
        ],
        "revocableImmediately": false,
        "recordPath": ".codex/approvals/archive/approval-20260704-target-pr-merge-ag-digitalz-first-content-sprint-v1.json",
        "archived": true
      },
      {
        "approvalId": "approval-20260704-ag-digitalz-first-content-sprint-build",
        "status": "expired",
        "riskLevel": "R4",
        "expiresAt": "2026-07-06T04:36:18Z",
        "approvedBy": "owner-gurnoor-bassi",
        "approvalKind": "single_action",
        "actionClass": null,
        "maxUses": null,
        "budget": {
          "required": false,
          "maxUsd": 0,
          "usageLedgerRef": ".codex/costs/cost-ledger-20260704-ag-digitalz-first-content-sprint-build.json"
        },
        "target": "github:gurnoorbassi/ag-social-media-management-system#ag-os/ag-digitalz-first-content-sprint-v1",
        "approvedActions": [
          "create_branch",
          "update_files",
          "open_pr"
        ],
        "revocableImmediately": false,
        "recordPath": ".codex/approvals/archive/approval-20260704-ag-digitalz-first-content-sprint-build.json",
        "archived": true
      },
      {
        "approvalId": "approval-20260704-ag-digitalz-netlify-staging-redeploy",
        "status": "expired",
        "riskLevel": "R4",
        "expiresAt": "2026-07-06T02:10:39Z",
        "approvedBy": "owner-gurnoor-bassi",
        "approvalKind": "single_action",
        "actionClass": null,
        "maxUses": null,
        "budget": {
          "required": false,
          "maxUsd": 0,
          "usageLedgerRef": ".codex/costs/cost-ledger-20260704-ag-digitalz-netlify-staging-redeploy.json"
        },
        "target": "netlify:ag-social-media-management-system-staging",
        "approvedActions": [
          "redeploy_netlify_staging"
        ],
        "revocableImmediately": false,
        "recordPath": ".codex/approvals/archive/approval-20260704-ag-digitalz-netlify-staging-redeploy.json",
        "archived": true
      },
      {
        "approvalId": "approval-20260704-target-pr-merge-ag-digitalz-draft-config",
        "status": "expired",
        "riskLevel": "R4",
        "expiresAt": "2026-07-06T02:05:01Z",
        "approvedBy": "owner-gurnoor-bassi",
        "approvalKind": "single_action",
        "actionClass": null,
        "maxUses": null,
        "budget": {
          "required": false,
          "maxUsd": 0,
          "usageLedgerRef": ".codex/costs/cost-ledger-20260704-target-pr-merge-ag-digitalz-draft-config.json"
        },
        "target": "github:gurnoorbassi/ag-social-media-management-system#3",
        "approvedActions": [
          "merge_pr"
        ],
        "revocableImmediately": false,
        "recordPath": ".codex/approvals/archive/approval-20260704-target-pr-merge-ag-digitalz-draft-config.json",
        "archived": true
      },
      {
        "approvalId": "approval-20260704-ag-digitalz-draft-config-build",
        "status": "expired",
        "riskLevel": "R4",
        "expiresAt": "2026-07-06T01:52:50Z",
        "approvedBy": "owner-gurnoor-bassi",
        "approvalKind": "single_action",
        "actionClass": null,
        "maxUses": null,
        "budget": {
          "required": false,
          "maxUsd": 0,
          "usageLedgerRef": ".codex/costs/cost-ledger-20260704-ag-digitalz-draft-config-build.json"
        },
        "target": "github:gurnoorbassi/ag-social-media-management-system#ag-os/ag-digitalz-draft-config",
        "approvedActions": [
          "create_branch",
          "update_files",
          "open_pr"
        ],
        "revocableImmediately": false,
        "recordPath": ".codex/approvals/archive/approval-20260704-ag-digitalz-draft-config-build.json",
        "archived": true
      },
      {
        "approvalId": "approval-20260704-social-media-netlify-staging-v1-1",
        "status": "expired",
        "riskLevel": "R4",
        "expiresAt": "2026-07-06T00:59:30Z",
        "approvedBy": "owner-gurnoor-bassi",
        "approvalKind": "single_action",
        "actionClass": null,
        "maxUses": null,
        "budget": {
          "required": false,
          "maxUsd": 0,
          "usageLedgerRef": ".codex/costs/cost-ledger-20260704-social-media-netlify-staging-v1-1.json"
        },
        "target": "netlify:ag-social-media-management-system-staging",
        "approvedActions": [
          "deploy_staging"
        ],
        "revocableImmediately": false,
        "recordPath": ".codex/approvals/archive/approval-20260704-social-media-netlify-staging-v1-1.json",
        "archived": true
      },
      {
        "approvalId": "approval-20260704-target-pr-merge-social-media-system-v1-1",
        "status": "expired",
        "riskLevel": "R4",
        "expiresAt": "2026-07-06T00:56:29Z",
        "approvedBy": "owner-gurnoor-bassi",
        "approvalKind": "single_action",
        "actionClass": null,
        "maxUses": null,
        "budget": {
          "required": false,
          "maxUsd": 0,
          "usageLedgerRef": ".codex/costs/cost-ledger-20260704-target-pr-merge-social-media-system-v1-1.json"
        },
        "target": "github:gurnoorbassi/ag-social-media-management-system#2",
        "approvedActions": [
          "merge_pr"
        ],
        "revocableImmediately": false,
        "recordPath": ".codex/approvals/archive/approval-20260704-target-pr-merge-social-media-system-v1-1.json",
        "archived": true
      },
      {
        "approvalId": "approval-20260704-social-media-system-v1-1-upgrade",
        "status": "expired",
        "riskLevel": "R4",
        "expiresAt": "2026-07-06T00:47:02Z",
        "approvedBy": "owner-gurnoor-bassi",
        "approvalKind": "single_action",
        "actionClass": null,
        "maxUses": null,
        "budget": {
          "required": false,
          "maxUsd": 0,
          "usageLedgerRef": ".codex/costs/cost-ledger-20260704-social-media-system-v1-1-upgrade.json"
        },
        "target": "github:gurnoorbassi/ag-social-media-management-system#ag-os/social-media-system-v1-1-upgrade",
        "approvedActions": [
          "create_branch",
          "update_files",
          "open_pr"
        ],
        "revocableImmediately": false,
        "recordPath": ".codex/approvals/archive/approval-20260704-social-media-system-v1-1-upgrade.json",
        "archived": true
      },
      {
        "approvalId": "approval-20260704-social-media-netlify-staging",
        "status": "expired",
        "riskLevel": "R4",
        "expiresAt": "2026-07-05T23:17:35.591Z",
        "approvedBy": "owner-gurnoor-bassi",
        "approvalKind": "single_action",
        "actionClass": null,
        "maxUses": null,
        "budget": {
          "required": false,
          "maxUsd": 0,
          "usageLedgerRef": ".codex/costs/cost-ledger-20260704-social-media-netlify-staging.json"
        },
        "target": "netlify:ag-social-media-management-system-staging",
        "approvedActions": [
          "connect_netlify",
          "deploy_staging"
        ],
        "revocableImmediately": false,
        "recordPath": ".codex/approvals/archive/approval-20260704-social-media-netlify-staging.json",
        "archived": true
      },
      {
        "approvalId": "approval-20260704-target-pr-merge-social-media-system-v1",
        "status": "expired",
        "riskLevel": "R4",
        "expiresAt": "2026-07-05T22:31:45.718Z",
        "approvedBy": "owner-gurnoor-bassi",
        "approvalKind": "single_action",
        "actionClass": null,
        "maxUses": null,
        "budget": {
          "required": false,
          "maxUsd": 0,
          "usageLedgerRef": ".codex/costs/cost-ledger-20260704-target-pr-merge-social-media-system-v1.json"
        },
        "target": "github:gurnoorbassi/ag-social-media-management-system#1",
        "approvedActions": [
          "merge_pr"
        ],
        "revocableImmediately": false,
        "recordPath": ".codex/approvals/archive/approval-20260704-target-pr-merge-social-media-system-v1.json",
        "archived": true
      },
      {
        "approvalId": "approval-20260704-social-media-starter-build",
        "status": "expired",
        "riskLevel": "R4",
        "expiresAt": "2026-07-05T21:35:09Z",
        "approvedBy": "owner-gurnoor-bassi",
        "approvalKind": "single_action",
        "actionClass": null,
        "maxUses": null,
        "budget": {
          "required": false,
          "maxUsd": 0,
          "usageLedgerRef": ".codex/costs/cost-ledger-20260704-social-media-starter-build.json"
        },
        "target": "github:gurnoorbassi/ag-social-media-management-system#ag-os/social-media-system-v1-starter",
        "approvedActions": [
          "create_branch",
          "create_files",
          "update_files",
          "open_pr"
        ],
        "revocableImmediately": false,
        "recordPath": ".codex/approvals/archive/approval-20260704-social-media-starter-build.json",
        "archived": true
      },
      {
        "approvalId": "approval-20260704-n8n-draft-workflow-proof",
        "status": "expired",
        "riskLevel": "R4",
        "expiresAt": "2026-07-05T11:18:16Z",
        "approvedBy": "owner-gurnoor-bassi",
        "approvalKind": "single_action",
        "actionClass": null,
        "maxUses": null,
        "budget": {
          "required": false,
          "maxUsd": 0,
          "usageLedgerRef": ".codex/costs/budget.json"
        },
        "target": "n8n:Construction Website Lead Intake Follow-up Draft",
        "approvedActions": [
          "create_inactive_n8n_draft_workflow",
          "export_n8n_workflow_json",
          "validate_n8n_workflow_json",
          "record_n8n_draft_result"
        ],
        "revocableImmediately": false,
        "recordPath": ".codex/approvals/archive/approval-20260704-n8n-draft-workflow-proof.json",
        "archived": true
      },
      {
        "approvalId": "approval-20260704-netlify-staging-test-construction",
        "status": "expired",
        "riskLevel": "R4",
        "expiresAt": "2026-07-05T10:50:47.913Z",
        "approvedBy": "owner-gurnoor-bassi",
        "approvalKind": "single_action",
        "actionClass": null,
        "maxUses": null,
        "budget": {
          "required": false,
          "maxUsd": 0,
          "usageLedgerRef": ".codex/costs/cost-ledger-20260704-netlify-staging-test-construction.json"
        },
        "target": "netlify:gurnoorbassi/ag-test-construction-website:staging",
        "approvedActions": [
          "connect_netlify",
          "deploy_staging"
        ],
        "revocableImmediately": false,
        "recordPath": ".codex/approvals/archive/approval-20260704-netlify-staging-test-construction.json",
        "archived": true
      },
      {
        "approvalId": "approval-20260704-target-pr-merge-construction-website",
        "status": "expired",
        "riskLevel": "R4",
        "expiresAt": "2026-07-05T10:16:16.617Z",
        "approvedBy": "owner-gurnoor-bassi",
        "approvalKind": "single_action",
        "actionClass": null,
        "maxUses": null,
        "budget": {
          "required": false,
          "maxUsd": 0,
          "usageLedgerRef": ".codex/costs/cost-ledger-20260704-target-pr-merge-construction-website.json"
        },
        "target": "github:gurnoorbassi/ag-test-construction-website#1",
        "approvedActions": [
          "merge_pr"
        ],
        "revocableImmediately": false,
        "recordPath": ".codex/approvals/archive/approval-20260704-target-pr-merge-construction-website.json",
        "archived": true
      },
      {
        "approvalId": "approval-20260704-github-builder-pr",
        "status": "expired",
        "riskLevel": "R4",
        "expiresAt": "2026-07-05T08:55:58.002Z",
        "approvedBy": "owner-gurnoor-bassi",
        "approvalKind": "single_action",
        "actionClass": null,
        "maxUses": null,
        "budget": {
          "required": false,
          "maxUsd": 0,
          "usageLedgerRef": ".codex/costs/cost-ledger-20260704-github-builder-pr.json"
        },
        "target": "github:gurnoorbassi/ag-test-construction-website#ag-os/starter-construction-website-v1",
        "approvedActions": [
          "create_branch",
          "create_files",
          "update_files",
          "open_pr"
        ],
        "revocableImmediately": false,
        "recordPath": ".codex/approvals/archive/approval-20260704-github-builder-pr.json",
        "archived": true
      },
      {
        "approvalId": "approval-20260703-github-repo-create",
        "status": "expired",
        "riskLevel": "R4",
        "expiresAt": "2026-07-04T21:06:41Z",
        "approvedBy": "owner-gurnoor-bassi",
        "approvalKind": "single_action",
        "actionClass": null,
        "maxUses": null,
        "budget": {
          "required": false,
          "maxUsd": 0,
          "usageLedgerRef": ".codex/costs/cost-ledger-runtime-github-construction-website-repo-20260703.json"
        },
        "target": "github:gurnoorbassi/ag-test-construction-website",
        "approvedActions": [
          "create_repo",
          "create_starter_readme_if_required"
        ],
        "revocableImmediately": false,
        "recordPath": ".codex/approvals/archive/approval-20260703-github-repo-create.json",
        "archived": true
      }
    ],
    "blockedApprovals": [],
    "staleApprovals": [],
    "recentApprovedActions": [
      {
        "approvalId": "approval-20260712-anthropic-planning",
        "status": "approved",
        "riskLevel": "R3",
        "expiresAt": "2026-08-13T06:59:59.000Z",
        "approvedBy": "owner-gurnoor-bassi",
        "approvalKind": "standing",
        "actionClass": "anthropic_plan_generation",
        "maxUses": 20,
        "budget": {
          "required": true,
          "maxUsd": 0.25,
          "usageLedgerRef": ".codex/costs"
        },
        "target": "anthropic:messages-api",
        "approvedActions": [
          "anthropic_plan_generation"
        ],
        "revocableImmediately": true,
        "recordPath": ".codex/approvals/approval-20260712-anthropic-planning.json",
        "archived": false,
        "usesRecorded": 0,
        "remainingUses": 20
      },
      {
        "approvalId": "approval-20260709-ag-os-codex-draft-pr-standing",
        "status": "approved",
        "riskLevel": "R4",
        "expiresAt": "2026-08-09T06:59:59.000Z",
        "approvedBy": "owner-gurnoor-bassi",
        "approvalKind": "standing",
        "actionClass": "push_codex_branch_and_open_draft_pull_request",
        "maxUses": 10,
        "budget": {
          "required": false,
          "maxUsd": 0
        },
        "target": "github.com/gurnoorbassi/ag-os",
        "approvedActions": [
          "push_codex_branch",
          "open_draft_pull_request"
        ],
        "revocableImmediately": true,
        "recordPath": ".codex/approvals/approval-20260709-ag-os-codex-draft-pr-standing.json",
        "archived": false,
        "usesRecorded": 5,
        "remainingUses": 5
      },
      {
        "approvalId": "approval-20260713-h3-compounding-proof",
        "status": "approved",
        "riskLevel": "R2",
        "expiresAt": "2026-07-14T09:32:19.851Z",
        "approvedBy": "owner-gurnoor-bassi",
        "approvalKind": "single_action",
        "actionClass": null,
        "maxUses": null,
        "budget": null,
        "target": "gurnoorbassi/ag-os local accepted memory and milestone proof records",
        "approvedActions": [
          "promote_named_lesson",
          "create_followup_reuse_proof",
          "create_draft_archetype_proposal",
          "commit_exact_milestone_proof_sets"
        ],
        "revocableImmediately": false,
        "recordPath": ".codex/approvals/approval-20260713-h3-compounding-proof.json",
        "archived": false,
        "usesRecorded": 0,
        "remainingUses": null
      }
    ],
    "standingCount": 2,
    "standingApprovals": [
      {
        "approvalId": "approval-20260712-anthropic-planning",
        "status": "approved",
        "riskLevel": "R3",
        "expiresAt": "2026-08-13T06:59:59.000Z",
        "approvedBy": "owner-gurnoor-bassi",
        "approvalKind": "standing",
        "actionClass": "anthropic_plan_generation",
        "maxUses": 20,
        "budget": {
          "required": true,
          "maxUsd": 0.25,
          "usageLedgerRef": ".codex/costs"
        },
        "target": "anthropic:messages-api",
        "approvedActions": [
          "anthropic_plan_generation"
        ],
        "revocableImmediately": true,
        "recordPath": ".codex/approvals/approval-20260712-anthropic-planning.json",
        "archived": false,
        "usesRecorded": 0,
        "remainingUses": 20
      },
      {
        "approvalId": "approval-20260709-ag-os-codex-draft-pr-standing",
        "status": "approved",
        "riskLevel": "R4",
        "expiresAt": "2026-08-09T06:59:59.000Z",
        "approvedBy": "owner-gurnoor-bassi",
        "approvalKind": "standing",
        "actionClass": "push_codex_branch_and_open_draft_pull_request",
        "maxUses": 10,
        "budget": {
          "required": false,
          "maxUsd": 0
        },
        "target": "github.com/gurnoorbassi/ag-os",
        "approvedActions": [
          "push_codex_branch",
          "open_draft_pull_request"
        ],
        "revocableImmediately": true,
        "recordPath": ".codex/approvals/approval-20260709-ag-os-codex-draft-pr-standing.json",
        "archived": false,
        "usesRecorded": 5,
        "remainingUses": 5
      }
    ]
  },
  "connectorProofs": {
    "github": [
      {
        "id": "connector-exec-20260703-github-repo-create-live-result",
        "status": "done",
        "action": "create_repo",
        "projectId": "project-unregistered-construction-website",
        "approvalId": "approval-20260703-github-repo-create",
        "result": {
          "repositoryFullName": "gurnoorbassi/ag-test-construction-website",
          "repositoryUrl": "https://github.com/gurnoorbassi/ag-test-construction-website",
          "visibility": "private",
          "defaultBranch": "main",
          "repositoryId": "1288681123",
          "starterReadmeCreated": true,
          "createdVia": "github_web_ui",
          "verifiedBy": "github_mcp_get_repo",
          "verifiedAt": "2026-07-03T21:18:06.600Z"
        },
        "recordPath": ".codex/connectors/connector-exec-20260703-github-repo-create-live-result.json"
      },
      {
        "id": "connector-exec-20260704-ag-digitalz-content-review-build-live-result",
        "status": "done",
        "action": "create_branch_update_files_open_pr",
        "projectId": "project-social-media-management-system-v1",
        "approvalId": "approval-20260704-ag-digitalz-content-review-build",
        "result": {
          "repositoryFullName": "gurnoorbassi/ag-social-media-management-system",
          "repositoryUrl": "https://github.com/gurnoorbassi/ag-social-media-management-system",
          "baseBranch": "main",
          "baseSha": "c6dc28dee2f50324322c476cb0d4174f853e8d68",
          "targetBranch": "ag-os/ag-digitalz-content-review-v1",
          "pullRequestNumber": 5,
          "pullRequestState": "open",
          "pullRequestUrl": "https://github.com/gurnoorbassi/ag-social-media-management-system/pull/5",
          "pullRequestMerged": false,
          "headSha": "7e49b37330bdd54e598ac82a3ae205519725d795",
          "filesChanged": [
            "README.md",
            "package.json",
            "index.html",
            "src/main.js",
            "src/styles.css",
            "src/data/templates.js",
            "src/lib/safety.js",
            "src/lib/status.js"
          ],
          "contentReviewSprint": {
            "sprintId": "ag-digitalz-content-review-refinement-v1",
            "postsReviewed": 21,
            "postsRevised": 21,
            "approvedDraft": 21,
            "needsRevision": 0,
            "blockedByMissingProof": 0,
            "blockedByMissingHandle": 0,
            "weeklyReportDrafts": 1,
            "pendingDraftApprovals": 22,
            "missingHandles": [
              "Instagram",
              "TikTok",
              "YouTube Shorts",
              "LinkedIn"
            ],
            "mode": "draft_only",
            "livePostingBlocked": true,
            "credentialsStored": false,
            "socialOauthConnected": false,
            "schedulingBlocked": true,
            "analyticsApiBlocked": true,
            "n8nAutomationBlocked": true
          },
          "targetRepoChecks": [
            "npm.cmd run check passed",
            "npm.cmd test passed",
            "npm.cmd run build passed",
            "direct draft-only content review safety assertion passed",
            "git diff --check passed"
          ],
          "verifiedBy": "github_mcp_and_local_git",
          "verifiedAt": "2026-07-05T05:26:42Z"
        },
        "recordPath": ".codex/connectors/connector-exec-20260704-ag-digitalz-content-review-build-live-result.json"
      },
      {
        "id": "connector-exec-20260704-ag-digitalz-draft-approval-build-live-result",
        "status": "done",
        "action": "create_branch_update_files_open_pr",
        "projectId": "project-social-media-management-system-v1",
        "approvalId": "approval-20260704-ag-digitalz-draft-approval-oauth-readiness",
        "result": {
          "repositoryFullName": "gurnoorbassi/ag-social-media-management-system",
          "repositoryUrl": "https://github.com/gurnoorbassi/ag-social-media-management-system",
          "baseBranch": "main",
          "baseSha": "68fee78ecf97c2f84a1bf76ff82658b99ee5f8ce",
          "headBranch": "ag-os/ag-digitalz-draft-approval-v1",
          "headSha": "4a8b28972ae5f5ddf733d149fcd8048ddbba83a9",
          "pullRequestNumber": 6,
          "pullRequestUrl": "https://github.com/gurnoorbassi/ag-social-media-management-system/pull/6",
          "pullRequestStateAfterOpen": "open",
          "filesChanged": [
            "README.md",
            "package.json",
            "src/data/templates.js",
            "src/lib/safety.js",
            "src/lib/status.js",
            "src/main.js",
            "src/styles.css"
          ],
          "targetChecks": {
            "npmRunCheck": "passed",
            "npmTest": "passed",
            "npmRunBuild": "passed",
            "gitDiffCheck": "passed",
            "dataAssertion": "passed"
          },
          "verifiedBy": "local_git_and_github_mcp",
          "verifiedAt": "2026-07-05T06:37:48Z"
        },
        "recordPath": ".codex/connectors/connector-exec-20260704-ag-digitalz-draft-approval-build-live-result.json"
      },
      {
        "id": "connector-exec-20260704-ag-digitalz-draft-config-build-live-result",
        "status": "done",
        "action": "create_branch_update_files_open_pr",
        "projectId": "project-social-media-management-system-v1",
        "approvalId": "approval-20260704-ag-digitalz-draft-config-build",
        "result": {
          "repositoryFullName": "gurnoorbassi/ag-social-media-management-system",
          "repositoryUrl": "https://github.com/gurnoorbassi/ag-social-media-management-system",
          "baseBranch": "main",
          "baseSha": "7204846654ef448f6c0c78027a569b7707c618b8",
          "targetBranch": "ag-os/ag-digitalz-draft-config",
          "pullRequestNumber": 3,
          "pullRequestState": "open",
          "pullRequestUrl": "https://github.com/gurnoorbassi/ag-social-media-management-system/pull/3",
          "pullRequestMerged": false,
          "headSha": "8b5fb0d006dae82fbf41b1064b8325424a447853",
          "filesChanged": [
            "README.md",
            "package.json",
            "index.html",
            "src/main.js",
            "src/styles.css",
            "src/data/templates.js",
            "src/lib/safety.js",
            "src/lib/status.js"
          ],
          "updatedFiles": [
            "README.md",
            "package.json",
            "index.html",
            "src/main.js",
            "src/styles.css",
            "src/data/templates.js",
            "src/lib/safety.js",
            "src/lib/status.js"
          ],
          "targetRepoChecks": [
            "npm.cmd run check passed",
            "npm.cmd test passed",
            "npm.cmd run build passed",
            "direct draft-only safety assertion passed",
            "git diff --check passed"
          ],
          "verifiedBy": "github_mcp_and_local_git",
          "verifiedAt": "2026-07-05T01:52:50Z"
        },
        "recordPath": ".codex/connectors/connector-exec-20260704-ag-digitalz-draft-config-build-live-result.json"
      },
      {
        "id": "connector-exec-20260704-ag-digitalz-first-content-sprint-build-live-result",
        "status": "done",
        "action": "create_branch_update_files_open_pr",
        "projectId": "project-social-media-management-system-v1",
        "approvalId": "approval-20260704-ag-digitalz-first-content-sprint-build",
        "result": {
          "repositoryFullName": "gurnoorbassi/ag-social-media-management-system",
          "repositoryUrl": "https://github.com/gurnoorbassi/ag-social-media-management-system",
          "baseBranch": "main",
          "baseSha": "6f54d3b5b257c2662319f39c0b89f810e22289e5",
          "targetBranch": "ag-os/ag-digitalz-first-content-sprint-v1",
          "pullRequestNumber": 4,
          "pullRequestState": "open",
          "pullRequestUrl": "https://github.com/gurnoorbassi/ag-social-media-management-system/pull/4",
          "pullRequestMerged": false,
          "headSha": "02a749ff3348be9c57f34726f104f381e228b1cd",
          "filesChanged": [
            "README.md",
            "package.json",
            "index.html",
            "src/main.js",
            "src/styles.css",
            "src/data/templates.js",
            "src/lib/safety.js",
            "src/lib/status.js"
          ],
          "contentSprint": {
            "sprintId": "ag-digitalz-first-content-sprint-v1",
            "calendarDays": 7,
            "draftPostPackages": 21,
            "weeklyReportDrafts": 1,
            "pendingDraftApprovals": 22,
            "platforms": [
              "Instagram",
              "TikTok",
              "YouTube Shorts",
              "LinkedIn"
            ],
            "mode": "draft_only",
            "livePostingBlocked": true,
            "credentialsStored": false,
            "socialOauthConnected": false
          },
          "targetRepoChecks": [
            "npm.cmd run check passed",
            "npm.cmd test passed",
            "npm.cmd run build passed",
            "direct draft-only safety assertion passed",
            "git diff --check passed"
          ],
          "verifiedBy": "github_mcp_and_local_git",
          "verifiedAt": "2026-07-05T04:36:18Z"
        },
        "recordPath": ".codex/connectors/connector-exec-20260704-ag-digitalz-first-content-sprint-build-live-result.json"
      },
      {
        "id": "connector-exec-20260704-github-builder-pr-live-result",
        "status": "done",
        "action": "create_branch_create_files_update_files_open_pr",
        "projectId": "project-unregistered-construction-website",
        "approvalId": "approval-20260704-github-builder-pr",
        "result": {
          "repositoryFullName": "gurnoorbassi/ag-test-construction-website",
          "repositoryUrl": "https://github.com/gurnoorbassi/ag-test-construction-website",
          "repositoryVisibility": "private",
          "baseBranch": "main",
          "targetBranch": "ag-os/starter-construction-website-v1",
          "pullRequestNumber": 1,
          "pullRequestState": "open",
          "pullRequestUrl": "https://github.com/gurnoorbassi/ag-test-construction-website/pull/1",
          "pullRequestMerged": false,
          "headSha": "6af3574df8ef93bb04010e3757587dc3b904afcf",
          "filesChanged": [
            "README.md",
            "package.json",
            "index.html",
            "src/styles.css",
            "src/main.js"
          ],
          "createdFiles": [
            "package.json",
            "index.html",
            "src/styles.css",
            "src/main.js"
          ],
          "updatedFiles": [
            "README.md"
          ],
          "verifiedBy": "github_mcp",
          "verifiedAt": "2026-07-04T09:01:53.688Z"
        },
        "recordPath": ".codex/connectors/connector-exec-20260704-github-builder-pr-live-result.json"
      },
      {
        "id": "connector-exec-20260704-social-media-starter-build-live-result",
        "status": "done",
        "action": "create_branch_create_files_update_files_open_pr",
        "projectId": "project-social-media-management-system-v1",
        "approvalId": "approval-20260704-social-media-starter-build",
        "result": {
          "repositoryFullName": "gurnoorbassi/ag-social-media-management-system",
          "repositoryUrl": "https://github.com/gurnoorbassi/ag-social-media-management-system",
          "repositoryVisibility": "private",
          "baseBranch": "main",
          "baseSha": "cc124110ab5e07e154317fc8eaeb90798e377993",
          "targetBranch": "ag-os/social-media-system-v1-starter",
          "pullRequestNumber": 1,
          "pullRequestState": "open",
          "pullRequestUrl": "https://github.com/gurnoorbassi/ag-social-media-management-system/pull/1",
          "pullRequestMerged": false,
          "headSha": "bf57520a6b08bf5fab9986adc2c9f7ae54b1e5bf",
          "filesChanged": [
            "README.md",
            "package.json",
            "index.html",
            "src/main.js",
            "src/styles.css",
            "src/data/templates.js",
            "src/lib/safety.js",
            "src/lib/status.js"
          ],
          "createdFiles": [
            "package.json",
            "index.html",
            "src/main.js",
            "src/styles.css",
            "src/data/templates.js",
            "src/lib/safety.js",
            "src/lib/status.js"
          ],
          "updatedFiles": [
            "README.md"
          ],
          "targetRepoCheck": "npm.cmd test passed",
          "verifiedBy": "github_mcp",
          "verifiedAt": "2026-07-04T21:35:09Z"
        },
        "recordPath": ".codex/connectors/connector-exec-20260704-social-media-starter-build-live-result.json"
      },
      {
        "id": "connector-exec-20260704-social-media-system-v1-1-upgrade-live-result",
        "status": "done",
        "action": "create_branch_update_files_open_pr",
        "projectId": "project-social-media-management-system-v1",
        "approvalId": "approval-20260704-social-media-system-v1-1-upgrade",
        "result": {
          "repositoryFullName": "gurnoorbassi/ag-social-media-management-system",
          "repositoryUrl": "https://github.com/gurnoorbassi/ag-social-media-management-system",
          "baseBranch": "main",
          "baseSha": "d3fcd8c6435433169686c2ec404a5f00c6cc62bd",
          "targetBranch": "ag-os/social-media-system-v1-1-upgrade",
          "pullRequestNumber": 2,
          "pullRequestState": "open",
          "pullRequestUrl": "https://github.com/gurnoorbassi/ag-social-media-management-system/pull/2",
          "pullRequestMerged": false,
          "headSha": "e3ab56ec0649e928418acc807c6badee2132521c",
          "filesChanged": [
            "README.md",
            "package.json",
            "index.html",
            "src/main.js",
            "src/styles.css",
            "src/data/templates.js",
            "src/lib/safety.js",
            "src/lib/status.js"
          ],
          "updatedFiles": [
            "README.md",
            "package.json",
            "index.html",
            "src/main.js",
            "src/styles.css",
            "src/data/templates.js",
            "src/lib/safety.js",
            "src/lib/status.js"
          ],
          "targetRepoChecks": [
            "npm.cmd run check passed",
            "npm.cmd test passed",
            "npm.cmd run build passed",
            "git diff --check passed"
          ],
          "verifiedBy": "github_mcp_and_local_git",
          "verifiedAt": "2026-07-05T00:47:02Z"
        },
        "recordPath": ".codex/connectors/connector-exec-20260704-social-media-system-v1-1-upgrade-live-result.json"
      },
      {
        "id": "connector-exec-20260704-target-pr-merge-ag-digitalz-content-review-v1-live-result",
        "status": "done",
        "action": "merge_pr",
        "projectId": "project-social-media-management-system-v1",
        "approvalId": "approval-20260704-target-pr-merge-ag-digitalz-content-review-v1",
        "result": {
          "repositoryFullName": "gurnoorbassi/ag-social-media-management-system",
          "repositoryUrl": "https://github.com/gurnoorbassi/ag-social-media-management-system",
          "pullRequestNumber": 5,
          "pullRequestUrl": "https://github.com/gurnoorbassi/ag-social-media-management-system/pull/5",
          "pullRequestStateBeforeMerge": "open",
          "pullRequestStateAfterMerge": "closed",
          "pullRequestMerged": true,
          "baseBranch": "main",
          "headBranch": "ag-os/ag-digitalz-content-review-v1",
          "headSha": "7e49b37330bdd54e598ac82a3ae205519725d795",
          "mergeCommitSha": "68fee78ecf97c2f84a1bf76ff82658b99ee5f8ce",
          "mergedAt": "2026-07-05T05:48:00Z",
          "filesChanged": [
            "README.md",
            "index.html",
            "package.json",
            "src/data/templates.js",
            "src/lib/safety.js",
            "src/lib/status.js",
            "src/main.js",
            "src/styles.css"
          ],
          "reviewRecordRef": ".codex/audit/audit-runtime-target-pr-review-ag-digitalz-content-review-v1-20260704.json",
          "verifiedBy": "github_mcp",
          "verifiedAt": "2026-07-05T05:48:00Z"
        },
        "recordPath": ".codex/connectors/connector-exec-20260704-target-pr-merge-ag-digitalz-content-review-v1-live-result.json"
      },
      {
        "id": "connector-exec-20260704-target-pr-merge-ag-digitalz-draft-approval-v1-live-result",
        "status": "done",
        "action": "merge_pr",
        "projectId": "project-social-media-management-system-v1",
        "approvalId": "approval-20260704-ag-digitalz-draft-approval-oauth-readiness",
        "result": {
          "repositoryFullName": "gurnoorbassi/ag-social-media-management-system",
          "repositoryUrl": "https://github.com/gurnoorbassi/ag-social-media-management-system",
          "pullRequestNumber": 6,
          "pullRequestUrl": "https://github.com/gurnoorbassi/ag-social-media-management-system/pull/6",
          "pullRequestStateBeforeMerge": "open",
          "pullRequestStateAfterMerge": "closed",
          "pullRequestMerged": true,
          "baseBranch": "main",
          "headBranch": "ag-os/ag-digitalz-draft-approval-v1",
          "headSha": "4a8b28972ae5f5ddf733d149fcd8048ddbba83a9",
          "mergeCommitSha": "392a582a7193412e39b264ce442e0f4949f08c0b",
          "mergedAt": "2026-07-05T06:39:49Z",
          "filesChanged": [
            "README.md",
            "package.json",
            "src/data/templates.js",
            "src/lib/safety.js",
            "src/lib/status.js",
            "src/main.js",
            "src/styles.css"
          ],
          "reviewRecordRef": ".codex/audit/audit-runtime-target-pr-review-ag-digitalz-draft-approval-v1-20260704.json",
          "verifiedBy": "github_mcp",
          "verifiedAt": "2026-07-05T06:39:49Z"
        },
        "recordPath": ".codex/connectors/connector-exec-20260704-target-pr-merge-ag-digitalz-draft-approval-v1-live-result.json"
      },
      {
        "id": "connector-exec-20260704-target-pr-merge-ag-digitalz-draft-config-live-result",
        "status": "done",
        "action": "merge_pr",
        "projectId": "project-social-media-management-system-v1",
        "approvalId": "approval-20260704-target-pr-merge-ag-digitalz-draft-config",
        "result": {
          "repositoryFullName": "gurnoorbassi/ag-social-media-management-system",
          "repositoryUrl": "https://github.com/gurnoorbassi/ag-social-media-management-system",
          "pullRequestNumber": 3,
          "pullRequestUrl": "https://github.com/gurnoorbassi/ag-social-media-management-system/pull/3",
          "pullRequestStateBeforeMerge": "open",
          "pullRequestStateAfterMerge": "closed",
          "pullRequestMerged": true,
          "baseBranch": "main",
          "headBranch": "ag-os/ag-digitalz-draft-config",
          "headSha": "8b5fb0d006dae82fbf41b1064b8325424a447853",
          "mergeCommitSha": "6f54d3b5b257c2662319f39c0b89f810e22289e5",
          "mergedAt": "2026-07-05T02:05:01Z",
          "filesChanged": [
            "README.md",
            "package.json",
            "index.html",
            "src/main.js",
            "src/styles.css",
            "src/data/templates.js",
            "src/lib/safety.js",
            "src/lib/status.js"
          ],
          "reviewRecordRef": ".codex/audit/audit-runtime-target-pr-review-ag-digitalz-draft-config-20260704.json",
          "verifiedBy": "github_mcp",
          "verifiedAt": "2026-07-05T02:05:01Z"
        },
        "recordPath": ".codex/connectors/connector-exec-20260704-target-pr-merge-ag-digitalz-draft-config-live-result.json"
      },
      {
        "id": "connector-exec-20260704-target-pr-merge-ag-digitalz-first-content-sprint-v1-live-result",
        "status": "done",
        "action": "merge_pr",
        "projectId": "project-social-media-management-system-v1",
        "approvalId": "approval-20260704-target-pr-merge-ag-digitalz-first-content-sprint-v1",
        "result": {
          "repositoryFullName": "gurnoorbassi/ag-social-media-management-system",
          "repositoryUrl": "https://github.com/gurnoorbassi/ag-social-media-management-system",
          "pullRequestNumber": 4,
          "pullRequestUrl": "https://github.com/gurnoorbassi/ag-social-media-management-system/pull/4",
          "pullRequestStateBeforeMerge": "open",
          "pullRequestStateAfterMerge": "closed",
          "pullRequestMerged": true,
          "baseBranch": "main",
          "headBranch": "ag-os/ag-digitalz-first-content-sprint-v1",
          "headSha": "02a749ff3348be9c57f34726f104f381e228b1cd",
          "mergeCommitSha": "c6dc28dee2f50324322c476cb0d4174f853e8d68",
          "mergedAt": "2026-07-05T04:52:30Z",
          "filesChanged": [
            "README.md",
            "package.json",
            "index.html",
            "src/main.js",
            "src/styles.css",
            "src/data/templates.js",
            "src/lib/safety.js",
            "src/lib/status.js"
          ],
          "reviewRecordRef": ".codex/audit/audit-runtime-target-pr-review-ag-digitalz-first-content-sprint-v1-20260704.json",
          "verifiedBy": "github_mcp",
          "verifiedAt": "2026-07-05T04:52:30Z"
        },
        "recordPath": ".codex/connectors/connector-exec-20260704-target-pr-merge-ag-digitalz-first-content-sprint-v1-live-result.json"
      },
      {
        "id": "connector-exec-20260704-target-pr-merge-live-result",
        "status": "done",
        "action": "merge_pr",
        "projectId": "project-unregistered-construction-website",
        "approvalId": "approval-20260704-target-pr-merge-construction-website",
        "result": {
          "repositoryFullName": "gurnoorbassi/ag-test-construction-website",
          "repositoryUrl": "https://github.com/gurnoorbassi/ag-test-construction-website",
          "pullRequestNumber": 1,
          "pullRequestUrl": "https://github.com/gurnoorbassi/ag-test-construction-website/pull/1",
          "pullRequestStateBeforeMerge": "open",
          "pullRequestStateAfterMerge": "closed",
          "pullRequestMerged": true,
          "baseBranch": "main",
          "headBranch": "ag-os/starter-construction-website-v1",
          "headSha": "6af3574df8ef93bb04010e3757587dc3b904afcf",
          "mergeCommitSha": "8c635538d7d5b7bb9918d2ea900c8f934ee98d49",
          "mergedAt": "2026-07-04T10:18:46Z",
          "filesChanged": [
            "README.md",
            "package.json",
            "index.html",
            "src/styles.css",
            "src/main.js"
          ],
          "reviewRecordRef": ".codex/audit/audit-runtime-target-pr-review-construction-website-20260704.json",
          "verifiedBy": "github_mcp",
          "verifiedAt": "2026-07-04T10:18:46Z"
        },
        "recordPath": ".codex/connectors/connector-exec-20260704-target-pr-merge-live-result.json"
      },
      {
        "id": "connector-exec-20260704-target-pr-merge-social-media-system-v1-1-live-result",
        "status": "done",
        "action": "merge_pr",
        "projectId": "project-social-media-management-system-v1",
        "approvalId": "approval-20260704-target-pr-merge-social-media-system-v1-1",
        "result": {
          "repositoryFullName": "gurnoorbassi/ag-social-media-management-system",
          "repositoryUrl": "https://github.com/gurnoorbassi/ag-social-media-management-system",
          "pullRequestNumber": 2,
          "pullRequestUrl": "https://github.com/gurnoorbassi/ag-social-media-management-system/pull/2",
          "pullRequestStateBeforeMerge": "open",
          "pullRequestStateAfterMerge": "closed",
          "pullRequestMerged": true,
          "baseBranch": "main",
          "headBranch": "ag-os/social-media-system-v1-1-upgrade",
          "headSha": "e3ab56ec0649e928418acc807c6badee2132521c",
          "mergeCommitSha": "7204846654ef448f6c0c78027a569b7707c618b8",
          "mergedAt": "2026-07-05T00:56:09Z",
          "filesChanged": [
            "README.md",
            "package.json",
            "index.html",
            "src/main.js",
            "src/styles.css",
            "src/data/templates.js",
            "src/lib/safety.js",
            "src/lib/status.js"
          ],
          "reviewRecordRef": ".codex/audit/audit-runtime-target-pr-review-social-media-system-v1-1-20260704.json",
          "verifiedBy": "github_mcp",
          "verifiedAt": "2026-07-05T00:56:29Z"
        },
        "recordPath": ".codex/connectors/connector-exec-20260704-target-pr-merge-social-media-system-v1-1-live-result.json"
      },
      {
        "id": "connector-exec-20260704-target-pr-merge-social-media-system-v1-live-result",
        "status": "done",
        "action": "merge_pr",
        "projectId": "project-social-media-management-system-v1",
        "approvalId": "approval-20260704-target-pr-merge-social-media-system-v1",
        "result": {
          "repositoryFullName": "gurnoorbassi/ag-social-media-management-system",
          "repositoryUrl": "https://github.com/gurnoorbassi/ag-social-media-management-system",
          "pullRequestNumber": 1,
          "pullRequestUrl": "https://github.com/gurnoorbassi/ag-social-media-management-system/pull/1",
          "pullRequestStateBeforeMerge": "open",
          "pullRequestStateAfterMerge": "closed",
          "pullRequestMerged": true,
          "baseBranch": "main",
          "headBranch": "ag-os/social-media-system-v1-starter",
          "headSha": "bf57520a6b08bf5fab9986adc2c9f7ae54b1e5bf",
          "mergeCommitSha": "d3fcd8c6435433169686c2ec404a5f00c6cc62bd",
          "mergedAt": "2026-07-04T22:31:45Z",
          "filesChanged": [
            "README.md",
            "package.json",
            "index.html",
            "src/main.js",
            "src/styles.css",
            "src/data/templates.js",
            "src/lib/safety.js",
            "src/lib/status.js"
          ],
          "reviewRecordRef": ".codex/audit/audit-runtime-target-pr-review-social-media-system-v1-20260704.json",
          "verifiedBy": "github_mcp",
          "verifiedAt": "2026-07-04T22:31:45Z"
        },
        "recordPath": ".codex/connectors/connector-exec-20260704-target-pr-merge-social-media-system-v1-live-result.json"
      },
      {
        "id": "connector-exec-20260705-ag-digitalz-instagram-handle-build-live-result",
        "status": "done",
        "action": "create_branch_update_files_open_pr_review_merge_pr",
        "projectId": "project-social-media-management-system-v1",
        "approvalId": "approval-20260705-ag-digitalz-instagram-handle-live-update",
        "result": {
          "repositoryFullName": "gurnoorbassi/ag-social-media-management-system",
          "repositoryUrl": "https://github.com/gurnoorbassi/ag-social-media-management-system",
          "baseBranch": "main",
          "baseSha": "daeb7c4f6e0aaaced7b55eb8fa50978320eff15e",
          "headBranch": "ag-os/ag-digitalz-instagram-handle",
          "headSha": "5b1e91a53790e5e00fcf167ed68749e574082025",
          "pullRequestNumber": 8,
          "pullRequestUrl": "https://github.com/gurnoorbassi/ag-social-media-management-system/pull/8",
          "pullRequestMerged": true,
          "mergeCommitSha": "5e6e74f9e90ddfd1c44cc025ead53179f7868b3a",
          "filesChanged": [
            "README.md",
            "package.json",
            "src/data/templates.js",
            "src/lib/safety.js",
            "src/main.js"
          ],
          "targetChecks": {
            "npmRunCheck": "passed",
            "npmTest": "passed",
            "npmRunBuild": "passed",
            "runtimeSafetyAssertion": "passed",
            "gitDiffCheck": "passed",
            "credentialPatternScan": "passed"
          },
          "handleState": {
            "Instagram": "@agdigitalz",
            "TikTok": "not_provided",
            "YouTube Shorts": "not_provided",
            "LinkedIn": "not_provided",
            "connectionStatus": "not_connected",
            "postingMode": "draft_only",
            "approvalRequired": true,
            "livePostingBlocked": true,
            "credentialsStored": false
          },
          "verifiedBy": "local_git_and_github_mcp",
          "verifiedAt": "2026-07-05T19:10:50Z"
        },
        "recordPath": ".codex/connectors/connector-exec-20260705-ag-digitalz-instagram-handle-build-live-result.json"
      },
      {
        "id": "connector-exec-20260705-ag-digitalz-manual-posting-pack-v1-build-live-result",
        "status": "done",
        "action": "create_branch_update_files_open_pr_review_merge_pr",
        "projectId": "project-social-media-management-system-v1",
        "approvalId": "approval-20260705-ag-digitalz-manual-posting-pack-v1",
        "result": {
          "repositoryFullName": "gurnoorbassi/ag-social-media-management-system",
          "repositoryUrl": "https://github.com/gurnoorbassi/ag-social-media-management-system",
          "baseBranch": "main",
          "baseSha": "5e6e74f9e90ddfd1c44cc025ead53179f7868b3a",
          "headBranch": "ag-os/manual-posting-pack-v1",
          "headSha": "1f4b35d1db6b36b0a67cd172d0d2e71bd3b85a2c",
          "pullRequestNumber": 9,
          "pullRequestUrl": "https://github.com/gurnoorbassi/ag-social-media-management-system/pull/9",
          "pullRequestMerged": true,
          "mergeCommitSha": "eaa05e5fcf9fa64e2ae85ace52f7c0949e00841d",
          "filesChanged": [
            "README.md",
            "package.json",
            "src/data/templates.js",
            "src/lib/safety.js",
            "src/lib/status.js",
            "src/main.js",
            "src/styles.css"
          ],
          "targetChecks": {
            "npmRunCheck": "passed",
            "npmTest": "passed",
            "npmRunBuild": "passed",
            "gitDiffCheck": "passed",
            "credentialPatternScan": "passed"
          },
          "featuresAdded": [
            "manual_posting_guide",
            "owner_manual_posting_checklist",
            "platform_specific_manual_checklist",
            "copy_ready_text_export",
            "approved_posts_json_export",
            "weekly_report_owner_view",
            "dashboard_owner_attention_state"
          ],
          "verifiedBy": "local_git_and_github_mcp",
          "verifiedAt": "2026-07-05T21:08:30Z"
        },
        "recordPath": ".codex/connectors/connector-exec-20260705-ag-digitalz-manual-posting-pack-v1-build-live-result.json"
      },
      {
        "id": "connector-exec-20260705-social-media-interactive-draft-ui-build-live-result",
        "status": "done",
        "action": "create_branch_update_files_open_pr_review_merge_pr",
        "projectId": "project-social-media-management-system-v1",
        "approvalId": "approval-20260705-social-media-interactive-draft-ui",
        "result": {
          "repositoryFullName": "gurnoorbassi/ag-social-media-management-system",
          "repositoryUrl": "https://github.com/gurnoorbassi/ag-social-media-management-system",
          "baseBranch": "main",
          "baseSha": "392a582a7193412e39b264ce442e0f4949f08c0b",
          "headBranch": "ag-os/social-media-interactive-draft-ui-v1",
          "headSha": "87f5d13dc47daaa1eca42e13326a55c2b38813d1",
          "pullRequestNumber": 7,
          "pullRequestUrl": "https://github.com/gurnoorbassi/ag-social-media-management-system/pull/7",
          "pullRequestMerged": true,
          "mergeCommitSha": "daeb7c4f6e0aaaced7b55eb8fa50978320eff15e",
          "filesChanged": [
            "README.md",
            "index.html",
            "package.json",
            "src/data/templates.js",
            "src/main.js",
            "src/styles.css"
          ],
          "targetChecks": {
            "npmRunCheck": "passed",
            "npmTest": "passed",
            "npmRunBuild": "passed",
            "gitDiffCheck": "passed",
            "credentialPatternScan": "passed"
          },
          "interactionsAdded": [
            "clickable_navigation_tabs",
            "post_package_expansion",
            "copy_hook_caption_cta",
            "calendar_day_selection",
            "platform_filter",
            "content_pillar_filter",
            "approval_queue_local_viewed_state",
            "weekly_report_copy",
            "weekly_report_download",
            "blocked_action_explanations"
          ],
          "verifiedBy": "local_git_and_github_mcp",
          "verifiedAt": "2026-07-05T07:52:00Z"
        },
        "recordPath": ".codex/connectors/connector-exec-20260705-social-media-interactive-draft-ui-build-live-result.json"
      },
      {
        "id": "connector-exec-runtime-construction-website-automated-20260703-github",
        "status": "waiting_approval",
        "action": "future_repository_creation_or_pull_request_work",
        "projectId": "project-unregistered-construction-website",
        "approvalId": "not_required",
        "result": {},
        "recordPath": ".codex/connectors/connector-exec-runtime-construction-website-automated-20260703-github.json"
      },
      {
        "id": "connector-exec-runtime-github-construction-website-repo-20260703-create-branch",
        "status": "waiting_approval",
        "action": "create_branch",
        "projectId": "project-unregistered-construction-website",
        "approvalId": "not_required",
        "result": {},
        "recordPath": ".codex/connectors/connector-exec-runtime-github-construction-website-repo-20260703-create-branch.json"
      },
      {
        "id": "connector-exec-runtime-github-construction-website-repo-20260703-create-files",
        "status": "waiting_approval",
        "action": "create_files",
        "projectId": "project-unregistered-construction-website",
        "approvalId": "not_required",
        "result": {},
        "recordPath": ".codex/connectors/connector-exec-runtime-github-construction-website-repo-20260703-create-files.json"
      },
      {
        "id": "connector-exec-runtime-github-construction-website-repo-20260703-create-repo",
        "status": "waiting_approval",
        "action": "create_repo",
        "projectId": "project-unregistered-construction-website",
        "approvalId": "not_required",
        "result": {},
        "recordPath": ".codex/connectors/connector-exec-runtime-github-construction-website-repo-20260703-create-repo.json"
      },
      {
        "id": "connector-exec-runtime-github-construction-website-repo-20260703-merge-pr",
        "status": "waiting_approval",
        "action": "merge_pr",
        "projectId": "project-unregistered-construction-website",
        "approvalId": "not_required",
        "result": {},
        "recordPath": ".codex/connectors/connector-exec-runtime-github-construction-website-repo-20260703-merge-pr.json"
      },
      {
        "id": "connector-exec-runtime-github-construction-website-repo-20260703-open-pr",
        "status": "waiting_approval",
        "action": "open_pr",
        "projectId": "project-unregistered-construction-website",
        "approvalId": "not_required",
        "result": {},
        "recordPath": ".codex/connectors/connector-exec-runtime-github-construction-website-repo-20260703-open-pr.json"
      },
      {
        "id": "connector-exec-runtime-github-construction-website-repo-20260703-poll-ci",
        "status": "waiting_approval",
        "action": "poll_ci",
        "projectId": "project-unregistered-construction-website",
        "approvalId": "not_required",
        "result": {},
        "recordPath": ".codex/connectors/connector-exec-runtime-github-construction-website-repo-20260703-poll-ci.json"
      },
      {
        "id": "connector-exec-runtime-github-construction-website-repo-20260703-update-files",
        "status": "waiting_approval",
        "action": "update_files",
        "projectId": "project-unregistered-construction-website",
        "approvalId": "not_required",
        "result": {},
        "recordPath": ".codex/connectors/connector-exec-runtime-github-construction-website-repo-20260703-update-files.json"
      }
    ],
    "netlify": [
      {
        "id": "connector-exec-20260704-ag-digitalz-content-review-netlify-staging-live-result",
        "status": "done",
        "siteName": "ag-social-media-management-system-staging",
        "siteUrl": "https://ag-social-media-management-system-staging.netlify.app",
        "deployStatus": "ready",
        "deployId": "6a49f1d33942a79f4190240c",
        "deployContext": "production",
        "stagingInterpretation": "This is the primary deploy context of the dedicated Netlify staging-only site, not an AG Digitalz production domain, customer production domain, or production customer system.",
        "httpStatus": 200,
        "verifiedAt": "2026-07-05T05:55:37Z",
        "sourceRepo": "gurnoorbassi/ag-social-media-management-system",
        "sourceSha": "68fee78ecf97c2f84a1bf76ff82658b99ee5f8ce",
        "stagingOnly": true,
        "recordPath": ".codex/connectors/connector-exec-20260704-ag-digitalz-content-review-netlify-staging-live-result.json"
      },
      {
        "id": "connector-exec-20260704-ag-digitalz-draft-approval-netlify-staging-live-result",
        "status": "done",
        "siteName": "ag-social-media-management-system-staging",
        "siteUrl": "https://ag-social-media-management-system-staging.netlify.app",
        "deployStatus": "ready",
        "deployId": "6a49fc6c75a309fb314ffb9d",
        "deployContext": "production",
        "stagingInterpretation": "This is the primary deploy context of the dedicated Netlify staging-only site, not an AG Digitalz production domain, customer production domain, or production customer system.",
        "httpStatus": 200,
        "verifiedAt": "2026-07-05T06:40:50Z",
        "sourceRepo": "gurnoorbassi/ag-social-media-management-system",
        "sourceSha": "392a582a7193412e39b264ce442e0f4949f08c0b",
        "stagingOnly": true,
        "recordPath": ".codex/connectors/connector-exec-20260704-ag-digitalz-draft-approval-netlify-staging-live-result.json"
      },
      {
        "id": "connector-exec-20260704-ag-digitalz-first-content-sprint-netlify-staging-live-result",
        "status": "done",
        "siteName": "ag-social-media-management-system-staging",
        "siteUrl": "https://ag-social-media-management-system-staging.netlify.app",
        "deployStatus": "ready",
        "deployId": "6a49e480fbe8fbbb83b933dc",
        "deployContext": "production",
        "stagingInterpretation": "This is the primary deploy context of the dedicated Netlify staging-only site, not an AG Digitalz production domain, customer production domain, or production customer system.",
        "httpStatus": 200,
        "verifiedAt": "2026-07-05T04:58:46Z",
        "sourceRepo": "gurnoorbassi/ag-social-media-management-system",
        "sourceSha": "c6dc28dee2f50324322c476cb0d4174f853e8d68",
        "stagingOnly": true,
        "recordPath": ".codex/connectors/connector-exec-20260704-ag-digitalz-first-content-sprint-netlify-staging-live-result.json"
      },
      {
        "id": "connector-exec-20260704-ag-digitalz-netlify-staging-redeploy-live-result",
        "status": "done",
        "siteName": "ag-social-media-management-system-staging",
        "siteUrl": "https://ag-social-media-management-system-staging.netlify.app",
        "deployStatus": "ready",
        "deployId": "6a49bd1932f7ae16701ece3f",
        "deployContext": "production",
        "stagingInterpretation": "This is the primary deploy context of the dedicated Netlify staging-only site, not an AG Digitalz production domain, customer production domain, or production customer system.",
        "httpStatus": 200,
        "verifiedAt": "2026-07-05T02:10:39Z",
        "sourceRepo": "gurnoorbassi/ag-social-media-management-system",
        "sourceSha": "6f54d3b5b257c2662319f39c0b89f810e22289e5",
        "stagingOnly": true,
        "recordPath": ".codex/connectors/connector-exec-20260704-ag-digitalz-netlify-staging-redeploy-live-result.json"
      },
      {
        "id": "connector-exec-20260704-netlify-staging-live-result",
        "status": "done",
        "siteName": "ag-test-construction-website-staging",
        "siteUrl": "https://ag-test-construction-website-staging.netlify.app",
        "deployStatus": "ready",
        "deployId": "6a48e6777c5c2f79b36d8c40",
        "deployContext": "production",
        "stagingInterpretation": "This is the primary deploy context of the dedicated Netlify staging site, not an AG Digitalz production domain or production customer system.",
        "httpStatus": "Not recorded",
        "verifiedAt": "2026-07-04T10:55:00.383Z",
        "sourceRepo": "gurnoorbassi/ag-test-construction-website",
        "sourceSha": "8c635538d7d5b7bb9918d2ea900c8f934ee98d49",
        "stagingOnly": true,
        "recordPath": ".codex/connectors/connector-exec-20260704-netlify-staging-live-result.json"
      },
      {
        "id": "connector-exec-20260704-social-media-netlify-staging-live-result",
        "status": "done",
        "siteName": "ag-social-media-management-system-staging",
        "siteUrl": "https://ag-social-media-management-system-staging.netlify.app",
        "deployStatus": "ready",
        "deployId": "6a49952960455c99f92eadc0",
        "deployContext": "production",
        "stagingInterpretation": "This is the primary deploy context of the dedicated Netlify staging-only site, not an AG Digitalz production domain, customer production domain, or production customer system.",
        "httpStatus": 200,
        "verifiedAt": "2026-07-04T23:20:51.558Z",
        "sourceRepo": "gurnoorbassi/ag-social-media-management-system",
        "sourceSha": "d3fcd8c6435433169686c2ec404a5f00c6cc62bd",
        "stagingOnly": true,
        "recordPath": ".codex/connectors/connector-exec-20260704-social-media-netlify-staging-live-result.json"
      },
      {
        "id": "connector-exec-20260704-social-media-netlify-staging-v1-1-live-result",
        "status": "done",
        "siteName": "ag-social-media-management-system-staging",
        "siteUrl": "https://ag-social-media-management-system-staging.netlify.app",
        "deployStatus": "ready",
        "deployId": "6a49ad36a73303e2fa05755f",
        "deployContext": "production",
        "stagingInterpretation": "This is the primary deploy context of the dedicated Netlify staging-only site, not an AG Digitalz production domain, customer production domain, or production customer system.",
        "httpStatus": 200,
        "verifiedAt": "2026-07-05T01:02:54Z",
        "sourceRepo": "gurnoorbassi/ag-social-media-management-system",
        "sourceSha": "7204846654ef448f6c0c78027a569b7707c618b8",
        "stagingOnly": true,
        "recordPath": ".codex/connectors/connector-exec-20260704-social-media-netlify-staging-v1-1-live-result.json"
      },
      {
        "id": "connector-exec-20260705-ag-digitalz-instagram-handle-netlify-staging-live-result",
        "status": "done",
        "siteName": "ag-social-media-management-system-staging",
        "siteUrl": "https://ag-social-media-management-system-staging.netlify.app",
        "deployStatus": "ready",
        "deployId": "6a4aabf08e52adba086014c2",
        "deployContext": "production",
        "stagingInterpretation": "This is the primary deploy context of the dedicated Netlify staging-only site, not an AG Digitalz production domain, customer production domain, or production customer system.",
        "httpStatus": 200,
        "verifiedAt": "2026-07-05T19:10:50Z",
        "sourceRepo": "Not recorded",
        "sourceSha": "5e6e74f9e90ddfd1c44cc025ead53179f7868b3a",
        "stagingOnly": true,
        "recordPath": ".codex/connectors/connector-exec-20260705-ag-digitalz-instagram-handle-netlify-staging-live-result.json"
      },
      {
        "id": "connector-exec-20260705-ag-digitalz-manual-posting-pack-v1-netlify-staging-live-result",
        "status": "done",
        "siteName": "ag-social-media-management-system-staging",
        "siteUrl": "https://ag-social-media-management-system-staging.netlify.app",
        "deployStatus": "ready",
        "deployId": "6a4ac78160b0ee09bacf9015",
        "deployContext": "production",
        "stagingInterpretation": "This is the primary deploy context of the dedicated Netlify staging-only site, not an AG Digitalz production domain, customer production domain, or production customer system.",
        "httpStatus": 200,
        "verifiedAt": "2026-07-05T21:08:30Z",
        "sourceRepo": "Not recorded",
        "sourceSha": "eaa05e5fcf9fa64e2ae85ace52f7c0949e00841d",
        "stagingOnly": true,
        "recordPath": ".codex/connectors/connector-exec-20260705-ag-digitalz-manual-posting-pack-v1-netlify-staging-live-result.json"
      },
      {
        "id": "connector-exec-20260705-ag-os-dashboard-netlify-staging-live-result",
        "status": "done",
        "siteName": "ag-os-dashboard-staging",
        "siteUrl": "https://ag-os-dashboard-staging.netlify.app",
        "deployStatus": "ready",
        "deployId": "6a4a112f93f9181e0fad6193",
        "deployContext": "production",
        "stagingInterpretation": "This is the primary deploy context of the dedicated Netlify staging-only site, not a custom domain, DNS change, or AG Digitalz/customer production deployment.",
        "httpStatus": 200,
        "verifiedAt": "2026-07-05T08:12:00Z",
        "sourceRepo": "Not recorded",
        "sourceSha": "a7cbe9b56c57754b3628c7e51a3d42c0747d0472",
        "stagingOnly": true,
        "recordPath": ".codex/connectors/connector-exec-20260705-ag-os-dashboard-netlify-staging-live-result.json"
      },
      {
        "id": "connector-exec-20260705-social-media-interactive-draft-ui-netlify-staging-live-result",
        "status": "done",
        "siteName": "ag-social-media-management-system-staging",
        "siteUrl": "https://ag-social-media-management-system-staging.netlify.app",
        "deployStatus": "ready",
        "deployId": "6a4a0caed37d0800a1f19a0d",
        "deployContext": "production",
        "stagingInterpretation": "This is the primary deploy context of the dedicated Netlify staging-only site, not an AG Digitalz production domain, customer production domain, or production customer system.",
        "httpStatus": 200,
        "verifiedAt": "2026-07-05T07:52:00Z",
        "sourceRepo": "Not recorded",
        "sourceSha": "daeb7c4f6e0aaaced7b55eb8fa50978320eff15e",
        "stagingOnly": true,
        "recordPath": ".codex/connectors/connector-exec-20260705-social-media-interactive-draft-ui-netlify-staging-live-result.json"
      },
      {
        "id": "connector-exec-runtime-construction-website-automated-20260703-netlify",
        "status": "waiting_approval",
        "siteName": "Not recorded",
        "siteUrl": "Not recorded",
        "deployStatus": "Not recorded",
        "deployId": "Not recorded",
        "deployContext": "Not recorded",
        "stagingInterpretation": "Not recorded",
        "httpStatus": "Not recorded",
        "verifiedAt": "2026-07-03T20:20:00.000Z",
        "sourceRepo": "Not recorded",
        "sourceSha": "Not recorded",
        "stagingOnly": false,
        "recordPath": ".codex/connectors/connector-exec-runtime-construction-website-automated-20260703-netlify.json"
      }
    ],
    "n8n": [
      {
        "id": "connector-exec-20260704-n8n-draft-workflow-blocked-oauth",
        "status": "blocked",
        "workflowName": "Construction Website Lead Intake Follow-up Draft",
        "workflowId": "Not recorded",
        "workflowActive": false,
        "credentialConnected": false,
        "workflowExportPath": "Not recorded",
        "recordPath": ".codex/connectors/connector-exec-20260704-n8n-draft-workflow-blocked-oauth.json"
      },
      {
        "id": "connector-exec-20260704-n8n-draft-workflow-live-result",
        "status": "done",
        "workflowName": "Construction Website Lead Intake Follow-up Draft",
        "workflowId": "WaD4uysb8ic0rfsH",
        "workflowActive": false,
        "credentialConnected": false,
        "workflowExportPath": ".codex/n8n/exports/n8n-export-20260704-construction-lead-draft-proof-success.json",
        "recordPath": ".codex/connectors/connector-exec-20260704-n8n-draft-workflow-live-result.json"
      },
      {
        "id": "connector-exec-runtime-construction-website-automated-20260703-n8n",
        "status": "waiting_approval",
        "workflowName": "Not recorded",
        "workflowId": "Not recorded",
        "workflowActive": false,
        "credentialConnected": false,
        "workflowExportPath": "Not recorded",
        "recordPath": ".codex/connectors/connector-exec-runtime-construction-website-automated-20260703-n8n.json"
      }
    ],
    "n8nActiveWorkflowCount": 0,
    "n8nActiveWorkflowSource": "source-controlled export/connector records only"
  },
  "qualityReview": {
    "critiquesCount": 11,
    "latestCritiques": [
      {
        "critiqueId": "critique-runtime-target-pr-review-ag-digitalz-manual-posting-pack-v1-20260705",
        "sourcePlanId": "runtime-target-pr-review-ag-digitalz-manual-posting-pack-v1-20260705",
        "archetypeId": "archetype-social-media-content-operations-system",
        "reviewStatus": "pass",
        "blocksBuildMode": false,
        "findingCount": 4,
        "requiredFixCount": 0,
        "createdAt": "2026-07-05T21:08:30Z",
        "recordPath": ".codex/critiques/critique-runtime-target-pr-review-ag-digitalz-manual-posting-pack-v1-20260705.json"
      },
      {
        "critiqueId": "critique-runtime-target-pr-review-ag-digitalz-instagram-handle-20260705",
        "sourcePlanId": "runtime-target-pr-review-ag-digitalz-instagram-handle-20260705",
        "archetypeId": "archetype-social-media-content-operations-system",
        "reviewStatus": "pass",
        "blocksBuildMode": false,
        "findingCount": 3,
        "requiredFixCount": 0,
        "createdAt": "2026-07-05T19:10:50Z",
        "recordPath": ".codex/critiques/critique-runtime-target-pr-review-ag-digitalz-instagram-handle-20260705.json"
      },
      {
        "critiqueId": "critique-runtime-target-pr-review-social-media-interactive-draft-ui-v1-20260705",
        "sourcePlanId": "runtime-target-pr-review-social-media-interactive-draft-ui-v1-20260705",
        "archetypeId": "archetype-social-media-content-operations-system",
        "reviewStatus": "pass",
        "blocksBuildMode": false,
        "findingCount": 4,
        "requiredFixCount": 0,
        "createdAt": "2026-07-05T07:52:00Z",
        "recordPath": ".codex/critiques/critique-runtime-target-pr-review-social-media-interactive-draft-ui-v1-20260705.json"
      },
      {
        "critiqueId": "critique-runtime-target-pr-review-ag-digitalz-draft-approval-v1-20260704",
        "sourcePlanId": "runtime-target-pr-review-ag-digitalz-draft-approval-v1-20260704",
        "archetypeId": "archetype-social-media-content-operations-system",
        "reviewStatus": "pass",
        "blocksBuildMode": false,
        "findingCount": 4,
        "requiredFixCount": 0,
        "createdAt": "2026-07-05T06:37:48Z",
        "recordPath": ".codex/critiques/critique-runtime-target-pr-review-ag-digitalz-draft-approval-v1-20260704.json"
      },
      {
        "critiqueId": "critique-runtime-target-pr-review-ag-digitalz-content-review-v1-20260704",
        "sourcePlanId": "runtime-target-pr-review-ag-digitalz-content-review-v1-20260704",
        "archetypeId": "archetype-social-media-content-operations-system",
        "reviewStatus": "pass",
        "blocksBuildMode": false,
        "findingCount": 6,
        "requiredFixCount": 0,
        "createdAt": "2026-07-05T05:39:30Z",
        "recordPath": ".codex/critiques/critique-runtime-target-pr-review-ag-digitalz-content-review-v1-20260704.json"
      }
    ],
    "reviewRequiredCount": 0,
    "failedCount": 0,
    "qualityScoreCount": 15,
    "latestQualityScores": [
      {
        "scoreId": "quality-score-20260713-runtime-ag-os-accepted-lesson-reuse-proof-20260713",
        "scoreType": "plan_quality_score",
        "status": "candidate",
        "projectId": "project-ag-os-coordinator-runtime",
        "archetypeId": "archetype-dashboard",
        "overallScore": 9.1,
        "reviewStatus": "pass",
        "updatedAt": "2026-07-13T09:35:12.629Z",
        "recordPath": ".codex/quality-scores/quality-score-20260713-runtime-ag-os-accepted-lesson-reuse-proof-20260713.json"
      },
      {
        "scoreId": "quality-score-20260713-runtime-social-doc-consolidation-20260713",
        "scoreType": "plan_quality_score",
        "status": "candidate",
        "projectId": "project-social-media-management-system-v1",
        "archetypeId": "archetype-social-media-content-operations-system",
        "overallScore": 9.1,
        "reviewStatus": "pass",
        "updatedAt": "2026-07-13T09:23:27.690Z",
        "recordPath": ".codex/quality-scores/quality-score-20260713-runtime-social-doc-consolidation-20260713.json"
      },
      {
        "scoreId": "quality-score-20260713-runtime-ag-os-compounding-completion-20260713",
        "scoreType": "plan_quality_score",
        "status": "candidate",
        "projectId": "project-ag-os-coordinator-runtime",
        "archetypeId": "archetype-dashboard",
        "overallScore": 9.1,
        "reviewStatus": "pass",
        "updatedAt": "2026-07-13T09:23:19.817Z",
        "recordPath": ".codex/quality-scores/quality-score-20260713-runtime-ag-os-compounding-completion-20260713.json"
      },
      {
        "scoreId": "quality-score-runtime-target-pr-review-ag-digitalz-manual-posting-pack-v1-20260705",
        "scoreType": "product_quality_score",
        "status": "candidate",
        "projectId": "project-social-media-management-system-v1",
        "archetypeId": "archetype-social-media-content-operations-system",
        "overallScore": 9.3,
        "reviewStatus": "pass",
        "updatedAt": "2026-07-05T21:08:30Z",
        "recordPath": ".codex/quality-scores/quality-score-runtime-target-pr-review-ag-digitalz-manual-posting-pack-v1-20260705.json"
      },
      {
        "scoreId": "quality-score-runtime-target-pr-review-ag-digitalz-instagram-handle-20260705",
        "scoreType": "product_quality_score",
        "status": "candidate",
        "projectId": "project-social-media-management-system-v1",
        "archetypeId": "archetype-social-media-content-operations-system",
        "overallScore": 9.3,
        "reviewStatus": "pass",
        "updatedAt": "2026-07-05T19:10:50Z",
        "recordPath": ".codex/quality-scores/quality-score-runtime-target-pr-review-ag-digitalz-instagram-handle-20260705.json"
      }
    ],
    "candidateLessonCount": 23,
    "acceptedLessonCount": 1,
    "candidatesLoadedAsTruth": false
  },
  "unifiedMemory": {
    "status": "active",
    "registryPath": ".codex/memory/registry.json",
    "acceptedCount": 1,
    "candidateCount": 23,
    "rejectedCount": 0,
    "conflictCount": 0,
    "staleCount": 0,
    "decisionQueueCount": 23,
    "candidatesLoadedAsTruth": false,
    "rejectedLoadedAsTruth": false,
    "acceptedLessonsLoadedByRuntime": true,
    "memoryGrantsPermission": false,
    "skillsGrantPermission": false,
    "latestAcceptedLessons": [
      {
        "lessonId": "lesson-20260713-runtime-ag-os-compounding-completion-20260713-03",
        "title": "Reuse archetype-backed scoring for dashboard",
        "scope": "agent_shared",
        "status": "accepted",
        "confidence": "high",
        "updatedAt": "2026-07-13T09:32:26.020Z",
        "recordPath": ".codex/memory/accepted/lesson-20260713-runtime-ag-os-compounding-completion-20260713-03.json"
      }
    ],
    "latestCandidateLessons": [
      {
        "lessonId": "lesson-20260713-runtime-ag-os-accepted-lesson-reuse-proof-20260713-01",
        "title": "Improve low quality dimensions for archetype-dashboard",
        "scope": "agent_shared",
        "status": "candidate",
        "confidence": "medium",
        "updatedAt": "2026-07-13T09:35:12.629Z",
        "recordPath": ".codex/memory/lessons/candidates/lesson-20260713-runtime-ag-os-accepted-lesson-reuse-proof-20260713-01.json"
      },
      {
        "lessonId": "lesson-20260713-runtime-ag-os-accepted-lesson-reuse-proof-20260713-02",
        "title": "Preserve recommendations from quality-score-20260713-runtime-ag-os-accepted-lesson-reuse-proof-20260713",
        "scope": "agent_shared",
        "status": "candidate",
        "confidence": "medium",
        "updatedAt": "2026-07-13T09:35:12.629Z",
        "recordPath": ".codex/memory/lessons/candidates/lesson-20260713-runtime-ag-os-accepted-lesson-reuse-proof-20260713-02.json"
      },
      {
        "lessonId": "lesson-20260713-runtime-ag-os-accepted-lesson-reuse-proof-20260713-03",
        "title": "Reuse archetype-backed scoring for dashboard",
        "scope": "agent_shared",
        "status": "candidate",
        "confidence": "high",
        "updatedAt": "2026-07-13T09:35:12.629Z",
        "recordPath": ".codex/memory/lessons/candidates/lesson-20260713-runtime-ag-os-accepted-lesson-reuse-proof-20260713-03.json"
      },
      {
        "lessonId": "lesson-20260713-runtime-social-doc-consolidation-20260713-01",
        "title": "Improve low quality dimensions for archetype-social-media-content-operations-system",
        "scope": "agent_shared",
        "status": "candidate",
        "confidence": "medium",
        "updatedAt": "2026-07-13T09:23:27.690Z",
        "recordPath": ".codex/memory/lessons/candidates/lesson-20260713-runtime-social-doc-consolidation-20260713-01.json"
      },
      {
        "lessonId": "lesson-20260713-runtime-social-doc-consolidation-20260713-02",
        "title": "Preserve recommendations from quality-score-20260713-runtime-social-doc-consolidation-20260713",
        "scope": "agent_shared",
        "status": "candidate",
        "confidence": "medium",
        "updatedAt": "2026-07-13T09:23:27.690Z",
        "recordPath": ".codex/memory/lessons/candidates/lesson-20260713-runtime-social-doc-consolidation-20260713-02.json"
      }
    ],
    "latestRejectedLessons": [],
    "conflicts": [],
    "decisionQueue": [
      {
        "id": "review-lesson-20260713-runtime-ag-os-accepted-lesson-reuse-proof-20260713-01",
        "decisionType": "candidate_lesson_review",
        "status": "review_needed",
        "lessonId": "lesson-20260713-runtime-ag-os-accepted-lesson-reuse-proof-20260713-01",
        "detail": "Owner can promote, reject, or leave candidate advisory.",
        "recordPath": ".codex/memory/lessons/candidates/lesson-20260713-runtime-ag-os-accepted-lesson-reuse-proof-20260713-01.json"
      },
      {
        "id": "review-lesson-20260713-runtime-ag-os-accepted-lesson-reuse-proof-20260713-02",
        "decisionType": "candidate_lesson_review",
        "status": "review_needed",
        "lessonId": "lesson-20260713-runtime-ag-os-accepted-lesson-reuse-proof-20260713-02",
        "detail": "Owner can promote, reject, or leave candidate advisory.",
        "recordPath": ".codex/memory/lessons/candidates/lesson-20260713-runtime-ag-os-accepted-lesson-reuse-proof-20260713-02.json"
      },
      {
        "id": "review-lesson-20260713-runtime-ag-os-accepted-lesson-reuse-proof-20260713-03",
        "decisionType": "candidate_lesson_review",
        "status": "review_needed",
        "lessonId": "lesson-20260713-runtime-ag-os-accepted-lesson-reuse-proof-20260713-03",
        "detail": "Owner can promote, reject, or leave candidate advisory.",
        "recordPath": ".codex/memory/lessons/candidates/lesson-20260713-runtime-ag-os-accepted-lesson-reuse-proof-20260713-03.json"
      },
      {
        "id": "review-lesson-20260713-runtime-social-doc-consolidation-20260713-01",
        "decisionType": "candidate_lesson_review",
        "status": "review_needed",
        "lessonId": "lesson-20260713-runtime-social-doc-consolidation-20260713-01",
        "detail": "Owner can promote, reject, or leave candidate advisory.",
        "recordPath": ".codex/memory/lessons/candidates/lesson-20260713-runtime-social-doc-consolidation-20260713-01.json"
      },
      {
        "id": "review-lesson-20260713-runtime-social-doc-consolidation-20260713-02",
        "decisionType": "candidate_lesson_review",
        "status": "review_needed",
        "lessonId": "lesson-20260713-runtime-social-doc-consolidation-20260713-02",
        "detail": "Owner can promote, reject, or leave candidate advisory.",
        "recordPath": ".codex/memory/lessons/candidates/lesson-20260713-runtime-social-doc-consolidation-20260713-02.json"
      },
      {
        "id": "review-lesson-20260713-runtime-social-doc-consolidation-20260713-03",
        "decisionType": "candidate_lesson_review",
        "status": "review_needed",
        "lessonId": "lesson-20260713-runtime-social-doc-consolidation-20260713-03",
        "detail": "Owner can promote, reject, or leave candidate advisory.",
        "recordPath": ".codex/memory/lessons/candidates/lesson-20260713-runtime-social-doc-consolidation-20260713-03.json"
      },
      {
        "id": "review-lesson-20260713-runtime-ag-os-compounding-completion-20260713-01",
        "decisionType": "candidate_lesson_review",
        "status": "review_needed",
        "lessonId": "lesson-20260713-runtime-ag-os-compounding-completion-20260713-01",
        "detail": "Owner can promote, reject, or leave candidate advisory.",
        "recordPath": ".codex/memory/lessons/candidates/lesson-20260713-runtime-ag-os-compounding-completion-20260713-01.json"
      },
      {
        "id": "review-lesson-20260713-runtime-ag-os-compounding-completion-20260713-02",
        "decisionType": "candidate_lesson_review",
        "status": "review_needed",
        "lessonId": "lesson-20260713-runtime-ag-os-compounding-completion-20260713-02",
        "detail": "Owner can promote, reject, or leave candidate advisory.",
        "recordPath": ".codex/memory/lessons/candidates/lesson-20260713-runtime-ag-os-compounding-completion-20260713-02.json"
      },
      {
        "id": "review-lesson-20260713-runtime-ag-os-compounding-completion-20260713-03",
        "decisionType": "candidate_lesson_review",
        "status": "review_needed",
        "lessonId": "lesson-20260713-runtime-ag-os-compounding-completion-20260713-03",
        "detail": "Owner can promote, reject, or leave candidate advisory.",
        "recordPath": ".codex/memory/lessons/candidates/lesson-20260713-runtime-ag-os-compounding-completion-20260713-03.json"
      },
      {
        "id": "review-lesson-20260704-runtime-target-pr-review-ag-digitalz-draft-approval-v1-20260704-01",
        "decisionType": "candidate_lesson_review",
        "status": "review_needed",
        "lessonId": "lesson-20260704-runtime-target-pr-review-ag-digitalz-draft-approval-v1-20260704-01",
        "detail": "Owner can promote, reject, or leave candidate advisory.",
        "recordPath": ".codex/memory/lessons/candidates/lesson-20260704-runtime-target-pr-review-ag-digitalz-draft-approval-v1-20260704-01.json"
      }
    ],
    "scopes": [
      "personal",
      "project",
      "client",
      "company",
      "agent_shared",
      "worker_specific"
    ],
    "sourceRecords": [
      ".codex/memory/registry.json",
      ".codex/memory/accepted",
      ".codex/memory/lessons/candidates",
      ".codex/memory/rejected",
      ".codex/memory/conflicts",
      "scripts/load-accepted-lessons.mjs",
      "scripts/process-lesson-promotion.mjs"
    ]
  },
  "costs": {
    "ledgerCount": 44,
    "latestCosts": [
      {
        "costLedgerId": "cost-ledger-runtime-ag-os-accepted-lesson-reuse-proof-20260713",
        "status": "active",
        "actualTaskCostUsd": 0,
        "budgetStatus": "within_limit",
        "updatedAt": "2026-07-13T09:35:20.350Z",
        "recordPath": ".codex/costs/cost-ledger-runtime-ag-os-accepted-lesson-reuse-proof-20260713.json"
      },
      {
        "costLedgerId": "cost-ledger-runtime-social-doc-consolidation-20260713",
        "status": "active",
        "actualTaskCostUsd": 0,
        "budgetStatus": "within_limit",
        "updatedAt": "2026-07-13T09:23:58.562Z",
        "recordPath": ".codex/costs/cost-ledger-runtime-social-doc-consolidation-20260713.json"
      },
      {
        "costLedgerId": "cost-ledger-runtime-ag-os-compounding-completion-20260713",
        "status": "active",
        "actualTaskCostUsd": 0,
        "budgetStatus": "within_limit",
        "updatedAt": "2026-07-13T09:23:58.558Z",
        "recordPath": ".codex/costs/cost-ledger-runtime-ag-os-compounding-completion-20260713.json"
      },
      {
        "costLedgerId": "cost-ledger-20260705-ag-digitalz-manual-posting-pack-v1",
        "status": "active",
        "actualTaskCostUsd": 0,
        "budgetStatus": "within_limit",
        "updatedAt": "2026-07-05T21:08:30Z",
        "recordPath": ".codex/costs/cost-ledger-20260705-ag-digitalz-manual-posting-pack-v1.json"
      },
      {
        "costLedgerId": "cost-ledger-20260705-ag-digitalz-instagram-handle-live-update",
        "status": "active",
        "actualTaskCostUsd": 0,
        "budgetStatus": "within_limit",
        "updatedAt": "2026-07-05T19:10:50Z",
        "recordPath": ".codex/costs/cost-ledger-20260705-ag-digitalz-instagram-handle-live-update.json"
      },
      {
        "costLedgerId": "cost-ledger-20260705-ag-digitalz-instagram-handle-update",
        "status": "active",
        "actualTaskCostUsd": 0,
        "budgetStatus": "within_limit",
        "updatedAt": "2026-07-05T08:30:00Z",
        "recordPath": ".codex/costs/cost-ledger-20260705-ag-digitalz-instagram-handle-update.json"
      }
    ],
    "totalRecordedActualUsd": 0,
    "budgetStatus": "within_limit",
    "limits": {
      "monthlyMaxUsd": 50,
      "dailyMaxUsd": 10,
      "perTaskMaxUsd": 5
    }
  },
  "metrics": {
    "status": "computed_from_source_records",
    "generatedFromLiveSystems": false,
    "cost": {
      "ledgerCount": 44,
      "estimatedUsd": 0,
      "actualUsd": 0,
      "varianceUsd": 0,
      "variancePercent": 0
    },
    "quality": {
      "scoreCount": 15,
      "averageScore": 9.18,
      "passCount": 15,
      "recentAverage": 9.18,
      "priorAverage": 9.36,
      "trendDelta": -0.18
    },
    "rework": {
      "critiqueCount": 11,
      "critiquesRequiringFixes": 0,
      "requiredFixCount": 0,
      "failedJobCount": 0,
      "reworkSignalRatePercent": 0
    },
    "lessonReuse": {
      "acceptedLessonCount": 1,
      "eligiblePlanCount": 6,
      "plansUsingAcceptedLessons": 1,
      "plansUsingQualityExamples": 2,
      "plansUsingSkills": 3,
      "lessonReuseRatePercent": 16.67,
      "exampleReuseRatePercent": 33.33,
      "skillReuseRatePercent": 50,
      "skillApplicationsRecorded": 6
    },
    "scaledOperations": {
      "evidenceType": "registered_project_plans_within_five_minutes",
      "concurrentProjectPairCount": 1,
      "projectsInConcurrentBatches": [
        "project-ag-os-coordinator-runtime",
        "project-social-media-management-system-v1"
      ],
      "concurrentPlanningProven": true,
      "latestPairs": [
        {
          "firstPlanId": "plan-runtime-ag-os-compounding-completion-20260713",
          "firstProjectId": "project-ag-os-coordinator-runtime",
          "secondPlanId": "plan-runtime-social-doc-consolidation-20260713",
          "secondProjectId": "project-social-media-management-system-v1",
          "deltaSeconds": 0
        }
      ]
    },
    "limitations": [
      "Metrics are computed only from source-controlled AG OS records.",
      "Rework rate is a deterministic signal from required critique fixes, not time tracking.",
      "Zero accepted lessons produces a truthful zero lesson-reuse rate.",
      "Concurrent planning proves distinct registered projects progressed through planning in one operating batch; it does not claim simultaneous worker execution.",
      "Metrics do not grant approval or authorize live operations."
    ]
  },
  "skills": {
    "draftCount": 0,
    "activeCount": 3,
    "skillsGrantPermission": false,
    "skills": [
      {
        "id": "skill-github-branch-pr-flow",
        "name": "GitHub branch and PR creation under approval gate",
        "status": "active",
        "category": "build",
        "recordPath": ".codex/skills/skill-github-branch-pr-flow.json"
      },
      {
        "id": "skill-netlify-staging-deploy-flow",
        "name": "Netlify staging deploy on staging-only site",
        "status": "active",
        "category": "delivery",
        "recordPath": ".codex/skills/skill-netlify-staging-deploy-flow.json"
      },
      {
        "id": "skill-target-pr-review-quality-score",
        "name": "Target repository PR review with quality score",
        "status": "active",
        "category": "review",
        "recordPath": ".codex/skills/skill-target-pr-review-quality-score.json"
      }
    ]
  },
  "safeMerge": {
    "status": "conditional",
    "mode": "Policy-gated",
    "summary": "Allowed only after CI, local validation, safety review, clear scope, and no blocked risk conditions.",
    "sources": [
      "docs/safe-merge-policy.md",
      "docs/action-matrix.md"
    ],
    "requiredChecks": [
      "GitHub CI succeeds",
      "npm.cmd run validate passes",
      "No credentials or secrets",
      "No live service connection",
      "No deployment",
      "No domain or DNS change",
      "No production or customer data",
      "No paid action",
      "No risky files",
      "No merge conflict"
    ]
  }
};
