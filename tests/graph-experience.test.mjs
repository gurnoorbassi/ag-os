import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildAgOsGraph, graphStateClass, layoutGraph, nodeDimensions, reconcileGraphViewState,
  renderGraphNodeDetail, searchGraph, visibleGraph
} from "../dashboard/graph-adapter.js";
import { activeMission, emptySystemStatus, visualStatus } from "./fixtures/graph-visual-states.mjs";

function fullyExpanded(graph) {
  return new Set(graph.nodes.filter((node) => graph.nodes.some((candidate) => candidate.parentId === node.id)).map((node) => node.id));
}

function assertNoOverlap(graph, positions) {
  for (let index = 0; index < graph.nodes.length; index += 1) {
    for (let other = index + 1; other < graph.nodes.length; other += 1) {
      const a = positions.get(graph.nodes[index].id); const b = positions.get(graph.nodes[other].id);
      const overlaps = Math.abs(a.x - b.x) < (a.width + b.width) / 2 && Math.abs(a.y - b.y) < (a.height + b.height) / 2;
      assert.equal(overlaps, false, `${graph.nodes[index].id} overlaps ${graph.nodes[other].id}`);
    }
  }
}

test("empty persisted state creates only the truthful AG OS root", () => {
  const graph = buildAgOsGraph();
  assert.deepEqual(graph.nodes.map((node) => node.id), ["ag-os"]);
  assert.deepEqual(graph.edges, []);
});

test("empty real system exposes proven dormant capabilities without fabricating activity", () => {
  const graph = buildAgOsGraph({ status: emptySystemStatus });
  const capabilities = graph.nodes.filter((node) => node.kind === "capability");
  assert.equal(capabilities.length, 5);
  assert.ok(capabilities.every((node) => node.state === "ready" && node.detail.executedWork === false && node.detail.constitutionVersion));
  assert.equal(graph.nodes.some((node) => node.type === "opportunity"), false);
  assert.equal(graph.nodes.some((node) => node.type === "mission" && node.kind === "entity"), false);
});

test("adapter generates deduplicated persisted nodes and real collaboration edge types", () => {
  const graph = buildAgOsGraph({ status: visualStatus, missionDetails: [activeMission] });
  assert.equal(new Set(graph.nodes.map((node) => node.id)).size, graph.nodes.length);
  assert.equal(new Set(graph.edges.map((edge) => edge.id)).size, graph.edges.length);
  for (const id of ["opp-recovery", "mission-recovery", "mission-recovery-planner", "person-john", "experiment-interviews", "rule-followup", "outcome-validated", "agent-backend", "task-design", "task-api", "artifact-patch"]) assert.ok(graph.nodes.some((node) => node.id === id), `missing ${id}`);
  assert.ok(graph.edges.some((edge) => edge.source === "opp-recovery" && edge.target === "mission-recovery" && edge.relation === "spawned"));
  assert.ok(graph.edges.some((edge) => edge.source === "opp-recovery-people" && edge.target === "person-john" && edge.relation === "involves"));
  assert.ok(graph.edges.some((edge) => edge.source === "experiment-interviews" && edge.target === "opp-recovery" && edge.relation === "validates"));
  assert.ok(graph.edges.some((edge) => edge.source === "outcome-validated" && edge.target === "rule-followup" && edge.relation === "learned"));
  assert.ok(graph.edges.some((edge) => edge.source === "task-design" && edge.target === "task-api" && edge.relation === "precedes"));
  assert.ok(graph.edges.some((edge) => edge.source === "agent-backend" && edge.target === "task-api" && edge.relation === "executes"));
  assert.ok(graph.edges.some((edge) => edge.source === "mission-recovery-planner" && edge.target === "agent-backend" && edge.relation === "assigns"));
});

test("large collections use independently expandable semantic groups", () => {
  const graph = buildAgOsGraph({ status: visualStatus, missionDetails: [activeMission] });
  const evidenceGroup = graph.nodes.find((node) => node.id === "opp-recovery-evidence");
  assert.equal(evidenceGroup.kind, "group");
  assert.equal(evidenceGroup.detail.count, 12);
  let focused = visibleGraph(graph, { expanded: new Set(["opp-recovery"]), focusId: "opp-recovery" });
  assert.ok(focused.nodes.some((node) => node.id === evidenceGroup.id));
  assert.equal(focused.nodes.some((node) => node.id === "evidence-1"), false);
  focused = visibleGraph(graph, { expanded: new Set(["opp-recovery", evidenceGroup.id]), focusId: "opp-recovery" });
  assert.ok(focused.nodes.some((node) => node.id === "evidence-1"));
});

test("root-centered layout radiates major systems and remains collision free", () => {
  const graph = buildAgOsGraph({ status: visualStatus, missionDetails: [activeMission] });
  const visible = visibleGraph(graph, { expanded: fullyExpanded(graph) });
  const positions = layoutGraph(visible);
  assert.deepEqual({ x: positions.get("ag-os").x, y: positions.get("ag-os").y }, { x: 0, y: 0 });
  const systems = visible.nodes.filter((node) => node.kind === "system").map((node) => positions.get(node.id));
  assert.ok(systems.some((node) => node.x < -200));
  assert.ok(systems.some((node) => node.x > 200));
  assert.ok(systems.some((node) => node.y < -200));
  assert.ok(systems.some((node) => node.y > 200));
  assertNoOverlap(visible, positions);
});

test("semantic node dimensions preserve visible hierarchy", () => {
  const graph = buildAgOsGraph({ status: visualStatus, missionDetails: [activeMission] });
  const size = (id) => nodeDimensions(graph.nodes.find((node) => node.id === id));
  assert.ok(size("ag-os").width > size("branch-missions").width);
  assert.ok(size("branch-missions").width > size("opp-recovery-evidence").width);
  assert.ok(size("opp-recovery").width > size("evidence-1").width);
});

