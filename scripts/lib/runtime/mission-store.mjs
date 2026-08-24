import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { isoTimestamp, readJson, slugify, writeJson } from "./common.mjs";

export const MISSION_STATUSES = ["created", "planning", "planned", "running", "blocked", "failed", "completed", "cancelled"];
export const AGENT_RUN_STATUSES = ["idle", "waiting", "working", "blocked", "reviewing", "failed", "complete"];
export const MISSION_TASK_STATUSES = ["waiting", "ready", "working", "reviewing", "blocked", "failed", "complete", "cancelled"];

function missionDirectory(missionId) {
  return `.codex/missions/${slugify(missionId)}`;
}

export function missionPaths(missionId) {
  const directory = missionDirectory(missionId);
  return {
    directory,
    mission: `${directory}/mission.json`,
    agents: `${directory}/agents`,
    tasks: `${directory}/tasks`,
    handoffs: `${directory}/handoffs`,
    artifacts: `${directory}/artifacts`,
    events: `${directory}/events.jsonl`
  };
}

export function ensureMissionDirectories({ missionId, root = process.cwd() }) {
  const paths = missionPaths(missionId);
  for (const relative of [paths.directory, paths.agents, paths.tasks, paths.handoffs, paths.artifacts]) {
    mkdirSync(path.join(root, relative), { recursive: true });
  }
  return paths;
}

export function writeMission(record, root = process.cwd()) {
  if (!record?.missionId || !MISSION_STATUSES.includes(record.status)) throw new Error("mission record is invalid");
  const paths = ensureMissionDirectories({ missionId: record.missionId, root });
  writeJson(paths.mission, record, root);
  return { record, filePath: paths.mission };
}

export function readMission(missionId, root = process.cwd()) {
  return readJson(missionPaths(missionId).mission, root);
}

export function writeAgentRun(record, root = process.cwd()) {
  if (!record?.agentRunId || !record?.missionId || !AGENT_RUN_STATUSES.includes(record.status)) throw new Error("agent run record is invalid");
  const paths = ensureMissionDirectories({ missionId: record.missionId, root });
  const filePath = `${paths.agents}/${slugify(record.agentRunId)}.json`;
  writeJson(filePath, record, root);
  return { record, filePath };
}

export function writeMissionTask(record, root = process.cwd()) {
  if (!record?.taskId || !record?.missionId || !MISSION_TASK_STATUSES.includes(record.status)) throw new Error("mission task record is invalid");
  const paths = ensureMissionDirectories({ missionId: record.missionId, root });
  const filePath = `${paths.tasks}/${slugify(record.taskId)}.json`;
  writeJson(filePath, record, root);
  return { record, filePath };
}

export function writeHandoff(record, root = process.cwd()) {
  if (!record?.handoffId || !record?.missionId || !record?.sourceAgentRunId || !record?.destinationAgentRunId) throw new Error("handoff record is invalid");
  const paths = ensureMissionDirectories({ missionId: record.missionId, root });
  const filePath = `${paths.handoffs}/${slugify(record.handoffId)}.json`;
  writeJson(filePath, record, root);
  return { record, filePath };
}

function listJsonRecords(relativeDirectory, root) {
  const absolute = path.join(root, relativeDirectory);
  if (!existsSync(absolute)) return [];
  return readdirSync(absolute)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => JSON.parse(readFileSync(path.join(absolute, name), "utf8")));
}

export function listMissionAgents(missionId, root = process.cwd()) {
  return listJsonRecords(missionPaths(missionId).agents, root);
}

export function listMissionTasks(missionId, root = process.cwd()) {
  return listJsonRecords(missionPaths(missionId).tasks, root);
}

export function listMissionHandoffs(missionId, root = process.cwd()) {
  return listJsonRecords(missionPaths(missionId).handoffs, root);
}

export function appendMissionEvent({ missionId, type, agentRunId = null, taskId = null, workspaceId = null, artifactIds = [], payload = {}, now = new Date(), root = process.cwd() }) {
  if (!missionId || !type) throw new Error("mission event requires missionId and type");
  const paths = ensureMissionDirectories({ missionId, root });
  const existing = readMissionEvents(missionId, root);
  const sequence = existing.length === 0 ? 1 : existing.at(-1).sequence + 1;
  const event = {
    eventId: `event-${slugify(missionId)}-${String(sequence).padStart(6, "0")}`,
    sequence,
    type,
    missionId,
    agentRunId,
    taskId,
    workspaceId,
    artifactIds,
    payload,
    createdAt: isoTimestamp(now)
  };
  appendFileSync(path.join(root, paths.events), `${JSON.stringify(event)}\n`, "utf8");
  return event;
}

export function readMissionEvents(missionId, root = process.cwd(), { after = 0, limit = 1000 } = {}) {
  const file = path.join(root, missionPaths(missionId).events);
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean)
    .map((line) => JSON.parse(line))
    .filter((event) => event.sequence > after)
    .slice(0, Math.max(1, Math.min(limit, 5000)));
}

export function listMissions({ root = process.cwd(), limit = 50 } = {}) {
  const directory = path.join(root, ".codex", "missions");
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(path.join(directory, entry.name, "mission.json")))
    .map((entry) => JSON.parse(readFileSync(path.join(directory, entry.name, "mission.json"), "utf8")))
    .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)))
    .slice(0, Math.max(1, Math.min(limit, 200)));
}

export function missionDetail(missionId, root = process.cwd()) {
  const mission = readMission(missionId, root);
  const artifactDirectory = path.join(root, missionPaths(missionId).artifacts);
  const artifactRecords = existsSync(artifactDirectory)
    ? readdirSync(artifactDirectory).filter((name) => name.endsWith(".json")).map((name) => JSON.parse(readFileSync(path.join(artifactDirectory, name), "utf8")))
    : [];
  return {
    ...mission,
    agents: listMissionAgents(missionId, root),
    tasks: listMissionTasks(missionId, root),
    handoffs: listMissionHandoffs(missionId, root),
    events: readMissionEvents(missionId, root),
    artifactRecords
  };
}
