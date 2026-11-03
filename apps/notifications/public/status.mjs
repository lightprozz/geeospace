import { connectSpaceOS } from "./bridge.mjs";
import { sourceState } from "./notification-model.mjs";

let visible = false, pending, timer, sequence = 0;
const bridge = connectSpaceOS(context => {
  if (visible === context.visible) return;
  visible = context.visible;
  if (visible) void refresh();
  else { clearTimeout(timer); pending?.abort(); }
});
async function refresh() {
  clearTimeout(timer);
  pending?.abort();
  const controller = new AbortController();
  pending = controller;
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch("/api/status", { cache: "no-store", signal: controller.signal });
    const data = await response.json();
    if (response.ok && (!Number.isSafeInteger(data.count) || data.count < 0 || data.count > 5000 || !Number.isFinite(Date.parse(data.observedAt)))) throw new Error("Invalid summary");
    if (!visible || pending !== controller) return;
    bridge.send({ type: "spaceos:app-status", appId: "notifications", sequence: ++sequence,
      status: response.ok ? "ready" : sourceState(response.status, data.code),
      count: response.ok ? data.count : null,
      observedAt: response.ok ? data.observedAt : null });
  } catch {
    if (visible && pending === controller) bridge.send({ type: "spaceos:app-status", appId: "notifications", sequence: ++sequence, status: "error", count: null, observedAt: null });
  } finally {
    clearTimeout(timeout);
    if (pending === controller && visible) timer = setTimeout(refresh, 60_000);
  }
}
window.addEventListener("pagehide", () => { visible = false; clearTimeout(timer); pending?.abort(); });
