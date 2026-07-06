import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { COST_LIMITS_USD } from "./cost-ledger-writer.mjs";
import { isoTimestamp, readJson } from "./common.mjs";

function requiredString(errors, value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(`${label} is required`);
  }
}

function requiredArray(errors, value, label) {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(`${label} must not be empty`);
  }
}

function readJsonIfExists(relativePath, root) {
  if (!existsSync(path.join(root, relativePath))) {
    return null;
  }
  return readJson(relativePath, root);
}

function actionAllowedByConnector(connector, action) {
  return (connector?.allowedCapabilities ?? []).includes(action) ||
    (connector?.approvalRequiredFor ?? []).includes(action);
}

function approvalActive(approval, now) {
  if (!approval || approval.status !== "approved") {
    return false;
  }
  if (!approval.expiresAt) {
    return false;
  }
  return new Date(approval.expiresAt) > now;
}

function approvalMatchesAction(approval, action) {
  return (approval?.approvedActions ?? []).includes(action) ||
    (approval?.approvalRequiredFor ?? []).includes(action);
}

function approvalMatchesTarget(approval, target) {
  const scopeText = `${approval?.target ?? ""} ${approval?.scope ?? ""}`.toLowerCase();
  return scopeText.includes(String(target).toLowerCase());
}

export function validateConnectorPreflightInput(input) {
  const errors = [];

  requiredString(errors, input?.preflightId, "preflightId");
  requiredString(errors, input?.connectorId, "connectorId");
  requiredString(errors, input?.requestedAction, "requestedAction");
  requiredString(errors, input?.target, "target");
  requiredString(errors, input?.projectId, "projectId");
  requiredString(errors, input?.approvalId, "approvalId");
  requiredString(errors, input?.rollbackPlan, "rollbackPlan");
  requiredArray(errors, input?.stopConditions, "stopConditions");

  if (Number(input?.estimatedCostUsd ?? 0) < 0) {
    errors.push("estimatedCostUsd must be zero or greater");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function buildConnectorPreflightRecord({ input, root = process.cwd(), now = new Date() }) {
  const validation = validateConnectorPreflightInput(input);
  if (!validation.valid) {
    throw new Error(`connector preflight input invalid: ${validation.errors.join("; ")}`);
  }

  const timestamp = isoTimestamp(now);
  const registry = readJson(".codex/connectors/registry.json", root);
  const connector = registry.connectors.find((record) => record.id === input.connectorId) ?? null;
  const approvalPath = `.codex/approvals/${input.approvalId}.json`;
  const approval = readJsonIfExists(approvalPath, root);
  const blockingReasons = [];
  const connectorVisible = Boolean(connector);
  const connectorConnected = connector?.connectionStatus === "connected";
  const connectorAllowsAction = actionAllowedByConnector(connector, input.requestedAction);
  const activeApproval = approvalActive(approval, now);
  const approvalActionMatches = approvalMatchesAction(approval, input.requestedAction);
  const approvalTargetMatches = approvalMatchesTarget(approval, input.target);
  const credentialStoreReady = input.credentialStoreRequired ? input.credentialStoreApproved === true : true;
  const costWithinLimit = Number(input.estimatedCostUsd ?? 0) <= COST_LIMITS_USD.perTaskMax;
  const rollbackReady = input.rollbackPlan.trim().length > 0;
  const stopConditionsReady = input.stopConditions.length > 0;

  if (!connectorVisible) {
    blockingReasons.push(`connector ${input.connectorId} is not registered`);
  } else if (!connectorConnected) {
    blockingReasons.push(`connector ${input.connectorId} is not connected`);
  }

  if (connectorVisible && !connectorAllowsAction) {
    blockingReasons.push(`connector ${input.connectorId} does not list action ${input.requestedAction}`);
  }

  if (!approval) {
    blockingReasons.push(`approval ${input.approvalId} is missing`);
  } else if (!activeApproval) {
    const reason = approval.status !== "approved"
      ? `approval ${input.approvalId} is ${approval.status}`
      : `approval ${input.approvalId} is expired`;
    blockingReasons.push(reason);
  }

  if (approval && !approvalActionMatches) {
    blockingReasons.push(`approval ${input.approvalId} does not approve action ${input.requestedAction}`);
  }

  if (approval && !approvalTargetMatches) {
    blockingReasons.push(`approval ${input.approvalId} does not match target ${input.target}`);
  }

  if (!credentialStoreReady) {
    blockingReasons.push("secure credential store is required but not approved");
  }

  if (!costWithinLimit) {
    blockingReasons.push("estimated cost exceeds per-task limit");
  }

  if (!rollbackReady) {
    blockingReasons.push("rollback plan is missing");
  }

  if (!stopConditionsReady) {
    blockingReasons.push("stop conditions are missing");
  }

  return {
    preflightId: input.preflightId,
    status: blockingReasons.length === 0 ? "ready" : "blocked",
    connectorId: input.connectorId,
    requestedAction: input.requestedAction,
    target: input.target,
    projectId: input.projectId,
    approvalId: input.approvalId,
    connector: {
      visible: connectorVisible,
      connected: connectorConnected,
      actionAvailable: connectorAllowsAction,
      allowedCapabilities: connector?.allowedCapabilities ?? [],
      approvalRequiredFor: connector?.approvalRequiredFor ?? []
    },
    approval: {
      exists: Boolean(approval),
      active: activeApproval,
      actionMatches: approvalActionMatches,
      scopeMatches: approvalTargetMatches,
      expiresAt: approval?.expiresAt ?? null,
      recordPath: approval ? approvalPath : null
    },
    credentialStore: {
      required: input.credentialStoreRequired === true,
      approved: input.credentialStoreApproved === true,
      ready: credentialStoreReady
    },
    cost: {
      estimatedUsd: Number(input.estimatedCostUsd ?? 0),
      perTaskMaxUsd: COST_LIMITS_USD.perTaskMax,
      withinLimit: costWithinLimit
    },
    rollback: {
      ready: rollbackReady,
      plan: input.rollbackPlan
    },
    stopConditions: input.stopConditions,
    blockingReasons,
    safety: {
      localReadOnly: true,
      liveConnectorCalled: false,
      credentialsAccessed: false,
      oauthStarted: false,
      deploymentTriggered: false,
      workflowActivated: false,
      socialActionPerformed: false,
      domainChanged: false,
      paidActionUsed: false,
      productionDataAccessed: false
    },
    generatedBy: "connector-preflight-runtime-v1",
    createdAt: timestamp,
    updatedAt: timestamp
  };
}
