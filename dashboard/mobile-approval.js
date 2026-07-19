const statusNode = document.querySelector("#mobile-decision-status");
const token = new URLSearchParams(location.hash.slice(1)).get("token") || "";
location.hash = "";
history.replaceState(null, "", "/mobile-approval");

async function decide(decision) {
  if (!token) return;
  document.querySelectorAll("button").forEach((button) => { button.disabled = true; });
  statusNode.textContent = `${decision === "approve" ? "Approving" : "Rejecting"} this one job…`;
  try {
    const response = await fetch("/api/v1/mobile-approvals/decision", { method: "POST", credentials: "omit", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, decision }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.detail || result.error || "Decision failed");
    statusNode.textContent = decision === "approve" ? "Approved once. AG OS re-queued the job; all adapter gates still apply." : "Rejected. AG OS cancelled the job without running its adapter.";
  } catch (error) {
    statusNode.textContent = `Decision stopped: ${error.message}`;
    document.querySelectorAll("button").forEach((button) => { button.disabled = false; });
  }
}

if (!token) {
  statusNode.textContent = "This decision link is missing or has already been cleared from the address bar.";
  document.querySelectorAll("button").forEach((button) => { button.disabled = true; });
} else {
  document.querySelector("#mobile-decision-detail").textContent = "The link can be used once and expires quickly. Approval covers only the exact job shown in AG OS; unrelated actions remain prohibited.";
  document.querySelector("#mobile-approve").addEventListener("click", () => decide("approve"));
  document.querySelector("#mobile-reject").addEventListener("click", () => decide("reject"));
}
