import process from "node:process";

const ADAPTERS = [
  {
    adapterId: "netlify-continuous-deployment",
    name: "Netlify Git continuous-deployment linker",
    kind: "connector",
    requestedAction: "netlify_continuous_deployment_link",
    commandPatterns: [/\bnetlify\b[^.]{0,100}\bcontinuous deployment\b/i, /\blink\b[^.]{0,80}\bnetlify\b[^.]{0,80}\brepositor(?:y|ies)\b/i],
    credentialEnvParts: ["AG_OS", "NETLIFY", "TOKEN"],
    capabilities: ["link_github_repository", "configure_build", "verify_repository_binding"],
    liveServiceTouched: true,
    approvalRequired: true,
    implemented: true
  },
  {
    adapterId: "github-private-repository",
    name: "GitHub private-repository provisioner",
    kind: "connector",
    requestedAction: "github_private_repository_create",
    commandPatterns: [/\bprivate\b[^.]{0,60}\brepositor(?:y|ies)\b/i, /\bcreate\b[^.]{0,60}\brepo\b/i],
    credentialEnvParts: ["AG_OS", "GITHUB", "TOKEN"],
    capabilities: ["create_private_repository", "verify_private_visibility", "bind_project_repository"],
    liveServiceTouched: true,
    approvalRequired: true,
    implemented: true
  },
  {
    adapterId: "local-work-product",
    name: "Local work-product worker",
    kind: "local",
    requestedAction: "local_work_product_execute",
    commandPatterns: [],
    credentialEnvParts: null,
    capabilities: ["create_files", "run_validation", "score_output", "generate_lessons"],
    liveServiceTouched: false,
    approvalRequired: false,
    implemented: true
  },
  {
    adapterId: "github-draft-pr",
    name: "GitHub draft pull-request worker",
    kind: "connector",
    requestedAction: "github_draft_pr_create",
    commandPatterns: [/\bgithub\b/i, /\bpull request\b/i, /\bdraft pr\b/i, /\bpush\b[^.]{0,60}\bbranch\b/i],
    credentialEnvParts: ["AG_OS", "GITHUB", "TOKEN"],
    capabilities: ["create_branch", "update_files", "run_validation", "open_draft_pull_request", "check_ci"],
    liveServiceTouched: true,
    approvalRequired: true,
    implemented: true
  },
  {
    adapterId: "n8n-workflow-control",
    name: "n8n workflow activation controller",
    kind: "connector",
    requestedAction: "n8n_workflow_activation_change",
    commandPatterns: [/\b(?:activate|deactivate|enable|disable)\b[^.]{0,100}\b(?:n8n|workflow)\b/i, /\bn8n\b[^.]{0,100}\b(?:activate|deactivate|enable|disable)\b/i],
    credentialEnvParts: ["AG_OS", "N8N", "API", "KEY"],
    capabilities: ["verify_exact_workflow", "activate_workflow", "deactivate_workflow", "verify_runtime_state", "rollback_activation"],
    liveServiceTouched: true,
    approvalRequired: true,
    implemented: true
  },
  {
    adapterId: "n8n-disabled-workflow",
    name: "n8n disabled-workflow worker",
    kind: "connector",
    requestedAction: "n8n_disabled_workflow_create",
    commandPatterns: [/\bn8n\b/i, /\bworkflow\b/i],
    credentialEnvParts: ["AG_OS", "N8N", "API", "KEY"],
    capabilities: ["create_disabled_workflow", "validate_workflow", "record_backup_plan"],
    liveServiceTouched: true,
    approvalRequired: true,
    implemented: true
  },
  {
    adapterId: "netlify-staging",
    name: "Netlify staging-deploy worker",
    kind: "connector",
    requestedAction: "netlify_staging_deploy",
    commandPatterns: [/\bnetlify\b/i, /\bstaging deploy\b/i, /\bpreview deploy\b/i],
    credentialEnvParts: ["AG_OS", "NETLIFY", "TOKEN"],
    capabilities: ["build_site", "deploy_staging", "verify_staging", "record_rollback"],
    liveServiceTouched: true,
    approvalRequired: true,
    implemented: true
  },
  {
    adapterId: "production-deployment",
    name: "Production deployment worker",
    kind: "connector",
    requestedAction: "production_deployment",
    commandPatterns: [/\bdeploy\b[^.]{0,80}\bproduction\b/i, /\bproduction deployment\b/i, /\brestart\b[^.]{0,60}\bservice\b/i],
    credentialEnvParts: ["AG_OS", "DEPLOYMENT", "RUNNER", "TOKEN"],
    configEnvParts: ["AG_OS", "DEPLOYMENT", "RUNNER", "URL"],
    capabilities: ["verify_candidate", "backup", "deploy", "healthcheck", "rollback"],
    liveServiceTouched: true,
    approvalRequired: true,
    implemented: true
  },
  {
    adapterId: "social-publishing",
    name: "Social publishing worker",
    kind: "connector",
    requestedAction: "social_publish",
    commandPatterns: [/\bpost\b[^.]{0,80}\b(?:instagram|facebook|linkedin|social)\b/i, /\bpublish\b/i, /\bschedule\b[^.]{0,60}\bpost\b/i],
    credentialEnvParts: ["AG_OS", "SOCIAL", "API", "TOKEN"],
    capabilities: ["preflight", "publish", "verify_public_result", "rollback_when_supported"],
    liveServiceTouched: true,
    approvalRequired: true,
    implemented: true
  },
  {
    adapterId: "dns-change",
    name: "DNS change worker",
    kind: "connector",
    requestedAction: "dns_change",
    commandPatterns: [/\bdns\b/i, /\bdomain\b[^.]{0,80}\b(?:change|point|configure)\b/i],
    credentialEnvParts: ["AG_OS", "DNS", "API", "TOKEN"],
    capabilities: ["snapshot_records", "apply_change", "verify_resolution", "restore_records"],
    liveServiceTouched: true,
    approvalRequired: true,
    implemented: true
  }
];

