import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildAgOsGraph, graphStateClass, renderGraphNodeDetail, searchGraph, toggleGraphExpansion, visibleGraph } from "../dashboard/graph-adapter.js";

const opportunity = {
  opportunityId: "opp-1", title: "Dependency-aware owner graph", status: "validation_ready", score: 81, confidence: 72,
  observations: [{ evidenceId: "evidence-1", statement: "Owner state is split across persistent systems." }],
  signals: [{ signalId: "signal-1", label: "Repeated navigation", status: "active" }],
  economicModel: { lowValueUsd: 100, baseValueUsd: 400, highValueUsd: 900, expectedValueUsd: 380 },
  problemHypothesis: "A graph reduces context switching.", assumptions: [{ statement: "Relationships matter." }],
  cheapestValidation: "Observe owner navigation", estimatedValidationCost: 2, distributionLeverage: "existing owner console",
  researchRunIds: ["skeptic-1"], skepticDowngrade: 4, confidenceBeforeSkeptic: 76,
  relatedPeople: ["person-1"], recommendedNextAction: "Run the bounded test"
};

const status = {
  safeguards: { status: "active" },
  missions: [{ missionId: "mission-1", summary: "Build graph shell", status: "running", budget: { spentUsd: 1, limitUsd: 10 } }],
  opportunityDirector: {
    discoveryStatus: "active", director: { objective: "Find evidence-backed opportunities" },
    opportunities: [opportunity, opportunity],
    people: [{ personId: "person-1", name: "Owner", organization: "AG Digitalz", publicRole: "Owner", relationshipState: "trusted", whyRelevant: "Owns decisions", relatedOpportunityIds: ["opp-1"] }],
    experiments: [{ experimentId: "experiment-1", opportunityId: "opp-1", hypothesis: "Graph navigation is faster", status: "waiting", successMetric: "time", target: "under 10 seconds" }],
    outcomes: [{ outcomeId: "outcome-1", opportunityId: "opp-1", type: "won", note: "Validated" }],
    learned: [{ ruleId: "rule-1", opportunityId: "opp-1", statement: "Show relationships first", status: "active", confidence: 80 }],
    missionLinks: [{ opportunityId: "opp-1", missionId: "mission-1" }],
    treasury: { spentUsd: 2, limitUsd: 20 }, aiSpendUsd: 1
  }
};

const missionDetails = [{
  missionId: "mission-1", ownerOutcome: "Build the persisted graph", status: "running", progress: { completedTasks: 1, totalTasks: 2, percent: 50 },
  planning: { mode: "deterministic_fallback", reason: "approved planner unavailable" }, validationStrategy: ["npm test"], integrationOrder: ["task-1", "task-2"],
  budget: { spentUsd: 1, limitUsd: 10 }, blockers: ["Awaiting review"], events: [{ type: "task.completed", timestamp: "2026-08-24T12:00:00Z" }],
  agents: [{ agentRunId: "agent-1", role: "frontend", displayName: "Frontend", status: "active" }],
  tasks: [{ taskId: "task-1", title: "Design contract", status: "completed", dependencies: [] }, { taskId: "task-2", title: "Build UI", status: "running", dependencies: ["task-1"] }],
  artifactRecords: [{ artifactId: "artifact-1", kind: "patch" }]
}];

test("empty persisted state creates only the truthful AG OS root", () => {
  const graph = buildAgOsGraph();
  assert.deepEqual(graph.nodes.map((node) => node.id), ["ag-os"]);
  assert.deepEqual(graph.edges, []);
});

