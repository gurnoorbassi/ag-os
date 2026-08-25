const evidence = Array.from({ length: 12 }, (_, index) => ({
  evidenceId: `evidence-${index + 1}`,
  statement: index === 0 ? "Seven public reviews mention delayed quote responses." : `Persisted field observation ${index + 1}.`
}));

export const opportunities = [
  {
    opportunityId: "opp-recovery", title: "Contractor Quote Recovery", status: "validation_ready", score: 84, confidence: 74,
    observations: evidence,
    signals: Array.from({ length: 5 }, (_, index) => ({ signalId: `signal-${index + 1}`, label: `Demand signal ${index + 1}`, status: index === 0 ? "active" : "completed" })),
    economicModel: { lowValueUsd: 2000, baseValueUsd: 8400, highValueUsd: 19000, expectedValueUsd: 5621 },
    problemHypothesis: "Contractors may lose qualified work because quote follow-up is slow or inconsistent.",
    assumptions: [{ statement: "Operator interviews can test the workflow pain." }],
    cheapestValidation: "Interview three operators", estimatedValidationCost: 12, researchSpendUsd: .38,
    distributionLeverage: "public operator network", researchRunIds: ["skeptic-review"], skepticDowngrade: 3, confidenceBeforeSkeptic: 77,
    relatedPeople: ["person-john"], recommendedNextAction: "Prepare the bounded validation"
  },
  { opportunityId: "opp-routing", title: "Service Dispatch Routing", status: "watching", score: 66, confidence: 58, observations: [{ evidenceId: "routing-evidence", statement: "Dispatch delays recur in public reviews." }] },
  { opportunityId: "opp-archive", title: "Legacy Intake Assistant", status: "killed", score: 41, confidence: 32, observations: [{ evidenceId: "archive-evidence", statement: "Economics did not clear the threshold." }] }
];

export const activeMission = {
  missionId: "mission-recovery", summary: "Lead Recovery Prototype", ownerOutcome: "Prove the quote-recovery workflow", status: "running",
  progress: { completedTasks: 2, totalTasks: 5, percent: 40 }, budget: { spentUsd: .42, limitUsd: 5 },
  planning: { mode: "model", validationStrategy: ["npm test"] }, validationStrategy: ["npm test"], integrationOrder: ["task-design", "task-api", "task-ui", "task-review", "task-qa"],
  agents: [
    { agentRunId: "agent-backend", role: "backend", displayName: "Backend Engineer", status: "running", currentTask: "Editing lead API", toolCallCount: 12, costUsd: .08, startedAt: "2026-08-25T12:00:00Z" },
    { agentRunId: "agent-frontend", role: "frontend", displayName: "Frontend Engineer", status: "completed", completedAt: "2026-08-25T12:10:00Z" },
    { agentRunId: "agent-reviewer", role: "code_reviewer", displayName: "Code Reviewer", status: "waiting" },
    { agentRunId: "agent-qa", role: "qa", displayName: "QA", status: "waiting" }
  ],
  tasks: [
    { taskId: "task-design", title: "Design contract", status: "completed", assignedAgentRunId: "agent-frontend", dependencies: [], completedAt: "2026-08-25T12:05:00Z" },
    { taskId: "task-api", title: "Build recovery API", status: "running", assignedAgentRunId: "agent-backend", dependencies: ["task-design"], startedAt: "2026-08-25T12:06:00Z" },
    { taskId: "task-ui", title: "Build owner workflow", status: "completed", assignedAgentRunId: "agent-frontend", dependencies: ["task-design"], completedAt: "2026-08-25T12:09:00Z" },
    { taskId: "task-review", title: "Review integration", status: "waiting", assignedAgentRunId: "agent-reviewer", dependencies: ["task-api", "task-ui"] },
    { taskId: "task-qa", title: "Run full validation", status: "waiting", assignedAgentRunId: "agent-qa", dependencies: ["task-review"] }
  ],
  blockers: ["Reviewer is waiting for backend integration."],
  artifactRecords: [{ artifactId: "artifact-patch", kind: "patch" }, { artifactId: "artifact-report", kind: "validation report" }],
  events: [{ type: "task.completed", timestamp: "2026-08-25T12:09:00Z" }]
};

export const visualStatus = {
  safeguards: { status: "active" },
  missions: [{ missionId: activeMission.missionId, summary: activeMission.summary, status: activeMission.status, budget: activeMission.budget }],
  opportunityDirector: {
    discoveryStatus: "active",
    director: { objective: "Find evidence-backed opportunities" },
    constitution: { version: "1.1.0" },
    opportunities,
    people: [{ personId: "person-john", name: "John Smith", organization: "ABC Construction", publicRole: "Owner", relationshipState: "identified", whyRelevant: "Operates the observed quote workflow", relatedOpportunityIds: ["opp-recovery"], publicSourceUrls: ["https://example.com/public-profile"] }],
    experiments: [{ experimentId: "experiment-interviews", opportunityId: "opp-recovery", hypothesis: "Operators confirm follow-up pain", status: "waiting", successMetric: "confirmed interviews", target: "3" }],
    outcomes: [{ outcomeId: "outcome-validated", opportunityId: "opp-recovery", type: "won", note: "Validation passed" }],
    learned: [{ ruleId: "rule-followup", opportunityId: "opp-recovery", statement: "Validate response-time pain before building", status: "active", confidence: 80, supportingOutcomeIds: ["outcome-validated"] }],
    missionLinks: [{ opportunityId: "opp-recovery", missionId: activeMission.missionId }],
    treasury: { spentUsd: .38, limitUsd: 20 }, aiSpendUsd: .38
  }
};

export const emptySystemStatus = {
  safeguards: { status: "active" }, missions: [],
  opportunityDirector: { discoveryStatus: "idle", director: { objective: "Find evidence-backed opportunities" }, constitution: { version: "1.1.0" }, opportunities: [], people: [], experiments: [], outcomes: [], learned: [] }
};
