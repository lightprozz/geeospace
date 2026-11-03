import { addDays, addMonths, dateRange, dayBounds, formatDay, formatTime, parseEvents, today } from "./dates.mjs";

const translations = {
  vi: {
    subtitle: "Lịch làm việc", today: "Hôm nay", previous: "Khoảng trước", next: "Khoảng sau",
    navigation: "Điều hướng ngày", views: "Chế độ xem", week: "Tuần", month: "Tháng", agenda: "Lịch biểu",
    allDay: "Cả ngày", noEvents: "Không có sự kiện", retry: "Thử lại",
    campus: "Chi nhánh", allCampuses: "Tất cả chi nhánh",
    loading: ["Đang tải lịch", ""],
    unconfigured: ["Chưa kết nối lịch làm việc", "Cần thiết lập nguồn lịch GeeO để xem sự kiện."],
    unauthorized: ["Cần đăng nhập GeeO", "Hãy đăng nhập vào tài khoản GeeO được cấp quyền xem lịch rồi thử lại."],
    forbidden: ["Bạn chưa có quyền xem lịch", "Tài khoản hiện tại chưa được cấp quyền truy cập lịch này."],
    error: ["Không tải được lịch", "Hãy thử lại sau ít phút."],
    empty: ["Không có sự kiện", "Chưa có sự kiện trong khoảng ngày đang xem."],
  },
  en: {
    subtitle: "Work calendar", today: "Today", previous: "Previous period", next: "Next period",
    navigation: "Date navigation", views: "Calendar views", week: "Week", month: "Month", agenda: "Agenda",
    allDay: "All day", noEvents: "No events", retry: "Try again",
    campus: "Branch", allCampuses: "All branches",
    loading: ["Loading calendar", ""],
    unconfigured: ["Calendar is disconnected", "Connect the GeeO calendar source to see your events."],
    unauthorized: ["GeeO sign-in required", "Sign in with a GeeO account that has calendar access, then try again."],
    forbidden: ["Calendar access is restricted", "Your current account does not have access to this calendar."],
    error: ["Calendar could not be loaded", "Please try again in a few minutes."],
    empty: ["No events", "There are no events in the selected date range."],
  },
};

const parentOrigin = document.querySelector('meta[name="spaceos-parent-origin"]').content;
const embedded = window.parent !== window && Boolean(parentOrigin);
const calendar = document.querySelector("#calendar");
const sourceState = document.querySelector("#source-state");
const retry = document.querySelector("#retry");
const viewButtons = document.querySelectorAll("[data-view]");
const campusSelect = document.querySelector("#campus");
let selectedCampus = "";
campusSelect.addEventListener("change", () => {
  selectedCampus = campusSelect.value;
  render();
});

let locale = navigator.language.startsWith("en") ? "en" : "vi";
let instanceId;
let visible = !embedded;
let day = today();
let view = "week";
let status = "loading";
let events = [];
let pending;
let refreshTimer;

function makeElement(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = content;
  return node;
}

function labelDay(date, options) {
  return formatDay(date, locale, options);
}

function dateLabel(date) {
  return labelDay(date, { dateStyle: "full" });
}

function dayEvents(date) {
  const { from, to } = dayBounds(date);
  return events.filter((event) => event.from < to && event.to > from &&
    (!selectedCampus || event.campusId === selectedCampus));
}

function eventItem(event, date, compact) {
  const { from, to } = dayBounds(date);
  const text = translations[locale];
  const start = event.from < from ? "…" : formatTime(event.from, locale);
  const end = event.to >= to ? "…" : formatTime(event.to, locale);
  const time = event.allDay ? text.allDay : compact ? start : `${start} – ${end}`;
  const item = makeElement("li", "event");
  item.append(
    makeElement("span", "event-time", time),
    makeElement("strong", "event-title", event.title),
  );
  if (event.location && !compact) item.append(makeElement("span", "event-location", event.location));
  return item;
}

function appendEvents(cell, entries, date, compact) {
  if (entries.length === 0) return;
  const list = makeElement("ul", "events");
  for (const entry of entries) list.append(eventItem(entry, date, compact));
  cell.append(list);
}

