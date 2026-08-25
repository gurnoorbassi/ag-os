const ACTIVE_STATES = new Set(["active", "running", "working", "reviewing", "researching", "synthesizing", "validating"]);
const WAITING_STATES = new Set(["idle", "ready", "waiting", "watching", "queued", "planned", "proposed", "waiting_approval", "identified", "validation_ready"]);
const BLOCKED_STATES = new Set(["blocked", "failed", "needs_revision", "rejected", "revoked", "expired"]);
const COMPLETE_STATES = new Set(["complete", "completed", "done", "won", "pass", "trusted"]);
const KILLED_STATES = new Set(["killed", "lost", "cancelled", "retired", "suspended"]);

function list(value) {
  return Array.isArray(value) ? value : [];
}

function text(value, fallback = "") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function money(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? Number(number.toFixed(6)) : 0;
}

function slug(value) {
  return text(value, "unknown").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100) || "unknown";
}

export function graphState(value) {
  const state = text(value, "waiting").toLowerCase();
  if (state === "archived") return "archived";
  if (ACTIVE_STATES.has(state)) return "active";
  if (BLOCKED_STATES.has(state)) return "blocked";
  if (COMPLETE_STATES.has(state)) return "completed";
  if (KILLED_STATES.has(state)) return "killed";
  if (WAITING_STATES.has(state)) return "waiting";
  return "warning";
}

export function graphStateClass(value) {
  return `graph-state-${graphState(value)}`;
}

function graphBuilder() {
  const nodes = new Map();
  const edges = new Map();
  const addNode = (node) => {
    if (!node?.id || !node.type || !node.label) return null;
    const normalized = { state: "waiting", detail: {}, parentId: null, kind: "detail", level: 3, ...node, id: String(node.id) };
    if (!nodes.has(normalized.id)) nodes.set(normalized.id, normalized);
    return nodes.get(normalized.id);
  };
  const addEdge = (source, target, relation = "contains") => {
    if (!source || !target || source === target || !nodes.has(source) || !nodes.has(target)) return;
    const id = `${source}::${relation}::${target}`;
    if (!edges.has(id)) edges.set(id, { id, source, target, relation, active: graphState(nodes.get(target).state) === "active" });
  };
  const addChild = (parentId, node, relation = "contains") => {
    const child = addNode({ ...node, parentId: node.parentId ?? parentId });
    if (child) addEdge(parentId, child.id, relation);
    return child;
  };
  return { nodes, edges, addNode, addEdge, addChild };
}

function branch(builder, rootId, id, label, type, records, detail = {}) {
  if (records == null || (Array.isArray(records) && records.length === 0)) return null;
  const { nodeState = "active", ...branchDetail } = detail;
  return builder.addChild(rootId, { id, type, label, kind: "system", level: 1, state: nodeState, detail: { count: Array.isArray(records) ? records.length : undefined, ...branchDetail } });
}

function addCollection(builder, parentId, { id, label, type, items, threshold = 4, makeNode }) {
  const records = list(items);
  if (!records.length) return null;
  const grouped = records.length > threshold;
  const parent = grouped ? builder.addChild(parentId, {
    id, type: "group", label, kind: "group", level: 3, state: "waiting",
    detail: { count: records.length, collectionType: type, executedWork: false }
  }) : null;
  records.forEach((record, index) => builder.addChild(parent?.id || parentId, makeNode(record, index)));
  return parent;
}

