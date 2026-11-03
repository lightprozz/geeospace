import { privateJson, parentOrigin } from "@geeo/embedded-app/server";
import { getCalendarEvents } from "../calendar-data.mjs";
import { createLocalMvpHandler } from "../local-mvp.mjs";
import { isDay } from "./dates.mjs";

export function createCalendarRoute(load = getCalendarEvents) {
  return async function handle(request) {
    const url = new URL(request.url), from = url.searchParams.get("from"), to = url.searchParams.get("to");
    if (!isDay(from) || !isDay(to) || to <= from || Date.parse(to) - Date.parse(from) > 42 * 86_400_000) return privateJson({ code: "INVALID_DATE_RANGE" }, 400);
    try {
      const result = await load({ request, from, to });
      return privateJson(await result.json(), result.status);
    } catch { return privateJson({ code: "CALENDAR_UNAVAILABLE" }, 503); }
  };
}
export function handleCalendar(request) {
  const accessToken = process.env.GEEO_CALENDAR_MVP_ACCESS_TOKEN;
  if (!accessToken) return createCalendarRoute()(request);
  if (process.env.NODE_ENV === "production") return privateJson({ code: "CALENDAR_MVP_DISABLED" }, 503);
  // Credentials remain exclusively in the server adapter.
  const load = createLocalMvpHandler({ accessToken, host: "127.0.0.1", port: 3200, parentOrigin: parentOrigin(),
    apiOrigin: process.env.GEEO_CALENDAR_API_ORIGIN, sourceOffset: process.env.GEEO_CALENDAR_SOURCE_OFFSET });
  return createCalendarRoute(load)(request);
}