function monthHeading(date) {
  const node = makeElement("div", "weekday", labelDay(date, { weekday: "short" }));
  node.setAttribute("aria-hidden", "true");
  return node;
}

function dateCell(date, currentDay) {
  const compact = view === "month";
  const cell = makeElement("div", "day");
  const entries = dayEvents(date);
  if (date.slice(0, 7) !== day.slice(0, 7) && compact) cell.dataset.outside = "true";
  if (date === currentDay) cell.dataset.today = "true";

  if (compact) {
    const button = makeElement("button", "month-day", String(Number(date.slice(8))));
    button.type = "button";
    button.setAttribute("aria-label", entries.length
      ? `${dateLabel(date)} · ${entries.length} ${locale === "vi" ? "sự kiện" : entries.length === 1 ? "event" : "events"}`
      : dateLabel(date));
    button.dataset.date = date;
    if (date === currentDay) button.setAttribute("aria-current", "date");
    button.addEventListener("click", () => {
      setRange(date, "agenda");
      document.querySelector('[data-view="agenda"]').focus();
    });
    cell.append(button);
    if (entries.length) {
      const count = makeElement("span", "day-count", String(entries.length));
      count.setAttribute("aria-hidden", "true");
      cell.append(count);
    }
  } else {
    const header = makeElement("h3", "day-label");
    header.append(
      makeElement("span", "day-weekday", labelDay(date, { weekday: "short" })),
      makeElement("span", "day-number", labelDay(date, view === "week" ? { day: "numeric" } : { day: "numeric", month: "short" })),
    );
    header.setAttribute("aria-label", dateLabel(date));
    if (date === currentDay) header.setAttribute("aria-current", "date");
    cell.append(header);
    if (entries.length === 0 && status === "ready") {
      cell.append(makeElement("p", "day-empty", translations[locale].noEvents));
    }
  }
  appendEvents(cell, entries, date, compact);
  return cell;
}

