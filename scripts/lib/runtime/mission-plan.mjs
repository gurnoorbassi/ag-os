export const SUPPORTED_MISSION_ROLES = Object.freeze([
  "Commander", "Product Manager", "Architect", "UI Designer", "Frontend Engineer", "Backend Engineer", "Database Engineer",
  "QA Engineer", "Security Reviewer", "Code Reviewer", "Fixer", "Integration Agent"
]);
const ADDITIONAL_ROLE_FIELDS = Object.freeze({
  productManager: "Product Manager",
  architect: "Architect",
  uiDesigner: "UI Designer",
  frontendEngineer: "Frontend Engineer",
  backendEngineer: "Backend Engineer",
  databaseEngineer: "Database Engineer",
  securityReviewer: "Security Reviewer",
  fixer: "Fixer"
});

export const MISSION_NATIVE_PLAN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "requiredRoles", "tasks", "validationStrategy", "integrationOrder", "risks", "approvalRequirements"],
  properties: {
    summary: { type: "string", minLength: 1 },
    requiredRoles: {
      type: "object",
      additionalProperties: false,
      required: ["commander", "qa", "codeReviewer", "integration", "additional"],
      properties: {
        commander: { type: "string", enum: ["Commander"] },
        qa: { type: "string", enum: ["QA Engineer"] },
        codeReviewer: { type: "string", enum: ["Code Reviewer"] },
        integration: { type: "string", enum: ["Integration Agent"] },
        additional: {
          type: "object",
          additionalProperties: false,
          required: Object.keys(ADDITIONAL_ROLE_FIELDS),
          properties: Object.fromEntries(Object.keys(ADDITIONAL_ROLE_FIELDS).map((key) => [key, { type: "boolean" }]))
        }
      }
    },
    tasks: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["taskId", "title", "description", "assignedRole", "dependencies", "acceptanceCriteria", "kind"],
        properties: {
          taskId: { type: "string", minLength: 2 },
          title: { type: "string", minLength: 1 },
          description: { type: "string", minLength: 1 },
          assignedRole: { type: "string", enum: SUPPORTED_MISSION_ROLES },
          dependencies: { type: "array", items: { type: "string" } },
          acceptanceCriteria: { type: "array", minItems: 1, items: { type: "string", minLength: 1 } },
          kind: { type: "string", enum: ["planning", "coding", "review", "qa", "integration"] }
        }
      }
    },
    validationStrategy: { type: "array", minItems: 1, items: { type: "string", minLength: 1 } },
    integrationOrder: { type: "array", minItems: 1, items: { type: "string" } },
    risks: { type: "array", items: { type: "string", minLength: 1 } },
    approvalRequirements: { type: "array", items: { type: "string", minLength: 1 } }
  }
};

