import { describe, expect, it } from "vitest";
import { getTimetableClassId, toCalendarSessions } from "@/features/lms/apps/timetable/calendar-model";
import type { ScheduleCalendarEvent } from "@/features/lms/types/schedule";

const event: ScheduleCalendarEvent = {
  id: "lesson-1", campusId: "campus-1", title: "Starters A",
  startTime: "2026-07-06T17:30:00", endTime: "2026-07-06T19:00:00",
};

describe("window timetable routes", () => {
  it("reads a class filter without using global query parameters", () => {
    expect(getTimetableClassId("class/class-1")).toBe("class-1");
    expect(getTimetableClassId("")).toBeUndefined();
  });
  it("rejects malformed and unsafe class routes", () => {
    for (const path of ["class/", "class/../x", "class/a/b", "/class/a", "class/a?b", "class/a#b", "other/a"]) {
      expect(getTimetableClassId(path)).toBeUndefined();
    }
  });
});

describe("calendar sessions", () => {
  it("maps local times and preserves distinct occurrences of the same lesson", () => {
    const next = { ...event, startTime: "2026-07-08T17:30:00", endTime: "2026-07-08T19:00:00" };
    const sessions = toCalendarSessions([event, event, next]);
    expect(sessions).toHaveLength(2);
    expect(sessions[0]).toMatchObject({ className: "Starters A", campusId: "campus-1", startTime: "17:30", endTime: "19:00" });
    expect(sessions[0].date).toEqual(new Date(2026, 6, 6));
    expect(sessions[0].id).not.toBe(sessions[1].id);
  });
  it("handles an empty calendar", () => expect(toCalendarSessions([])).toEqual([]));
  it("omits invalid timestamps instead of rendering invalid dates", () => {
    expect(toCalendarSessions([{ ...event, startTime: "invalid" }, { ...event, endTime: "invalid" }])).toEqual([]);
  });
});
