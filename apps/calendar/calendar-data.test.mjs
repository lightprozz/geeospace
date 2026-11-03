import assert from "node:assert/strict";
import test from "node:test";
import { createCalendarEventsHandler } from "./calendar-data.mjs";

const range = { from: "2026-10-26", to: "2026-11-02" };
const actor = { accessToken: "test-token", permissions: ["class.schedule"], campusIds: ["campus-a"] };

test("loads a cross-month range and excludes rows outside the actor's campus", async () => {
  const months = [];
  const handle = createCalendarEventsHandler({
    apiOrigin: "https://lms.gee-o.edu",
    resolveActor: async () => actor,
    fetchImpl: async url => {
      assert.equal(url.searchParams.get("campusId"), "campus-a");
      months.push(url.searchParams.get("month"));
      if (url.searchParams.get("month") !== "11") return Response.json([]);
      const event = { id: "lesson-a", title: "Lesson", startTime: "2026-11-01T09:00:00+07:00",
        endTime: "2026-11-01T10:00:00+07:00", campusId: "campus-a", campusName: "Campus A" };
      return Response.json([event, { ...event, id: "lesson-b", campusId: "campus-b" }]);
    },
  });
  const response = await handle(range);
  assert.equal(response.status, 200);
  assert.ok(months.includes("10") && months.includes("11"));
  const { events } = await response.json();
  assert.deepEqual(events.map(({ id, campusId, campusName }) => [id, campusId, campusName]),
    [["lesson-a", "campus-a", "Campus A"]]);
});

test("returns distinct session and permission errors before accessing timetable", async () => {
  for (const [identity, expected] of [[null, 401], [{ ...actor, permissions: [] }, 403], [{ ...actor, campusIds: [] }, 403]]) {
    const handle = createCalendarEventsHandler({
      apiOrigin: "https://lms.gee-o.edu",
      resolveActor: async () => identity,
      fetchImpl: () => assert.fail("Unauthorized timetable call"),
    });
    assert.equal((await handle(range)).status, expected);
  }
});
