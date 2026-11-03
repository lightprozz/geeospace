import { createHash } from "node:crypto";

const offsetPattern = /^(?:Z|[+-](?:0\d|1[0-3]):[0-5]\d|[+-]14:00)$/;
const timestampPattern = /^(\d{4}-\d{2}-\d{2})T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,7})?(Z|[+-]\d{2}:\d{2})?$/;
const failure = (code, status) => Response.json({ code }, { status });

export function getNotifications() {
  return failure("NOTIFICATIONS_NOT_CONFIGURED", 503);
}

export function projectLegacyEvents(rows, sourceOffset) {
  if (!Array.isArray(rows) || rows.length > 5000) throw new Error("Invalid events");
  const events = new Map();
  for (const row of rows) {
    const match = typeof row?.startTime === "string" && timestampPattern.exec(row.startTime);
    const offset = match && (match[2] ?? sourceOffset);
    if (!match || !offsetPattern.test(offset ?? "") ||
        new Date(match[1]).toISOString().slice(0, 10) !== match[1] ||
        typeof row.title !== "string" || !row.title.trim() || row.title.length > 2000 ||
        (row.subject != null && (typeof row.subject !== "string" || row.subject.length > 200))) {
      throw new Error("Invalid event");
    }
    const start = Date.parse(match[2] ? row.startTime : row.startTime + offset);
    if (!Number.isFinite(start)) throw new Error("Invalid event time");
    const title = row.title.trim(), subject = row.subject?.trim() || "";
    const startTime = new Date(start).toISOString();
    // A snapshot identity, not a durable notification/read-state identifier.
    const id = createHash("sha256").update(JSON.stringify([subject, title, startTime])).digest("hex");
    events.set(id, { id, title, subject, startTime });
  }
  return [...events.values()].sort((a, b) => b.startTime.localeCompare(a.startTime) || a.id.localeCompare(b.id));
}

// The resolver is a server integration seam. It must validate the session and
// permission for this source; never derive actor/token from browser query input.
export function createNotificationsHandler({ apiOrigin, resolveActor, sourceOffset, fetchImpl = fetch }) {
  const origin = new URL(apiOrigin);
  if (origin.protocol !== "https:" || origin.origin !== apiOrigin || typeof resolveActor !== "function" ||
      (sourceOffset !== undefined && !offsetPattern.test(sourceOffset))) throw new Error("Invalid notifications configuration");
  return async ({ request }) => {
    try {
      const actor = await resolveActor(request);
      if (!actor || typeof actor.subject !== "string" || !actor.subject.trim() ||
          typeof actor.accessToken !== "string" || !actor.accessToken.trim()) return failure("NOTIFICATIONS_UNAUTHENTICATED", 401);
      if (actor.canReadUserEvents !== true) return failure("NOTIFICATIONS_FORBIDDEN", 403);
      const response = await fetchImpl(new URL(`/api/ClassEvents/GetEventsPerUser/${encodeURIComponent(actor.subject)}`, origin), {
        headers: { Accept: "application/json", Authorization: `Bearer ${actor.accessToken}` },
        cache: "no-store", redirect: "error", signal: AbortSignal.timeout(6000),
      });
      if (response.status === 401) return failure("NOTIFICATIONS_UNAUTHENTICATED", 401);
      if (response.status === 403) return failure("NOTIFICATIONS_FORBIDDEN", 403);
      if (!response.ok) return failure("NOTIFICATIONS_UNAVAILABLE", 503);
      const events = projectLegacyEvents(await response.json(), sourceOffset);
      return Response.json({ events, observedAt: new Date().toISOString() });
    } catch { return failure("NOTIFICATIONS_UNAVAILABLE", 503); }
  };
}
