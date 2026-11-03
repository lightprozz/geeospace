"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { flushSync } from "react-dom";
import { exitOverlay, motion, motionDuration, prefersReducedMotion, rememberLaunch, rememberPress } from "@/lib/desktop/motion";
import { Search, X } from "lucide-react";
import { desktopApps, isDesktopApp, type DesktopAppId } from "@/lib/desktop/apps";
import { activeWindow, frameRect, initialDesktop, layoutKey, readLayout, windowReducer, type Area, type WindowMode } from "@/lib/desktop/window-store";
import { AppGlyph } from "./app-glyph";
import { AppPanel } from "./app-panel";
import { EmbeddedCalendar } from "./embedded-calendar";
import { EmbeddedNotifications } from "./embedded-notifications";
import { AppLauncher } from "./app-launcher";
import { AppearancePanel, defaultLook, lookKey, readLook, type Look } from "./appearance-panel";
import { DesktopWindow } from "./desktop-window";
import { DesktopMenubar } from "./desktop-menubar";
import { DesktopDock } from "./desktop-dock";
import { SpaceContext, useSpace } from "./space-context";
import { Companion } from "./companion";
import { VideoWallpaper } from "./video-wallpaper";
import { accents } from "@/lib/desktop/appearance";

const dockApps = desktopApps.filter((app) => app.id !== "appearance");
const viewport = () => `${window.innerWidth}|${window.innerHeight}|${window.matchMedia("(prefers-color-scheme: dark)").matches}|${/Mac|iPhone|iPad/.test(navigator.platform)}`;
function subscribeViewport(callback: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  window.addEventListener("resize", callback); media.addEventListener("change", callback);
  return () => { window.removeEventListener("resize", callback); media.removeEventListener("change", callback); };
}
const currentArea = (): Area => ({ width: window.innerWidth, height: Math.max(320, window.innerHeight - 132) });

