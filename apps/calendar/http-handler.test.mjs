import assert from "node:assert/strict";
import test from "node:test";
import { createCalendarRoute } from "./lib/http-handler.mjs";
import { parentOrigin } from "@geeo/embedded-app/server";
const request = (query = "from=2026-11-02&to=2026-11-09") => new Request(`http://127.0.0.1:3200/api/events?${query}`, { headers: { Cookie: "session=test" } });
test("Next calendar handler preserves missing source, range validation and privacy", async () => {
  const response = await createCalendarRoute()(request());
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { code: "CALENDAR_NOT_CONFIGURED" });
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal((await createCalendarRoute()(request("from=2026-02-30&to=2026-03-09"))).status, 400);
});
test("Next calendar handler forwards the server request without copying upstream headers", async () => {
  const response = await createCalendarRoute(async ({ request, from, to }) => {
    assert.equal(request.headers.get("cookie"), "session=test");
    assert.equal(from, "2026-11-02"); assert.equal(to, "2026-11-09");
    return Response.json({ code: "CALENDAR_FORBIDDEN" }, { status: 403, headers: { "Access-Control-Allow-Origin": "*" } });
  })(request());
  assert.equal(response.status, 403);
  assert.equal(response.headers.get("access-control-allow-origin"), null);
  assert.throws(() => parentOrigin("http://127.0.0.1:3100/path"));
  assert.equal(parentOrigin("https://space.example"), "https://space.example");
});
