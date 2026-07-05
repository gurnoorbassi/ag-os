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
    "count": 3,
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
        "status": "planned",
        "managementMode": "managed_staging",
        "projectType": "product_project",
        "riskLevel": "medium",
        "owner": "owner-gurnoor-bassi",
        "recordPath": ".codex/projects/social-media-management-system-v1.json",
        "boundary": "Do not create a GitHub repository."
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
    "status": "planned",
    "managementMode": "managed_staging",
    "projectType": "product_project",
    "riskLevel": "medium",
    "owner": "owner-gurnoor-bassi",
    "recordPath": ".codex/projects/social-media-management-system-v1.json",
    "boundary": "Do not create a GitHub repository.",
    "currentVersion": "v1.4 draft PR",
    "lifecycleStatus": "AG Digitalz content review target PR open; review required",
    "targetRepo": "gurnoorbassi/ag-social-media-management-system",
    "targetPullRequestUrl": "https://github.com/gurnoorbassi/ag-social-media-management-system/pull/5",
    "targetPullRequestMerged": false,
    "targetMergeSha": "c6dc28dee2f50324322c476cb0d4174f853e8d68",
    "reviewedHeadSha": "02a749ff3348be9c57f34726f104f381e228b1cd",
    "stagingUrl": "https://ag-social-media-management-system-staging.netlify.app",
    "stagingStatus": "ready",
    "latestDeployId": "6a49e480fbe8fbbb83b933dc",
    "latestDeploySourceSha": "c6dc28dee2f50324322c476cb0d4174f853e8d68",
    "latestDeployVerifiedAt": "2026-07-05T04:58:46Z",
    "latestDeployHttpStatus": 200,
    "netlifyDeployContext": "production",
    "stagingInterpretation": "This is the primary deploy context of the dedicated Netlify staging-only site, not an AG Digitalz production domain, customer production domain, or production customer system.",
    "currentMode": "draft/staging only",
    "firstClientReadiness": {
      "status": "active_draft_configured",
      "sourceRecord": ".codex/client-management/clients/client-ag-digitalz-internal.json",
      "activeClientRecordsCreated": true,
      "activeRecordCount": 16,
      "missingRequiredFieldCount": 0,
      "missingRequiredFields": [],
      "canCreateActiveRecords": true,
      "currentMode": "draft/staging only",
      "nextOwnerDecision": "Review the target app PR and staging state before any future live social connector work. OAuth, posting, scheduling, analytics, and n8n activation remain blocked.",
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
      "status": "content_review_target_pr_open_review_required",
      "mode": "draft_only",
      "targetRepo": "gurnoorbassi/ag-social-media-management-system",
      "targetBranch": "ag-os/ag-digitalz-content-review-v1",
      "targetPullRequestUrl": "https://github.com/gurnoorbassi/ag-social-media-management-system/pull/5",
      "targetPullRequestNumber": 5,
      "targetHeadSha": "7e49b37330bdd54e598ac82a3ae205519725d795",
      "calendarDays": 7,
      "draftPostPackageCount": 21,
      "weeklyReportDraftCount": 1,
      "postsReviewedCount": 21,
      "postsRevisedCount": 21,
      "approvedDraftCount": 21,
      "needsRevisionCount": 0,
      "blockedByMissingProofCount": 0,
      "blockedByMissingHandleCount": 0,
      "pendingDraftApprovalCount": 22,
      "platforms": [
        {
          "platform": "Instagram",
          "handle": "not_provided",
          "handleStatus": "pending_owner_input",
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
      "updatedAt": "2026-07-05T05:26:42Z",
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
      ".codex/connectors/connector-exec-20260704-ag-digitalz-content-review-build-live-result.json",
      ".codex/connectors/connector-exec-20260704-ag-digitalz-first-content-sprint-build-live-result.json",
      ".codex/connectors/connector-exec-20260704-target-pr-merge-ag-digitalz-first-content-sprint-v1-live-result.json",
      ".codex/connectors/connector-exec-20260704-ag-digitalz-first-content-sprint-netlify-staging-live-result.json",
      ".codex/connectors/connector-exec-20260704-ag-digitalz-content-review-build-live-result.json",
      ".codex/connectors/connector-exec-20260704-target-pr-merge-ag-digitalz-first-content-sprint-v1-live-result.json",
      ".codex/connectors/connector-exec-20260704-ag-digitalz-first-content-sprint-netlify-staging-live-result.json",
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
    "pendingApprovalCount": 4,
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
        "status": "ready_for_review",
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
        "status": "ready_for_review",
        "reviewStatus": "pass",
        "recordPath": ".codex/client-management/deliverables/deliverable-ag-digitalz-weekly-report.json"
      }
    ],
    "contentSprints": [
      {
        "sprintId": "content-sprint-ag-digitalz-first-content-sprint-v1",
        "status": "content_review_target_pr_open_review_required",
        "mode": "draft_only",
        "targetRepo": "gurnoorbassi/ag-social-media-management-system",
        "targetBranch": "ag-os/ag-digitalz-content-review-v1",
        "targetPullRequestUrl": "https://github.com/gurnoorbassi/ag-social-media-management-system/pull/5",
        "targetPullRequestNumber": 5,
        "targetHeadSha": "7e49b37330bdd54e598ac82a3ae205519725d795",
        "calendarDays": 7,
        "draftPostPackageCount": 21,
        "weeklyReportDraftCount": 1,
        "postsReviewedCount": 21,
        "postsRevisedCount": 21,
        "approvedDraftCount": 21,
        "needsRevisionCount": 0,
        "blockedByMissingProofCount": 0,
        "blockedByMissingHandleCount": 0,
        "pendingDraftApprovalCount": 22,
        "platforms": [
          {
            "platform": "Instagram",
            "handle": "not_provided",
            "handleStatus": "pending_owner_input",
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
        "updatedAt": "2026-07-05T05:26:42Z",
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
      },
      {
        "approvalId": "client-approval-ag-digitalz-first-post-package-draft",
        "clientId": "client-ag-digitalz-internal",
        "itemType": "post_package",
        "status": "pending",
        "blockerLevel": "medium",
        "recordPath": ".codex/client-management/approvals/client-approval-ag-digitalz-first-post-package-draft.json"
      },
      {
        "approvalId": "client-approval-ag-digitalz-weekly-reporting-setup",
        "clientId": "client-ag-digitalz-internal",
        "itemType": "weekly_report",
        "status": "pending",
        "blockerLevel": "medium",
        "recordPath": ".codex/client-management/approvals/client-approval-ag-digitalz-weekly-reporting-setup.json"
      }
    ],
    "zeroState": "Owner-approved client records are registered."
  },
  "firstClientReadiness": {
    "status": "active_draft_configured",
    "sourceRecord": ".codex/client-management/clients/client-ag-digitalz-internal.json",
    "activeClientRecordsCreated": true,
    "activeRecordCount": 16,
    "missingRequiredFieldCount": 0,
    "missingRequiredFields": [],
    "canCreateActiveRecords": true,
    "currentMode": "draft/staging only",
    "nextOwnerDecision": "Review the target app PR and staging state before any future live social connector work. OAuth, posting, scheduling, analytics, and n8n activation remain blocked.",
    "safetyDefaults": [
      "platform accounts remain not_connected",
      "posting mode remains draft_only",
      "approval_required remains true",
      "live_posting_blocked remains true",
      "no credentials or social OAuth",
      "no posting, scheduling, analytics API, or n8n activation"
    ]
  },
  "ownerAttention": [
    {
      "id": "live-social-integrations-blocked",
      "status": "blocked",
      "title": "Live social integrations",
      "detail": "OAuth, credentials, posting, scheduling, analytics API, and n8n activation remain blocked.",
      "action": "Use future approval packages before any live integration work.",
      "sourceRecord": "docs/social-media-management-system-v1-future-connectors.md"
    }
  ],
  "approvals": {
    "activeCount": 17,
    "expiredCount": 1,
    "blockedCount": 0,
    "staleWarningCount": 0,
    "activeApprovals": [
      {
        "approvalId": "approval-20260704-ag-digitalz-content-review-build",
        "status": "approved",
        "riskLevel": "R4",
        "expiresAt": "2026-07-06T05:26:42Z",
        "approvedBy": "owner-gurnoor-bassi",
        "recordPath": ".codex/approvals/approval-20260704-ag-digitalz-content-review-build.json",
        "archived": false
      },
      {
        "approvalId": "approval-20260704-ag-digitalz-first-content-sprint-netlify-staging",
        "status": "approved",
        "riskLevel": "R4",
        "expiresAt": "2026-07-06T04:58:46Z",
        "approvedBy": "owner-gurnoor-bassi",
        "recordPath": ".codex/approvals/approval-20260704-ag-digitalz-first-content-sprint-netlify-staging.json",
        "archived": false
      },
      {
        "approvalId": "approval-20260704-target-pr-merge-ag-digitalz-first-content-sprint-v1",
        "status": "approved",
        "riskLevel": "R4",
        "expiresAt": "2026-07-06T04:52:30Z",
        "approvedBy": "owner-gurnoor-bassi",
        "recordPath": ".codex/approvals/approval-20260704-target-pr-merge-ag-digitalz-first-content-sprint-v1.json",
        "archived": false
      },
      {
        "approvalId": "approval-20260704-ag-digitalz-first-content-sprint-build",
        "status": "approved",
        "riskLevel": "R4",
        "expiresAt": "2026-07-06T04:36:18Z",
        "approvedBy": "owner-gurnoor-bassi",
        "recordPath": ".codex/approvals/approval-20260704-ag-digitalz-first-content-sprint-build.json",
        "archived": false
      },
      {
        "approvalId": "approval-20260704-ag-digitalz-netlify-staging-redeploy",
        "status": "approved",
        "riskLevel": "R4",
        "expiresAt": "2026-07-06T02:10:39Z",
        "approvedBy": "owner-gurnoor-bassi",
        "recordPath": ".codex/approvals/approval-20260704-ag-digitalz-netlify-staging-redeploy.json",
        "archived": false
      },
      {
        "approvalId": "approval-20260704-target-pr-merge-ag-digitalz-draft-config",
        "status": "approved",
        "riskLevel": "R4",
        "expiresAt": "2026-07-06T02:05:01Z",
        "approvedBy": "owner-gurnoor-bassi",
        "recordPath": ".codex/approvals/approval-20260704-target-pr-merge-ag-digitalz-draft-config.json",
        "archived": false
      },
      {
        "approvalId": "approval-20260704-ag-digitalz-draft-config-build",
        "status": "approved",
        "riskLevel": "R4",
        "expiresAt": "2026-07-06T01:52:50Z",
        "approvedBy": "owner-gurnoor-bassi",
        "recordPath": ".codex/approvals/approval-20260704-ag-digitalz-draft-config-build.json",
        "archived": false
      },
      {
        "approvalId": "approval-20260704-social-media-netlify-staging-v1-1",
        "status": "approved",
        "riskLevel": "R4",
        "expiresAt": "2026-07-06T00:59:30Z",
        "approvedBy": "owner-gurnoor-bassi",
        "recordPath": ".codex/approvals/approval-20260704-social-media-netlify-staging-v1-1.json",
        "archived": false
      },
      {
        "approvalId": "approval-20260704-target-pr-merge-social-media-system-v1-1",
        "status": "approved",
        "riskLevel": "R4",
        "expiresAt": "2026-07-06T00:56:29Z",
        "approvedBy": "owner-gurnoor-bassi",
        "recordPath": ".codex/approvals/approval-20260704-target-pr-merge-social-media-system-v1-1.json",
        "archived": false
      },
      {
        "approvalId": "approval-20260704-social-media-system-v1-1-upgrade",
        "status": "approved",
        "riskLevel": "R4",
        "expiresAt": "2026-07-06T00:47:02Z",
        "approvedBy": "owner-gurnoor-bassi",
        "recordPath": ".codex/approvals/approval-20260704-social-media-system-v1-1-upgrade.json",
        "archived": false
      },
      {
        "approvalId": "approval-20260704-social-media-netlify-staging",
        "status": "approved",
        "riskLevel": "R4",
        "expiresAt": "2026-07-05T23:17:35.591Z",
        "approvedBy": "owner-gurnoor-bassi",
        "recordPath": ".codex/approvals/approval-20260704-social-media-netlify-staging.json",
        "archived": false
      },
      {
        "approvalId": "approval-20260704-target-pr-merge-social-media-system-v1",
        "status": "approved",
        "riskLevel": "R4",
        "expiresAt": "2026-07-05T22:31:45.718Z",
        "approvedBy": "owner-gurnoor-bassi",
        "recordPath": ".codex/approvals/approval-20260704-target-pr-merge-social-media-system-v1.json",
        "archived": false
      },
      {
        "approvalId": "approval-20260704-social-media-starter-build",
        "status": "approved",
        "riskLevel": "R4",
        "expiresAt": "2026-07-05T21:35:09Z",
        "approvedBy": "owner-gurnoor-bassi",
        "recordPath": ".codex/approvals/approval-20260704-social-media-starter-build.json",
        "archived": false
      },
      {
        "approvalId": "approval-20260704-n8n-draft-workflow-proof",
        "status": "approved",
        "riskLevel": "R4",
        "expiresAt": "2026-07-05T11:18:16Z",
        "approvedBy": "owner-gurnoor-bassi",
        "recordPath": ".codex/approvals/approval-20260704-n8n-draft-workflow-proof.json",
        "archived": false
      },
      {
        "approvalId": "approval-20260704-netlify-staging-test-construction",
        "status": "approved",
        "riskLevel": "R4",
        "expiresAt": "2026-07-05T10:50:47.913Z",
        "approvedBy": "owner-gurnoor-bassi",
        "recordPath": ".codex/approvals/approval-20260704-netlify-staging-test-construction.json",
        "archived": false
      },
      {
        "approvalId": "approval-20260704-target-pr-merge-construction-website",
        "status": "approved",
        "riskLevel": "R4",
        "expiresAt": "2026-07-05T10:16:16.617Z",
        "approvedBy": "owner-gurnoor-bassi",
        "recordPath": ".codex/approvals/approval-20260704-target-pr-merge-construction-website.json",
        "archived": false
      },
      {
        "approvalId": "approval-20260704-github-builder-pr",
        "status": "approved",
        "riskLevel": "R4",
        "expiresAt": "2026-07-05T08:55:58.002Z",
        "approvedBy": "owner-gurnoor-bassi",
        "recordPath": ".codex/approvals/approval-20260704-github-builder-pr.json",
        "archived": false
      }
    ],
    "expiredApprovals": [
      {
        "approvalId": "approval-20260703-github-repo-create",
        "status": "expired",
        "riskLevel": "R4",
        "expiresAt": "2026-07-04T21:06:41Z",
        "approvedBy": "owner-gurnoor-bassi",
        "recordPath": ".codex/approvals/archive/approval-20260703-github-repo-create.json",
        "archived": true
      }
    ],
    "blockedApprovals": [],
    "recentApprovedActions": [
      {
        "approvalId": "approval-20260704-ag-digitalz-content-review-build",
        "status": "approved",
        "riskLevel": "R4",
        "expiresAt": "2026-07-06T05:26:42Z",
        "approvedBy": "owner-gurnoor-bassi",
        "recordPath": ".codex/approvals/approval-20260704-ag-digitalz-content-review-build.json",
        "archived": false
      },
      {
        "approvalId": "approval-20260704-ag-digitalz-first-content-sprint-netlify-staging",
        "status": "approved",
        "riskLevel": "R4",
        "expiresAt": "2026-07-06T04:58:46Z",
        "approvedBy": "owner-gurnoor-bassi",
        "recordPath": ".codex/approvals/approval-20260704-ag-digitalz-first-content-sprint-netlify-staging.json",
        "archived": false
      },
      {
        "approvalId": "approval-20260704-target-pr-merge-ag-digitalz-first-content-sprint-v1",
        "status": "approved",
        "riskLevel": "R4",
        "expiresAt": "2026-07-06T04:52:30Z",
        "approvedBy": "owner-gurnoor-bassi",
        "recordPath": ".codex/approvals/approval-20260704-target-pr-merge-ag-digitalz-first-content-sprint-v1.json",
        "archived": false
      },
      {
        "approvalId": "approval-20260704-ag-digitalz-first-content-sprint-build",
        "status": "approved",
        "riskLevel": "R4",
        "expiresAt": "2026-07-06T04:36:18Z",
        "approvedBy": "owner-gurnoor-bassi",
        "recordPath": ".codex/approvals/approval-20260704-ag-digitalz-first-content-sprint-build.json",
        "archived": false
      },
      {
        "approvalId": "approval-20260704-ag-digitalz-netlify-staging-redeploy",
        "status": "approved",
        "riskLevel": "R4",
        "expiresAt": "2026-07-06T02:10:39Z",
        "approvedBy": "owner-gurnoor-bassi",
        "recordPath": ".codex/approvals/approval-20260704-ag-digitalz-netlify-staging-redeploy.json",
        "archived": false
      },
      {
        "approvalId": "approval-20260704-target-pr-merge-ag-digitalz-draft-config",
        "status": "approved",
        "riskLevel": "R4",
        "expiresAt": "2026-07-06T02:05:01Z",
        "approvedBy": "owner-gurnoor-bassi",
        "recordPath": ".codex/approvals/approval-20260704-target-pr-merge-ag-digitalz-draft-config.json",
        "archived": false
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
    "critiquesCount": 6,
    "latestCritiques": [
      {
        "critiqueId": "critique-runtime-target-pr-review-ag-digitalz-first-content-sprint-v1-20260704",
        "sourcePlanId": "runtime-target-pr-review-ag-digitalz-first-content-sprint-v1-20260704",
        "archetypeId": "archetype-social-media-content-operations-system",
        "reviewStatus": "pass",
        "blocksBuildMode": false,
        "findingCount": 6,
        "requiredFixCount": 0,
        "createdAt": "2026-07-05T04:43:00Z",
        "recordPath": ".codex/critiques/critique-runtime-target-pr-review-ag-digitalz-first-content-sprint-v1-20260704.json"
      },
      {
        "critiqueId": "critique-runtime-target-pr-review-ag-digitalz-draft-config-20260704",
        "sourcePlanId": "runtime-target-pr-review-ag-digitalz-draft-config-20260704",
        "archetypeId": "archetype-social-media-content-operations-system",
        "reviewStatus": "pass",
        "blocksBuildMode": false,
        "findingCount": 6,
        "requiredFixCount": 0,
        "createdAt": "2026-07-05T01:59:30Z",
        "recordPath": ".codex/critiques/critique-runtime-target-pr-review-ag-digitalz-draft-config-20260704.json"
      },
      {
        "critiqueId": "critique-runtime-target-pr-review-social-media-system-v1-1-20260704",
        "sourcePlanId": "runtime-target-pr-review-social-media-system-v1-1-20260704",
        "archetypeId": "archetype-social-media-content-operations-system",
        "reviewStatus": "pass",
        "blocksBuildMode": false,
        "findingCount": 5,
        "requiredFixCount": 0,
        "createdAt": "2026-07-05T00:51:42Z",
        "recordPath": ".codex/critiques/critique-runtime-target-pr-review-social-media-system-v1-1-20260704.json"
      },
      {
        "critiqueId": "critique-runtime-target-pr-review-social-media-system-v1-20260704",
        "sourcePlanId": "runtime-target-pr-review-social-media-system-v1-20260704",
        "archetypeId": "archetype-social-media-content-operations-system",
        "reviewStatus": "pass",
        "blocksBuildMode": false,
        "findingCount": 5,
        "requiredFixCount": 0,
        "createdAt": "2026-07-04T21:52:00Z",
        "recordPath": ".codex/critiques/critique-runtime-target-pr-review-social-media-system-v1-20260704.json"
      },
      {
        "critiqueId": "critique-runtime-target-pr-review-construction-website-20260704",
        "sourcePlanId": "runtime-target-pr-review-construction-website-20260704",
        "archetypeId": "archetype-website",
        "reviewStatus": "pass",
        "blocksBuildMode": false,
        "findingCount": 4,
        "requiredFixCount": 0,
        "createdAt": "2026-07-04T09:33:20.653Z",
        "recordPath": ".codex/critiques/critique-runtime-target-pr-review-construction-website-20260704.json"
      }
    ],
    "reviewRequiredCount": 0,
    "failedCount": 0,
    "qualityScoreCount": 7,
    "latestQualityScores": [
      {
        "scoreId": "quality-score-runtime-target-pr-review-ag-digitalz-first-content-sprint-v1-20260704",
        "scoreType": "product_quality_score",
        "status": "candidate",
        "projectId": "project-social-media-management-system-v1",
        "archetypeId": "archetype-social-media-content-operations-system",
        "overallScore": 9.4,
        "reviewStatus": "pass",
        "updatedAt": "2026-07-05T04:43:00Z",
        "recordPath": ".codex/quality-scores/quality-score-runtime-target-pr-review-ag-digitalz-first-content-sprint-v1-20260704.json"
      },
      {
        "scoreId": "quality-score-runtime-target-pr-review-ag-digitalz-draft-config-20260704",
        "scoreType": "product_quality_score",
        "status": "candidate",
        "projectId": "project-social-media-management-system-v1",
        "archetypeId": "archetype-social-media-content-operations-system",
        "overallScore": 9.3,
        "reviewStatus": "pass",
        "updatedAt": "2026-07-05T01:59:30Z",
        "recordPath": ".codex/quality-scores/quality-score-runtime-target-pr-review-ag-digitalz-draft-config-20260704.json"
      },
      {
        "scoreId": "quality-score-runtime-target-pr-review-social-media-system-v1-1-20260704",
        "scoreType": "product_quality_score",
        "status": "candidate",
        "projectId": "project-social-media-management-system-v1",
        "archetypeId": "archetype-social-media-content-operations-system",
        "overallScore": 9.1,
        "reviewStatus": "pass",
        "updatedAt": "2026-07-05T00:51:42Z",
        "recordPath": ".codex/quality-scores/quality-score-runtime-target-pr-review-social-media-system-v1-1-20260704.json"
      },
      {
        "scoreId": "quality-score-runtime-target-pr-review-social-media-system-v1-20260704",
        "scoreType": "product_quality_score",
        "status": "candidate",
        "projectId": "project-social-media-management-system-v1",
        "archetypeId": "archetype-social-media-content-operations-system",
        "overallScore": 8.9,
        "reviewStatus": "pass",
        "updatedAt": "2026-07-04T21:52:00Z",
        "recordPath": ".codex/quality-scores/quality-score-runtime-target-pr-review-social-media-system-v1-20260704.json"
      },
      {
        "scoreId": "quality-score-runtime-target-pr-review-construction-website-20260704",
        "scoreType": "product_quality_score",
        "status": "candidate",
        "projectId": "project-unregistered-construction-website",
        "archetypeId": "archetype-website",
        "overallScore": 8.8,
        "reviewStatus": "pass",
        "updatedAt": "2026-07-04T09:33:20.653Z",
        "recordPath": ".codex/quality-scores/quality-score-runtime-target-pr-review-construction-website-20260704.json"
      }
    ],
    "candidateLessonCount": 12,
    "acceptedLessonCount": 0,
    "candidatesLoadedAsTruth": false
  },
  "costs": {
    "ledgerCount": 28,
    "latestCosts": [
      {
        "costLedgerId": "cost-ledger-20260704-ag-digitalz-content-review-build",
        "status": "active",
        "actualTaskCostUsd": 0,
        "budgetStatus": "within_limit",
        "updatedAt": "2026-07-05T05:26:42Z",
        "recordPath": ".codex/costs/cost-ledger-20260704-ag-digitalz-content-review-build.json"
      },
      {
        "costLedgerId": "cost-ledger-20260704-ag-digitalz-first-content-sprint-netlify-staging",
        "status": "active",
        "actualTaskCostUsd": 0,
        "budgetStatus": "within_limit",
        "updatedAt": "2026-07-05T04:58:46Z",
        "recordPath": ".codex/costs/cost-ledger-20260704-ag-digitalz-first-content-sprint-netlify-staging.json"
      },
      {
        "costLedgerId": "cost-ledger-20260704-target-pr-merge-ag-digitalz-first-content-sprint-v1",
        "status": "active",
        "actualTaskCostUsd": 0,
        "budgetStatus": "within_limit",
        "updatedAt": "2026-07-05T04:52:30Z",
        "recordPath": ".codex/costs/cost-ledger-20260704-target-pr-merge-ag-digitalz-first-content-sprint-v1.json"
      },
      {
        "costLedgerId": "cost-ledger-runtime-target-pr-review-ag-digitalz-first-content-sprint-v1-20260704",
        "status": "active",
        "actualTaskCostUsd": 0,
        "budgetStatus": "within_limit",
        "updatedAt": "2026-07-05T04:43:00Z",
        "recordPath": ".codex/costs/cost-ledger-runtime-target-pr-review-ag-digitalz-first-content-sprint-v1-20260704.json"
      },
      {
        "costLedgerId": "cost-ledger-20260704-ag-digitalz-first-content-sprint-build",
        "status": "active",
        "actualTaskCostUsd": 0,
        "budgetStatus": "within_limit",
        "updatedAt": "2026-07-05T04:36:18Z",
        "recordPath": ".codex/costs/cost-ledger-20260704-ag-digitalz-first-content-sprint-build.json"
      },
      {
        "costLedgerId": "cost-ledger-20260704-ag-digitalz-netlify-staging-redeploy",
        "status": "active",
        "actualTaskCostUsd": 0,
        "budgetStatus": "within_limit",
        "updatedAt": "2026-07-05T02:10:39Z",
        "recordPath": ".codex/costs/cost-ledger-20260704-ag-digitalz-netlify-staging-redeploy.json"
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