test("adapter generates deduplicated persisted nodes and real collaboration edges", () => {
  const graph = buildAgOsGraph({ status, missionDetails });
  assert.equal(new Set(graph.nodes.map((node) => node.id)).size, graph.nodes.length);
  assert.equal(new Set(graph.edges.map((edge) => edge.id)).size, graph.edges.length);
  for (const id of ["branch-opportunity-director", "branch-missions", "branch-people", "branch-experiments", "branch-learning", "branch-costs", "branch-outcomes", "opp-1", "mission-1", "mission-1-planner", "people-trusted", "person-1", "experiment-1", "rule-1", "outcome-1", "agent-1", "task-1", "task-2", "artifact-1"]) {
    assert.ok(graph.nodes.some((node) => node.id === id), `missing ${id}`);
  }
  assert.ok(graph.edges.some((edge) => edge.source === "opp-1" && edge.target === "mission-1" && edge.relation === "spawned"));
  assert.ok(graph.edges.some((edge) => edge.source === "opp-1" && edge.target === "person-1" && edge.relation === "involves"));
  assert.ok(graph.edges.some((edge) => edge.source === "task-1" && edge.target === "task-2" && edge.relation === "precedes"));
});

test("expand, collapse, and focus expose only the intended subtree", () => {
  const graph = buildAgOsGraph({ status, missionDetails });
  const rootOnly = visibleGraph(graph, { expanded: new Set() });
  assert.deepEqual(rootOnly.nodes.map((node) => node.id), ["ag-os"]);
  let expanded = toggleGraphExpansion(new Set(), "ag-os");
  const branches = visibleGraph(graph, { expanded });
  assert.ok(branches.nodes.some((node) => node.id === "branch-missions"));
  assert.ok(!branches.nodes.some((node) => node.id === "mission-1"));
  expanded = toggleGraphExpansion(expanded, "branch-missions");
  assert.ok(visibleGraph(graph, { expanded }).nodes.some((node) => node.id === "mission-1"));
  const focus = visibleGraph(graph, { expanded: new Set(["opp-1"]), focusId: "opp-1" });
  assert.equal(focus.rootId, "opp-1");
  assert.ok(focus.nodes.some((node) => node.id === "evidence-1"));
  assert.ok(!focus.nodes.some((node) => node.id === "branch-people"));
});

test("all graph state treatments including killed remain deterministic", () => {
  assert.equal(graphStateClass("running"), "graph-state-active");
  assert.equal(graphStateClass("queued"), "graph-state-waiting");
  assert.equal(graphStateClass("failed"), "graph-state-blocked");
  assert.equal(graphStateClass("done"), "graph-state-completed");
  assert.equal(graphStateClass("killed"), "graph-state-killed");
  assert.equal(graphStateClass("archived"), "graph-state-archived");
  assert.equal(graphStateClass("unexpected"), "graph-state-warning");
});

test("search and rich drawer details use persisted content and escape markup", () => {
  const graph = buildAgOsGraph({ status, missionDetails });
  assert.equal(searchGraph(graph, "context switching")[0].id, "opp-1");
  const opportunityNode = graph.nodes.find((node) => node.id === "opp-1");
  const details = renderGraphNodeDetail({ ...opportunityNode, label: "<unsafe>" }, graph);
  assert.match(details, /Observed facts/);
  assert.match(details, /Economics/);
  assert.doesNotMatch(details, /<unsafe>/);
  const mission = renderGraphNodeDetail(graph.nodes.find((node) => node.id === "mission-1"), graph);
  assert.match(mission, /Agent runs/);
  assert.match(mission, /Recent events/);
});

test("graph shell wires drawer, subtree focus, modes, controls, and every state treatment", () => {
  const html = readFileSync("dashboard/os.html", "utf8");
  const script = readFileSync("dashboard/os.js", "utf8");
  const styles = readFileSync("dashboard/os.css", "utf8");
  for (const id of ["graph-canvas", "graph-search", "graph-fit", "graph-reset", "graph-zoom-in", "graph-zoom-out"]) assert.match(html, new RegExp(`id="${id}"`));
  for (const mode of ["system", "opportunity", "mission"]) assert.match(html, new RegExp(`data-graph-mode="${mode}"`));
  assert.match(script, /data-focus-subtree/);
  assert.match(script, /openDrawer\(\{ kicker: `\$\{titleCase\(node\.type\)\}/);
  for (const stateName of ["active", "waiting", "blocked", "completed", "killed", "warning", "archived"]) assert.match(styles, new RegExp(`\\.graph-state-${stateName}\\b`));
});
