import path from "node:path";
import process from "node:process";
import { listDirectJson, readJson } from "./common.mjs";

const CATEGORY_KEYWORDS = {
  build: ["build", "code", "file", "github", "branch", "pull request", "source"],
  review: ["review", "quality", "score", "critique", "validation", "test"],
  delivery: ["deliver", "deploy", "release", "staging", "netlify"],
  client: ["client", "customer", "onboarding"],
  ops: ["operate", "runtime", "monitor", "incident", "backup", "rollback", "queue", "concurrent"]
};

function normalizedContext({ outputType, tools = [], tasks = [] }) {
  return [
    outputType,
    ...tools,
    ...tasks.flatMap((task) => [task?.taskId, task?.description])
  ].filter(Boolean).join(" ").toLowerCase();
}

function relevanceForSkill(skill, query) {
  let score = 0;
  const reasons = [];
  const appliesTo = new Set(skill.appliesTo ?? []);
  const exactTargets = [
    query.projectId,
    query.archetypeId,
    query.outputType,
    query.workerType,
    query.workerType ? `worker:${query.workerType}` : null
  ].filter(Boolean);

  for (const target of exactTargets) {
    if (appliesTo.has(target)) {
      score += 6;
      reasons.push(`applies_to:${target}`);
    }
  }

  const context = normalizedContext(query);
  const categoryMatched = (CATEGORY_KEYWORDS[skill.category] ?? []).some((keyword) => context.includes(keyword));
  if (categoryMatched) {
    score += 3;
    reasons.push(`category:${skill.category}`);
  }

  if (appliesTo.has("any") && (categoryMatched || score > 0)) {
    score += 1;
    reasons.push("applies_to:any");
  }

  return { score, reasons };
}

export function retrieveRelevantSkills({
  root = process.cwd(),
  projectId,
  archetypeId,
  outputType,
  workerType = "worker",
  tools = [],
  tasks = [],
  limit = 5
} = {}) {
  const query = { projectId, archetypeId, outputType, workerType, tools, tasks };
  const skills = listDirectJson(".codex/skills", { root })
    .filter((recordPath) => path.basename(recordPath).startsWith("skill-"))
    .map((recordPath) => ({ recordPath, skill: readJson(recordPath, root) }))
    .filter(({ skill }) => skill.status === "active")
    .map(({ recordPath, skill }) => ({ recordPath, skill, relevance: relevanceForSkill(skill, query) }))
    .filter(({ relevance }) => relevance.score > 0)
    .sort((left, right) => right.relevance.score - left.relevance.score || left.skill.id.localeCompare(right.skill.id))
    .slice(0, limit)
    .map(({ recordPath, skill, relevance }) => ({
      skillId: skill.id,
      name: skill.name,
      category: skill.category,
      recordPath,
      relevanceScore: relevance.score,
      relevanceReasons: relevance.reasons,
      grantsPermission: false
    }));

  return {
    strategy: "task_tool_skill_similarity_v1",
    query: {
      projectId: projectId ?? null,
      archetypeId: archetypeId ?? null,
      outputType: outputType ?? null,
      workerType
    },
    skills,
    activeSkillsOnly: true,
    skillsGrantPermission: false
  };
}