function publicAdapter(adapter, env) {
  const credentialEnv = adapter.credentialEnvParts?.join("_");
  const configEnv = adapter.configEnvParts?.join("_");
  const credentialConfigured = credentialEnv ? Boolean(env[credentialEnv]) : true;
  const runtimeConfigured = configEnv ? Boolean(env[configEnv]) : true;
  const enabled = adapter.kind === "local" || env.AG_OS_LIVE_ADAPTERS_ENABLED === "true";
  const blockers = [];
  if (!enabled) blockers.push("live connector adapters are disabled");
  if (!credentialConfigured) blockers.push(`${adapter.adapterId} private runtime credential is not configured`);
  if (!runtimeConfigured) blockers.push(`${adapter.adapterId} runtime endpoint is not configured`);
  if (!adapter.implemented) blockers.push("connector execution transport is not installed yet");
  return {
    adapterId: adapter.adapterId,
    name: adapter.name,
    kind: adapter.kind,
    requestedAction: adapter.requestedAction,
    capabilities: adapter.capabilities,
    liveServiceTouched: adapter.liveServiceTouched,
    approvalRequired: adapter.approvalRequired,
    implemented: adapter.implemented,
    enabled,
    credentialConfigured,
    readyForUngatedWork: adapter.kind === "local" && enabled,
    runtimeConfigured,
    executionReady: adapter.implemented && enabled && credentialConfigured && runtimeConfigured,
    blockers
  };
}

export function listExecutionAdapters({ env = process.env } = {}) {
  return ADAPTERS.map((adapter) => publicAdapter(adapter, env));
}

export function selectExecutionAdapter({ command, env = process.env } = {}) {
  const explicitAdapterId = typeof command === "object" ? command?.executionRequest?.adapterId : null;
  if (explicitAdapterId) {
    const explicit = ADAPTERS.find((adapter) => adapter.adapterId === explicitAdapterId);
    if (!explicit) throw new Error(`execution adapter is not registered: ${explicitAdapterId}`);
    return publicAdapter(explicit, env);
  }
  const commandText = typeof command === "string" ? command : command?.rawCommand || command?.normalizedCommand || "";
  const matched = ADAPTERS.find((adapter) => adapter.commandPatterns.some((pattern) => pattern.test(commandText))) || ADAPTERS.find((adapter) => adapter.adapterId === "local-work-product");
  const selected = publicAdapter(matched, env);
  if (matched.adapterId === "github-draft-pr" && typeof command === "object" && !command.executionRequest) {
    return {
      ...selected,
      executionReady: false,
      blockers: [...selected.blockers, "exact GitHub executionRequest with repository, base commit, branch, and isolated source directory is missing"]
    };
  }
  if (["github-private-repository", "n8n-disabled-workflow", "n8n-workflow-control", "netlify-staging", "netlify-continuous-deployment", "production-deployment", "social-publishing", "dns-change"].includes(matched.adapterId) && typeof command === "object" && !command.executionRequest) {
    return {
      ...selected,
      executionReady: false,
      blockers: [...selected.blockers, `exact ${matched.adapterId} executionRequest is missing`]
    };
  }
  return selected;
}

export function adapterDefinition(adapterId) {
  return ADAPTERS.find((adapter) => adapter.adapterId === adapterId) || null;
}
