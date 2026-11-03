import assert from "node:assert/strict";
import test from "node:test";
import { createNotificationsHandler, projectLegacyEvents } from "./notification-data.mjs";
import { filterEvents, parseSnapshot } from "./lib/notification-model.mjs";

const rows = [{ title: "Lịch kiểm tra", subject: "Tiếng Anh", startTime: "2026-11-03T09:00:00" }];
const request = new Request("https://notifications.example/api/notifications?userId=outsider");
const actor = { subject: "teacher/one", accessToken: "test-token", canReadUserEvents: true };
test("legacy projection preserves event time, deduplicates snapshots, and never fabricates unread", () => {
  const events = projectLegacyEvents([...rows, ...rows], "+07:00");
  assert.equal(events.length, 1);
  assert.equal(events[0].startTime, "2026-11-03T02:00:00.000Z");
  assert.deepEqual(Object.keys(events[0]), ["id", "title", "subject", "startTime"]);
  assert.equal(events[0].id, projectLegacyEvents(rows, "+07:00")[0].id);
  assert.throws(() => projectLegacyEvents(rows));
  assert.throws(() => projectLegacyEvents([{ ...rows[0], startTime: "2026-02-30T09:00:00Z" }]));
  assert.throws(() => projectLegacyEvents([{ ...rows[0], title: null }], "+07:00"));
});
test("upstream actor is server-resolved and private payload is projected", async () => {
  const handle = createNotificationsHandler({ apiOrigin: "https://api.example", sourceOffset: "+07:00", resolveActor: async () => actor,
    fetchImpl: async (url, options) => {
      assert.equal(url.pathname, "/api/ClassEvents/GetEventsPerUser/teacher%2Fone");
      assert.equal(url.search, ""); assert.equal(options.headers.Authorization, "Bearer test-token");
      assert.equal(options.redirect, "error"); assert.equal(options.cache, "no-store");
      return Response.json([{ ...rows[0], privateSalary: "not-for-client" }]);
    },
  });
  const response = await handle({ request });
  assert.equal(response.status, 200);
  const body = await response.json(); assert.equal(body.events.length, 1);
  assert.ok(!JSON.stringify(body).includes("not-for-client"));
});
test("missing sessions and denied access never call upstream", async () => {
  for (const [value, status] of [[null, 401], [{ ...actor, canReadUserEvents: false }, 403]]) {
    const handle = createNotificationsHandler({ apiOrigin: "https://api.example", resolveActor: async () => value,
      fetchImpl: async () => { assert.fail("Unauthorized upstream call"); },
    });
    assert.equal((await handle({ request })).status, status);
  }
});
test("authorization failures and malformed upstream remain distinct from empty", async () => {
  for (const [upstream, status] of [[() => new Response(null, { status: 401 }), 401], [() => new Response(null, { status: 403 }), 403], [() => Response.json({ items: [] }), 503], [() => Response.json([]), 200], [() => { throw new Error("private failure"); }, 503]]) {
    const handle = createNotificationsHandler({ apiOrigin: "https://api.example", resolveActor: async () => actor, fetchImpl: upstream });
    const response = await handle({ request }); assert.equal(response.status, status);
    const body = await response.json();
    if (status === 200) assert.deepEqual(body.events, []); else assert.equal(body.events, undefined);
    assert.ok(!JSON.stringify(body).includes("private failure"));
  }
});
test("search supports Vietnamese and combines subject and event-time filters", () => {
  const events = projectLegacyEvents(rows, "+07:00");
  parseSnapshot({ events, observedAt: new Date().toISOString() });
  assert.equal(filterEvents(events, { query: "kiem tieng", subject: "Tiếng Anh", period: "upcoming", now: Date.parse("2026-11-02") }).length, 1);
  assert.equal(filterEvents(events, { query: "kiem", period: "past", now: Date.parse("2026-11-02") }).length, 0);
  assert.throws(() => parseSnapshot({ events: [...events, ...events], observedAt: new Date().toISOString() }));
  assert.throws(() => parseSnapshot({ events: [{ title: "bad" }], observedAt: "invalid" }));
});
