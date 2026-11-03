"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowUpRight, Bell, X } from "lucide-react";
import { disconnectedStatus, parseAppStatus, statusLifetime, type AppStatus } from "@/lib/desktop/app-status";
import type { DesktopAppId } from "@/lib/desktop/apps";
import { useSpace } from "./space-context";
import { useNotificationsOrigin } from "./use-notifications-origin";

const preferenceKey = "geeospace.status.compact-info.v1";

// The OS owns chrome and transport lifetime; an app contributes only a validated
// summary. Add other apps through an explicit registration, never arbitrary URLs.
export function AppStatusTray({ dark, motion, onOpen }: { dark: boolean; motion: boolean; onOpen: (id: DesktopAppId) => void }) {
  const { t, locale } = useSpace();
  const origin = useNotificationsOrigin();
  const id = useId(), instanceId = `${id}-status`;
  const frame = useRef<HTMLIFrameElement>(null), panel = useRef<HTMLDivElement>(null), closeButton = useRef<HTMLButtonElement>(null);
  const [receivedSummary, setSummary] = useState<AppStatus | null>(null);
  const summary = receivedSummary ?? (origin ? { ...disconnectedStatus, status: "loading" as const } : disconnectedStatus);
  const [compactInfo, setCompactInfo] = useState(false), [storageError, setStorageError] = useState(false), [expanded, setExpanded] = useState(false);
  const sequence = useRef(0), received = useRef(0);
  useEffect(() => {
    try { if (localStorage.getItem(preferenceKey) === "true") queueMicrotask(() => setCompactInfo(true)); } catch { /* Optional UI preference. */ }
  }, []);
  useEffect(() => {
    if (!origin || origin === window.location.origin) return;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => frame.current?.contentWindow?.postMessage({ type: "spaceos:init", version: 1, instanceId,
      theme: dark ? "dark" : "light", locale, reducedMotion: !motion || media.matches,
      visible: document.visibilityState === "visible" }, origin);
    const receive = (event: MessageEvent) => {
      if (event.origin !== origin || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type === "spaceos:ready" && event.data.version === 1) { sequence.current = 0; sync(); return; }
      const next = parseAppStatus(event.data, instanceId, sequence.current, Date.now());
      if (!next) return;
      sequence.current = next.sequence; received.current = Date.now(); setSummary(next);
    };
    const expire = () => {
      if (Date.now() - received.current > statusLifetime) setSummary(previous => previous?.status === "stale" ? previous : { status: "stale", count: null, observedAt: null });
    };
    const visibility = () => { if (document.visibilityState === "visible") expire(); sync(); };
    const element = frame.current;
    window.addEventListener("message", receive); document.addEventListener("visibilitychange", visibility); media.addEventListener("change", sync);
    element?.addEventListener("load", sync); sync();
    const timeout = setTimeout(() => { if (!received.current) setSummary({ status: "error", count: null, observedAt: null }); }, 10_000);
    const heartbeat = setInterval(expire, 15_000);
    return () => { clearTimeout(timeout); clearInterval(heartbeat); window.removeEventListener("message", receive); document.removeEventListener("visibilitychange", visibility); media.removeEventListener("change", sync); element?.removeEventListener("load", sync); };
  }, [dark, instanceId, locale, motion, origin]);
  const descriptions = {
    ready: t(`${summary.count ?? ""} sự kiện`, `${summary.count ?? ""} events`),
    loading: t("Đang kết nối", "Connecting"), unconfigured: t("Chưa kết nối", "Not connected"),
    unauthorized: t("Cần đăng nhập", "Sign-in required"), forbidden: t("Chưa có quyền truy cập", "Access restricted"),
    error: t("Không tải được cập nhật", "Updates unavailable"), stale: t("Cần cập nhật lại", "Update needed"),
  };
  const description = descriptions[summary.status];
  return <div className="os-app-status-tray">
    {origin && <iframe ref={frame} src={`${origin}/status`} title={t("Kênh trạng thái thông báo", "Notification status channel")} sandbox="allow-scripts allow-same-origin" referrerPolicy="no-referrer" hidden />}
    <button className="os-app-status-trigger" popoverTarget={id} aria-expanded={expanded} aria-haspopup="dialog" aria-label={`${t("Xem nhanh thông báo", "Notification quick view")}: ${description}`} title={description}>
      <Bell size={17} />
      {summary.status === "ready" && summary.count !== null && summary.count > 0 && <span className="os-app-status-count" aria-hidden="true">{summary.count > 99 ? "99+" : summary.count}</span>}
      {compactInfo && <span className="os-app-status-mini" aria-hidden="true">{description}</span>}
    </button>
    <div ref={panel} id={id} popover="auto" role="dialog" aria-label={t("Xem nhanh thông báo", "Notification quick view")} className="os-app-status-popover" onToggle={event => {
      const open = event.newState === "open"; setExpanded(open); if (open) closeButton.current?.focus();
    }}>
      <div className="os-app-status-heading"><strong>{t("Thông báo", "Notifications")}</strong><button ref={closeButton} popoverTarget={id} popoverTargetAction="hide" aria-label={t("Đóng xem nhanh", "Close quick view")}><X size={17} /></button></div>
      <p className="os-app-status-summary" role="status">{description}</p>
      <p>{summary.status === "ready" ? t("Sự kiện từ Lịch & giảng dạy. Đây không phải số thông báo chưa đọc.", "Events from Calendar & teaching. This is not an unread count.") : t("Số sự kiện chưa xác định. Mở app để xem trạng thái nguồn và thử lại.", "The event count is unknown. Open the app to check the source and retry.")}</p>
      {summary.observedAt && <p><time dateTime={summary.observedAt}>{t("Đã kiểm tra lúc ", "Checked at ")}{new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-GB", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" }).format(new Date(summary.observedAt))}</time></p>}
      <p>{t("Kiểm tra mỗi phút khi SpaceOS đang hiển thị.", "Checked every minute while SpaceOS is visible.")}</p>
      <label className="os-app-status-preference"><input type="checkbox" checked={compactInfo} onChange={event => {
        setCompactInfo(event.target.checked);
        try { localStorage.setItem(preferenceKey, String(event.target.checked)); setStorageError(false); } catch { setStorageError(true); }
      }} />{t("Hiện thông tin ngắn trên thanh đầu", "Show compact information in the toolbar")}</label>
      {storageError && <p role="status">{t("Tùy chọn chỉ được giữ trong phiên này.", "This preference will only last for this session.")}</p>}
      <button className="os-app-status-open" onClick={() => { panel.current?.hidePopover(); onOpen("notifications"); }}>{t("Mở Thông báo", "Open Notifications")}<ArrowUpRight size={16} /></button>
    </div>
  </div>;
}
