window.AG_OS_DASHBOARD_DATA = {
  "meta": {
    "title": "AG OS Dashboard",
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
  "projectRegistry": {
    "status": "active",
    "count": 2,
    "source": ".codex/projects/registry.json",
    "projects": [
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
    ]
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
