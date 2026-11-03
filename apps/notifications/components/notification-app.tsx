"use client";
import { useEffect, useRef, useState } from "react";
import { useStore } from "zustand";
import { Bell, CalendarDays, ChevronRight, RefreshCw, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@geeo/embedded-app/ui/button";
import { Input } from "@geeo/embedded-app/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@geeo/embedded-app/ui/dialog";
import { useSpaceOS } from "@geeo/embedded-app/bridge";
import { useSource } from "@geeo/embedded-app/use-source";
import { createNotificationStore } from "../lib/notification-store";
import { filterEvents, parseSnapshot } from "../lib/notification-model.mjs";
import { copy } from "../lib/copy";
import type { CalendarNotice, NotificationSnapshot } from "../lib/notification-types";

const preferenceKey = "geeo.notifications.display.v1";
function decode(data: unknown): NotificationSnapshot {
  const events = parseSnapshot(data) as CalendarNotice[];
  return { events, observedAt: (data as NotificationSnapshot).observedAt };
}
export function NotificationApp() {
  const [store] = useState(createNotificationStore);
  const state = useStore(store);
  const { locale, visible, setLocale } = useSpaceOS();
  const text = copy[locale];
  const [preferenceError, setPreferenceError] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const lastTrigger = useRef<HTMLButtonElement | null>(null);
  const source = useSource({ url: "/api/notifications", visible: visible && !state.preferences, automatic: state.automatic, decode, unconfiguredCode: "NOTIFICATIONS_NOT_CONFIGURED" });
  const events = source.data?.events ?? [];
  const filtered = filterEvents(events, state) as CalendarNotice[];
  const detail = events.find(event => event.id === detailId);
  const status = source.status === "ready" ? !events.length ? "empty" : !filtered.length ? "noResults" : null : source.status;
  const subjects = [...new Set(events.map(event => event.subject))];
  const groups = state.group ? [...new Set(filtered.map(event => event.subject))] : [null];
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(preferenceKey) ?? "null");
      store.setState({ ...(typeof saved?.group === "boolean" && { group: saved.group }), ...(typeof saved?.automatic === "boolean" && { automatic: saved.automatic }) });
    } catch { /* UI remains usable when persistence is unavailable. */ }
  }, [store]);
  useEffect(() => { document.title = `${text.identity} · GeeO`; }, [text.identity]);
  function changePreference(key: "group" | "automatic", value: boolean) {
    state.set({ [key]: value });
    const { group, automatic } = store.getState();
    try { localStorage.setItem(preferenceKey, JSON.stringify({ group, automatic })); setPreferenceError(false); } catch { setPreferenceError(true); }
  }
  function date(value: string, options: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" }) {
    return new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-GB", { timeZone: "Asia/Ho_Chi_Minh", ...options }).format(new Date(value));
  }
  return <main className="space-app">
    <header className="identity space-app-identity"><Bell className="context-icon" aria-hidden="true" /><div><h1>{text.identity}</h1><p>{text.subtitle}</p></div><Button className="language" aria-label={locale === "vi" ? "Switch to English" : "Chuyển sang tiếng Việt"} onClick={() => setLocale(locale === "vi" ? "en" : "vi")}>{locale === "vi" ? "EN" : "VI"}</Button></header>
    <div className="notification-layout">
      <aside className="sidebar" aria-label={text.sources}>
        <label className="search-box"><Search className="icon" aria-hidden="true" /><Input type="search" value={state.query} onChange={event => state.set({ query: event.target.value })} placeholder={text.search} aria-label={text.search} /></label>
        <div className="source-heading">{text.sources}</div>
        <nav id="sources" aria-label={text.sourceFilter}>{(["all", "calendar"] as const).map(id => <Button key={id} variant="ghost" aria-pressed={!state.preferences && state.subject === null && state.source === id} onClick={() => state.set({ source: id, subject: null, preferences: false })}>
          {id === "all" ? <Bell className="icon" aria-hidden="true" /> : <CalendarDays className="icon" aria-hidden="true" />}<span>{id === "all" ? text.allUpdates : text.calendar}</span>{source.status === "ready" && <span className="count">{events.length}</span>}
        </Button>)}</nav>
        {!!subjects.length && <div id="subjects-section"><div className="source-heading">{text.subjects}</div><nav id="subjects" aria-label={text.subjectFilter}>{subjects.map(subject => <Button key={subject} variant="ghost" aria-pressed={!state.preferences && state.subject === subject} onClick={() => state.set({ subject, source: "calendar", preferences: false })}><span>{subject || text.unknownSubject}</span><span className="count">{events.filter(event => event.subject === subject).length}</span></Button>)}</nav></div>}
        <div className="sidebar-footer"><Button variant="ghost" aria-pressed={state.preferences} onClick={() => state.set({ preferences: !state.preferences })}><SlidersHorizontal className="icon" aria-hidden="true" /><span>{text.preferences}</span></Button><span className="source-note">{text.privacy}</span></div>
      </aside>
      <section className="content" aria-labelledby="context-title">
        <div className="content-heading"><div className="heading-title"><span className="context-icon"><Bell className="icon" aria-hidden="true" /></span><div><span className="eyebrow">{text.workspace}</span><h2 id="context-title">{state.preferences ? text.preferences : state.subject !== null ? state.subject || text.unknownSubject : state.source === "all" ? text.allUpdates : text.calendar}</h2></div></div>{!state.preferences && <Button variant="ghost" size="icon" aria-label={text.refresh} title={text.refresh} disabled={source.status === "loading"} onClick={source.refresh}><RefreshCw className="icon" aria-hidden="true" /></Button>}</div>
        {state.preferences ? <section aria-labelledby="preferences-title"><h3 id="preferences-title">{text.preferences}</h3><p>{text.deviceOnly}</p>{(["group", "automatic"] as const).map(key => <label className="preference-row" key={key}><span><strong>{text[key]}</strong><small>{key === "group" ? text.groupDetail : text.automaticDetail}</small></span><input type="checkbox" checked={state[key]} onChange={event => changePreference(key, event.target.checked)} /></label>)}<p role="status">{preferenceError ? text.preferenceError : ""}</p><p className="preferences-note">{text.toolbarNote}</p></section> : <div>
          <div className="periods" role="group" aria-label={text.periods}>{(["all", "upcoming", "past"] as const).map(period => <Button variant="ghost" key={period} aria-pressed={state.period === period} onClick={() => state.set({ period })}>{text[period]}</Button>)}</div>
          <div className="feed-meta"><span>{source.status === "ready" && `${filtered.length} ${text.items}`}</span><span>{source.data && `${text.snapshot} ${date(source.data.observedAt, { hour: "2-digit", minute: "2-digit" })}`}</span></div>
          {status && <div className="source-state" role="status"><span className="state-icon"><Bell className="icon" aria-hidden="true" /></span><h3>{text[status][0]}</h3><p>{text[status][1]}</p>{["error", "unauthorized", "forbidden", "unconfigured"].includes(status) && <Button onClick={source.refresh}>{text.retry}</Button>}{status === "noResults" && <Button onClick={() => state.set({ query: "", subject: null, period: "all" })}>{text.clear}</Button>}</div>}
          {!status && <div>{groups.map(subject => <section className="event-group" key={subject ?? "all"}>{state.group && <h3>{subject || text.unknownSubject}<span className="count">{filtered.filter(event => event.subject === subject).length}</span></h3>}<ul className="event-list">{filtered.filter(event => subject === null || event.subject === subject).map(event => <li key={event.id}><Button className="event-card" onClick={click => { lastTrigger.current = click.currentTarget; setDetailId(event.id); }}><CalendarDays className="icon" aria-hidden="true" /><span><strong>{event.title}</strong><time dateTime={event.startTime}>{date(event.startTime)} · GMT+7</time></span><ChevronRight className="icon" aria-hidden="true" /></Button></li>)}</ul></section>)}</div>}
          <p className="source-explanation">{text.explanation}</p>
        </div>}
      </section>
    </div>
    <Dialog open={Boolean(detail)} onOpenChange={open => { if (!open) setDetailId(null); }}><DialogContent className="event-detail" closeLabel={text.close} onCloseAutoFocus={event => { event.preventDefault(); lastTrigger.current?.focus(); }}>
      <span className="eyebrow">{text.event}</span><DialogTitle>{detail?.title}</DialogTitle><dl><dt>{text.subject}</dt><dd>{detail?.subject || text.unknownSubject}</dd><dt>{text.eventTime}</dt><dd>{detail && `${date(detail.startTime)} · GMT+7`}</dd></dl><DialogDescription>{text.reason}</DialogDescription><p className="detail-note">{text.readNote}</p>
    </DialogContent></Dialog>
  </main>;
}
