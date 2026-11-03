"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useNotificationsOrigin } from "./use-notifications-origin";
import { useSpace } from "./space-context";

export function EmbeddedNotifications({ dark, motion, visible }: { dark: boolean; motion: boolean; visible: boolean }) {
  const { t, locale } = useSpace();
  const origin = useNotificationsOrigin();
  const frame = useRef<HTMLIFrameElement>(null);
  const instanceId = useId();
  const [state, setState] = useState<"loading" | "ready" | "unavailable">("loading");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!origin || origin === window.location.origin) return;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => frame.current?.contentWindow?.postMessage({
      type: "spaceos:init", version: 1, instanceId: `${instanceId}-${attempt}`,
      theme: dark ? "dark" : "light", locale, reducedMotion: !motion || media.matches,
      visible: visible && document.visibilityState === "visible",
    }, origin);
    const receive = (event: MessageEvent) => {
      if (event.origin !== origin || event.source !== frame.current?.contentWindow ||
          event.data?.type !== "spaceos:ready" || event.data.version !== 1) return;
      setState("ready"); sync();
    };
    window.addEventListener("message", receive);
    document.addEventListener("visibilitychange", sync); media.addEventListener("change", sync);
    const element = frame.current; element?.addEventListener("load", sync); sync();
    return () => { window.removeEventListener("message", receive); document.removeEventListener("visibilitychange", sync); media.removeEventListener("change", sync); element?.removeEventListener("load", sync); };
  }, [attempt, dark, instanceId, locale, motion, origin, visible]);
  useEffect(() => {
    if (!origin || state !== "loading") return;
    const timeout = setTimeout(() => setState("unavailable"), 8000);
    return () => clearTimeout(timeout);
  }, [attempt, origin, state]);
  if (!origin) return <div className="os-panel"><h2>{t("Kết nối để xem cập nhật", "Connect to see updates")}</h2><p>{t("App Thông báo chưa được kết nối với SpaceOS.", "The Notifications app is not connected to SpaceOS.")}</p></div>;
  return <div className="os-notifications-embed">
    {state !== "ready" && <div className="os-panel" role="status"><p>{state === "loading" ? t("Đang mở Thông báo…", "Opening Notifications…") : t("App Thông báo chưa phản hồi.", "The Notifications app did not respond.")}</p>
      {state === "unavailable" && <><button className="os-button os-button-secondary" onClick={() => { setState("loading"); setAttempt(value => value + 1); }}>{t("Thử lại", "Try again")}</button><a className="os-text-button" href={origin} target="_blank" rel="noopener noreferrer">{t("Mở app trong tab riêng", "Open app in a new tab")}</a></>}
    </div>}
    <iframe key={attempt} ref={frame} title={t("Thông báo GeeO", "GeeO Notifications")} src={origin} sandbox="allow-scripts allow-same-origin" referrerPolicy="no-referrer" hidden={state !== "ready"} />
  </div>;
}