function opportunityNodes(builder, directorBranch, director) {
  const opportunities = list(director.opportunities);
  const people = list(director.people);
  const experiments = list(director.experiments);
  const outcomes = list(director.outcomes);
  const rules = list(director.learned);
  const missionLinks = list(director.missionLinks);
  for (const opportunity of opportunities) {
    const opportunityId = text(opportunity.opportunityId);
    if (!opportunityId) continue;
    const node = builder.addChild(directorBranch.id, {
      id: opportunityId,
      type: "opportunity",
      label: text(opportunity.title, opportunityId),
      kind: "entity",
      level: 2,
      state: opportunity.status,
      detail: { record: opportunity, score: opportunity.score, confidence: opportunity.confidence, provenance: opportunity.provenance }
    });
    addCollection(builder, node.id, {
      id: `${opportunityId}-signals`, label: "Signals", type: "signal", items: opportunity.signals,
      makeNode: (signal, index) => ({ id: text(signal.signalId, `${opportunityId}-signal-${index + 1}`), type: "signal", label: text(signal.label || signal.entity || signal.type, "Signal"), kind: "detail", level: 4, state: signal.status || "active", detail: { record: signal } })
    });
    addCollection(builder, node.id, {
      id: `${opportunityId}-evidence`, label: "Evidence", type: "evidence", items: opportunity.observations,
      makeNode: (observation, index) => ({ id: text(observation.evidenceId, `${opportunityId}-evidence-${index + 1}`), type: "evidence", label: text(observation.statement, `Evidence ${index + 1}`).slice(0, 90), kind: "detail", level: 4, state: "completed", detail: { record: observation, sourceUrl: list(opportunity.sourceUrls)[index] || null } })
    });
    if (opportunity.economicModel && Object.keys(opportunity.economicModel).length > 0) {
      builder.addChild(node.id, { id: `${opportunityId}-economics`, type: "cost", label: "Economics", kind: "detail", level: 3, state: "active", detail: { record: opportunity.economicModel, researchSpendUsd: opportunity.researchSpendUsd } });
    }
    if (text(opportunity.distributionLeverage) && opportunity.distributionLeverage !== "unassessed") {
      builder.addChild(node.id, { id: `${opportunityId}-distribution`, type: "distribution", label: "Distribution", kind: "detail", level: 3, state: "waiting", detail: { value: opportunity.distributionLeverage } });
    }
    if (list(opportunity.researchRunIds).some((id) => String(id).includes("skeptic")) || Number(opportunity.skepticDowngrade || 0) > 0) {
      builder.addChild(node.id, { id: `${opportunityId}-skeptic`, type: "skeptic", label: "Skeptic", kind: "detail", level: 3, state: Number(opportunity.skepticDowngrade || 0) > 0 ? "warning" : "completed", detail: { confidenceBefore: opportunity.confidenceBeforeSkeptic, downgrade: opportunity.skepticDowngrade, confidenceAfter: opportunity.confidence } });
    }
    if (opportunity.cheapestValidation) {
      builder.addChild(node.id, { id: `${opportunityId}-validation`, type: "experiment", label: "Next validation", kind: "detail", level: 3, state: opportunity.status === "validation_ready" ? "waiting" : opportunity.status, detail: { method: opportunity.cheapestValidation, actionClass: opportunity.validationActionClass, costUsd: opportunity.estimatedValidationCost, stopConditions: opportunity.stopConditions } });
    }
    for (const experiment of experiments.filter((item) => item.opportunityId === opportunityId)) {
      const experimentId = text(experiment.experimentId);
      if (experimentId) builder.addEdge(experimentId, node.id, "validates");
    }
    const relatedPeople = people.filter((item) => list(item.relatedOpportunityIds).includes(opportunityId) || list(opportunity.relatedPeople).includes(item.personId));
    const peopleGroup = relatedPeople.length ? builder.addChild(node.id, { id: `${opportunityId}-people`, type: "group", label: "People", kind: "group", level: 3, state: "waiting", detail: { count: relatedPeople.length, collectionType: "person", executedWork: false } }) : null;
    for (const person of relatedPeople) {
      const personId = text(person.personId);
      if (personId) builder.addEdge(peopleGroup?.id || node.id, personId, "involves");
    }
    for (const outcome of outcomes.filter((item) => item.opportunityId === opportunityId)) {
      const outcomeId = text(outcome.outcomeId);
      if (outcomeId) builder.addEdge(node.id, outcomeId, "produced");
    }
    for (const rule of rules.filter((item) => item.opportunityId === opportunityId)) {
      const ruleId = text(rule.ruleId);
      if (ruleId) builder.addEdge(node.id, ruleId, "learned");
    }
    for (const link of missionLinks.filter((item) => item.opportunityId === opportunityId)) {
      const missionId = text(link.missionId);
      if (missionId) builder.addEdge(node.id, missionId, "spawned");
    }
  }
}

