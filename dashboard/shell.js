(() => {
  const views = new Set(["console", "ops", "keep", "dash"]);

  function coordinatorBaseUrl() {
    return (sessionStorage.getItem("ag-os-coordinator-url") || "").replace(/\/$/, "");
  }

  async function request(path, options = {}) {
    const token = sessionStorage.getItem("ag-os-owner-token") || "";
    const headers = { "content-type": "application/json", ...(options.headers || {}) };
    if (token) headers.authorization = `Bearer ${token}`;
    const response = await fetch(`${coordinatorBaseUrl()}${path}`, {
      ...options,
      credentials: "include",
      headers
    });
    const result = await response.json().catch(() => ({}));
    return { response, result };
  }

  function selectedView() {
    const value = location.hash.replace(/^#/, "");
    return views.has(value) ? value : "console";
  }

  function setView(view, { updateHash = true } = {}) {
    const next = views.has(view) ? view : "console";
    document.querySelectorAll("[data-os-view]").forEach((surface) => {
      surface.hidden = surface.dataset.osView !== next;
    });
    document.querySelectorAll("[data-os-view-button]").forEach((button) => {
      const active = button.dataset.osViewButton === next;
      button.setAttribute("aria-pressed", String(active));
    });
    document.body.dataset.osView = next;
    if (updateHash && location.hash !== `#${next}`) history.replaceState(null, "", `#${next}`);
    window.dispatchEvent(new CustomEvent("agos:view", { detail: { view: next } }));
  }

  function setSessionLabel(status, detail = "") {
    const label = document.querySelector("#os-owner-session");
    label.textContent = status === "connected" ? "owner session · active" : "owner session · sign in";
    label.title = detail;
    label.dataset.state = status;
  }

  async function refreshStatus() {
    const { response, result } = await request("/api/v1/status");
    if (!response.ok) {
      setSessionLabel("disconnected", result.error || "Owner authentication required");
      window.dispatchEvent(new CustomEvent("agos:status-error", { detail: { response, result } }));
      return null;
    }
    setSessionLabel("connected", result.authentication?.method || "authenticated");
    window.dispatchEvent(new CustomEvent("agos:status", { detail: result }));
    return result;
  }

  document.querySelectorAll("[data-os-view-button]").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.osViewButton));
  });
  window.addEventListener("hashchange", () => setView(selectedView(), { updateHash: false }));

  window.AGOS = { request, refreshStatus, setSessionLabel, setView, views };
  setView(selectedView());
  refreshStatus();
  window.setInterval(refreshStatus, 5_000);
})();