export function DesktopWorkspace({ initialApp, initialTime, launch = false }: { initialApp?: DesktopAppId; initialTime: string; launch?: boolean }) {
  const screen = useSyncExternalStore(subscribeViewport, viewport, () => "1440|900|false");
  const [width, height, systemDark, isApple] = screen.split("|");
  const mobile = Number(width) < 768;
  const area = useMemo(() => ({ width: Number(width), height: Math.max(320, Number(height) - 132) }), [width, height]);
  const [state, dispatch] = useReducer(windowReducer, initialApp, (app) => initialDesktop(app));
  const [droppedFile, setDroppedFile] = useState<File>();
  const [ready, setReady] = useState(false);
  const [look, setLook] = useState(defaultLook);
  const { t, label } = useSpace(look.locale);
  const [clock, setClock] = useState(initialTime);
  const [overlay, setOverlay] = useState<"launcher" | "search" | "overview" | null>(launch ? "launcher" : null);
  const [snap, setSnap] = useState<WindowMode | null>(null);
  const [storageWarning, setStorageWarning] = useState("");
  const home = useRef<HTMLDivElement>(null);
  const themeTransition = useRef<{ skipTransition: () => void } | null>(null);
  const desktop = useRef<HTMLElement>(null);
  const brand = useRef<HTMLButtonElement>(null);
  const previousMobile = useRef<boolean | undefined>(undefined);
  const recentActivation = useRef<{ element: HTMLElement; time: number } | null>(null);
  const overlayTrigger = useRef<HTMLElement | null>(null);
  const previousFocusedApp = useRef<DesktopAppId | undefined>(undefined);
  const active = activeWindow(state);
  const hasActive = !!active;
  const dark = look.mode === "dark" || (look.mode === "system" && systemDark === "true");
  const isModal = overlay === "launcher" || overlay === "search";
  const openApp = useCallback((id: DesktopAppId) => {
    rememberLaunch(id);
    overlayTrigger.current = null;
    dispatch({ type: "open", id, area }); setOverlay(null);
    if (window.location.hash !== `#${id}`) {
      const method = mobile && active ? "replaceState" : "pushState";
      const internalSheet = mobile && active ? window.history.state?.geeospaceSheet === true : mobile;
      window.history[method]({ geeospaceSheet: internalSheet }, "", `/#${id}`);
    }
  }, [area, mobile, active]);
  const latestLook = useRef(look);
  useLayoutEffect(() => { latestLook.current = look; }, [look]);
  const changeLook = useCallback((next: Look | ((value: Look) => Look)) => {
    const previous = latestLook.current;
    const value = typeof next === "function" ? next(previous) : next;
    latestLook.current = value;
    const visualChange = previous.mode !== value.mode || previous.wallpaper !== value.wallpaper || previous.material !== value.material || previous.glass !== value.glass;
    themeTransition.current?.skipTransition();
    if (!visualChange || !value.motion || !document.startViewTransition || prefersReducedMotion() || document.visibilityState !== "visible") { setLook(value); return; }
    const transition = document.startViewTransition(() => { flushSync(() => setLook(value)); });
    transition.ready.catch(() => {});
    transition.finished.catch(() => {});
    themeTransition.current = transition;
  }, []);
  const goHome = useCallback(() => {
    for (const app of desktopApps) dispatch({ type: "close", id: app.id });
    if (window.history.state?.geeospaceSheet) window.history.back();
    else window.history.replaceState(null, "", "/");
    setOverlay(null);
  }, []);
  const minimizeApp = useCallback((id: DesktopAppId) => {
    if (mobile) goHome();
    else dispatch({ type: "minimize", id });
  }, [mobile, goHome]);
  const closeApp = useCallback((id: DesktopAppId) => {
    if (mobile) { goHome(); return; }
    dispatch({ type: "close", id });
    const next = activeWindow(windowReducer(state, { type: "close", id }));
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${next ? `#${next}` : ""}`);
  }, [mobile, goHome, state]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const bounds = currentArea();
      const phone = window.innerWidth < 768;
      const hash = window.location.hash.slice(1);
      const requested = isDesktopApp(hash) ? hash : initialApp;
      let restored = initialDesktop(undefined, bounds);
      try { restored = readLayout(localStorage.getItem(layoutKey), bounds) ?? restored; setLook(readLook(localStorage.getItem(lookKey))); }
      catch { setStorageWarning("restore"); }
      if (phone) restored = { windows: Object.fromEntries(Object.entries(restored.windows).map(([id, win]) => [id, { ...win, open: false }])) };
      if (requested) restored = windowReducer(restored, { type: "open", id: requested, area: bounds });
      dispatch({ type: "restore", state: restored }); setReady(true);
    });
    const timer = window.setInterval(() => setClock(new Date().toISOString()), 30000);
    return () => { cancelAnimationFrame(frame); clearInterval(timer); };
  }, [initialApp]);
  useEffect(() => {
    if (!ready) return;
    const save = () => {
      try { if (!mobile) localStorage.setItem(layoutKey, JSON.stringify(state)); localStorage.setItem(lookKey, JSON.stringify(look)); }
      catch { setStorageWarning("save"); }
    };
    const timer = window.setTimeout(save, 250);
    window.addEventListener("pagehide", save);
    return () => { clearTimeout(timer); window.removeEventListener("pagehide", save); };
  }, [state, look, ready, mobile]);
  useEffect(() => {
    if (!ready) return;
    const returningToDesktop = previousMobile.current === true && !mobile;
    previousMobile.current = mobile;
    const frame = requestAnimationFrame(() => {
      if (mobile) setOverlay(value => value === "overview" ? null : value);
      if (returningToDesktop) {
        let restored = initialDesktop(initialApp, area);
        try { restored = readLayout(localStorage.getItem(layoutKey), area) ?? restored; } catch { /* UI storage is optional. */ }
        const hash = window.location.hash.slice(1);
        if (isDesktopApp(hash)) restored = windowReducer(restored, { type: "open", id: hash, area });
        dispatch({ type: "restore", state: restored });
      } else if (!mobile) dispatch({ type: "resize-area", area });
    });
    return () => cancelAnimationFrame(frame);
  }, [area, ready, mobile, initialApp]);
  useEffect(() => {
    if (!ready || mobile) return;
    const url = active ? `/#${active}` : "/";
    if (`${window.location.pathname}${window.location.hash}` !== url) window.history.replaceState({ geeospaceSheet: false }, "", url);
  }, [active, ready, mobile]);
  useEffect(() => {
    const changed = () => {
      const hash = window.location.hash.slice(1);
      if (isDesktopApp(hash)) { dispatch({ type: "open", id: hash, area }); setOverlay(null); }
      else if (!hash && mobile) { for (const app of desktopApps) dispatch({ type: "close", id: app.id }); }
    };
    window.addEventListener("hashchange", changed);
    return () => window.removeEventListener("hashchange", changed);
  }, [area, mobile]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      const typing = event.target instanceof HTMLElement && (event.target.matches("input,textarea,select") || event.target.isContentEditable);
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); if (overlay === "search") exitOverlay(document.querySelector<HTMLElement>("[data-app-overlay]"), () => setOverlay(null)); else setOverlay("search"); return; }
      if (event.key === "Escape") {
        if (overlay) { setOverlay(null); desktop.current?.focus(); }
        else if (!typing && active && event.target instanceof HTMLElement && event.target.closest(".os-window")) { event.preventDefault(); closeApp(active); }
        return;
      }
      if (typing || overlay || !event.altKey || event.ctrlKey || event.metaKey) return;
      const id = dockApps[Number(event.key) - 1]?.id;
      if (/^[1-9]$/.test(event.key) && id) { event.preventDefault(); openApp(id); }
      else if (event.key.toLowerCase() === "o") { event.preventDefault(); setOverlay(mobile ? "launcher" : "overview"); }
      else if (event.key.toLowerCase() === "t") { event.preventDefault(); changeLook((value) => ({ ...value, mode: dark ? "light" : "dark" })); }
      else if (event.key.toLowerCase() === "m" && active) { event.preventDefault(); minimizeApp(active); }
      else if (event.key.toLowerCase() === "w" && active) { event.preventDefault(); closeApp(active); }
      else if (["ArrowLeft", "ArrowRight", "ArrowUp"].includes(event.key) && active) { event.preventDefault(); dispatch({ type: "place", id: active, rect: state.windows[active]!.rect, mode: state.windows[active]!.mode === (event.key === "ArrowLeft" ? "left" : event.key === "ArrowRight" ? "right" : "maximized") ? "normal" : event.key === "ArrowLeft" ? "left" : event.key === "ArrowRight" ? "right" : "maximized", area }); }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [active, area, closeApp, dark, openApp, overlay, state.windows, mobile, minimizeApp, changeLook]);
  useEffect(() => {
    if (overlay) {
      const activation = recentActivation.current;
      overlayTrigger.current = activation && performance.now() - activation.time < 150 && activation.element.isConnected ? activation.element : document.activeElement as HTMLElement;
      return;
    }
    if (!ready) return;
    const frame = requestAnimationFrame(() => {
      const previous = previousFocusedApp.current;
      previousFocusedApp.current = active;
      const trigger = overlayTrigger.current; overlayTrigger.current = null;
      if (previous === active && trigger?.isConnected && !trigger.closest("[inert]")) { trigger.focus({ preventScroll: true }); return; }
      const element = active ? desktop.current?.querySelector<HTMLElement>(`[data-app="${active}"]`) : null;
      if (element && !element.contains(document.activeElement)) element.focus({ preventScroll: true });
      else if (!active && previous) brand.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [active, overlay, ready]);
  useEffect(() => {
    if (overlay !== "overview") return;
    const frame = requestAnimationFrame(() => desktop.current?.querySelector<HTMLElement>("[data-overview-pick]")?.focus());
    return () => cancelAnimationFrame(frame);
  }, [overlay]);

  useLayoutEffect(() => {
    const el = home.current;
    if (!el || !mobile || prefersReducedMotion() || !el.animate) return;
    const animation = el.animate(hasActive ? [{ transform: "none", opacity: 1 }, { transform: "scale(.96)", opacity: .55 }] : [{ transform: "scale(.96)", opacity: .55 }, { transform: "none", opacity: 1 }], { duration: motionDuration("layout", el), easing: motion.out });
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const stop = () => { if (media.matches) animation.cancel(); };
    media.addEventListener("change", stop);
    return () => { media.removeEventListener("change", stop); animation.cancel(); };
  }, [mobile, hasActive, look.motion]);
  useEffect(() => () => themeTransition.current?.skipTransition(), []);

  const opened = desktopApps.filter((app) => state.windows[app.id]?.open);
  const overviewStyle = (id: DesktopAppId): CSSProperties | undefined => {
    if (overlay !== "overview") return;
    const index = opened.findIndex((app) => app.id === id);
    const columns = Math.max(1, Math.ceil(Math.sqrt(opened.length * area.width / area.height)));
    const rows = Math.ceil(opened.length / columns);
    const headerHeight = 112;
    const cellWidth = area.width / columns, cellHeight = Math.max(1, area.height - headerHeight - 40) / Math.max(1, rows);
    const rect = frameRect(state.windows[id]!, area);
    const scale = Math.min((cellWidth - 48) / rect.width, (cellHeight - 50) / rect.height, 0.9);
    return { left: cellWidth * (index % columns) + (cellWidth - rect.width * scale) / 2, top: headerHeight + Math.floor(index / columns) * cellHeight, transform: `scale(${scale})`, transformOrigin: "top left" };
  };
  const dismissOverlay = () => { setOverlay(null); brand.current?.focus(); };
  const style = { "--os-accent": accents[look.accent], "--os-media-dim": look.dim / 100, ...(look.wallpaper === "image" && look.image ? { "--os-custom-wallpaper": `url("${look.image}")` } : {}) } as CSSProperties;
  return <SpaceContext value={look.locale}><div className="geeospace-os" data-theme={dark ? "dark" : "light"} data-wallpaper={look.wallpaper} data-glass={look.glass} data-ready={ready} data-has-sheet={!!active} data-overview={overlay === "overview"} data-material={!look.glass ? "opaque" : look.material === "auto" ? "frost" : look.material} data-motion={look.motion ? "full" : "reduce"} lang={look.locale} style={style} onClickCapture={event => {
      rememberPress(event.target);
      const button = event.target instanceof Element ? event.target.closest<HTMLElement>("button") : null;
      if (button) recentActivation.current = { element: button, time: performance.now() };
    }} onDragOver={e => { if (e.dataTransfer.types.includes("Files")) e.preventDefault(); }} onDrop={e => { if (e.target instanceof Element && e.target.closest(".os-appearance")) return; if (e.dataTransfer.files.length) { e.preventDefault(); openApp("appearance"); setDroppedFile(e.dataTransfer.files[0]); } }}>
    <a href="#os-screen" className="os-skip">{t("Đến nội dung chính", "Skip to main content")}</a><div className="os-wallpaper" aria-hidden="true">{look.wallpaper === "video" && ready && <VideoWallpaper revision={look.mediaRevision} moving={look.motion} onError={() => { setLook(v => ({ ...v, wallpaper: "geeo" })); setStorageWarning("video"); }} />}<span>geeospace</span></div>
    <DesktopMenubar brand={brand} active={active} inert={isModal || overlay === "overview"} mobile={mobile} dark={dark} apple={isApple === "true"} clock={clock} look={look} onLook={changeLook} onOpen={openApp} onLauncher={() => setOverlay("launcher")} onSearch={() => setOverlay("search")} onOverview={() => setOverlay(mobile ? "launcher" : "overview")} onDesktop={() => { if (mobile) goHome(); else for (const app of opened) dispatch({ type: "minimize", id: app.id }); }} onArrange={() => dispatch({ type: "arrange", area })} onCloseAll={() => { if (mobile) goHome(); else dispatch({ type: "close-all" }); }} />
    <div ref={home} className="os-mobile-home" inert={isModal || !!active}><button className="os-home-profile" onClick={() => openApp("today")}><span className="os-profile-mark">g.</span><span><strong>Geeospace</strong><small>{t("Không gian giáo viên & nhân viên", "A space for teachers & staff")}</small></span></button><nav className="os-home-grid" aria-label={t("Ứng dụng trên điện thoại", "Mobile apps")}>{desktopApps.map((app) => <button key={app.id} onClick={() => openApp(app.id)}><AppGlyph id={app.id} /><span>{label(app.id)}</span></button>)}</nav><button className="os-home-widget" onClick={() => openApp("today")}><span>{t("HÔM NAY", "TODAY")} <span>{t("Chi tiết →", "Details →")}</span></span><strong>{t("Ngày làm việc của bạn", "Your work day")}</strong><p>{t("Chưa kết nối Gee-O. Lịch và việc cần làm xuất hiện sau khi xác thực.", "Gee-O is not connected. Your schedule and tasks appear after sign-in.")}</p></button><p className="os-home-footer">{t("Một tài khoản Gee-O · Asia/Ho_Chi_Minh", "One Gee-O account · Asia/Ho_Chi_Minh")}</p><button className="os-askbar" onClick={() => openApp("assistant")}><span><Search size={17} />{t("Bạn cần tìm điều gì?", "What are you looking for?")}</span><strong>{t("Hỏi trợ lý ", "Ask assistant ")}<span>↗</span></strong></button></div>
    <main ref={desktop} id="os-screen" className="os-screen" tabIndex={-1} role={overlay === "overview" ? "dialog" : undefined} aria-modal={overlay === "overview" ? true : undefined} aria-label={overlay === "overview" ? t("Tất cả cửa sổ", "All windows") : t("Màn hình làm việc Geeospace", "Geeospace desktop")} inert={isModal} onKeyDown={(event) => {
      if (overlay !== "overview") return;
      const buttons = Array.from(desktop.current!.querySelectorAll<HTMLButtonElement>("[data-overview-pick], .os-overview-close"));
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      if (["Tab", "ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(event.key)) { event.preventDefault(); const backwards = event.shiftKey || ["ArrowLeft", "ArrowUp"].includes(event.key); buttons[(index + (backwards ? -1 : 1) + buttons.length) % buttons.length]?.focus(); }
    }}>
      {overlay === "overview" && <><div className="os-overview-backdrop" onClick={dismissOverlay} /><div className="os-overview-heading"><div><h1>{t("Tất cả cửa sổ", "All windows")}</h1><p>{t("Chọn một cửa sổ để tiếp tục · Esc để trở về", "Choose a window to continue · Esc to return")}</p></div><button className="os-overview-close" aria-label={t("Đóng tổng quan cửa sổ", "Close window overview")} onClick={dismissOverlay}><X size={20} /></button></div>{!opened.length && <p className="os-overview-empty">{t("Chưa có cửa sổ nào đang mở.", "No windows are open.")}</p>}</>}
      {snap && <div className={`os-snap-preview os-snap-${snap}`} aria-hidden="true" />}
      {desktopApps.filter((app) => state.windows[app.id]).map((app) => {
        const win = state.windows[app.id]!;
        return <DesktopWindow key={app.id} id={app.id} state={mobile && win.open && app.id !== active ? { ...win, minimized: true } : win} area={area} mobile={mobile} active={active === app.id} overview={win.open ? overviewStyle(app.id) : undefined} onFocus={() => { dispatch({ type: "focus", id: app.id }); setOverlay(null); }} onClose={() => closeApp(app.id)} onMinimize={() => minimizeApp(app.id)} onMaximize={() => dispatch({ type: "maximize", id: app.id })} onPlace={(rect, mode) => dispatch({ type: "place", id: app.id, rect, mode, area })} onSnap={setSnap}>{app.id === "appearance" ? <AppearancePanel look={look} onChange={changeLook} droppedFile={droppedFile} onDropConsumed={() => setDroppedFile(undefined)} /> : app.id === "calendar" ? <EmbeddedCalendar dark={dark} motion={look.motion} visible={win.open && !win.minimized && (!mobile || active === app.id) && !overlay} /> : app.id === "notifications" ? <EmbeddedNotifications dark={dark} motion={look.motion} visible={win.open && !win.minimized && (!mobile || active === app.id) && !overlay} /> : <AppPanel id={app.id} onOpen={openApp} />}</DesktopWindow>;
      })}
    </main>
    <DesktopDock state={state} active={active} overview={overlay === "overview"} inert={isModal} moving={look.motion} onLaunch={id => { if (active === id && !state.windows[id]?.minimized) minimizeApp(id); else openApp(id); }} onOverview={() => setOverlay(v => v === "overview" ? null : "overview")} onLauncher={() => setOverlay("launcher")} />
    {!look.companionHidden && ready && !isModal && overlay !== "overview" && <Companion paused={look.companionPaused || !look.motion} onPause={() => changeLook(v => ({ ...v, companionPaused: !v.companionPaused }))} onHide={() => { changeLook(v => ({ ...v, companionHidden: true })); requestAnimationFrame(() => { const toggle = document.querySelector<HTMLElement>("[data-companion-toggle]"); if (toggle?.getClientRects().length) toggle.focus(); else brand.current?.focus(); }); }} onOpen={openApp} />}
    {isModal && <AppLauncher mode={overlay} onOpen={openApp} onClose={dismissOverlay} />}
    {storageWarning && <div className="os-storage-warning" role="status">{storageWarning === "restore" ? t("Trình duyệt không cho phép lưu sở thích. Bạn vẫn có thể sử dụng không gian làm việc.", "This browser cannot restore preferences. You can still use the workspace.") : storageWarning === "save" ? t("Không lưu được sở thích trên thiết bị. Thay đổi hiện tại được giữ trong phiên này.", "Could not save preferences on this device. Changes remain available in this session.") : t("Video không còn khả dụng. Đã dùng hình nền GeeO.", "Video unavailable. Using the GeeO wallpaper.")}<button aria-label={t("Đóng thông báo lưu trữ", "Dismiss storage notice")} onClick={() => setStorageWarning("")}><X size={16} /></button></div>}
  </div></SpaceContext>;
}
