const zone = "Asia/Ho_Chi_Minh";
const dayFormatter = new Intl.DateTimeFormat("sv-SE", {
  timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit",
});

export function today() {
  return dayFormatter.format(new Date());
}

export function isDay(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

export function addDays(day, count) {
  const date = new Date(day);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}

export function addMonths(day, count) {
  const first = new Date(`${day.slice(0, 7)}-01`);
  first.setUTCMonth(first.getUTCMonth() + count);
  const month = first.toISOString().slice(0, 7);
  first.setUTCMonth(first.getUTCMonth() + 1, 0);
  return `${month}-${String(Math.min(Number(day.slice(8)), first.getUTCDate())).padStart(2, "0")}`;
}

export function startOfWeek(day) {
  return addDays(day, -((new Date(day).getUTCDay() + 6) % 7));
}

export function dateRange(day, view) {
  if (view === "month") {
    const first = `${day.slice(0, 7)}-01`;
    const from = startOfWeek(first);
    const last = addDays(addMonths(first, 1), -1);
    return { from, to: addDays(startOfWeek(last), 7) };
  }
  const from = view === "week" ? startOfWeek(day) : day;
  return { from, to: addDays(from, 7) };
}

export function dayBounds(day) {
  const from = Date.parse(`${day}T00:00:00+07:00`);
  const to = Date.parse(`${addDays(day, 1)}T00:00:00+07:00`);
  return { from, to };
}

export function formatDay(day, locale, options) {
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" }).format(new Date(day));
}

export function formatTime(instant, locale) {
  return new Intl.DateTimeFormat(locale, {
    timeZone: zone, hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(new Date(instant));
}

export function parseEvents(data) {
  if (!Array.isArray(data?.events)) throw new Error("Invalid calendar response");

  return data.events.map((event) => {
    const { id, title, start, end, allDay = false, location, campusId, campusName } = event ?? {};
    if (typeof id !== "string" || !id || typeof title !== "string" || !title ||
        typeof allDay !== "boolean" || typeof start !== "string" || typeof end !== "string" ||
        (location !== undefined && typeof location !== "string")) {
      throw new Error("Invalid calendar event");
    }
    const zoned = /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/;
    const from = allDay && isDay(start) ? dayBounds(start).from : zoned.test(start) ? Date.parse(start) : NaN;
    const to = allDay && isDay(end) ? dayBounds(end).from : zoned.test(end) ? Date.parse(end) : NaN;
    if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) throw new Error("Invalid calendar event dates");
    return { id, title, from, to, allDay, location,
      campusId: typeof campusId === "string" ? campusId : undefined,
      campusName: typeof campusName === "string" ? campusName : undefined };
  }).sort((first, second) => Number(second.allDay) - Number(first.allDay) || first.from - second.from);
}
