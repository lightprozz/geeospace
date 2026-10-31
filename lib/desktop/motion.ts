import type { DesktopAppId } from "./apps";

export const motion = {
  feedback: 120, overlay: 200, exit: 160, layout: 320, window: 400, sheet: 360, rebound: 200, minimize: 440,
  out: "cubic-bezier(.22,1,.36,1)", in: "cubic-bezier(.4,0,1,1)", spring: "cubic-bezier(.16,1.08,.3,1)", minimizeEase: "cubic-bezier(.55,0,.75,.3)",
};
let pressed: { rect: DOMRect; time: number } | undefined;
/** Capture activation itself: Safari and assistive technology need not focus a clicked button. */
export function rememberPress(target: EventTarget | null) {
  const source = target instanceof Element ? target.closest("button, .os-launcher") : null;
  if (!(source instanceof HTMLElement)) return;
  const value = { rect: source.getBoundingClientRect(), time: performance.now() };
  pressed = value;
  queueMicrotask(() => { if (pressed === value) pressed = undefined; });
}
const origins = new Map<DesktopAppId, { rect: DOMRect; time: number }>();
export function rememberLaunch(id: DesktopAppId) {
  const active = document.activeElement;
  const source = active instanceof HTMLElement ? active.closest("button, .os-launcher") : null;
  const rect = pressed?.rect ?? source?.getBoundingClientRect();
  if (rect) origins.set(id, { rect, time: performance.now() });
}
export function windowAnchor(id: DesktopAppId, launching = false) {
  const stored = origins.get(id);
  const source = launching && stored && performance.now() - stored.time <= 700 ? stored.rect : undefined;
  if (stored && performance.now() - stored.time > 700) origins.delete(id);
  const dock = document.querySelector(`[data-launch-app="${id}"]`);
  return source ?? dock?.getBoundingClientRect();
}
export function prefersReducedMotion() { return document.querySelector<HTMLElement>(".geeospace-os")?.dataset.motion === "reduce" || window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
export function durationInMilliseconds(raw: string, fallback: number) {
  const text = raw.trim();
  const value = Number.parseFloat(text) * (text.endsWith("s") && !text.endsWith("ms") ? 1000 : 1);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}
export function motionDuration(name: keyof Pick<typeof motion, "feedback" | "overlay" | "exit" | "layout" | "window" | "sheet" | "rebound" | "minimize">, element: Element) {
  return prefersReducedMotion() ? 0 : durationInMilliseconds(getComputedStyle(element).getPropertyValue(`--os-duration-${name}`), motion[name]);
}

/** A presence owner keeps exiting overlays rendered, but immediately removes their input. */
export function exitOverlay(root: HTMLElement | null, complete: () => void) {
  if (!root || root.dataset.exiting === "true") return;
  root.dataset.exiting = "true";
  root.inert = true;
  const duration = motionDuration("exit", root);
  if (!duration || typeof root.animate !== "function") { complete(); return; }
  const animation = root.animate([{ opacity: 1 }, { opacity: 0 }], { duration, easing: motion.in });
  animation.finished.then(() => { if (root.isConnected) complete(); }, () => {});
}
