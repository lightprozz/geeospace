import assert from "node:assert/strict";
import test from "node:test";
import { createNotificationRoutes } from "./lib/http-handler.mjs";
test("Next notifications handlers reject query spoofing and preserve unavailable", async () => {
  const handle = createNotificationRoutes();
  assert.equal((await handle(new Request("https://notifications.example/api/notifications?userId=other"))).status, 400);
  for (const summary of [true, false]) {
    const response = await handle(new Request("https://notifications.example/api/notifications"), summary);
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { code: "NOTIFICATIONS_NOT_CONFIGURED" });
  }
});
test("Next summary shares no content or upstream headers", async () => {
  const observedAt = new Date().toISOString();
  const handle = createNotificationRoutes(async () => Response.json({ events: [{ title: "private" }], observedAt }, { headers: { "Access-Control-Allow-Origin": "*" } }));
  const response = await handle(new Request("https://notifications.example/api/status"), true);
  assert.deepEqual(await response.json(), { status: "ready", count: 1, observedAt });
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("access-control-allow-origin"), null);
});
