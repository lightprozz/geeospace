import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import { createCalendarServer } from "./server.mjs";
import { dateRange, dayBounds, parseEvents } from "./lib/dates.mjs";

const host = "http://127.0.0.1:3100";
const eventsPath = "/api/events?from=2026-11-02&to=2026-11-09";

async function startServer(t, options) {
  const server = createCalendarServer(options);
  server.listen(0, "127.0.0.1");
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await once(server, "listening");
  return `http://127.0.0.1:${server.address().port}`;
}

test("limits frame ancestors to the configured origin", async (t) => {
  assert.throws(() => createCalendarServer({ spaceOrigin: `${host}/path` }), /exact HTTP/);
  const standalone = await startServer(t);
  const embedded = await startServer(t, { spaceOrigin: host });

  const first = await fetch(standalone);
  assert.match(first.headers.get("content-security-policy"), /frame-ancestors 'none'/);
  const second = await fetch(embedded);
  assert.ok(second.headers.get("content-security-policy").endsWith(`frame-ancestors ${host}`));
  assert.ok((await second.text()).includes(`name="spaceos-parent-origin" content="${host}"`));
});

test("reports missing configuration and rejects invalid ranges", async (t) => {
  const base = await startServer(t);
  const response = await fetch(base + eventsPath);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { code: "CALENDAR_NOT_CONFIGURED" });

  const invalid = await fetch(base + "/api/events?from=2026-02-30&to=2026-03-09");
  assert.equal(invalid.status, 400);
  assert.equal((await fetch(base + "/calendar-data.mjs")).status, 404);
});

test("preserves adapter authorization status without sharing response headers", async (t) => {
  const base = await startServer(t, {
    getCalendarEvents: async ({ request, from, to }) => {
      assert.equal(request.headers.get("cookie"), "session=demo");
      assert.equal(from, "2026-11-02");
      assert.equal(to, "2026-11-09");
      return Response.json({ code: "SIGN_IN_REQUIRED" }, {
        status: 401,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    },
  });
  const response = await fetch(base + eventsPath, { headers: { Cookie: "session=demo" } });
  assert.equal(response.status, 401);
  assert.equal(response.headers.get("access-control-allow-origin"), null);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("uses Monday weeks and Asia/Ho_Chi_Minh dates for all-day events", () => {
  assert.deepEqual(dateRange("2026-11-01", "week"), { from: "2026-10-26", to: "2026-11-02" });
  assert.deepEqual(dateRange("2026-11-01", "month"), { from: "2026-10-26", to: "2026-12-07" });
  const [event] = parseEvents({
    events: [{ id: "all-day", title: "Example", allDay: true, start: "2026-11-02", end: "2026-11-03" }],
  });
  assert.equal(event.from, Date.parse("2026-11-01T17:00:00Z"));
  assert.equal(event.to, dayBounds("2026-11-03").from);
  assert.throws(() => parseEvents({ events: [{ id: "bad", title: "Example", start: "2026-11-02", end: "2026-11-03" }] }));
});
