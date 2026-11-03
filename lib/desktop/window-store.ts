import { isDesktopApp, type DesktopAppId } from "./apps";

export type Rect = { x: number; y: number; width: number; height: number };
export type Area = { width: number; height: number };
export type WindowMode = "normal" | "maximized" | "left" | "right";
export type ResizeEdge = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
export type DesktopWindow = { rect: Rect; mode: WindowMode; open: boolean; minimized: boolean; order: number };
export type DesktopState = { windows: Partial<Record<DesktopAppId, DesktopWindow>> };
export type WindowAction =
  | { type: "open"; id: DesktopAppId; area: Area }
  | { type: "focus" | "close" | "minimize" | "maximize"; id: DesktopAppId }
  | { type: "place"; id: DesktopAppId; rect: Rect; mode: WindowMode; area: Area }
  | { type: "resize-area"; area: Area }
  | { type: "restore"; state: DesktopState }
  | { type: "arrange"; area: Area }
  | { type: "close-all" };

export const layoutKey = "geeospace.desktop.layout.v1";
const inset = 16;
export function resizeRect(rect: Rect, edge: ResizeEdge, dx: number, dy: number): Rect {
  const next = { ...rect };
  if (edge.includes("e")) next.width = Math.max(320, rect.width + dx);
  if (edge.includes("s")) next.height = Math.max(260, rect.height + dy);
  if (edge.includes("w")) { next.width = Math.max(320, rect.width - dx); next.x = rect.x + rect.width - next.width; }
  if (edge.includes("n")) { next.height = Math.max(260, rect.height - dy); next.y = rect.y + rect.height - next.height; }
  return next;
}
export function fitRect(rect: Rect, area: Area): Rect {
  const width = Math.min(Math.max(320, rect.width), Math.max(1, area.width - inset * 2));
  const height = Math.min(Math.max(260, rect.height), Math.max(1, area.height - inset * 2));
  return { width, height, x: Math.max(inset, Math.min(rect.x, area.width - width - inset)), y: Math.max(inset, Math.min(rect.y, area.height - height - inset)) };
}
export function defaultRect(id: DesktopAppId, area: Area): Rect {
  const wide = ["calendar", "learning", "lms", "work", "notifications"].includes(id);
  const rect = { x: 34, y: 28, width: wide ? 820 : 510, height: 640 };
  if (id === "appearance") Object.assign(rect, { x: (area.width - 560) / 2, y: 24, width: 560, height: 640 });
  if (id === "assistant") Object.assign(rect, { x: Math.max(100, area.width - 690), y: 74, width: 640, height: 570 });
  return fitRect(rect, area);
}
export function frameRect(window: DesktopWindow, area: Area): Rect {
  if (window.mode === "normal") return fitRect(window.rect, area);
  const half = (area.width - inset * 3) / 2;
  return { x: window.mode === "right" ? inset * 2 + half : inset, y: inset, width: window.mode === "maximized" ? area.width - inset * 2 : half, height: area.height - inset * 2 };
}
export function activeWindow(state: DesktopState): DesktopAppId | undefined {
  return (Object.entries(state.windows) as [DesktopAppId, DesktopWindow][]).filter(([, win]) => win.open && !win.minimized).sort((a, b) => b[1].order - a[1].order)[0]?.[0];
}
export function windowReducer(state: DesktopState, action: WindowAction): DesktopState {
  if (action.type === "restore") return action.state;
  if (action.type === "resize-area") return { windows: Object.fromEntries(Object.entries(state.windows).map(([id, win]) => [id, { ...win, rect: fitRect(win!.rect, action.area) }])) };
  if (action.type === "close-all") return { windows: Object.fromEntries(Object.entries(state.windows).map(([id, win]) => [id, { ...win, open: false, minimized: false }])) };
  if (action.type === "arrange") {
    let index = 0;
    return { windows: Object.fromEntries(Object.entries(state.windows).map(([id, win]) => {
      if (!win!.open || win!.minimized) return [id, win];
      const base = defaultRect(id as DesktopAppId, action.area);
      const rect = fitRect({ ...base, x: 34 + index * 32, y: 28 + index++ * 28 }, action.area);
      return [id, { ...win, mode: "normal", rect }];
    })) };
  }
  const previous = state.windows[action.id];
  const order = Math.max(0, ...Object.values(state.windows).map((win) => win!.order)) + 1;
  if (action.type === "open") return { windows: { ...state.windows, [action.id]: { rect: previous?.rect ?? defaultRect(action.id, action.area), mode: previous?.mode ?? "normal", open: true, minimized: false, order } } };
  if (!previous) return state;
  let update = { ...previous };
  if (action.type === "close") update = { ...update, open: false, minimized: false };
  if (action.type === "minimize") update.minimized = true;
  if (action.type === "focus") update = { ...update, minimized: false, order };
  if (action.type === "maximize") update = { ...update, mode: update.mode === "maximized" ? "normal" : "maximized", order };
  if (action.type === "place") update = { ...update, rect: fitRect(action.rect, action.area), mode: action.mode, order };
  return { windows: { ...state.windows, [action.id]: update } };
}
export function initialDesktop(app?: DesktopAppId, area: Area = { width: 1440, height: 768 }): DesktopState {
  let state: DesktopState = { windows: {} };
  for (const id of app ? [app] : ["assistant", "today"] as const) state = windowReducer(state, { type: "open", id, area });
  return state;
}
/** Storage is untrusted and contains geometry only, never tokens or business records. */
export function readLayout(raw: string | null, area: Area): DesktopState | undefined {
  try {
    const value: unknown = JSON.parse(raw ?? "null");
    if (!value || typeof value !== "object" || !("windows" in value) || !value.windows || typeof value.windows !== "object") return;
    const windows: DesktopState["windows"] = {};
    for (const [id, candidate] of Object.entries(value.windows)) {
      if (!isDesktopApp(id) || !candidate || typeof candidate !== "object") continue;
      const win = candidate as DesktopWindow;
      if (!win.rect || ![win.rect.x, win.rect.y, win.rect.width, win.rect.height, win.order].every(Number.isFinite) || !["normal", "maximized", "left", "right"].includes(win.mode) || typeof win.open !== "boolean" || typeof win.minimized !== "boolean") continue;
      windows[id] = { rect: fitRect(win.rect, area), mode: win.mode, open: win.open, minimized: win.minimized, order: Math.max(0, Math.min(10000, win.order)) };
    }
    return { windows };
  } catch { return; }
}
