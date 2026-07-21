import { EventEmitter } from "node:events";

const emitter = new EventEmitter();
emitter.setMaxListeners(100);
let eventSequence = 0;

function boundedText(value, max = 500) {
  return String(value ?? "").slice(0, max);
}

export function createRuntimeEvent({ type, jobId, projectId, previousStatus, status, summary, changed = true, now = new Date() }) {
  if (!/^[a-z][a-z0-9_]{2,63}$/.test(String(type || ""))) throw new Error("runtime event type is invalid");
  const timestamp = new Date(now);
  if (!Number.isFinite(timestamp.getTime())) throw new Error("runtime event timestamp is invalid");
  eventSequence += 1;
  return {
    eventId: `runtime-${timestamp.getTime()}-${eventSequence}`,
    type,
    occurredAt: timestamp.toISOString(),
    changed: Boolean(changed),
    ...(jobId ? { jobId: boundedText(jobId, 160) } : {}),
    ...(projectId ? { projectId: boundedText(projectId, 160) } : {}),
    ...(previousStatus ? { previousStatus: boundedText(previousStatus, 64) } : {}),
    ...(status ? { status: boundedText(status, 64) } : {}),
    ...(summary ? { summary: boundedText(summary) } : {})
  };
}

export function publishRuntimeEvent(input) {
  const event = createRuntimeEvent(input);
  emitter.emit("runtime-event", event);
  return event;
}

export function subscribeRuntimeEvents(listener) {
  if (typeof listener !== "function") throw new Error("runtime event listener must be a function");
  emitter.on("runtime-event", listener);
  return () => emitter.off("runtime-event", listener);
}

export function serializeRuntimeEvent(event) {
  return `id: ${event.eventId}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}