function missionNodes(builder, missionBranch, missions, missionDetails) {
  const detailById = new Map(list(missionDetails).map((mission) => [mission.missionId, mission]));
  for (const summary of missions) {
    const missionId = text(summary.missionId);
    if (!missionId) continue;
    const mission = { ...summary, ...(detailById.get(missionId) || {}) };
    const node = builder.addChild(missionBranch.id, { id: missionId, type: "mission", label: text(mission.summary || mission.ownerOutcome, missionId), kind: "entity", level: 2, state: mission.status, detail: { record: mission } });
    const planner = mission.planning ? builder.addChild(node.id, { id: `${missionId}-planner`, type: "planner", label: mission.planning.mode === "model" ? "Model planner" : "Deterministic planner", kind: "detail", level: 3, state: "completed", detail: { record: mission.planning, validationStrategy: list(mission.validationStrategy).join(" · "), integrationOrder: list(mission.integrationOrder).join(" · ") } }) : null;
    const agents = list(mission.agents);
    const tasks = list(mission.tasks);
    const agentGroup = agents.length ? builder.addChild(node.id, { id: `${missionId}-agents`, type: "group", label: "Agent runs", kind: "group", level: 3, state: agents.some((agent) => graphState(agent.status) === "active") ? "active" : "waiting", detail: { count: agents.length, collectionType: "agent", executedWork: agents.some((agent) => agent.startedAt || agent.completedAt) } }) : null;
    for (const agent of agents) {
      const agentId = text(agent.agentRunId);
      if (agentId) {
        const currentTask = tasks.find((task) => task.taskId === agent.currentTaskId)?.title;
        builder.addChild(agentGroup.id, { id: agentId, type: "agent", label: text(agent.displayName || agent.role, agentId), kind: "detail", level: 4, state: agent.status, detail: { record: { ...agent, currentTask } } });
        if (planner) builder.addEdge(planner.id, agentId, "assigns");
      }
    }
    const taskGroup = tasks.length ? builder.addChild(node.id, { id: `${missionId}-tasks`, type: "group", label: "Tasks", kind: "group", level: 3, state: tasks.some((task) => graphState(task.status) === "active") ? "active" : "waiting", detail: { count: tasks.length, collectionType: "task", executedWork: tasks.some((task) => task.startedAt || task.completedAt) } }) : null;
    for (const task of tasks) {
      const taskId = text(task.taskId);
      if (!taskId) continue;
      builder.addChild(taskGroup.id, { id: taskId, type: "task", label: text(task.title, taskId), kind: "detail", level: 4, state: task.status, detail: { record: task } });
      if (text(task.assignedAgentRunId)) builder.addEdge(task.assignedAgentRunId, taskId, "executes");
    }
    for (const task of tasks) for (const dependency of list(task.dependencies)) builder.addEdge(dependency, task.taskId, "precedes");
    for (const [index, blocker] of list(mission.blockers).entries()) builder.addChild(node.id, { id: `${missionId}-blocker-${index + 1}`, type: "blocker", label: text(blocker, "Blocker").slice(0, 90), state: "blocked", detail: { message: blocker } });
    const artifacts = list(mission.artifactRecords);
    const artifactGroup = artifacts.length ? builder.addChild(node.id, { id: `${missionId}-artifacts`, type: "group", label: "Artifacts", kind: "group", level: 3, state: "completed", detail: { count: artifacts.length, collectionType: "artifact", executedWork: true } }) : null;
    for (const artifact of artifacts) {
      const artifactId = text(artifact.artifactId);
      if (artifactId) builder.addChild(artifactGroup.id, { id: artifactId, type: "artifact", label: text(artifact.kind, "Artifact"), kind: "detail", level: 4, state: "completed", detail: { record: artifact } });
    }
    if (mission.budget && (Number(mission.budget.spentUsd || 0) > 0 || Number(mission.budget.limitUsd || 0) > 0)) {
      builder.addChild(node.id, { id: `${missionId}-cost`, type: "cost", label: "Mission cost", state: Number(mission.budget.spentUsd || 0) > Number(mission.budget.limitUsd || Infinity) ? "warning" : "active", detail: { record: mission.budget } });
    }
    if (["completed", "failed", "cancelled"].includes(mission.status)) {
      builder.addChild(node.id, { id: `${missionId}-result`, type: "outcome", label: text(mission.result?.summary, mission.status === "completed" ? "Mission completed" : `Mission ${mission.status}`), state: mission.status, detail: { record: mission.result || {}, progress: mission.progress } });
    }
  }
}

