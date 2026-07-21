(() => {
  const form = document.querySelector("#console-command-form");
  const input = document.querySelector("#console-command");
  const project = document.querySelector("#console-project");
  const scrollback = document.querySelector("#console-scrollback");
  const note = document.querySelector("#console-runtime-note");
  const history = [];
  let historyIndex = 0;
  let status = null;

  function formatNumber(value, digits = 0) {
    const number = Number(value || 0);
    return Number.isFinite(number) ? number.toLocaleString(undefined, { maximumFractionDigits: digits }) : "0";
  }

  function writeLine(source, message, tone = "normal") {
    const line = document.createElement("p");
    line.className = `console-line console-line-${tone}`;
    const label = document.createElement("span");
    const content = document.createElement("strong");
    label.textContent = source;
    content.textContent = message;
    line.append(label, content);
    scrollback.append(line);
    while (scrollback.childElementCount > 200) scrollback.firstElementChild.remove();
    scrollback.scrollTop = scrollback.scrollHeight;
  }

  function pipelineLine(label, outcome, state = "done") {
    const glyph = state === "blocked" ? "■" : state === "running" ? "◐" : state === "waiting" ? "▲" : "●";
    writeLine(label, `${"·".repeat(Math.max(4, 22 - label.length))} ${glyph} ${outcome}`, state === "blocked" ? "bad" : state === "waiting" ? "warn" : "ok");
  }

  function renderProjects(payload) {
    const selected = project.value;
    project.replaceChildren(new Option("one-off work", "project-one-off"));
    (payload.projects || []).forEach((item) => project.append(new Option(item.name, item.id)));
    if ([...project.options].some((option) => option.value === selected)) project.value = selected;
  }

  function localCommand(command) {
    if (!status) {
      writeLine("system", "Owner sign-in is required before runtime status is available.", "warn");
      return true;
    }
    if (command === "status") {
      const ready = status.readiness?.coordinator;
      writeLine("status", `runtime ${status.runtimeDeployment?.status || "private"}; readiness ${ready?.passedCheckCount || 0}/${ready?.requiredCheckCount || 0}; safeguards ${status.safeguards?.status || "unknown"}`);
      return true;
    }
    if (command === "jobs") {
      const jobs = status.jobs || [];
      writeLine("jobs", jobs.length ? jobs.slice(0, 8).map((job) => `${job.status} ${job.jobId}`).join(" | ") : "No current jobs.");
      return true;
    }
    if (command === "budget") {
      const budget = window.AG_OS_DASHBOARD_DATA?.costs;
      writeLine("budget", `$${formatNumber(budget?.totalRecordedActualUsd, 2)} recorded / $${formatNumber(budget?.limits?.monthlyMaxUsd, 0)} monthly; breaker armed`);
      return true;
    }
    if (command === "lessons") {
      const lessons = status.lessonDecisions || {};
      writeLine("lessons", `${formatNumber(lessons.acceptedCount)} accepted; ${formatNumber(lessons.activeCandidateCount)} awaiting owner review`);
      return true;
    }
    return false;
  }

  async function submitCommand(event) {
    event.preventDefault();
    const command = input.value.trim();
    if (!command) return;
    history.push(command);
    historyIndex = history.length;
    input.value = "";
    writeLine("owner", `❯ ${command}`, "owner");
    if (localCommand(command.toLowerCase())) return;

    const button = form.querySelector("button");
    button.disabled = true;
    note.textContent = "AG OS is classifying and routing the command…";
    pipelineLine("command intake", "accepted", "running");
    try {
      const { response, result } = await window.AGOS.request("/api/v1/commands", {
        method: "POST",
        body: JSON.stringify({ command, projectId: project.value })
      });
      if (!response.ok) throw new Error(result.detail || result.error || "command rejected");
      pipelineLine("classification", `${result.riskLevel || "bounded risk"}`);
      pipelineLine("route", result.routeId || result.assignedAgent || "worker selected");
      pipelineLine("plan", result.planId || "plan recorded");
      const finalState = result.status === "waiting_approval" ? "waiting" : result.status === "failed" ? "blocked" : "done";
      pipelineLine("job", `${result.jobId || "created"} · ${result.status || "queued"}`, finalState);
      note.textContent = "Command recorded. Live state continues below and in Ops or Keep.";
      await window.AGOS.refreshStatus();
    } catch (error) {
      pipelineLine("command", error.message, "blocked");
      note.textContent = error.message === "unauthorized" ? "Sign in through the Dash view, then return to Console." : `Stopped safely: ${error.message}`;
    } finally {
      button.disabled = false;
      input.focus();
    }
  }

  input.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowUp" || history.length === 0) return;
    event.preventDefault();
    historyIndex = Math.max(0, historyIndex - 1);
    input.value = history[historyIndex];
  });
  form.addEventListener("submit", submitCommand);
  document.querySelector("#console-sign-in").addEventListener("click", () => {
    window.AGOS.setView("dash");
    requestAnimationFrame(() => document.querySelector("#owner-password")?.focus());
  });
  window.addEventListener("agos:status", (event) => {
    status = event.detail;
    renderProjects(status);
    note.textContent = `Connected · ${status.jobs?.length || 0} jobs · fail-closed protections active`;
  });
  window.addEventListener("agos:status-error", () => {
    status = null;
    note.textContent = "Owner sign-in required. Open Dash once, sign in, then operate from Console.";
  });
})();
