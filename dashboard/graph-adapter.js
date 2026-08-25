const ACTIVE_STATES = new Set(["active", "running", "researching", "synthesizing", "validating"]);
const WAITING_STATES = new Set(["waiting", "watching", "queued", "planned", "proposed", "waiting_approval", "identified"]);
const BLOCKED_STATES = new Set(["blocked", "failed", "needs_revision", "rejected", "revoked", "expired"]);
const COMPLETE_STATES = new Set(["complete", "completed", "done", "won", "pass", "ready", "trusted"]);
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
    const normalized = { state: "waiting", detail: {}, parentId: null, ...node, id: String(node.id) };
    if (!nodes.has(normalized.id)) nodes.set(normalized.id, normalized);
    return nodes.get(normalized.id);
  };
  const addEdge = (source, target, relation = "contains") => {
    if (!source || !target || source === target || !nodes.has(source) || !nodes.has(target)) return;
    const id = `${source}::${relation}::${target}`;
    if (!edges.has(id)) edges.set(id, { id, source, target, relation });
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
  return builder.addChild(rootId, { id, type, label, state: "active", detail: { count: Array.isArray(records) ? records.length : undefined, ...detail } });
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
      state: opportunity.status,
      detail: { record: opportunity, score: opportunity.score, confidence: opportunity.confidence, provenance: opportunity.provenance }
    });
    for (const [index, signal] of list(opportunity.signals).entries()) {
      const signalId = text(signal.signalId, `${opportunityId}-signal-${index + 1}`);
      builder.addChild(node.id, { id: signalId, type: "signal", label: text(signal.label || signal.entity || signal.type, "Signal"), state: signal.status || "active", detail: { record: signal } });
    }
    for (const [index, observation] of list(opportunity.observations).entries()) {
      const evidenceId = text(observation.evidenceId, `${opportunityId}-evidence-${index + 1}`);
      builder.addChild(node.id, { id: evidenceId, type: "evidence", label: text(observation.statement, `Evidence ${index + 1}`).slice(0, 90), state: "completed", detail: { record: observation, sourceUrl: list(opportunity.sourceUrls)[index] || null } });
    }
    if (opportunity.economicModel && Object.keys(opportunity.economicModel).length > 0) {
      builder.addChild(node.id, { id: `${opportunityId}-economics`, type: "cost", label: "Economics", state: "active", detail: { record: opportunity.economicModel, researchSpendUsd: opportunity.researchSpendUsd } });
    }
    if (text(opportunity.distributionLeverage) && opportunity.distributionLeverage !== "unassessed") {
      builder.addChild(node.id, { id: `${opportunityId}-distribution`, type: "distribution", label: "Distribution", state: "waiting", detail: { value: opportunity.distributionLeverage } });
    }
    if (list(opportunity.researchRunIds).some((id) => String(id).includes("skeptic")) || Number(opportunity.skepticDowngrade || 0) > 0) {
      builder.addChild(node.id, { id: `${opportunityId}-skeptic`, type: "skeptic", label: "Skeptic", state: Number(opportunity.skepticDowngrade || 0) > 0 ? "warning" : "completed", detail: { confidenceBefore: opportunity.confidenceBeforeSkeptic, downgrade: opportunity.skepticDowngrade, confidenceAfter: opportunity.confidence } });
    }
    if (opportunity.cheapestValidation) {
      builder.addChild(node.id, { id: `${opportunityId}-validation`, type: "experiment", label: "Next validation", state: opportunity.status === "validation_ready" ? "waiting" : opportunity.status, detail: { method: opportunity.cheapestValidation, actionClass: opportunity.validationActionClass, costUsd: opportunity.estimatedValidationCost, stopConditions: opportunity.stopConditions } });
    }
    for (const experiment of experiments.filter((item) => item.opportunityId === opportunityId)) {
      const experimentId = text(experiment.experimentId);
      if (experimentId) builder.addEdge(node.id, experimentId, "validates");
    }
    for (const person of people.filter((item) => list(item.relatedOpportunityIds).includes(opportunityId) || list(opportunity.relatedPeople).includes(item.personId))) {
      const personId = text(person.personId);
      if (personId) builder.addEdge(node.id, personId, "involves");
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
    const node = builder.addChild(missionBranch.id, { id: missionId, type: "mission", label: text(mission.summary || mission.ownerOutcome, missionId), state: mission.status, detail: { record: mission } });
    if (mission.planning) builder.addChild(node.id, { id: `${missionId}-planner`, type: "planner", label: mission.planning.mode === "model" ? "Model planner" : "Deterministic planner", state: "completed", detail: { record: mission.planning, validationStrategy: list(mission.validationStrategy).join(" · "), integrationOrder: list(mission.integrationOrder).join(" · ") } });
    for (const agent of list(mission.agents)) {
      const agentId = text(agent.agentRunId);
      if (agentId) builder.addChild(node.id, { id: agentId, type: "agent", label: text(agent.displayName || agent.role, agentId), state: agent.status, detail: { record: agent } });
    }
    for (const task of list(mission.tasks)) {
      const taskId = text(task.taskId);
      if (!taskId) continue;
      builder.addChild(node.id, { id: taskId, type: "task", label: text(task.title, taskId), state: task.status, detail: { record: task } });
    }
    for (const task of list(mission.tasks)) for (const dependency of list(task.dependencies)) builder.addEdge(dependency, task.taskId, "precedes");
    for (const [index, blocker] of list(mission.blockers).entries()) builder.addChild(node.id, { id: `${missionId}-blocker-${index + 1}`, type: "blocker", label: text(blocker, "Blocker").slice(0, 90), state: "blocked", detail: { message: blocker } });
    for (const artifact of list(mission.artifactRecords)) {
      const artifactId = text(artifact.artifactId);
      if (artifactId) builder.addChild(node.id, { id: artifactId, type: "artifact", label: text(artifact.kind, "Artifact"), state: "completed", detail: { record: artifact } });
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
  const root = builder.addNode({ id: "ag-os", type: "root", label: "AG OS", state: status.safeguards?.status || "active", detail: { status: status.boot?.status || status.safeguards?.status || "active", truth: status.safeguards || {} } });
  const director = status.opportunityDirector || null;
  const missions = list(status.missions);
  const directorBranch = branch(builder, root.id, "branch-opportunity-director", "Opportunity Director", "director", director, { objective: director?.director?.objective, status: director?.discoveryStatus });
  const missionBranch = branch(builder, root.id, "branch-missions", "Missions", "mission", missions);
  const peopleBranch = branch(builder, root.id, "branch-people", "People", "person", director?.people);
  const experimentsBranch = branch(builder, root.id, "branch-experiments", "Experiments", "experiment", director?.experiments);
  const learningBranch = branch(builder, root.id, "branch-learning", "Learning", "rule", director?.learned);
  const hasCosts = Boolean(director?.treasury) || Number(director?.aiSpendUsd || 0) > 0 || missions.some((mission) => mission.budget);
  const costsBranch = branch(builder, root.id, "branch-costs", "Costs", "cost", hasCosts ? { persisted: true } : null);
  const outcomesBranch = branch(builder, root.id, "branch-outcomes", "Outcomes", "outcome", director?.outcomes);

  const peopleGroups = new Map();
  for (const person of list(director?.people)) {
    const personId = text(person.personId);
    if (peopleBranch && personId) {
      const relationship = text(person.relationshipState, "unconfirmed");
      const groupId = `people-${slug(relationship)}`;
      let group = peopleGroups.get(groupId);
      if (!group) { group = builder.addChild(peopleBranch.id, { id: groupId, type: "person_group", label: `${text(relationship).replaceAll("_", " ")} people`, state: relationship, detail: { relationshipState: relationship } }); peopleGroups.set(groupId, group); }
      builder.addChild(group.id, { id: personId, type: "person", label: text(person.name, personId), state: person.relationshipState, detail: { record: person } });
    }
  }
  for (const experiment of list(director?.experiments)) {
    const experimentId = text(experiment.experimentId);
    if (experimentsBranch && experimentId) builder.addChild(experimentsBranch.id, { id: experimentId, type: "experiment", label: text(experiment.hypothesis, experimentId), state: experiment.status, detail: { record: experiment } });
  }
  for (const rule of list(director?.learned)) {
    const ruleId = text(rule.ruleId);
    if (learningBranch && ruleId) builder.addChild(learningBranch.id, { id: ruleId, type: "rule", label: text(rule.statement, ruleId), state: rule.status, detail: { record: rule } });
  }
  for (const outcome of list(director?.outcomes)) {
    const outcomeId = text(outcome.outcomeId);
    if (outcomesBranch && outcomeId) builder.addChild(outcomesBranch.id, { id: outcomeId, type: "outcome", label: text(outcome.note || outcome.type, outcomeId), state: outcome.type === "won" || outcome.type === "revenue" ? "completed" : outcome.type === "lost" ? "killed" : "active", detail: { record: outcome } });
  }
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
  const allowed = focusId ? subtreeNodeIds(graph, focusId) : new Set(list(graph?.nodes).map((node) => node.id));
  if (focusId) {
    for (const edge of list(graph?.edges).filter((item) => item.relation !== "contains" && allowed.has(item.source))) allowed.add(edge.target);
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
  for (const edge of list(graph?.edges).filter((item) => item.relation !== "contains" && visible.has(item.source) && allowed.has(item.target))) visible.add(edge.target);
  return {
    ...graph,
    rootId: focusId || graph.rootId,
    nodes: list(graph?.nodes).filter((node) => visible.has(node.id)),
    edges: list(graph?.edges).filter((edge) => visible.has(edge.source) && visible.has(edge.target))
  };
}

export function toggleGraphExpansion(expanded, nodeId) {
  const next = new Set(expanded || []);
  if (next.has(nodeId)) next.delete(nodeId); else next.add(nodeId);
  return next;
}

export function layoutGraph(graph, { focusId = null } = {}) {
  const nodes = list(graph?.nodes);
  const rootId = focusId || graph?.rootId;
  const children = new Map();
  for (const node of nodes) {
    if (!node.parentId || !nodes.some((candidate) => candidate.id === node.parentId)) continue;
    if (!children.has(node.parentId)) children.set(node.parentId, []);
    children.get(node.parentId).push(node.id);
  }
  for (const values of children.values()) values.sort();
  const positions = new Map([[rootId, { x: 0, y: 0, depth: 0 }]]);
  const first = children.get(rootId) || [];
  first.forEach((id, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(1, first.length);
    positions.set(id, { x: Math.cos(angle) * 290, y: Math.sin(angle) * 220, depth: 1, angle });
  });
  const queue = [...first];
  while (queue.length) {
    const parentId = queue.shift();
    const parent = positions.get(parentId);
    const descendants = children.get(parentId) || [];
    descendants.forEach((id, index) => {
      const spread = (index - (descendants.length - 1) / 2) * 104;
      const angle = parent.angle ?? Math.atan2(parent.y, parent.x);
      const radius = 210;
      positions.set(id, { x: parent.x + Math.cos(angle) * radius - Math.sin(angle) * spread, y: parent.y + Math.sin(angle) * radius + Math.cos(angle) * spread, depth: parent.depth + 1, angle });
      queue.push(id);
    });
  }
  let orphan = 0;
  for (const node of nodes) if (!positions.has(node.id)) positions.set(node.id, { x: 430 + (orphan % 3) * 180, y: -140 + Math.floor(orphan / 3) * 100, depth: 2, angle: 0 }), orphan += 1;
  return positions;
}

export function searchGraph(graph, query) {
  const needle = text(query).toLowerCase();
  if (!needle) return [];
  return list(graph?.nodes).filter((node) => `${node.label} ${node.type} ${node.id} ${JSON.stringify(node.detail || {})}`.toLowerCase().includes(needle));
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
  let body = `<section class="drawer-section">${row("Type", node.type)}${row("State", graphState(node.state))}${row("ID", node.id)}</section>`;
  if (node.type === "opportunity") {
    body += `<section class="drawer-section">${row("Score", record.score)}${row("Confidence", record.confidence == null ? null : `${record.confidence}%`)}${row("Status", record.status)}${row("Research spend", record.researchSpendUsd == null ? null : `$${money(record.researchSpendUsd).toFixed(2)}`)}</section>`;
    body += cards("Observed facts", list(record.observations).map((item) => item.statement));
    body += cards("Hypothesis", [record.problemHypothesis, ...list(record.assumptions).map((item) => item.statement || item)]);
    body += `<section class="drawer-section"><h3>Economics</h3>${row("Low / base / high", record.economicModel ? `$${money(record.economicModel.lowValueUsd)} / $${money(record.economicModel.baseValueUsd)} / $${money(record.economicModel.highValueUsd)}` : null)}${row("Expected value", record.economicModel?.expectedValueUsd == null ? null : `$${money(record.economicModel.expectedValueUsd)}`)}${row("Validation cost", record.estimatedValidationCost == null ? null : `$${money(record.estimatedValidationCost)}`)}</section>`;
    body += cards("Next action", [record.recommendedNextAction, record.cheapestValidation]);
  } else if (node.type === "mission") {
    body += `<section class="drawer-section">${row("Outcome", record.ownerOutcome)}${row("Progress", record.progress ? `${record.progress.completedTasks || 0} / ${record.progress.totalTasks || 0} (${record.progress.percent || 0}%)` : null)}${row("Cost", record.budget ? `$${money(record.budget.spentUsd).toFixed(3)} / $${money(record.budget.limitUsd).toFixed(2)}` : null)}${row("Agent runs", list(record.agents).length)}${row("Tasks", list(record.tasks).length)}${row("Artifacts", list(record.artifactRecords).length)}</section>`;
    body += cards("Blockers", record.blockers);
    body += cards("Recent events", list(record.events).slice(-12).reverse().map((item) => `${item.type} · ${item.timestamp}`));
  } else if (node.type === "person") {
    body += `<section class="drawer-section">${row("Role", record.publicRole || record.role)}${row("Organization", record.organization)}${row("Relationship", record.relationshipState)}${row("Why relevant", record.whyRelevant)}${row("Owner notes", record.ownerNotes)}</section>`;
    const links = list(record.publicSourceUrls).filter((url) => String(url).startsWith("https://"));
    if (links.length) body += `<section class="drawer-section"><h3>Public sources</h3>${links.map((url) => `<div class="drawer-item"><a href="${escapeMarkup(url)}" target="_blank" rel="noopener noreferrer">${escapeMarkup(url)}</a></div>`).join("")}</section>`;
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
  return body;
}