export function buildAgOsGraph({ status = {}, missionDetails = [] } = {}) {
  const builder = graphBuilder();
  const root = builder.addNode({ id: "ag-os", type: "root", label: "AG OS", kind: "root", level: 0, state: status.safeguards?.status || "active", detail: { status: status.boot?.status || status.safeguards?.status || "active", truth: status.safeguards || {} } });
  const director = status.opportunityDirector || null;
  const missions = list(status.missions);
  const directorBranch = branch(builder, root.id, "branch-opportunity-director", "Opportunity Director", "director", director, { objective: director?.director?.objective, status: director?.discoveryStatus, nodeState: director?.discoveryStatus || "idle" });
  const missionBranch = branch(builder, root.id, "branch-missions", "Missions", "mission", Array.isArray(status.missions) ? { implemented: true } : missions, { count: missions.length, emptyMessage: missions.length ? null : "No missions created yet.", nodeState: missions.length ? "active" : "idle" });
  const peopleBranch = branch(builder, root.id, "branch-people", "People", "person", director?.people);
  const experimentsBranch = branch(builder, root.id, "branch-experiments", "Experiments", "experiment", director?.experiments);
  const learningBranch = branch(builder, root.id, "branch-learning", "Learning", "rule", director?.learned);
  const hasCosts = Boolean(director?.treasury) || Number(director?.aiSpendUsd || 0) > 0 || missions.some((mission) => mission.budget);
  const costsBranch = branch(builder, root.id, "branch-costs", "Costs", "cost", hasCosts ? { persisted: true } : null);
  const outcomesBranch = branch(builder, root.id, "branch-outcomes", "Outcomes", "outcome", director?.outcomes);

  if (directorBranch && director?.constitution?.version) {
    const capabilityProof = { constitutionVersion: director.constitution.version, executedWork: false, capabilityStatus: "ready" };
    const capabilityParent = list(director.opportunities).length ? builder.addChild(directorBranch.id, { id: "opportunity-capabilities", type: "group", label: "Capabilities", kind: "group", level: 2, state: "ready", detail: { count: 5, collectionType: "capabilities", executedWork: false } }) : directorBranch;
    for (const [id, label, type] of [
      ["capability-opportunity-discovery", "Discovery", "discovery"],
      ["capability-opportunity-research", "Research", "research"],
      ["capability-opportunity-economics", "Economics", "economics"],
      ["capability-opportunity-network", "Network mapper", "network"],
      ["capability-opportunity-skeptic", "Skeptic", "skeptic"]
    ]) builder.addChild(capabilityParent.id, { id, type: "capability", label, kind: "capability", level: 2, state: "ready", detail: { ...capabilityProof, capabilityType: type } });
  }

  const peopleGroups = new Map();
  for (const person of list(director?.people)) {
    const personId = text(person.personId);
    if (peopleBranch && personId) {
      const relationship = text(person.relationshipState, "unconfirmed");
      const groupId = `people-${slug(relationship)}`;
      let group = peopleGroups.get(groupId);
      if (!group) { group = builder.addChild(peopleBranch.id, { id: groupId, type: "person_group", label: `${text(relationship).replaceAll("_", " ")} people`, state: relationship, detail: { relationshipState: relationship } }); peopleGroups.set(groupId, group); }
      builder.addChild(group.id, { id: personId, type: "person", label: text(person.name, personId), kind: "entity", level: 2, state: person.relationshipState, detail: { record: person } });
    }
  }
  for (const experiment of list(director?.experiments)) {
    const experimentId = text(experiment.experimentId);
    if (experimentsBranch && experimentId) builder.addChild(experimentsBranch.id, { id: experimentId, type: "experiment", label: text(experiment.hypothesis, experimentId), kind: "entity", level: 2, state: experiment.status, detail: { record: experiment } });
  }
  for (const rule of list(director?.learned)) {
    const ruleId = text(rule.ruleId);
    if (learningBranch && ruleId) builder.addChild(learningBranch.id, { id: ruleId, type: "rule", label: text(rule.statement, ruleId), kind: "entity", level: 2, state: rule.status, detail: { record: rule } });
  }
  for (const outcome of list(director?.outcomes)) {
    const outcomeId = text(outcome.outcomeId);
    if (outcomesBranch && outcomeId) builder.addChild(outcomesBranch.id, { id: outcomeId, type: "outcome", label: text(outcome.note || outcome.type, outcomeId), kind: "entity", level: 2, state: outcome.type === "won" || outcome.type === "revenue" ? "completed" : outcome.type === "lost" ? "killed" : "active", detail: { record: outcome } });
  }
  for (const rule of list(director?.learned)) for (const outcomeId of list(rule.supportingOutcomeIds)) builder.addEdge(outcomeId, rule.ruleId, "learned");
  if (costsBranch) {
    if (director?.treasury) builder.addChild(costsBranch.id, { id: "cost-opportunity-treasury", type: "cost", label: "Opportunity treasury", state: "active", detail: { record: director.treasury } });
    if (director && Number.isFinite(Number(director.aiSpendUsd))) builder.addChild(costsBranch.id, { id: "cost-opportunity-ai", type: "cost", label: "Opportunity research", state: Number(director.aiSpendUsd) > 0 ? "active" : "waiting", detail: { spentUsd: money(director.aiSpendUsd), limitUsd: money(director.costLimitUsd) } });
  }
  // Materialize missions first so opportunity-to-mission collaboration edges
  // can target real nodes regardless of source ordering in the status payload.
  if (missionBranch) missionNodes(builder, missionBranch, missions, missionDetails);
  if (directorBranch) opportunityNodes(builder, directorBranch, director);

  return { nodes: [...builder.nodes.values()], edges: [...builder.edges.values()], rootId: root.id };
}

export function ancestorsOf(graph, nodeId) {
  const byId = new Map(list(graph?.nodes).map((node) => [node.id, node]));
  const ancestors = [];
  let current = byId.get(nodeId);
  while (current?.parentId && byId.has(current.parentId)) {
    ancestors.unshift(current.parentId);
    current = byId.get(current.parentId);
  }
  return ancestors;
}

