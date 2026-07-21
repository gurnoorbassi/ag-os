(() => {
  const world = document.querySelector("#keep-world");
  const readModel = window.AG_OS_DASHBOARD_DATA || {};

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function minifig({ id, name, role, style = "", accessory = "" }) {
    const actor = node("div", `keep-actor ${style}`);
    actor.dataset.keepEntity = id;
    actor.dataset.role = role;
    actor.setAttribute("aria-label", `${name}, ${role}`);
    const figure = node("div", "minifig");
    const head = node("span", "minifig-head");
    head.append(node("i", "minifig-eye left"), node("i", "minifig-eye right"));
    const torso = node("span", "minifig-torso");
    torso.append(node("i", "minifig-arm left"), node("i", "minifig-arm right"));
    const legs = node("span", "minifig-legs");
    legs.append(node("i", "minifig-leg left"), node("i", "minifig-leg right"));
    figure.append(head, torso, legs);
    if (accessory) figure.append(node("span", `minifig-accessory ${accessory}`));
    actor.append(figure, node("span", "keep-actor-name", name), node("span", "keep-actor-role", role));
    return actor;
  }

  function desk(label) {
    const item = node("div", "keep-desk");
    item.append(node("span", "keep-monitor", "▰"), node("span", "keep-desk-label", label));
    return item;
  }

  function room(id, title, tint) {
    const section = node("section", `keep-room keep-room-${id} ${tint}`);
    section.dataset.room = id;
    const header = node("header", "keep-room-label");
    header.append(node("span", "", title), node("span", "keep-room-state", "○ idle"));
    section.append(header);
    return section;
  }

  function buildPlanningHall() {
    const section = room("planning", "planning hall", "room-blue");
    const desks = node("div", "keep-desk-row");
    desks.append(desk("intake"), desk("planner"));
    const actors = node("div", "keep-actor-row");
    actors.append(
      minifig({ id: "intake", name: "Intake", role: "command classifier", style: "fig-intake" }),
      minifig({ id: "planner", name: "Planner", role: "plan worker", style: "fig-planner" })
    );
    section.append(desks, actors);
    return section;
  }

  function buildForge() {
    const section = room("forge", "build forge", "room-clay");
    const reactor = node("div", "keep-reactor");
    reactor.dataset.keepEntity = "reactor";
    const crystal = node("span", "reactor-crystal");
    const fuel = node("div", "reactor-fuel");
    const fuelFill = node("span", "reactor-fuel-fill");
    const monthly = Number(readModel.costs?.limits?.monthlyMaxUsd || 0);
    const spent = Number(readModel.costs?.totalRecordedActualUsd || 0);
    fuelFill.style.width = `${monthly > 0 ? Math.max(0, Math.min(100, (spent / monthly) * 100)) : 0}%`;
    fuel.append(fuelFill);
    reactor.append(crystal, node("strong", "", "claude reactor"), fuel, node("small", "", "breaker armed"));
    if (readModel.costs?.budgetStatus === "within_limit") reactor.classList.add("is-live");
    const forgeFloor = node("div", "keep-forge-floor");
    forgeFloor.append(minifig({ id: "codex", name: "Codex", role: "builder warrior", style: "fig-codex", accessory: "sword" }), desk("work product"), reactor);
    section.append(forgeFloor);
    return section;
  }

  function buildLibrary() {
    const section = room("library", "library of lessons", "room-purple");
    const memory = readModel.unifiedMemory || {};
    const shelves = node("div", "lesson-shelves");
    const books = node("div", "lesson-books");
    books.dataset.keepEntity = "accepted-lessons";
    books.append(node("span", "book-stack", "▥"), node("strong", "", `${Number(memory.acceptedCount || 0).toLocaleString()} bound books`));
    const scrolls = node("div", "lesson-scrolls");
    scrolls.dataset.keepEntity = "lesson-queue";
    scrolls.append(node("span", "scroll-stack", "▤"), node("strong", "", `×${Number(memory.candidateCount || 0).toLocaleString()} candidate scrolls`));
    shelves.append(books, scrolls);
    const cast = node("div", "keep-actor-row library-cast");
    cast.append(minifig({ id: "fable", name: "Fable", role: "learning guide", style: "fig-fable" }));
    const brain = node("div", "memory-brain");
    brain.dataset.keepEntity = "memory";
    brain.setAttribute("aria-label", "Memory, accepted lessons and candidate review");
    brain.append(node("span", "brain-lobe one"), node("span", "brain-lobe two"), node("i", "brain-eye left"), node("i", "brain-eye right"), node("strong", "", "Memory"));
    cast.append(brain);
    section.append(shelves, cast);
    return section;
  }

  function buildGatehouse() {
    const section = room("gate", "gatehouse", "room-green");
    const gate = node("div", "keep-gate");
    gate.dataset.keepEntity = "gate";
    gate.setAttribute("aria-label", "Approval gate");
    const arch = node("div", "gate-arch");
    arch.append(node("span", "gate-bars"));
    gate.append(arch, node("strong", "gate-label", "○ gate: quiet"));
    section.append(minifig({ id: "gatekeeper", name: "Gate", role: "approval guard", style: "fig-gate" }), gate);
    return section;
  }

  function buildOwnerAlcove() {
    const section = node("section", "owner-alcove");
    section.dataset.keepEntity = "owner";
    const deskTop = node("div", "owner-desk");
    const pending = Number(readModel.approvals?.activeCount || 0);
    deskTop.append(node("span", "owner-scrolls", pending ? `▤×${pending}` : "▱"), node("small", "", "pending locks"));
    section.append(node("strong", "owner-crown", "♛ owner — you"), deskTop, node("div", "owner-figure-slot", "session offline"));
    return section;
  }

  function buildCenter() {
    const center = node("section", "keep-center");
    const stone = node("div", "constitution-stone");
    stone.dataset.keepEntity = "constitution";
    stone.append(node("span", "", "CONSTITUTION"), node("strong", "", "v1.0"));
    const archive = node("div", "archive-slot");
    archive.dataset.keepEntity = "archive";
    archive.append(node("span", "", "▰"), node("strong", "", "archive"));
    const standup = node("div", "standup-table");
    standup.dataset.keepEntity = "standup";
    standup.append(node("span", "", "standup table"));
    center.append(stone, archive, standup);
    return center;
  }

  function buildWatchdog() {
    const patrol = node("div", "watchdog-patrol");
    const dog = node("div", "watchdog-dog");
    dog.dataset.keepEntity = "watchdog";
    dog.setAttribute("aria-label", "Watchdog, internal safety monitor");
    dog.append(node("span", "dog-body"), node("span", "dog-head"), node("span", "dog-ear"), node("span", "dog-tail"), node("i", "dog-leg one"), node("i", "dog-leg two"), node("i", "dog-leg three"), node("i", "dog-leg four"), node("strong", "", "Watchdog"));
    if (readModel.watchdog?.status === "configured") patrol.classList.add("is-patrolling");
    patrol.append(dog);
    return patrol;
  }

  world.append(buildPlanningHall(), buildOwnerAlcove(), buildForge(), buildCenter(), buildLibrary(), buildGatehouse(), buildWatchdog());
})();
