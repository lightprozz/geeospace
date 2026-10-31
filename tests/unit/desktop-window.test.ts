import { expect, it } from "vitest";
import { searchApps } from "@/lib/desktop/apps";
import { activeWindow, fitRect, frameRect, initialDesktop, readLayout, resizeRect, windowReducer } from "@/lib/desktop/window-store";
const area = { width: 1200, height: 700 };
it("finds Vietnamese apps regardless of accents, punctuation, case or word order", () => {
  for (const query of ["doi chieu", "ĐỐI CHIẾU", "cong luong", "lương công", "CÔNG & LƯƠNG"]) {
    expect(searchApps(query).map((app) => app.id)).toContain("work");
  }
  expect(searchApps("khong co chuc nang nay")).toEqual([]);
});
it("resizes west/north/corners while keeping the opposite edges anchored", () => {
  const rect = { x: 100, y: 100, width: 600, height: 500 };
  expect(resizeRect(rect, "w", 16, 0)).toEqual({ x: 116, y: 100, width: 584, height: 500 });
  expect(resizeRect(rect, "n", 0, -40)).toEqual({ x: 100, y: 60, width: 600, height: 540 });
  expect(resizeRect(rect, "nw", 16, -16)).toEqual({ x: 116, y: 84, width: 584, height: 516 });
  expect(resizeRect(rect, "w", 1000, 0)).toEqual({ x: 380, y: 100, width: 320, height: 500 });
});

it("restores minimized apps, preserves geometry and focuses the next window on close", () => {
  let state = initialDesktop(undefined, area);
  expect(activeWindow(state)).toBe("today");
  state = windowReducer(state, { type: "minimize", id: "today" });
  expect(activeWindow(state)).toBe("assistant");
  const rect = state.windows.today!.rect;
  state = windowReducer(state, { type: "open", id: "today", area });
  expect(state.windows.today!.rect).toEqual(rect);
  expect(activeWindow(state)).toBe("today");
  state = windowReducer(state, { type: "close", id: "today" });
  expect(activeWindow(state)).toBe("assistant");
});
it("fits geometry after viewport changes and preserves normal position when zooming", () => {
  const normal = { x: 500, y: 500, width: 800, height: 700 };
  expect(fitRect(normal, area)).toEqual({ x: 384, y: 16, width: 800, height: 668 });
  let state = initialDesktop("today", area);
  const rect = state.windows.today!.rect;
  state = windowReducer(state, { type: "maximize", id: "today" });
  expect(frameRect(state.windows.today!, area).width).toBe(1168);
  state = windowReducer(state, { type: "maximize", id: "today" });
  expect(state.windows.today!.rect).toEqual(rect);
  expect(frameRect({ ...state.windows.today!, mode: "right" }, area).x).toBeGreaterThan(590);
});
it("rejects malformed or unknown persisted apps without trusting their dimensions", () => {
  const state = initialDesktop("today", area);
  state.windows.today!.rect.width = 1e9;
  const raw = JSON.stringify({ windows: { ...state.windows, unknown: state.windows.today, work: { rect: { x: "bad" } } } });
  const restored = readLayout(raw, area)!;
  expect(Object.keys(restored.windows)).toEqual(["today"]);
  expect(restored.windows.today!.rect.width).toBe(1168);
  expect(readLayout("{", area)).toBeUndefined();
  expect(searchApps("yeu cau").map((app) => app.id)).toContain("requests");
});

it("arranges visible windows without closing apps, restoring minimized apps or changing focus", () => {
  let state = initialDesktop("requests", area);
  state = windowReducer(state, { type: "open", id: "work", area });
  state = windowReducer(state, { type: "open", id: "learning", area });
  state = windowReducer(state, { type: "minimize", id: "learning" });
  state = windowReducer(state, { type: "place", id: "requests", rect: { x: 300, y: 200, width: 600, height: 400 }, mode: "right", area });
  const before = state, focused = activeWindow(state);
  const next = windowReducer(state, { type: "arrange", area });
  expect(Object.keys(next.windows)).toEqual(Object.keys(before.windows));
  expect(activeWindow(next)).toBe(focused);
  expect(next.windows.learning).toBe(before.windows.learning);
  for (const id of ["requests", "work"] as const) {
    expect(next.windows[id]).toMatchObject({ open: true, minimized: false, order: before.windows[id]!.order, mode: "normal" });
  }
  expect(next.windows.requests!.rect).not.toEqual(before.windows.requests!.rect);
  expect(Object.values(windowReducer(next, { type: "close-all" }).windows).every(win => !win!.open)).toBe(true);
});
it("finds English app names without changing feature IDs", () => {
  expect(searchApps("work pay").map(app => app.id)).toContain("work");
  expect(searchApps("self learning").map(app => app.id)).toContain("learning");
});