export function subtreeNodeIds(graph, nodeId) {
  const children = new Map();
  for (const node of list(graph?.nodes)) {
    if (!node.parentId) continue;
    if (!children.has(node.parentId)) children.set(node.parentId, []);
    children.get(node.parentId).push(node.id);
  }
  const ids = new Set();
  const visit = (id) => {
    if (ids.has(id)) return;
    ids.add(id);
    for (const child of children.get(id) || []) visit(child);
  };
  visit(nodeId);
  return ids;
}

export function visibleGraph(graph, { expanded = new Set([graph?.rootId]), focusId = null } = {}) {
  const nodesById = new Map(list(graph?.nodes).map((node) => [node.id, node]));
  const allowed = focusId ? subtreeNodeIds(graph, focusId) : new Set(list(graph?.nodes).map((node) => node.id));
  if (focusId) {
    for (const edge of list(graph?.edges).filter((item) => item.relation !== "contains" && allowed.has(item.source))) {
      const source = nodesById.get(edge.source);
      if (source?.kind !== "group" || expanded.has(source.id)) allowed.add(edge.target);
    }
  }
  const visible = new Set(focusId ? [focusId] : [graph?.rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of list(graph?.nodes)) {
      if (!allowed.has(node.id) || visible.has(node.id)) continue;
      if (node.parentId && visible.has(node.parentId) && expanded.has(node.parentId)) { visible.add(node.id); changed = true; }
    }
  }
  for (const edge of list(graph?.edges).filter((item) => item.relation !== "contains" && visible.has(item.source) && allowed.has(item.target))) {
    const source = nodesById.get(edge.source);
    if (source?.kind !== "group" || expanded.has(source.id)) visible.add(edge.target);
  }
  return {
    ...graph,
    rootId: focusId || graph.rootId,
    nodes: list(graph?.nodes).filter((node) => visible.has(node.id)),
    edges: list(graph?.edges).filter((edge) => visible.has(edge.source) && visible.has(edge.target))
  };
}

export function reconcileGraphViewState(graph, { expanded = new Set(), selectedId = null, focusId = null } = {}) {
  const ids = new Set(list(graph?.nodes).map((node) => node.id));
  return {
    expanded: new Set([...expanded].filter((id) => ids.has(id))),
    selectedId: ids.has(selectedId) ? selectedId : graph?.rootId || null,
    focusId: ids.has(focusId) ? focusId : null
  };
}

export function toggleGraphExpansion(expanded, nodeId) {
  const next = new Set(expanded || []);
  if (next.has(nodeId)) next.delete(nodeId); else next.add(nodeId);
  return next;
}

export function nodeDimensions(node) {
  if (node?.kind === "root" || node?.type === "root") return { width: 250, height: 108 };
  if (node?.kind === "system" || node?.level === 1) return { width: 196, height: 82 };
  if (node?.kind === "entity") return node.type === "person" ? { width: 154, height: 96 } : { width: 178, height: 84 };
  if (node?.kind === "capability") return { width: 150, height: 66 };
  if (node?.kind === "group" || node?.type === "group") return { width: 150, height: 64 };
  if (["signal", "evidence"].includes(node?.type)) return { width: 136, height: 58 };
  return { width: 148, height: 66 };
}

const SYSTEM_ANGLES = new Map([
  ["branch-missions", 0], ["branch-outcomes", Math.PI / 4], ["branch-opportunity-director", Math.PI / 2],
  ["branch-experiments", Math.PI * .78], ["branch-learning", Math.PI * 1.18], ["branch-costs", Math.PI],
  ["branch-people", -Math.PI / 2]
]);

function overlaps(a, b, gap = 42) {
  return Math.abs(a.x - b.x) < (a.width + b.width) / 2 + gap && Math.abs(a.y - b.y) < (a.height + b.height) / 2 + gap;
}

