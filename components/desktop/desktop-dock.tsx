import { useEffect, useRef, type PointerEvent } from "react";
import { AppWindow, Grid2X2 } from "lucide-react";
import { desktopApps, type DesktopAppId } from "@/lib/desktop/apps";
import type { DesktopState } from "@/lib/desktop/window-store";
import { AppGlyph } from "./app-glyph";
import { useSpace } from "./space-context";

type Props = { state: DesktopState; active?: DesktopAppId; overview: boolean; inert: boolean; moving: boolean; onLaunch: (id: DesktopAppId) => void; onOverview: () => void; onLauncher: () => void };
export function DesktopDock({ state, active, overview, inert, moving, onLaunch, onOverview, onLauncher }: Props) {
  const { t, label } = useSpace();
  const root = useRef<HTMLElement>(null), frame = useRef(0);
  const values = useRef<number[]>([]), targets = useRef<number[]>([]);
  const previous = useRef(0);
  const apps = desktopApps.filter(app => app.id !== "appearance");
  function tick(time: number) {
    const items = root.current?.querySelectorAll<HTMLElement>(".os-dock-item");
    if (!items) return;
    const amount = 1 - Math.exp(-Math.min(40, time - (previous.current || time - 16)) / 38);
    previous.current = time;
    let pending = false;
    items.forEach((item, index) => {
      const target = targets.current[index] ?? 1;
      const current = values.current[index] ?? 1;
      const next = Math.abs(target - current) < .002 ? target : current + (target - current) * amount;
      values.current[index] = next; item.style.setProperty("--s", String(next));
      pending ||= next !== target;
    });
    frame.current = pending ? requestAnimationFrame(tick) : 0;
  }
  function schedule(next: number[]) { targets.current = next; if (!frame.current) { previous.current = 0; frame.current = requestAnimationFrame(tick); } }
  function magnify(event: PointerEvent<HTMLElement>) {
    if (!moving || event.pointerType !== "mouse" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const list = root.current?.querySelector("ul");
    if (!list) return;
    const size = innerWidth >= 1440 ? 48 : 44;
    const children = [...list.children] as HTMLElement[];
    const total = children.reduce((sum, item) => sum + (item.querySelector("button") !== null ? size : 9), 0) + (children.length - 1) * 6;
    let left = innerWidth / 2 - total / 2;
    const next: number[] = [];
    for (const child of children) {
      if (child.querySelector("button") !== null) {
        const distance = Math.abs(event.clientX - left - size / 2);
        next.push(1 + .55 * Math.cos(Math.min(1, distance / 150) * Math.PI / 2)); left += size + 6;
      } else left += 15;
    }
    const available = innerWidth - 48 - total;
    const excess = next.reduce((sum, scale) => sum + (scale - 1) * size, 0);
    schedule(next.map(scale => 1 + (scale - 1) * Math.max(0, Math.min(1, available / (excess || 1)))));
  }
  useEffect(() => {
    const reset = () => {
      cancelAnimationFrame(frame.current); frame.current = 0; values.current = []; targets.current = [];
      root.current?.querySelectorAll<HTMLElement>(".os-dock-item").forEach(item => item.style.removeProperty("--s"));
    };
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    media.addEventListener("change", reset); window.addEventListener("resize", reset);
    if (!moving) reset();
    return () => { cancelAnimationFrame(frame.current); media.removeEventListener("change", reset); window.removeEventListener("resize", reset); };
  }, [moving]);
  return <nav ref={root} className="os-dock" aria-label={t("Dock ứng dụng", "App dock")} inert={inert} onPointerMove={magnify} onPointerLeave={() => schedule(targets.current.map(() => 1))}><ul>
    {apps.map((app, index) => <li key={app.id}><button data-launch-app={app.id} className="os-dock-item" aria-label={label(app.id)} aria-current={active === app.id ? "true" : undefined} aria-keyshortcuts={index < 9 ? `Alt+${index + 1}` : undefined} data-running={!!state.windows[app.id]?.open} data-minimized={!!state.windows[app.id]?.minimized} onClick={() => onLaunch(app.id)}><AppGlyph id={app.id} /><span className="os-tooltip">{label(app.id)}{index < 9 && <kbd>Alt {index + 1}</kbd>}</span><i className="os-running-indicator" /></button></li>)}
    <li className="os-dock-divider" aria-hidden="true" />
    <li><button className="os-dock-item" aria-label={t("Xem tất cả cửa sổ", "Show all windows")} aria-pressed={overview} aria-keyshortcuts="Alt+O" onClick={onOverview}><span className="os-glyph os-glyph-overview"><AppWindow size={25} /></span><span className="os-tooltip">{t("Tất cả cửa sổ", "All windows")}<kbd>Alt O</kbd></span></button></li>
    <li><button data-launch-app="appearance" className="os-dock-item" aria-label={label("appearance")} data-running={!!state.windows.appearance?.open} data-minimized={!!state.windows.appearance?.minimized} onClick={() => onLaunch("appearance")}><AppGlyph id="appearance" /><span className="os-tooltip">{label("appearance")}</span><i className="os-running-indicator" /></button></li>
    <li><button className="os-dock-item" aria-label={t("Tất cả ứng dụng", "All apps")} onClick={onLauncher}><span className="os-glyph os-glyph-launcher"><Grid2X2 size={25} /></span><span className="os-tooltip">{t("Tất cả ứng dụng", "All apps")}<kbd>Ctrl/Cmd K</kbd></span></button></li>
  </ul></nav>;
}
