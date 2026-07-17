export const DEFAULT_EXTERNAL_REQUEST_TIMEOUT_MS = 30_000;

function normalizedTimeout(value) {
  const timeout = Number(value);
  if (!Number.isFinite(timeout) || timeout < 100 || timeout > 300_000) {
    return DEFAULT_EXTERNAL_REQUEST_TIMEOUT_MS;
  }
  return Math.round(timeout);
}

export async function fetchWithTimeout(fetchImpl, url, options = {}, timeoutMs = DEFAULT_EXTERNAL_REQUEST_TIMEOUT_MS) {
  if (typeof fetchImpl !== "function") throw new Error("fetch implementation is unavailable");
  const timeout = normalizedTimeout(timeoutMs);
  const controller = new AbortController();
  const upstreamSignal = options.signal;
  const forwardAbort = () => controller.abort(upstreamSignal.reason);
  if (upstreamSignal?.aborted) forwardAbort();
  else upstreamSignal?.addEventListener("abort", forwardAbort, { once: true });
  const timer = setTimeout(() => controller.abort(new Error(`request timed out after ${timeout}ms`)), timeout);
  try {
    return await fetchImpl(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted && !upstreamSignal?.aborted) {
      throw new Error(`external request timed out after ${timeout}ms`, { cause: error });
    }
    throw error;
  } finally {
    clearTimeout(timer);
    upstreamSignal?.removeEventListener?.("abort", forwardAbort);
  }
}