export function layoutGraph(graph, { focusId = null } = {}) {
  const nodes = list(graph?.nodes);
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const rootId = focusId || graph?.rootId;
  const children = new Map();
  for (const node of nodes) {
    if (!node.parentId || !byId.has(node.parentId)) continue;
    if (!children.has(node.parentId)) children.set(node.parentId, []);
    children.get(node.parentId).push(node.id);
  }
  for (const values of children.values()) values.sort((a, b) => a.localeCompare(b));
  const weights = new Map();
  const weight = (id) => {
    if (weights.has(id)) return weights.get(id);
    const value = Math.max(1, (children.get(id) || []).reduce((sum, childId) => sum + weight(childId), 0));
    weights.set(id, value); return value;
  };
  weight(rootId);
  const positions = new Map();
  const rootSize = nodeDimensions(byId.get(rootId));
  positions.set(rootId, { x: 0, y: 0, depth: 0, angle: -Math.PI / 2, ...rootSize });
  const first = children.get(rootId) || [];
  const firstRadius = focusId ? 350 : 340;

  const placeDescendants = (parentId, parentAngle, sectorStart, sectorEnd, depth) => {
    const descendants = children.get(parentId) || [];
    if (!descendants.length) return;
    const total = descendants.reduce((sum, id) => sum + weight(id), 0);
    let cursor = sectorStart;
    const parent = positions.get(parentId);
    const radialStep = depth === 2 ? 250 : depth === 3 ? 220 : 190;
    descendants.forEach((id) => {
      const span = (sectorEnd - sectorStart) * (weight(id) / total);
      const angle = descendants.length === 1 ? parentAngle : cursor + span / 2;
      const tangent = descendants.length > 1 ? (angle - parentAngle) * radialStep * .72 : 0;
      const size = nodeDimensions(byId.get(id));
      positions.set(id, {
        x: parent.x + Math.cos(parentAngle) * radialStep - Math.sin(parentAngle) * tangent,
        y: parent.y + Math.sin(parentAngle) * radialStep + Math.cos(parentAngle) * tangent,
        depth, angle, ...size
      });
      placeDescendants(id, angle, cursor, cursor + span, depth + 1);
      cursor += span;
    });
  };

  first.forEach((id, index) => {
    const angle = focusId ? -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(1, first.length) : (SYSTEM_ANGLES.get(id) ?? (-Math.PI / 2 + (Math.PI * 2 * index) / Math.max(1, first.length)));
    const sectorWidth = focusId ? Math.PI * 2 / Math.max(1, first.length) : Math.min(Math.PI * .56, Math.PI * 2 / Math.max(3, first.length));
    const size = nodeDimensions(byId.get(id));
    positions.set(id, { x: Math.cos(angle) * firstRadius, y: Math.sin(angle) * firstRadius, depth: 1, angle, ...size });
    placeDescendants(id, angle, angle - sectorWidth / 2, angle + sectorWidth / 2, 2);
  });

  const orphans = nodes.filter((node) => !positions.has(node.id)).sort((a, b) => a.id.localeCompare(b.id));
  orphans.forEach((node, index) => {
    const angle = -Math.PI / 3 + index * (Math.PI * 2 / Math.max(3, orphans.length));
    positions.set(node.id, { x: Math.cos(angle) * 500, y: Math.sin(angle) * 500, depth: 2, angle, ...nodeDimensions(node), contextual: true });
  });

  const ordered = nodes.map((node) => ({ id: node.id, ...positions.get(node.id) })).filter((item) => Number.isFinite(item.x)).sort((a, b) => a.depth - b.depth || a.angle - b.angle || a.id.localeCompare(b.id));
  for (let pass = 0; pass < 120; pass += 1) {
    let moved = false;
    for (let index = 1; index < ordered.length; index += 1) {
      const current = ordered[index];
      for (let previous = 0; previous < index; previous += 1) {
        const fixed = ordered[previous];
        const gap = current.depth <= 1 ? 76 : current.depth >= 4 ? 30 : 48;
        if (!overlaps(current, fixed, gap)) continue;
        const overlapX = (current.width + fixed.width) / 2 + gap - Math.abs(current.x - fixed.x);
        const overlapY = (current.height + fixed.height) / 2 + gap - Math.abs(current.y - fixed.y);
        if (overlapX <= overlapY) current.x += (current.x === fixed.x ? (current.id.localeCompare(fixed.id) >= 0 ? 1 : -1) : Math.sign(current.x - fixed.x)) * (overlapX + 1);
        else current.y += (current.y === fixed.y ? (current.id.localeCompare(fixed.id) >= 0 ? 1 : -1) : Math.sign(current.y - fixed.y)) * (overlapY + 1);
        moved = true;
      }
    }
    if (!moved) break;
  }
  // A final monotonic sweep makes the collision guarantee absolute even for
  // unusually dense, fully-expanded fixtures. Normal progressive-disclosure
  // views rarely need this fallback.
  for (let index = 1; index < ordered.length; index += 1) {
    const current = ordered[index];
    const direction = Math.sin(current.angle) < 0 ? -1 : 1;
    for (let attempt = 0; attempt < 400; attempt += 1) {
      const collision = ordered.slice(0, index).find((fixed) => overlaps(current, fixed, current.depth >= 4 ? 30 : 48));
      if (!collision) break;
      const needed = (current.height + collision.height) / 2 + (current.depth >= 4 ? 30 : 48) - Math.abs(current.y - collision.y);
      current.y += direction * Math.max(18, needed + 1);
    }
  }
  for (const item of ordered) Object.assign(positions.get(item.id), { x: item.x, y: item.y });
  return positions;
}