function render() {
  const text = translations[locale];
  const campuses = new Map(events.filter(event => event.campusId && event.campusName)
    .map(event => [event.campusId, event.campusName]));
  document.querySelector("#campus-label").textContent = text.campus;
  document.querySelector("#campus-filter").hidden = campuses.size === 0;
  campusSelect.replaceChildren(new Option(text.allCampuses, ""),
    ...[...campuses].sort((a, b) => a[1].localeCompare(b[1], locale))
      .map(([id, name]) => new Option(name, id)));
  campusSelect.value = campuses.has(selectedCampus) ? selectedCampus : "";
  if (status === "ready") selectedCampus = campusSelect.value;
  document.documentElement.lang = locale;
  document.querySelector("#subtitle").textContent = text.subtitle;
  document.querySelector("#today").textContent = text.today;
  document.querySelector("#previous").setAttribute("aria-label", text.previous);
  document.querySelector("#next").setAttribute("aria-label", text.next);
  document.querySelector(".date-controls").setAttribute("aria-label", text.navigation);
  document.querySelector(".view-controls").setAttribute("aria-label", text.views);
  for (const button of viewButtons) {
    button.textContent = text[button.dataset.view];
    button.setAttribute("aria-pressed", String(view === button.dataset.view));
  }

  const state = text[status];
  sourceState.hidden = !state;
  if (state) {
    document.querySelector("#state-title").textContent = state[0];
    document.querySelector("#state-detail").textContent = state[1];
  }
  retry.textContent = text.retry;
  retry.hidden = !["error", "unauthorized", "forbidden"].includes(status);

  const { from, to } = dateRange(day, view);
  const heading = document.querySelector("#range-title");
  const format = { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" };
  heading.textContent = view === "month"
    ? labelDay(day, { month: "long", year: "numeric" })
    : new Intl.DateTimeFormat(locale, format).formatRange(new Date(from), new Date(addDays(to, -1)));
  calendar.dataset.view = view;
  calendar.setAttribute("aria-busy", String(status === "loading"));
  const cells = document.createDocumentFragment();
  const currentDay = today();
  if (view === "month") {
    for (let index = 0; index < 7; index++) cells.append(monthHeading(addDays(from, index)));
  }
  for (let date = from; date < to; date = addDays(date, 1)) {
    cells.append(dateCell(date, currentDay));
  }
  const focusedDate = calendar.contains(document.activeElement) ? document.activeElement.dataset.date : null;
  calendar.replaceChildren(cells);
  if (focusedDate) {
    const target = Array.from(calendar.querySelectorAll(".month-day"))
      .find((button) => button.dataset.date === focusedDate);
    target?.focus({ preventScroll: true });
  }
}

function stopRefresh() {
  clearTimeout(refreshTimer);
  pending?.abort();
  pending = undefined;
}

function canRefresh() {
  return visible && document.visibilityState === "visible";
}

async function refresh() {
  stopRefresh();
  if (!canRefresh()) return;

  const controller = new AbortController();
  pending = controller;
  const { from, to } = dateRange(day, view);

  try {
    const params = new URLSearchParams({ from, to });
    const response = await fetch(`/api/events?${params}`, {
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]),
    });
    let nextEvents = [];
    let nextStatus = "error";
    if (response.ok) {
      const start = dayBounds(from).from;
      const end = dayBounds(to).from;
      nextEvents = parseEvents(await response.json()).filter((event) => event.from < end && event.to > start);
      nextStatus = nextEvents.length ? "ready" : "empty";
    } else if (response.status === 401) {
      nextStatus = "unauthorized";
    } else if (response.status === 403) {
      nextStatus = "forbidden";
    } else if (response.status === 503 && (await response.json()).code === "CALENDAR_NOT_CONFIGURED") {
      nextStatus = "unconfigured";
    }
    if (controller.signal.aborted) return;
    events = nextEvents;
    status = nextStatus;
  } catch {
    if (controller.signal.aborted) return;
    events = [];
    status = "error";
  }

  pending = undefined;
  render();
  if (["ready", "empty", "error"].includes(status) && canRefresh()) {
    refreshTimer = setTimeout(refresh, 60_000);
  }
}

function setRange(nextDay, nextView) {
  day = nextDay;
  view = nextView;
  status = "loading";
  events = [];
  render();
  void refresh();
}

retry.addEventListener("click", () => void refresh());
document.querySelector("#today").addEventListener("click", () => setRange(today(), view));
for (const [selector, direction] of [["#previous", -1], ["#next", 1]]) {
  document.querySelector(selector).addEventListener("click", () => {
    setRange(view === "month" ? addMonths(day, direction) : addDays(day, 7 * direction), view);
  });
}
for (const button of viewButtons) {
  button.addEventListener("click", () => {
    if (view !== button.dataset.view) setRange(day, button.dataset.view);
  });
}

document.addEventListener("visibilitychange", () => {
  if (canRefresh()) void refresh();
  else stopRefresh();
});

if (embedded) {
  window.addEventListener("message", (event) => {
    if (event.origin !== parentOrigin || event.source !== window.parent) return;
    const data = event.data;
    if (data?.type !== "spaceos:init" || data.version !== 1 ||
        typeof data.instanceId !== "string" || !data.instanceId ||
        (instanceId && data.instanceId !== instanceId) ||
        !["light", "dark"].includes(data.theme) ||
        !["vi", "en"].includes(data.locale) ||
        typeof data.reducedMotion !== "boolean" || typeof data.visible !== "boolean") return;

    instanceId = data.instanceId;
    document.documentElement.dataset.presentation = "embedded";
    document.documentElement.dataset.theme = data.theme;
    document.documentElement.dataset.reducedMotion = String(data.reducedMotion);
    const changedLocale = locale !== data.locale;
    locale = data.locale;
    if (changedLocale) render();
    if (visible !== data.visible) {
      visible = data.visible;
      if (canRefresh()) void refresh();
      else stopRefresh();
    }
  });
  window.parent.postMessage({ type: "spaceos:ready", version: 1 }, parentOrigin);
}

render();
void refresh();