test("opportunity and mission focus preserve real subtree structure", () => {
  const graph = buildAgOsGraph({ status: visualStatus, missionDetails: [activeMission] });
  const opportunity = visibleGraph(graph, { expanded: new Set(["opp-recovery"]), focusId: "opp-recovery" });
  assert.equal(opportunity.rootId, "opp-recovery");
  assert.ok(opportunity.nodes.some((node) => node.id === "opp-recovery-evidence"));
  assert.ok(opportunity.nodes.some((node) => node.id === "mission-recovery"));
  assert.equal(opportunity.nodes.some((node) => node.id === "branch-people"), false);
  const mission = visibleGraph(graph, { expanded: new Set(["mission-recovery"]), focusId: "mission-recovery" });
  assert.ok(mission.nodes.some((node) => node.id === "mission-recovery-agents"));
  assert.ok(mission.nodes.some((node) => node.id === "mission-recovery-tasks"));
});

test("selection, focus, and expansion survive refresh only while nodes remain", () => {
  const graph = buildAgOsGraph({ status: visualStatus, missionDetails: [activeMission] });
  const preserved = reconcileGraphViewState(graph, { expanded: new Set(["ag-os", "opp-recovery"]), selectedId: "opp-recovery", focusId: "opp-recovery" });
  assert.equal(preserved.selectedId, "opp-recovery");
  assert.equal(preserved.focusId, "opp-recovery");
  assert.ok(preserved.expanded.has("opp-recovery"));
  const nextStatus = structuredClone(visualStatus);
  nextStatus.opportunityDirector.opportunities = nextStatus.opportunityDirector.opportunities.filter((item) => item.opportunityId !== "opp-recovery");
  nextStatus.opportunityDirector.missionLinks = [];
  const removed = reconcileGraphViewState(buildAgOsGraph({ status: nextStatus, missionDetails: [activeMission] }), { expanded: preserved.expanded, selectedId: preserved.selectedId, focusId: preserved.focusId });
  assert.equal(removed.selectedId, "ag-os");
  assert.equal(removed.focusId, null);
  assert.equal(removed.expanded.has("opp-recovery"), false);
});

test("layout remains deterministic for a large visible graph", () => {
  const graph = buildAgOsGraph({ status: visualStatus, missionDetails: [activeMission] });
  const visible = visibleGraph(graph, { expanded: fullyExpanded(graph) });
  assert.deepEqual([...layoutGraph(visible).entries()], [...layoutGraph(visible).entries()]);
});

test("all graph state treatments including killed remain deterministic", () => {
  assert.equal(graphStateClass("running"), "graph-state-active");
  assert.equal(graphStateClass("working"), "graph-state-active");
  assert.equal(graphStateClass("ready"), "graph-state-waiting");
  assert.equal(graphStateClass("validation_ready"), "graph-state-waiting");
  assert.equal(graphStateClass("failed"), "graph-state-blocked");
  assert.equal(graphStateClass("done"), "graph-state-completed");
  assert.equal(graphStateClass("killed"), "graph-state-killed");
  assert.equal(graphStateClass("archived"), "graph-state-archived");
});

test("search and type-specific inspector lead with useful escaped content", () => {
  const graph = buildAgOsGraph({ status: visualStatus, missionDetails: [activeMission] });
  assert.equal(searchGraph(graph, "quote follow-up")[0].id, "opp-recovery");
  assert.equal(searchGraph(graph, "opp-recovery").length, 0, "internal ids are not search content");
  const opportunity = graph.nodes.find((node) => node.id === "opp-recovery");
  const detail = renderGraphNodeDetail({ ...opportunity, label: "<unsafe>" }, graph);
  assert.match(detail, /Observed/);
  assert.match(detail, /Opportunity score/);
  assert.match(detail, /Economics/);
  assert.doesNotMatch(detail, /<unsafe>/);
  assert.ok(detail.indexOf("Opportunity score") < detail.indexOf("Technical details"));
  assert.ok(detail.indexOf("Internal ID") > detail.indexOf("Next validation"));
  const mission = renderGraphNodeDetail(graph.nodes.find((node) => node.id === "mission-recovery"), graph);
  assert.match(mission, /Tasks complete/);
  assert.match(mission, /Active now/);
  const capability = renderGraphNodeDetail(graph.nodes.find((node) => node.kind === "capability"), graph);
  assert.match(capability, /does not mean work ran/i);
});

test("graph shell keeps the existing command API and accessibility/motion controls", () => {
  const html = readFileSync("dashboard/os.html", "utf8");
  const script = readFileSync("dashboard/os.js", "utf8");
  const styles = readFileSync("dashboard/os.css", "utf8");
  for (const id of ["graph-canvas", "graph-search", "graph-fit-all", "graph-fit", "graph-reset", "graph-command-form", "graph-command-input", "detail-drawer"]) assert.match(html, new RegExp(`id="${id}"`));
  for (const mode of ["system", "opportunity", "mission"]) assert.match(html, new RegExp(`data-graph-mode="${mode}"`));
  assert.match(script, /api\("\/api\/v1\/commands"/);
  assert.match(script, /reconcileGraphViewState/);
  assert.doesNotMatch(script, /graphState\(item\.state\)/);
  assert.match(script, /event\.key === " "/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(styles, /@keyframes branch-retract/);
  assert.match(styles, /\.graph-edge[^}]*transition/s);
  for (const stateName of ["active", "waiting", "blocked", "completed", "killed", "warning", "archived"]) assert.match(styles, new RegExp(`\\.graph-state-${stateName}\\b`));
});
