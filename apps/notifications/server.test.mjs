import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import { createNotificationsServer } from "./server.mjs";
async function start(t, options) {
  const server = createNotificationsServer(options); server.listen(0, "127.0.0.1"); await once(server, "listening");
  t.after(() => new Promise(resolve => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}
test("standalone is closed to framing and embedding uses an exact origin", async t => {
  assert.throws(() => createNotificationsServer({ spaceOrigin: "https://space.example/path" }));
  const base = await start(t), embedded = await start(t, { spaceOrigin: "http://127.0.0.1:3100" });
  assert.match((await fetch(base)).headers.get("content-security-policy"), /frame-ancestors 'none'/);
  const response = await fetch(embedded);
  assert.match(response.headers.get("content-security-policy"), /frame-ancestors http:\/\/127.0.0.1:3100/);
  assert.match(await response.text(), /content="http:\/\/127.0.0.1:3100"/);
});
test("unconfigured is not empty, query actor spoofing and mutations are rejected", async t => {
  const base = await start(t);
  for (const path of ["/api/notifications", "/api/status"]) {
    const response = await fetch(base + path); assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { code: "NOTIFICATIONS_NOT_CONFIGURED" });
    assert.equal((await fetch(base + path + "?userId=other")).status, 400);
    assert.equal((await fetch(base + path, { method: "POST" })).status, 405);
  }
  assert.equal((await fetch(base + "/notification-data.mjs")).status, 404);
});
test("status endpoint returns only counts and observation time without upstream headers", async t => {
  const observedAt = new Date().toISOString();
  const base = await start(t, { getNotifications: async ({ request }) => {
    assert.equal(request.headers.get("cookie"), "session=test");
    return Response.json({ events: [{ title: "private-title" }], observedAt }, { headers: { "Access-Control-Allow-Origin": "*" } });
  } });
  const response = await fetch(base + "/api/status", { headers: { Cookie: "session=test" } });
  assert.deepEqual(await response.json(), { status: "ready", count: 1, observedAt });
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("access-control-allow-origin"), null);
});
