import { expect, it } from "vitest";
import { appGroups, appsInGroup, desktopApps, dockApps, searchApps } from "@/lib/desktop/apps";
import { formatAppHash, isSafePath, parseAppHash } from "@/lib/desktop/navigation";
import { initialDesktop, readLayout, windowReducer } from "@/lib/desktop/window-store";
const area = { width: 1440, height: 800 };

it("registers unique apps in valid groups with a single LMS dock entry", () => {
  expect(new Set(desktopApps.map(app => app.id)).size).toBe(desktopApps.length);
  expect(desktopApps.every(app => appGroups.some(group => group.id === app.group))).toBe(true);
  expect(appsInGroup("lms")).toHaveLength(16);
  expect(dockApps.filter(app => app.group === "lms").map(app => app.id)).toEqual(["lms"]);
  expect(dockApps.filter(app => app.group === "workspace").map(app => app.id)).toEqual(["today", "calendar", "requests", "learning", "work", "notifications", "assistant", "account"]);
});
it("searches across groups and handles empty and unmatched queries", () => {
  expect(searchApps("yeu cau").map(app => app.id)).toEqual(["requests", "lms-requests"]);
  expect(searchApps("Levels Lessons").map(app => app.id)).toEqual(["lms-curriculum"]);
  expect(searchApps("Workspace").every(app => app.group === "workspace")).toBe(true);
  expect(searchApps("")).toHaveLength(desktopApps.length);
  expect(searchApps("nonexistentxyz")).toEqual([]);
});
it("ranks app matches above group-only matches while preserving group searches", () => {
  const work = searchApps("work").map(app => app.id);
  expect(work.slice(0, 2)).toEqual(["work", "lms-worklog"]);
  expect(work.indexOf("today")).toBeGreaterThan(work.indexOf("lms-worklog"));
  for (const query of ["LMS", "Gee-O LMS"]) expect(searchApps(query).map(app => app.id)).toEqual(appsInGroup("lms").map(app => app.id));
  expect(searchApps("workspace")).toHaveLength(appsInGroup("workspace").length);
});
it("round trips hashes and rejects malformed or unsafe routes", () => {
  for (const path of ["", "123", "123/overview", "học-viên"]) expect(parseAppHash(formatAppHash("lms-classes", path))).toEqual({ id: "lms-classes", path });
  for (const hash of ["#unknown/123", "#lms-classes/%", "#lms-classes/%2E%2E", "#lms-classes/%00", "#lms-classes/%2Fbad"]) expect(parseAppHash(hash)).toBeUndefined();
  for (const path of ["a".repeat(513), "../x", "/x", "x?y", "x\\y", "x#y", "x\ny"]) expect(isSafePath(path)).toBe(false);
});
it("navigates and goes back without affecting other windows or accepting invalid paths", () => {
  let state = windowReducer(initialDesktop("today", area), { type: "open", id: "lms-classes", area });
  const today = state.windows.today;
  expect(state.windows["lms-classes"]).toMatchObject({ path: "", backStack: [] });
  expect(windowReducer(state, { type: "back", id: "lms-classes" })).toEqual(state);
  state = windowReducer(state, { type: "navigate", id: "lms-classes", path: "123" });
  state = windowReducer(state, { type: "navigate", id: "lms-classes", path: "123/overview" });
  expect(state.windows["lms-classes"]).toMatchObject({ path: "123/overview", backStack: ["", "123"] });
  expect(windowReducer(state, { type: "navigate", id: "lms-classes", path: "../bad" })).toBe(state);
  state = windowReducer(state, { type: "back", id: "lms-classes" });
  expect(state.windows["lms-classes"]).toMatchObject({ path: "123", backStack: [""] });
  expect(state.windows.today).toBe(today);
  state = windowReducer(state, { type: "open", id: "lms-classes", area });
  expect(state.windows["lms-classes"]?.path).toBe("123");
  state = windowReducer(state, { type: "open", id: "lms-classes", area, path: "456" });
  expect(state.windows["lms-classes"]).toMatchObject({ path: "456", backStack: [] });
});
it("resumes desktop geometry with current navigation, including mobile-only windows", () => {
  const saved = initialDesktop("lms-classes", area);
  let mobile = windowReducer(saved, { type: "navigate", id: "lms-classes", path: "123" });
  mobile = windowReducer(mobile, { type: "open", id: "lms-students", area: { width: 390, height: 712 } });
  mobile = windowReducer(mobile, { type: "navigate", id: "lms-students", path: "456" });
  const resumed = windowReducer(mobile, { type: "resume-desktop", state: saved, area, route: { id: "lms-students", path: "456" } });
  expect(resumed.windows["lms-classes"]).toMatchObject({ ...saved.windows["lms-classes"], path: "123", backStack: [""] });
  expect(resumed.windows["lms-students"]).toMatchObject({ open: true, path: "456", backStack: [""] });
  expect(windowReducer(resumed, { type: "back", id: "lms-students" }).windows["lms-students"]).toMatchObject({ path: "", backStack: [] });
  expect(saved.windows["lms-classes"]).toMatchObject({ path: "", backStack: [] });
  expect(windowReducer(mobile, { type: "resume-desktop", state: saved, area }).windows["lms-students"]).toMatchObject({ open: false, path: "456", backStack: [""] });
  expect(windowReducer(mobile, { type: "resume-desktop", state: saved, area, route: { id: "lms-students", path: "other" } }).windows["lms-students"]).toMatchObject({ path: "other", backStack: [] });
  expect(windowReducer({ windows: {} }, { type: "resume-desktop", state: saved, area })).toEqual(saved);
});
it("validates stored paths and history, caps history and upgrades old layouts", () => {
  const state = initialDesktop("lms-classes", area), win = state.windows["lms-classes"]!;
  for (const path of [null, 123, "../bad", "a".repeat(513)]) {
    expect(readLayout(JSON.stringify({ windows: { "lms-classes": { ...win, path, backStack: ["123", null, "../bad", ""] } } }), area)?.windows["lms-classes"]).toMatchObject({ path: "", backStack: ["123", ""] });
  }
  expect(readLayout(JSON.stringify({ windows: { "lms-classes": { ...win, path: "123", backStack: Array(50).fill("ok") } } }), area)?.windows["lms-classes"]?.backStack).toHaveLength(32);
  expect(readLayout(JSON.stringify({ windows: { "lms-classes": { ...win, path: undefined, backStack: {} } } }), area)?.windows["lms-classes"]).toMatchObject({ path: "", backStack: [] });
});
