import { describe, expect, it } from "vitest";
import { createCalendarStore } from "../../apps/calendar/lib/calendar-store";
import { createNotificationStore } from "../../apps/notifications/lib/notification-store";
import { parseHostContext } from "../../packages/embedded-app/src/bridge";
describe("embedded app state isolation", () => {
  it("creates independent UI state for each app/request", () => {
    const first = createNotificationStore(), second = createNotificationStore();
    first.getState().set({ query: "private query", subject: "subject", group: false });
    expect(second.getState()).toMatchObject({ query: "", subject: null, group: true });
    const calendar = createCalendarStore("2026-11-03"), other = createCalendarStore("2026-11-03");
    calendar.getState().set({ campus: "branch", view: "month", day: "2026-12-01" });
    expect(other.getState()).toMatchObject({ campus: "", view: "week", day: "2026-11-03" });
    expect(first.getState()).not.toHaveProperty("events");
    expect(calendar.getState()).not.toHaveProperty("accessToken");
  });
  it("validates bridge context and binds subsequent messages to the instance", () => {
    const value = { type: "spaceos:init", version: 1, instanceId: "a", theme: "light", locale: "vi", visible: true, reducedMotion: false };
    expect(parseHostContext(value)?.locale).toBe("vi");
    for (const patch of [{ version: 2 }, { instanceId: "" }, { visible: "true" }, { locale: "fr" }, { theme: "system" }]) expect(parseHostContext({ ...value, ...patch })).toBeUndefined();
    expect(parseHostContext(value, "b")).toBeUndefined();
  });
});