export function graphLayoutBounds(graph, positions) {
  if (!graph?.nodes?.length) return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  const boxes = graph.nodes.map((node) => positions.get(node.id)).filter(Boolean);
  const minX = Math.min(...boxes.map((item) => item.x - item.width / 2));
  const maxX = Math.max(...boxes.map((item) => item.x + item.width / 2));
  const minY = Math.min(...boxes.map((item) => item.y - item.height / 2));
  const maxY = Math.max(...boxes.map((item) => item.y + item.height / 2));
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

export function searchGraph(graph, query) {
  const needle = text(query).toLowerCase();
  if (!needle) return [];
  return list(graph?.nodes).filter((node) => {
    const record = node.detail?.record || {};
    const publicText = [
      node.label, node.type, node.kind, node.state,
      record.title, record.summary, record.problemHypothesis, record.organization, record.publicRole,
      record.whyRelevant, record.hypothesis, record.statement, record.ownerOutcome, record.role, record.displayName,
      ...list(record.observations).map((item) => item.statement),
      ...list(record.assumptions).map((item) => item.statement || item)
    ];
    return publicText.filter(Boolean).join(" ").toLowerCase().includes(needle);
  });
}

function escapeMarkup(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function row(label, value) {
  if (value == null || value === "" || (Array.isArray(value) && value.length === 0)) return "";
  return `<div class="drawer-kv"><span>${escapeMarkup(label)}</span><span>${escapeMarkup(Array.isArray(value) ? value.join(" · ") : value)}</span></div>`;
}

function cards(title, values) {
  const items = list(values).filter(Boolean);
  if (!items.length) return "";
  return `<section class="drawer-section"><h3>${escapeMarkup(title)}</h3>${items.map((item) => `<div class="drawer-item"><p>${escapeMarkup(item)}</p></div>`).join("")}</section>`;
}

export function renderGraphNodeDetail(node, graph) {
  if (!node) return '<div class="empty-card">No persisted node selected.</div>';
  const record = node.detail?.record || {};
  const connected = list(graph?.edges).filter((edge) => edge.source === node.id || edge.target === node.id).map((edge) => {
    const otherId = edge.source === node.id ? edge.target : edge.source;
    const other = list(graph?.nodes).find((candidate) => candidate.id === otherId);
    return other ? `${edge.relation}: ${other.label}` : null;
  }).filter(Boolean);
  const state = graphState(node.state);
  const stateBadge = `<span class="inspector-state ${graphStateClass(node.state)}">${escapeMarkup(String(node.state || state).replaceAll("_", " "))}</span>`;
  const technical = `<details class="inspector-technical"><summary>Technical details</summary>${row("Record type", node.type)}${row("Internal ID", node.id)}${row("Persisted state", node.state)}${row("Created", record.createdAt)}${row("Updated", record.updatedAt)}${row("Provenance", record.provenance || node.detail?.provenance)}</details>`;
  let body = `<section class="inspector-lead">${stateBadge}</section>`;
  if (node.type === "opportunity") {
    body += `<section class="inspector-scoreboard"><div><strong>${escapeMarkup(record.score ?? "—")}</strong><span>Opportunity score</span></div><div><strong>${escapeMarkup(record.confidence == null ? "—" : `${record.confidence}%`)}</strong><span>Confidence</span></div></section>`;
    body += cards("Observed", list(record.observations).map((item) => item.statement));
    body += cards("Hypothesis", [record.problemHypothesis, ...list(record.assumptions).map((item) => item.statement || item)]);
    if (record.economicModel) body += `<section class="drawer-section inspector-economics"><h3>Economics</h3><div><span>Low</span><strong>$${money(record.economicModel.lowValueUsd).toLocaleString()}</strong></div><div><span>Base</span><strong>$${money(record.economicModel.baseValueUsd).toLocaleString()}</strong></div><div><span>High</span><strong>$${money(record.economicModel.highValueUsd).toLocaleString()}</strong></div>${record.economicModel.expectedValueUsd == null ? "" : `<div class="expected"><span>Expected value</span><strong>$${money(record.economicModel.expectedValueUsd).toLocaleString()}</strong></div>`}</section>`;
    body += `<section class="drawer-section inspector-next"><h3>Next validation</h3><p>${escapeMarkup(record.cheapestValidation || record.recommendedNextAction || "No validation step recorded.")}</p>${record.estimatedValidationCost == null ? "" : `<small>Estimated cost · $${money(record.estimatedValidationCost).toFixed(2)}</small>`}</section>`;
    if (record.researchSpendUsd != null) body += `<section class="inspector-inline-stat"><span>Research spend</span><strong>$${money(record.researchSpendUsd).toFixed(2)}</strong></section>`;
  } else if (node.type === "mission") {
    const activeAgents = list(record.agents).filter((agent) => graphState(agent.status) === "active");
    body += `<section class="inspector-scoreboard"><div><strong>${escapeMarkup(record.progress ? `${record.progress.completedTasks || 0} / ${record.progress.totalTasks || 0}` : "—")}</strong><span>Tasks complete</span></div><div><strong>${escapeMarkup(record.budget ? `$${money(record.budget.spentUsd).toFixed(2)}` : "—")}</strong><span>${record.budget ? `of $${money(record.budget.limitUsd).toFixed(2)}` : "Spend"}</span></div></section>`;
    if (record.ownerOutcome) body += `<section class="drawer-section"><h3>Outcome</h3><p class="inspector-copy">${escapeMarkup(record.ownerOutcome)}</p></section>`;
    if (activeAgents.length) body += cards("Active now", activeAgents.map((agent) => {
      const currentTask = agent.currentTask || list(record.tasks).find((task) => task.taskId === agent.currentTaskId)?.title;
      return `${agent.displayName || agent.role}${currentTask ? ` · ${currentTask}` : ""}`;
    }));
    body += cards("Team", list(record.agents).map((agent) => `${agent.displayName || agent.role} · ${String(agent.status || "waiting").replaceAll("_", " ")}`));
    body += cards("Blockers", record.blockers);
    body += cards("Recent events", list(record.events).slice(-12).reverse().map((item) => `${item.type} · ${item.timestamp}`));
    body += cards("Artifacts", list(record.artifactRecords).map((item) => item.kind || item.path || item.artifactId));
  } else if (node.type === "person") {
    body += `<section class="inspector-person"><div class="person-mark" aria-hidden="true">${escapeMarkup(String(record.name || node.label).slice(0, 1))}</div><div><strong>${escapeMarkup(record.organization)}</strong><span>${escapeMarkup(record.publicRole || record.role)}</span></div></section>`;
    if (record.whyRelevant) body += `<section class="drawer-section"><h3>Why relevant</h3><p class="inspector-copy">${escapeMarkup(record.whyRelevant)}</p></section>`;
    if (record.ownerNotes) body += `<section class="drawer-section"><h3>Owner notes</h3><p class="inspector-copy">${escapeMarkup(record.ownerNotes)}</p></section>`;
    body += cards("Related opportunities", record.relatedOpportunityIds);
    const links = list(record.publicSourceUrls).filter((url) => String(url).startsWith("https://"));
    if (links.length) body += `<section class="drawer-section"><h3>Public sources</h3>${links.map((url) => `<div class="drawer-item"><a href="${escapeMarkup(url)}" target="_blank" rel="noopener noreferrer">${escapeMarkup(url)}</a></div>`).join("")}</section>`;
  } else if (node.kind === "capability") {
    body += `<section class="capability-truth"><strong>Implemented capability</strong><p>Available to the Opportunity Director when legitimate persisted work requires it.</p><small>READY means the capability exists. It does not mean work ran.</small></section>`;
  } else if (node.kind === "group") {
    body += `<section class="inspector-scoreboard single"><div><strong>${escapeMarkup(node.detail?.count ?? 0)}</strong><span>${escapeMarkup(node.detail?.collectionType || "records")}</span></div></section><section class="drawer-section"><p class="inspector-copy">Expand this branch to inspect its persisted records.</p></section>`;
  } else if (node.type === "experiment") {
    body += `<section class="drawer-section">${row("Hypothesis", record.hypothesis || node.detail?.method)}${row("Method", record.method || record.actionClass || node.detail?.actionClass)}${row("Success metric", record.successMetric)}${row("Baseline", record.baseline)}${row("Target", record.target)}${row("Cost", record.cost == null ? node.detail?.costUsd : `$${money(record.cost)}`)}${row("Result", record.result)}${row("Decision", record.decision)}</section>`;
  } else if (node.type === "rule") {
    body += `<section class="drawer-section">${row("Statement", record.statement)}${row("Status", record.status)}${row("Confidence", record.confidence == null ? null : `${record.confidence}%`)}${row("Supporting outcomes", record.supportingOutcomeIds)}${row("Conflicting outcomes", record.contradictingOutcomeIds)}${row("Review date", record.reviewAt)}</section>`;
  } else {
    const detailRows = Object.entries(node.detail || {}).filter(([key, value]) => key !== "record" && ["string", "number", "boolean"].includes(typeof value)).map(([key, value]) => row(key.replace(/([A-Z])/g, " $1"), value)).join("");
    const recordRows = Object.entries(record).filter(([, value]) => ["string", "number", "boolean"].includes(typeof value)).slice(0, 16).map(([key, value]) => row(key.replace(/([A-Z])/g, " $1"), value)).join("");
    body += `<section class="drawer-section">${detailRows}${recordRows}</section>`;
  }
  body += cards("Relationships", connected);
  return body + technical;
}
