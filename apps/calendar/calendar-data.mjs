import { addMonths, isDay } from "./lib/dates.mjs";

const dayMs = 86_400_000;
const timetablePath = "/api/v2/class/timetable/events";
const offsetPattern = /^(?:Z|[+-](?:0\d|1[0-3]):[0-5]\d|[+-]14:00)$/;
const dateTimePattern = /^(\d{4}-\d{2}-\d{2})T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,7})?(Z|[+-]\d{2}:\d{2})?$/;

function json(body, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function error(code, status) {
  return json({ code }, status);
}

function instant(value, sourceOffset) {
  const match = typeof value === "string" && dateTimePattern.exec(value);
  if (!match || !isDay(match[1])) return NaN;
  const offset = match[2] ?? sourceOffset;
  if (!offset || !offsetPattern.test(offset)) return NaN;
  return Date.parse(match[2] ? value : value + offset);
}

function project(row, sourceOffset, start, end) {
  const from = instant(row.startTime, sourceOffset);
  const to = instant(row.endTime, sourceOffset);
  if (typeof row.id !== "string" || !row.id || typeof row.title !== "string" ||
      !row.title || !Number.isFinite(from) || !Number.isFinite(to) || to <= from) {
    throw new Error("Invalid timetable event");
  }
  if (from >= end || to <= start) return null;
  const location = [row.campusName, row.roomName]
    .filter((value) => typeof value === "string" && value.trim())
    .join(" · ");
  return {
    id: row.id, title: row.title, start: new Date(from).toISOString(),
    campusId: row.campusId,
    campusName: typeof row.campusName === "string" ? row.campusName.trim() : "",
    end: new Date(to).toISOString(), ...(location && { location }),
  };
}

export function getCalendarEvents() {
  return error("CALENDAR_NOT_CONFIGURED", 503);
}

// resolveActor must derive these values from a verified server session and
// current server-side permissions. Never use caller-supplied headers or IDs.
export function createCalendarEventsHandler({ apiOrigin, resolveActor, sourceOffset, fetchImpl = fetch }) {
  const origin = new URL(apiOrigin);
  if (origin.protocol !== "https:" || origin.username || origin.password ||
      origin.pathname !== "/" || origin.search || origin.hash ||
      typeof resolveActor !== "function" ||
      (sourceOffset !== undefined && !offsetPattern.test(sourceOffset))) {
    throw new Error("Invalid timetable adapter configuration");
  }

  return async function handleCalendarEvents({ request, from, to }) {
    if (!isDay(from) || !isDay(to) || from < "0001-01-01" ||
        to <= from || Date.parse(to) - Date.parse(from) > 42 * dayMs) {
      return error("INVALID_DATE_RANGE", 400);
    }

    try {
      const actor = await resolveActor(request);
      if (!actor || typeof actor.accessToken !== "string" || !actor.accessToken.trim()) {
        return error("CALENDAR_UNAUTHENTICATED", 401);
      }
      if (!Array.isArray(actor.permissions) || !actor.permissions.includes("class.schedule") ||
          !Array.isArray(actor.campusIds) || !actor.campusIds.length ||
          actor.campusIds.some((campusId) => typeof campusId !== "string" || !campusId.trim())) {
        return error("CALENDAR_FORBIDDEN", 403);
      }

      const start = Date.parse(from + "T00:00:00+07:00");
      const end = Date.parse(to + "T00:00:00+07:00");
      const startMonth = `${from.slice(0, 7)}-01`;
      const lastMonth = `${to.slice(0, 7)}-01`;
      const firstMonth = startMonth === "0001-01-01" ? startMonth : addMonths(startMonth, -1);
      const signal = AbortSignal.timeout(6_000);
      const events = new Map();
      const campusIds = new Set(actor.campusIds);

      // The upstream filters by start month. Include the previous month for
      // lessons that cross midnight at a month boundary.
      for (let month = firstMonth; month <= lastMonth; month = addMonths(month, 1)) {
        for (const campusId of campusIds) {
          const url = new URL(timetablePath, origin);
          url.search = new URLSearchParams({
            campusId, month: String(Number(month.slice(5, 7))), year: month.slice(0, 4),
          });
          const response = await fetchImpl(url, {
            headers: { Accept: "application/json", Authorization: `Bearer ${actor.accessToken}` },
            redirect: "error",
            cache: "no-store",
            signal,
          });
          if (response.status === 401) return error("CALENDAR_UNAUTHENTICATED", 401);
          if (response.status === 403) return error("CALENDAR_FORBIDDEN", 403);
          if (!response.ok) return error("CALENDAR_UNAVAILABLE", 503);

          const rows = await response.json();
          if (!Array.isArray(rows)) return error("CALENDAR_UNAVAILABLE", 503);
          for (const row of rows) {
            if (row?.campusId !== campusId) continue;
            const event = project(row, sourceOffset, start, end);
            if (event && !events.has(event.id)) events.set(event.id, event);
          }
        }
        if (month === lastMonth) break;
      }

      return json({ events: [...events.values()] });
    } catch {
      return error("CALENDAR_UNAVAILABLE", 503);
    }
  };
}
