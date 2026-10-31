import { useEffect, useRef, useState } from "react";
import { EyeOff, Pause, Play, X } from "lucide-react";
import type { DesktopAppId } from "@/lib/desktop/apps";
import { useSpace } from "./space-context";
export function Companion({ paused, onPause, onHide, onOpen }: { paused: boolean; onPause: () => void; onHide: () => void; onOpen: (id: DesktopAppId) => void }) {
  const { t, label } = useSpace();
  const root = useRef<HTMLDivElement>(null), button = useRef<HTMLButtonElement>(null), drag = useRef<{ x: number; y: number; left: number; top: number; moved: boolean } | null>(null);
  const helpPanel = useRef<HTMLDivElement>(null);
  const [help, setHelp] = useState(false);
  function place(left: number, top: number) {
    const el = root.current; if (!el) return;
    const bar = document.querySelector(".os-menubar")?.getBoundingClientRect().bottom ?? 48;
    el.style.left = `${Math.max(12, Math.min(innerWidth - el.offsetWidth - 12, left))}px`;
    el.style.top = `${Math.max(bar + 12, Math.min(innerHeight - el.offsetHeight - 100, top))}px`; el.style.right = "auto"; el.style.bottom = "auto";
  }
  useEffect(() => {
    if (!help) return;
    const frame = requestAnimationFrame(() => {
      const panel = helpPanel.current; if (!panel) return;
      const box = panel.getBoundingClientRect();
      panel.style.translate = `${Math.max(12 - box.left, Math.min(0, innerWidth - 12 - box.right))}px ${Math.max(48 - box.top, 0)}px`;
      panel.querySelector<HTMLButtonElement>("button")?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [help]);
  useEffect(() => { const clamp = () => { const box = root.current?.getBoundingClientRect(); if (box) place(box.left, box.top); }; window.addEventListener("resize", clamp); return () => window.removeEventListener("resize", clamp); }, []);
  return <div ref={root} className="os-companion" data-paused={paused} onKeyDown={e => { if (e.key === "Escape") { e.stopPropagation(); setHelp(false); button.current?.focus(); } }}>
    {help && <div ref={helpPanel} className="os-companion-help"><div className="os-widget-heading"><strong>{t("Bạn cần đi đâu?", "Where would you like to go?")}</strong><button aria-label={t("Đóng hướng dẫn", "Close guidance")} onClick={() => { setHelp(false); button.current?.focus(); }}><X size={14} /></button></div><p>{t("Mở nhanh chức năng GeeO. Trợ lý AI cần được kết nối riêng.", "Open a GeeO feature. AI assistance requires a separate connection.")}</p>{(["today", "requests", "assistant"] as const).map(id => <button key={id} onClick={() => { setHelp(false); onOpen(id); }}>{label(id)} ↗</button>)}</div>}
    <button ref={button} className="os-companion-character" aria-label={t("Bạn đồng hành GeeO, mở hướng dẫn; phím mũi tên để di chuyển", "GeeO companion, open guidance; arrow keys to move")} aria-expanded={help} onClick={() => { if (!drag.current?.moved) setHelp(!help); }} onPointerDown={e => { if (e.button !== 0) return; const r = root.current!.getBoundingClientRect(); drag.current = { x: e.clientX, y: e.clientY, left: r.left, top: r.top, moved: false }; e.currentTarget.setPointerCapture(e.pointerId); }} onPointerMove={e => { const d = drag.current; if (!d || !e.currentTarget.hasPointerCapture(e.pointerId)) return; const dx = e.clientX - d.x, dy = e.clientY - d.y; if (Math.hypot(dx, dy) > 4) d.moved = true; if (d.moved) { setHelp(false); place(d.left + dx, d.top + dy); } }} onPointerUp={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); }} onPointerCancel={() => { drag.current = null; }} onKeyDown={e => { if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) { e.preventDefault(); setHelp(false); const r = root.current!.getBoundingClientRect(), step = e.shiftKey ? 40 : 12; place(r.left + (e.key === "ArrowRight" ? step : e.key === "ArrowLeft" ? -step : 0), r.top + (e.key === "ArrowDown" ? step : e.key === "ArrowUp" ? -step : 0)); } else if (e.key === "Enter" || e.key === " ") drag.current = null; }}>
      <svg viewBox="0 0 96 112" role="img" aria-label="GeeO"><defs><linearGradient id="geeo-body" x2=".8" y2="1"><stop stopColor="#fff4f1" /><stop offset="1" stopColor="#dfd4d6" /></linearGradient></defs><ellipse cx="48" cy="105" rx="27" ry="4" fill="black" opacity=".16" /><g className="os-companion-body"><path d="M30 78v20q0 6 8 6h6V83m8 0v21h6q8 0 8-6V78" fill="url(#geeo-body)" /><rect x="25" y="53" width="46" height="34" rx="15" fill="url(#geeo-body)" /><path className="os-companion-arm" d="M27 61Q10 60 14 44" fill="none" stroke="#e3d7da" strokeWidth="10" strokeLinecap="round" /><path d="M69 62q14 8 8 17" fill="none" stroke="#e3d7da" strokeWidth="10" strokeLinecap="round" /><rect x="17" y="12" width="62" height="49" rx="20" fill="url(#geeo-body)" /><rect x="24" y="22" width="48" height="28" rx="12" fill="#2a202c" /><g className="os-companion-eyes" fill="#ff737d"><rect x="33" y="31" width="5" height="10" rx="2.5" /><rect x="58" y="31" width="5" height="10" rx="2.5" /></g><path d="M44 42q4 4 8 0" stroke="#ffb4bd" fill="none" strokeWidth="2" strokeLinecap="round" /><rect x="36" y="61" width="24" height="18" rx="6" fill="#d51e37" /><text x="48" y="74" textAnchor="middle" fontSize="14" fontWeight="700" fill="white">g.</text><path d="M48 12V7" stroke="#dfd4d6" strokeWidth="3" /><circle cx="48" cy="6" r="4" fill="#ef5366" /></g></svg>
    </button><div className="os-companion-controls"><button aria-label={paused ? t("Tiếp tục companion", "Resume companion") : t("Tạm dừng companion", "Pause companion")} aria-pressed={paused} onClick={onPause}>{paused ? <Play size={15} /> : <Pause size={15} />}</button><button aria-label={t("Ẩn companion", "Hide companion")} onClick={onHide}><EyeOff size={15} /></button></div>
  </div>;
}