function assertNonEmptyString(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} must be a non-empty string`);
}

function assertStringArray(value, label, { nonEmpty = false } = {}) {
  if (!Array.isArray(value) || (nonEmpty && value.length === 0)) throw new Error(`${label} must be ${nonEmpty ? "a non-empty" : "an"} array`);
  value.forEach((item, index) => assertNonEmptyString(item, `${label}[${index}]`));
}

function assertAcyclic(tasksById) {
  const visiting = new Set();
  const visited = new Set();
  const visit = (taskId) => {
    if (visiting.has(taskId)) throw new Error(`mission plan dependency cycle includes ${taskId}`);
    if (visited.has(taskId)) return;
    visiting.add(taskId);
    for (const dependency of tasksById.get(taskId).dependencies) visit(dependency);
    visiting.delete(taskId);
    visited.add(taskId);
  };
  for (const taskId of tasksById.keys()) visit(taskId);
}

export function validateMissionPlanDraft(plan, { assertValidationCommand = null } = {}) {
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) throw new Error("mission plan must be an object");
  const expectedKeys = new Set(MISSION_NATIVE_PLAN_SCHEMA.required);
  for (const key of Object.keys(plan)) if (!expectedKeys.has(key)) throw new Error(`mission plan has unsupported field: ${key}`);
  for (const key of expectedKeys) if (!(key in plan)) throw new Error(`mission plan is missing ${key}`);
  assertNonEmptyString(plan.summary, "mission plan summary");
  if (!plan.requiredRoles || typeof plan.requiredRoles !== "object" || Array.isArray(plan.requiredRoles)) throw new Error("mission plan requiredRoles must be an object");
  const requiredRoleKeys = MISSION_NATIVE_PLAN_SCHEMA.properties.requiredRoles.required;
  for (const key of Object.keys(plan.requiredRoles)) if (!requiredRoleKeys.includes(key)) throw new Error(`mission plan requiredRoles has unsupported field: ${key}`);
  for (const key of requiredRoleKeys) if (!(key in plan.requiredRoles)) throw new Error(`mission plan requiredRoles is missing ${key}`);
  if (plan.requiredRoles.commander !== "Commander" || plan.requiredRoles.qa !== "QA Engineer" || plan.requiredRoles.codeReviewer !== "Code Reviewer" || plan.requiredRoles.integration !== "Integration Agent") throw new Error("mission plan requiredRoles has malformed mandatory quality roles");
  if (!plan.requiredRoles.additional || typeof plan.requiredRoles.additional !== "object" || Array.isArray(plan.requiredRoles.additional)) throw new Error("mission plan requiredRoles.additional must be an object");
  const additionalRoleKeys = Object.keys(ADDITIONAL_ROLE_FIELDS);
  for (const key of Object.keys(plan.requiredRoles.additional)) if (!additionalRoleKeys.includes(key)) throw new Error(`mission plan requiredRoles.additional has unsupported field: ${key}`);
  for (const key of additionalRoleKeys) if (typeof plan.requiredRoles.additional[key] !== "boolean") throw new Error(`mission plan requiredRoles.additional.${key} must be boolean`);
  const additionalRoles = additionalRoleKeys.filter((key) => plan.requiredRoles.additional[key]).map((key) => ADDITIONAL_ROLE_FIELDS[key]);
  const requiredRoles = [plan.requiredRoles.commander, ...additionalRoles, plan.requiredRoles.codeReviewer, plan.requiredRoles.qa, plan.requiredRoles.integration];
  for (const role of requiredRoles) if (!SUPPORTED_MISSION_ROLES.includes(role)) throw new Error(`unsupported mission role: ${role}`);
  if (!Array.isArray(plan.tasks) || plan.tasks.length === 0) throw new Error("mission plan tasks must be a non-empty array");
  const tasksById = new Map();
  const taskKeys = new Set(MISSION_NATIVE_PLAN_SCHEMA.properties.tasks.items.required);
  for (const task of plan.tasks) {
    if (!task || typeof task !== "object" || Array.isArray(task)) throw new Error("mission plan task must be an object");
    for (const key of Object.keys(task)) if (!taskKeys.has(key)) throw new Error(`mission plan task has unsupported field: ${key}`);
    for (const key of taskKeys) if (!(key in task)) throw new Error(`mission plan task is missing ${key}`);
    if (!/^[a-z][a-z0-9-]{1,63}$/.test(task.taskId)) throw new Error(`mission plan taskId is invalid: ${task.taskId}`);
    if (tasksById.has(task.taskId)) throw new Error(`duplicate mission plan taskId: ${task.taskId}`);
    assertNonEmptyString(task.title, `${task.taskId} title`);
    assertNonEmptyString(task.description, `${task.taskId} description`);
    if (!requiredRoles.includes(task.assignedRole) || task.assignedRole === "Commander") throw new Error(`${task.taskId} has unsupported assignedRole: ${task.assignedRole}`);
    assertStringArray(task.dependencies, `${task.taskId} dependencies`);
    if (new Set(task.dependencies).size !== task.dependencies.length) throw new Error(`${task.taskId} dependencies must be unique`);
    assertStringArray(task.acceptanceCriteria, `${task.taskId} acceptanceCriteria`, { nonEmpty: true });
    if (!MISSION_NATIVE_PLAN_SCHEMA.properties.tasks.items.properties.kind.enum.includes(task.kind)) throw new Error(`${task.taskId} has invalid kind`);
    tasksById.set(task.taskId, task);
  }
  if (!plan.tasks.some((task) => task.kind === "qa" && task.assignedRole === "QA Engineer")) throw new Error("mission plan must assign a QA task to QA Engineer");
  if (!plan.tasks.some((task) => task.kind === "review" && task.assignedRole === "Code Reviewer")) throw new Error("mission plan must assign a review task to Code Reviewer");
  if (!plan.tasks.some((task) => task.kind === "integration" && task.assignedRole === "Integration Agent")) throw new Error("mission plan must assign an integration task to Integration Agent");
  for (const task of plan.tasks) {
    for (const dependency of task.dependencies) {
      if (!tasksById.has(dependency)) throw new Error(`${task.taskId} has unknown dependency: ${dependency}`);
      if (dependency === task.taskId) throw new Error(`${task.taskId} cannot depend on itself`);
    }
  }
  assertAcyclic(tasksById);
  assertStringArray(plan.validationStrategy, "mission plan validationStrategy", { nonEmpty: true });
  if (new Set(plan.validationStrategy).size !== plan.validationStrategy.length) throw new Error("mission plan validationStrategy must be unique");
  for (const command of plan.validationStrategy) assertValidationCommand?.(command);
  assertStringArray(plan.integrationOrder, "mission plan integrationOrder", { nonEmpty: true });
  if (plan.integrationOrder.length !== tasksById.size || new Set(plan.integrationOrder).size !== tasksById.size || plan.integrationOrder.some((taskId) => !tasksById.has(taskId))) {
    throw new Error("mission plan integrationOrder must contain every task exactly once");
  }
  const order = new Map(plan.integrationOrder.map((taskId, index) => [taskId, index]));
  for (const task of plan.tasks) for (const dependency of task.dependencies) if (order.get(dependency) > order.get(task.taskId)) throw new Error(`mission plan integrationOrder places ${task.taskId} before dependency ${dependency}`);
  assertStringArray(plan.risks, "mission plan risks");
  assertStringArray(plan.approvalRequirements, "mission plan approvalRequirements");
  return plan;
}

export function missionPlanRoles(plan) {
  validateMissionPlanDraft(plan);
  const additionalRoles = Object.keys(ADDITIONAL_ROLE_FIELDS).filter((key) => plan.requiredRoles.additional[key]).map((key) => ADDITIONAL_ROLE_FIELDS[key]);
  return [plan.requiredRoles.commander, ...additionalRoles, plan.requiredRoles.codeReviewer, plan.requiredRoles.qa, plan.requiredRoles.integration];
}
