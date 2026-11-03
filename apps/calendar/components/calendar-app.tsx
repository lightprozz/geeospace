"use client";
import { useRef, useState } from "react";
import { useStore } from "zustand";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@geeo/embedded-app/ui/button";
import { useSpaceOS } from "@geeo/embedded-app/bridge";
import { useSource } from "@geeo/embedded-app/use-source";
import { addDays, addMonths, dateRange, dayBounds, formatDay, formatTime, parseEvents, today } from "../lib/dates.mjs";
import { createCalendarStore, type CalendarView } from "../lib/calendar-store";
import { translations } from "../lib/copy";

type CalendarEvent = { id: string; title: string; from: number; to: number; allDay: boolean; location?: string; campusId?: string; campusName?: string };
const decode = (data: unknown) => parseEvents(data) as CalendarEvent[];
export function CalendarApp({ initialDay }: { initialDay: string }) {
  const [store] = useState(() => createCalendarStore(initialDay));
  const state = useStore(store);
  const { locale, visible } = useSpaceOS();
  const text = translations[locale];
  const agenda = useRef<HTMLButtonElement>(null);
  const { from, to } = dateRange(state.day, state.view);
  const source = useSource({ url: `/api/events?${new URLSearchParams({ from, to })}`, visible, decode, unconfiguredCode: "CALENDAR_NOT_CONFIGURED" });
  const events = (source.data ?? []).filter(event => event.from < dayBounds(to).from && event.to > dayBounds(from).from);
  const status = source.status === "ready" && !events.length ? "empty" : source.status;
  const statusText = status === "ready" ? null : text[status];
  const campuses = new Map(events.filter(event => event.campusId && event.campusName).map(event => [event.campusId!, event.campusName!]));
  const activeCampus = state.campus;
  const days: string[] = [];
  for (let day = from; day < to; day = addDays(day, 1)) days.push(day);
  const rangeTitle = state.view === "month" ? formatDay(state.day, locale, { month: "long", year: "numeric" }) :
    new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).formatRange(new Date(from), new Date(addDays(to, -1)));
  function shift(direction: number) { state.set({ day: state.view === "month" ? addMonths(state.day, direction) : addDays(state.day, direction * 7) }); }
  const currentDay = today();
  return <main className="space-app">
    <header className="app-header space-app-identity"><span className="app-icon"><CalendarDays size={24} aria-hidden="true" /></span><div><h1>GeeO Calendar</h1><p id="subtitle">{text.subtitle}</p></div></header>
    <section aria-labelledby="range-title">
      <div className="toolbar space-toolbar">
        <div className="date-controls" role="group" aria-label={text.navigation}><Button onClick={() => state.set({ day: today() })}>{text.today}</Button><Button className="arrow" size="icon" aria-label={text.previous} onClick={() => shift(-1)}><ChevronLeft size={16} /></Button><Button className="arrow" size="icon" aria-label={text.next} onClick={() => shift(1)}><ChevronRight size={16} /></Button></div>
        <div className="range-context"><h2 id="range-title" aria-live="polite">{rangeTitle}</h2><span className="timezone" title="Asia/Ho_Chi_Minh">GMT+7</span></div>
        <div className="toolbar-options"><div className="view-controls" role="group" aria-label={text.views}>{(["week", "month", "agenda"] as CalendarView[]).map(view => <Button ref={view === "agenda" ? agenda : undefined} key={view} variant="ghost" data-view={view} aria-pressed={state.view === view} onClick={() => state.set({ view })}>{text[view]}</Button>)}</div>
          {(campuses.size > 0 || activeCampus) && <label className="campus-filter"><span>{text.campus}</span><select aria-label={text.campus} value={activeCampus} onChange={event => state.set({ campus: event.target.value })}><option value="">{text.allCampuses}</option>{activeCampus && !campuses.has(activeCampus) && <option value={activeCampus}>{locale === "vi" ? "Chi nhánh đã chọn (không có sự kiện)" : "Selected branch (no events)"}</option>}{[...campuses].sort((a, b) => a[1].localeCompare(b[1], locale)).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>}
        </div>
      </div>
      {statusText && <div className="source-state"><div role="status"><strong>{statusText[0]}</strong><p id="state-detail">{statusText[1]}</p></div>{["error", "unauthorized", "forbidden"].includes(status) && <Button onClick={source.refresh}>{text.retry}</Button>}</div>}
      <div className="calendar" data-view={state.view} aria-busy={source.status === "loading"}>
        {state.view === "month" && days.slice(0, 7).map(day => <div className="weekday" key={`weekday-${day}`} aria-hidden="true">{formatDay(day, locale, { weekday: "short" })}</div>)}
        {days.map(day => {
          const bounds = dayBounds(day), compact = state.view === "month";
          const entries = events.filter(event => event.from < bounds.to && event.to > bounds.from && (!activeCampus || event.campusId === activeCampus));
          const dateLabel = formatDay(day, locale, { dateStyle: "full" });
          return <div className="day" key={day} data-today={day === currentDay || undefined} data-outside={compact && day.slice(0, 7) !== state.day.slice(0, 7) || undefined}>
            {compact ? <><Button variant="ghost" className="month-day" data-date={day} aria-label={entries.length ? `${dateLabel} · ${entries.length} ${locale === "vi" ? "sự kiện" : "events"}` : dateLabel} aria-current={day === currentDay ? "date" : undefined} onClick={() => { state.set({ day, view: "agenda" }); requestAnimationFrame(() => agenda.current?.focus()); }}>{Number(day.slice(8))}</Button>{entries.length > 0 && <span className="day-count" aria-hidden="true">{entries.length}</span>}</> : <><h3 className="day-label" aria-label={dateLabel} aria-current={day === currentDay ? "date" : undefined}><span className="day-weekday">{formatDay(day, locale, { weekday: "short" })}</span><span className="day-number">{formatDay(day, locale, state.view === "week" ? { day: "numeric" } : { day: "numeric", month: "short" })}</span></h3>{!entries.length && source.status === "ready" && <p className="day-empty">{text.noEvents}</p>}</>}
            {!!entries.length && <ul className="events">{entries.map(event => <li className="event" key={event.id}><span className="event-time">{event.allDay ? text.allDay : compact ? event.from < bounds.from ? "…" : formatTime(event.from, locale) : `${event.from < bounds.from ? "…" : formatTime(event.from, locale)} – ${event.to >= bounds.to ? "…" : formatTime(event.to, locale)}`}</span><strong className="event-title">{event.title}</strong>{event.location && !compact && <span className="event-location">{event.location}</span>}</li>)}</ul>}
          </div>;
        })}
      </div>
    </section>
  </main>;
}
