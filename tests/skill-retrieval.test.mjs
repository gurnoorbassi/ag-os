import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { retrieveRelevantSkills } from "../scripts/lib/runtime/skill-retrieval.mjs";

function writeJson(root, relativePath, value) {
  const filePath = path.join(root, relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function skill(id, category, status = "active") {
  return {
    id,
    name: id,
    status,
    category,
    appliesTo: ["any"]
  };
}

test("retrieves active skills relevant to plan tasks without granting permission", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "ag-os-skill-retrieval-"));
  try {
    writeJson(root, ".codex/skills/skill-github-flow.json", skill("skill-github-flow", "build"));
    writeJson(root, ".codex/skills/skill-quality-review.json", skill("skill-quality-review", "review"));
    writeJson(root, ".codex/skills/skill-netlify-deploy.json", skill("skill-netlify-deploy", "delivery"));
    writeJson(root, ".codex/skills/skill-draft.json", skill("skill-draft", "build", "draft"));

    const result = retrieveRelevantSkills({
      root,
      projectId: "project-ag-os",
      archetypeId: "archetype-dashboard",
      workerType: "planner",
      tools: ["local-filesystem", "github-after-approval"],
      tasks: [{ taskId: "work-review", description: "Build source files and run quality validation review." }]
    });

    assert.equal(result.strategy, "task_tool_skill_similarity_v1");
    assert.deepEqual(result.skills.map((item) => item.skillId), ["skill-github-flow", "skill-quality-review"]);
    assert.equal(result.skills.every((item) => item.grantsPermission === false), true);
    assert.equal(result.skillsGrantPermission, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
