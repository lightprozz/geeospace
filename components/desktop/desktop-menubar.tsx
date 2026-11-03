import { useEffect, useRef, useState, type RefObject } from "react";
import { AppWindow, Command, Eye, EyeOff, Globe2, Grid2X2, Moon, Sun, UserRound } from "lucide-react";
import type { DesktopAppId } from "@/lib/desktop/apps";
import type { Look } from "@/lib/desktop/appearance";
import { exitOverlay } from "@/lib/desktop/motion";
import { useSpace } from "./space-context";
import { AppStatusTray } from "./app-status-tray";
import { WeatherControl } from "./weather-control";

type Props = { brand: RefObject<HTMLButtonElement | null>; active?: DesktopAppId; inert: boolean; mobile: boolean; dark: boolean; apple: boolean; clock: string; look: Look; onLook: (next: (look: Look) => Look) => void; onOpen: (id: DesktopAppId) => void; onLauncher: () => void; onSearch: () => void; onOverview: () => void; onDesktop: () => void; onArrange: () => void; onCloseAll: () => void };
export function DesktopMenubar(p: Props) {
  const { brand, ...actions } = p;
  const { t, label, locale } = useSpace();
  const [menu, setMenu] = useState(false), [more, setMore] = useState(false);
  const anchor = useRef<HTMLDivElement>(null), panel = useRef<HTMLDivElement>(null);
  const moreAnchor = useRef<HTMLDivElement>(null);
  function close() { brand.current?.focus(); exitOverlay(panel.current, () => setMenu(false)); }
  useEffect(() => {
    if (!menu && !more) return;
    const outside = (e: PointerEvent) => { if (!anchor.current?.contains(e.target as Node)) setMenu(false); if (!moreAnchor.current?.contains(e.target as Node)) setMore(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); if (menu) close(); if (more) { setMore(false); moreAnchor.current?.querySelector("button")?.focus(); } } };
    const frame = requestAnimationFrame(() => { if (menu && !panel.current?.contains(document.activeElement)) panel.current?.querySelector<HTMLButtonElement>("button")?.focus(); });
    document.addEventListener("pointerdown", outside); document.addEventListener("keydown", key, true);
    return () => { cancelAnimationFrame(frame); document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", key, true); };
  // The menu focus owner is stable while the popover is open.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menu, more]);
  const run = (callback: () => void) => { setMenu(false); callback(); };
  const utilities = <><WeatherControl /><button aria-label={t("Đổi ngôn ngữ sang tiếng Anh", "Switch language to Vietnamese")} onClick={() => actions.onLook(v => ({ ...v, locale: v.locale === "vi" ? "en" : "vi" }))}><Globe2 size={16} /><span>{locale.toUpperCase()}</span></button><button data-companion-toggle aria-label={actions.look.companionHidden ? t("Hiện bạn đồng hành GeeO", "Show GeeO companion") : t("Ẩn bạn đồng hành GeeO", "Hide GeeO companion")} aria-pressed={!actions.look.companionHidden} onClick={() => actions.onLook(v => ({ ...v, companionHidden: !v.companionHidden }))}>{actions.look.companionHidden ? <EyeOff size={16} /> : <Eye size={16} />}</button></>;
  return <header className="os-menubar" inert={actions.inert}><div ref={anchor} className="os-brand-menu" onBlurCapture={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setMenu(false); }}><button ref={brand} className="os-brand-button" aria-expanded={menu} aria-haspopup="menu" aria-label="Menu Geeospace" onClick={() => menu ? close() : setMenu(true)} onKeyDown={e => { if (["ArrowDown", "ArrowUp"].includes(e.key)) { e.preventDefault(); setMenu(true); if (e.key === "ArrowUp") requestAnimationFrame(() => panel.current?.querySelector<HTMLButtonElement>("button:last-child")?.focus()); } }}><i>g.</i><strong>geeospace</strong></button>{menu && <div ref={panel} role="menu" className="os-brand-popover" aria-label={t("Điều hướng Geeospace", "Geeospace navigation")} onKeyDown={e => {
    const items = [...panel.current!.querySelectorAll<HTMLButtonElement>("button")], index = items.indexOf(document.activeElement as HTMLButtonElement);
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) { e.preventDefault(); items[e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : (index + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus(); }
    if (e.key === "Tab") { brand.current?.focus(); setMenu(false); }
  }}>
    <button role="menuitem" tabIndex={-1} onClick={() => run(actions.onLauncher)}><Grid2X2 size={17} />{t("Tất cả ứng dụng", "All apps")}</button>
    <button role="menuitem" tabIndex={-1} onClick={() => run(actions.onOverview)}><AppWindow size={17} />{t("Tất cả cửa sổ", "All windows")}<kbd>Alt O</kbd></button>
    <button role="menuitem" tabIndex={-1} onClick={() => run(() => actions.onOpen("appearance"))}>{label("appearance")}</button>
    <button role="menuitem" tabIndex={-1} onClick={() => run(actions.onDesktop)}>{t("Hiện màn hình nền", "Show desktop")}</button>
    <button role="menuitem" tabIndex={-1} onClick={() => run(actions.onCloseAll)}>{t("Đóng tất cả cửa sổ", "Close all windows")}</button>
    <button role="menuitem" tabIndex={-1} onClick={() => run(actions.onArrange)}>{t("Sắp lại cửa sổ", "Arrange windows")}</button>
  </div>}</div><span className="os-active-app">{actions.active ? label(actions.active) : t("Không gian làm việc", "Workspace")}</span>
  <div className="os-menubar-tools"><AppStatusTray dark={actions.dark} motion={actions.look.motion} onOpen={actions.onOpen} /><div ref={moreAnchor} className="os-utilities-anchor"><button className="os-utilities-toggle" aria-label={t("Tiện ích", "Utilities")} aria-expanded={more} onClick={() => setMore(!more)}>•••</button><div className="os-utilities" data-expanded={more}>{utilities}</div></div>
  <button aria-label={t("Tìm nhanh", "Quick search")} aria-keyshortcuts="Control+K Meta+K" onClick={actions.onSearch}><Command size={16} /><kbd>{actions.apple ? "⌘ K" : "Ctrl K"}</kbd></button>
  <button aria-label={actions.dark ? t("Chuyển sang chế độ sáng", "Switch to light mode") : t("Chuyển sang chế độ tối", "Switch to dark mode")} onClick={() => actions.onLook(v => ({ ...v, mode: actions.dark ? "light" : "dark" }))}>{actions.dark ? <Sun size={17} /> : <Moon size={17} />}</button>
  <button className="os-account-chip" aria-label={t("Tài khoản Gee-O", "Gee-O account")} onClick={() => actions.onOpen("account")}><UserRound size={16} /><span>{t("Kết nối Gee-O", "Connect Gee-O")}</span></button><time dateTime={actions.clock}>{new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-GB", { timeZone: "Asia/Ho_Chi_Minh", weekday: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(actions.clock))}</time></div></header>;
}
