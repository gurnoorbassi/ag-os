const MIN_TIMEOUT_MS = 100;
const MAX_TIMEOUT_MS = 30_000;

function timeoutValue(value) {
  const parsed = Number(value || 5000);
  if (!Number.isFinite(parsed)) return 5000;
  return Math.min(MAX_TIMEOUT_MS, Math.max(MIN_TIMEOUT_MS, Math.trunc(parsed)));
}

export function monitorAlertEvent({ current, previous, threshold = 3 }) {
  const requiredFailures = Math.max(1, Math.trunc(Number(threshold) || 3));
  if (current.status === "fail" && current.consecutiveFailures === requiredFailures) return "failure_threshold_reached";
  if (current.status === "pass" && Number(previous?.consecutiveFailures || 0) >= requiredFailures) return "service_recovered";
  return null;
}

export async function sendMonitorAlert({ webhookUrl, token = "", event, record, fetchImpl = fetch, timeoutMs = 5000 }) {
  if (!event || !webhookUrl) return { attempted: false, sent: false, event: event || null };
  const url = new URL(webhookUrl);
  if (url.protocol !== "https:") throw new Error("monitor alert webhook must use HTTPS");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutValue(timeoutMs));
  try {
    const response = await fetchImpl(url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        event,
        service: record.service,
        status: record.status,
        checkedAt: record.checkedAt,
        consecutiveFailures: record.consecutiveFailures,
        lastSuccessAt: record.lastSuccessAt,
        ...(record.httpStatus ? { httpStatus: record.httpStatus } : {}),
        ...(record.error ? { error: record.error } : {})
      })
    });
    if (!response.ok) throw new Error(`monitor alert webhook returned HTTP ${response.status}`);
    return { attempted: true, sent: true, event, sentAt: new Date().toISOString() };
  } catch (error) {
    const message = error?.name === "AbortError" ? "timeout" : String(error?.message || "delivery_failed");
    return { attempted: true, sent: false, event, error: message.slice(0, 160) };
  } finally {
    clearTimeout(timer);
  }
}
