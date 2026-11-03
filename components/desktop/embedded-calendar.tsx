"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { useSpace } from "./space-context";

const subscribe = () => () => {};
const browserOrigin = () => window.location.origin;
const serverOrigin = () => "";

function calendarOrigin() {
  try {
    const value = process.env.NEXT_PUBLIC_SPACEOS_CALENDAR_ORIGIN;
    const url = new URL(value ?? "");
    const loopback = url.protocol === "http:" && ["127.0.0.1", "localhost"].includes(url.hostname);
    if (value === url.origin && (url.protocol === "https:" || loopback)) return url.origin;
  } catch { /* An unconfigured integration stays closed. */ }
}

export function EmbeddedCalendar({ dark, motion, visible }: { dark: boolean; motion: boolean; visible: boolean }) {
  const { locale, t } = useSpace();
  const hostOrigin = useSyncExternalStore(subscribe, browserOrigin, serverOrigin);
  const origin = calendarOrigin();
  const frame = useRef<HTMLIFrameElement>(null);
  const instanceId = useId();
  const [state, setState] = useState<"loading" | "ready" | "unavailable">("loading");
  const [attempt, setAttempt] = useState(0);
  const enabled = Boolean(origin && hostOrigin && origin !== hostOrigin);

  useEffect(() => {
    if (!enabled || !origin) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => frame.current?.contentWindow?.postMessage({
      type: "spaceos:init", version: 1, instanceId,
      theme: dark ? "dark" : "light", locale,
      reducedMotion: !motion || media.matches,
      visible: visible && document.visibilityState === "visible",
    }, origin);
    const receive = (event: MessageEvent) => {
      if (event.origin !== origin || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type !== "spaceos:ready" || event.data.version !== 1) return;
      setState("ready");
      sync();
    };
    const element = frame.current;
    window.addEventListener("message", receive);
    document.addEventListener("visibilitychange", sync);
    media.addEventListener("change", sync);
    element?.addEventListener("load", sync);
    sync();
    return () => {
      window.removeEventListener("message", receive);
      document.removeEventListener("visibilitychange", sync);
      media.removeEventListener("change", sync);
      element?.removeEventListener("load", sync);
    };
  }, [attempt, dark, enabled, instanceId, locale, motion, origin, visible]);

  useEffect(() => {
    if (!enabled || state !== "loading") return;
    const timeout = window.setTimeout(() => setState("unavailable"), 8000);
    return () => window.clearTimeout(timeout);
  }, [attempt, enabled, state]);

  if (!enabled) return <div className="os-panel"><h1>{t("Lịch làm việc", "Work calendar")}</h1><p>{t("Calendar chưa được kết nối với SpaceOS.", "Calendar is not connected to SpaceOS.")}</p></div>;

  return <div className="os-calendar-embed">
    {state === "loading" && <p role="status">{t("Đang kết nối Calendar…", "Connecting to Calendar…")}</p>}
    {state === "unavailable" && <p role="status">{t("Calendar chưa phản hồi.", "Calendar did not respond.")}{" "}
      <button type="button" onClick={() => { setState("loading"); setAttempt(n => n + 1); }}>{t("Thử lại", "Retry")}</button>{" "}
      <a href={origin} target="_blank" rel="noopener noreferrer">{t("Mở Calendar trong tab mới", "Open Calendar in a new tab")}</a>
    </p>}
    <iframe key={attempt} ref={frame} title={t("Lịch làm việc GeeO", "GeeO work calendar")} src={origin}
      sandbox="allow-scripts allow-same-origin" referrerPolicy="no-referrer" hidden={state !== "ready"} />
  </div>;
}
