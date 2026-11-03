export function parseSnapshot(data) {
  if (!Array.isArray(data?.events) || data.events.length > 5000 || !Number.isFinite(Date.parse(data.observedAt))) throw new Error("Invalid snapshot");
  const ids = new Set();
  for (const row of data.events) {
    if (!row || typeof row.id !== "string" || !row.id || ids.has(row.id) ||
        typeof row.title !== "string" || !row.title || row.title.length > 2000 ||
        typeof row.subject !== "string" || row.subject.length > 200 ||
        typeof row.startTime !== "string" || !Number.isFinite(Date.parse(row.startTime))) throw new Error("Invalid event");
    ids.add(row.id);
  }
  return data.events;
}
const normalize = value => value.toLocaleLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replaceAll("đ", "d");
/** @param {{id: string, title: string, subject: string, startTime: string}[]} events
 * @param {{query?: string, subject?: string | null, period?: string, now?: number}} filters */
export function filterEvents(events, { query = "", subject = null, period = "all", now = Date.now() }) {
  const words = normalize(query).trim().split(/\s+/).filter(Boolean);
  return events.filter(event => (subject === null || subject === event.subject) &&
    words.every(word => normalize(`${event.title} ${event.subject}`).includes(word)) &&
    (period === "all" || (period === "upcoming" ? Date.parse(event.startTime) >= now : Date.parse(event.startTime) < now)));
}
export function sourceState(status, code) {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (code === "NOTIFICATIONS_NOT_CONFIGURED") return "unconfigured";
  return "error";
}
