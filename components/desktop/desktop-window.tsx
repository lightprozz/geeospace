import { useEffect, useId, useRef, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import { ArrowLeft, ExternalLink, Minus, Plus, X } from "lucide-react";
import { type DesktopAppId } from "@/lib/desktop/apps";
import { fitRect, frameRect, resizeRect, type ResizeEdge as Edge, type Area, type DesktopWindow as WindowState, type Rect, type WindowMode } from "@/lib/desktop/window-store";
import { useSpace } from "./space-context";
import { useWindowMotion } from "./use-window-motion";

type Props = {
  id: DesktopAppId; state: WindowState; area: Area; mobile: boolean; active: boolean;
  overview?: CSSProperties; children: ReactNode;
  onFocus: () => void; onClose: () => void; onMinimize: () => void; onMaximize: () => void;
  onPlace: (rect: Rect, mode: WindowMode) => void; onSnap: (mode: WindowMode | null) => void;
};
type Gesture = {
  x: number; y: number; rect: Rect; latest: Rect; edge?: Edge; moved: boolean; pull: number;
  restore: Rect; original: Rect; mode: WindowMode; pointer: number; target: HTMLElement;
};
export function DesktopWindow({ id, state, area, mobile, active, overview, children, onFocus, onClose, onMinimize, onMaximize, onPlace, onSnap }: Props) {
  const frame = frameRect(state, area);
  const section = useRef<HTMLElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const raf = useRef(0);
  const helpId = useId();
  const visible = state.open && (!state.minimized || !!overview);
  const animation = useWindowMotion(section, { id, visible, minimized: state.minimized, mobile, rect: frame, overview });
  const { t, label } = useSpace();
  const title = label(id);
  useEffect(() => () => {
    cancelAnimationFrame(raf.current);
    gesture.current = null;
    section.current?.removeAttribute("data-moving");
  }, [mobile, area.width, area.height]);
  function writeRect(rect: Rect) {
    const el = section.current;
    if (!el) return;
    el.style.left = `${rect.x}px`; el.style.top = `${rect.y}px`;
    el.style.width = `${rect.width}px`; el.style.height = `${rect.height}px`;
  }
  function handlePointerStart(event: PointerEvent<HTMLElement>) {
    const edge = event.currentTarget.dataset.edge as Edge | undefined;
    if (event.button !== 0 || overview || (event.target as HTMLElement).closest("a, button:not(.os-resize)")) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    gesture.current = {
      x: event.clientX, y: event.clientY, rect: frame, latest: frame, original: frame,
      edge, moved: false, pull: 0, restore: state.rect, mode: state.mode,
      pointer: event.pointerId, target: event.currentTarget,
    };
  }
  function move(event: PointerEvent<HTMLElement>) {
    const initial = gesture.current;
    if (!initial || initial.pointer !== event.pointerId) return;
    const dx = event.clientX - initial.x, dy = event.clientY - initial.y;
    if (!initial.moved && Math.hypot(dx, dy) < 4) return;
    if (!initial.moved) {
      const visual = animation.beginGesture();
      if (visual) { initial.rect = visual; initial.latest = visual; initial.mode = "normal"; if (mobile) initial.pull = visual.y; }
      initial.moved = true;
      section.current?.setAttribute("data-moving", "true");
      if (!mobile && !initial.edge && initial.mode !== "normal") {
        const ratio = Math.max(0, Math.min(1, (initial.x - frame.x) / frame.width));
        initial.rect = fitRect({ ...initial.restore, x: initial.x - initial.restore.width * ratio, y: initial.y - 66 }, area);
      }
    }
    if (mobile) { section.current?.style.setProperty("--os-pull", `${Math.max(0, initial.pull + dy)}px`); return; }
    const rect = initial.edge ? resizeRect(initial.rect, initial.edge, dx, dy) : { ...initial.rect, x: initial.rect.x + dx, y: initial.rect.y + dy };
    // Keep a partially opened visual frame continuous; enforce size minima on release.
    initial.latest = initial.edge ? fitRect(rect, area) : { ...rect, x: Math.max(16, Math.min(rect.x, area.width - rect.width - 16)), y: Math.max(16, Math.min(rect.y, area.height - rect.height - 16)) };
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => writeRect(initial.latest));
    onSnap(initial.edge ? null : snapMode(event.clientX, event.clientY));
  }
  function snapMode(x: number, y: number): WindowMode | null {
    return x < 24 ? "left" : x > area.width - 24 ? "right" : y < 48 ? "maximized" : null;
  }
  function finish(event: PointerEvent<HTMLElement>, cancelled = false) {
    const initial = gesture.current;
    if (!initial || initial.pointer !== event.pointerId) return;
    gesture.current = null;
    cancelAnimationFrame(raf.current);
    section.current?.removeAttribute("data-moving");
    if (initial.target.hasPointerCapture(initial.pointer)) initial.target.releasePointerCapture(initial.pointer);
    onSnap(null);
    if (!initial.moved) return;
    if (mobile) {
      if (!cancelled && event.clientY - initial.y > 96) onClose();
      else animation.rebound();
      return;
    }
    if (cancelled) { writeRect(initial.original); return; }
    writeRect(initial.latest);
    const mode = initial.edge ? "normal" : snapMode(event.clientX, event.clientY) ?? "normal";
    onPlace(initial.latest, mode);
  }
  return <section ref={section} tabIndex={-1} className={`os-window${active ? " is-focused" : ""}${overview ? " is-overview" : ""}`} data-app={id} data-mode={state.mode} aria-label={title} hidden inert={!visible} style={{ zIndex: overview ? 20 : 20 + state.order }} onPointerDown={() => { if (!active && !overview) onFocus(); }}>
    <div className="os-window-chrome" inert={!!overview}>
      <header className="os-window-title" tabIndex={!mobile && !overview && visible ? 0 : -1} aria-describedby={!mobile ? helpId : undefined} onPointerDown={handlePointerStart} onPointerMove={move} onPointerUp={(event) => finish(event)} onPointerCancel={(event) => finish(event, true)} onLostPointerCapture={(event) => finish(event, true)} onDoubleClick={(event) => { if (!mobile && !(event.target as HTMLElement).closest("button,a")) onMaximize(); }} onKeyDown={(event) => {
        if (event.target !== event.currentTarget || mobile || event.altKey || event.ctrlKey || event.metaKey || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
        event.preventDefault();
        const amount = event.shiftKey ? 40 : 16;
        const base = state.mode === "normal" ? frame : fitRect({ ...state.rect, x: frame.x, y: frame.y }, area);
        onPlace(fitRect({ ...base, x: base.x + (event.key === "ArrowRight" ? amount : event.key === "ArrowLeft" ? -amount : 0), y: base.y + (event.key === "ArrowDown" ? amount : event.key === "ArrowUp" ? -amount : 0) }, area), "normal");
      }}>
        <div className="os-traffic-lights"><button className="os-light-close" aria-label={`${t("Đóng", "Close")} ${title}`} onClick={onClose}><X size={11} /></button><button className="os-light-min" aria-label={`${t("Thu nhỏ", "Minimize")} ${title}`} onClick={onMinimize}><Minus size={11} /></button><button className="os-light-max" aria-label={`${t("Phóng to hoặc khôi phục", "Maximize or restore")} ${title}`} onClick={onMaximize}><Plus size={11} /></button></div>
        <button className="os-mobile-back" onClick={onClose} aria-label={t("Về màn hình chính", "Back to home")}><ArrowLeft size={19} /><span>{t("Trang chủ", "Home")}</span></button>
        <span className="os-window-name">{title}</span><a className="os-window-permalink" href={id === "account" ? "/sign-in" : id === "appearance" ? "/#appearance" : `/${id}`} aria-label={`${t("Mở liên kết", "Open link to")} ${title}`}><ExternalLink size={14} /></a>
      </header>
      <span id={helpId} className="sr-only">{t("Dùng phím mũi tên để di chuyển cửa sổ. Giữ Shift để di chuyển xa hơn. Alt và mũi tên để chia màn hình hoặc phóng to.", "Use arrow keys to move this window. Hold Shift for larger steps. Alt and arrows tile or maximize it.")}</span>
      <div className="os-window-body">{children}</div>
    </div>
    {!mobile && !overview && (["n", "s", "e", "w", "ne", "nw", "se", "sw"] as Edge[]).map((edge) => <div key={edge} role="button" data-edge={edge} tabIndex={active && visible ? 0 : -1} aria-label={`${t("Đổi kích thước", "Resize")} ${title} ${edge}`} className={`os-resize os-resize-${edge}`} onPointerDown={handlePointerStart} onPointerMove={move} onPointerUp={(event) => finish(event)} onPointerCancel={(event) => finish(event, true)} onLostPointerCapture={(event) => finish(event, true)} onKeyDown={(event) => {
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key) || event.altKey) return;
      event.preventDefault();
      const amount = event.shiftKey ? 40 : 16;
      onPlace(resizeRect(frame, edge, event.key === "ArrowRight" ? amount : event.key === "ArrowLeft" ? -amount : 0, event.key === "ArrowDown" ? amount : event.key === "ArrowUp" ? -amount : 0), "normal");
    }} />)}
    {overview && <button className="os-overview-pick" data-overview-pick aria-label={`${t("Chuyển đến", "Switch to")} ${title}`} onClick={onFocus}><span>{title}{state.minimized && <small>{t("Đã thu nhỏ", "Minimized")}</small>}</span></button>}
  </section>;
}
