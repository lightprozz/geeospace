import { useEffect, useId, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { searchApps, type DesktopAppId } from "@/lib/desktop/apps";
import { useSpace } from "./space-context";
import { AppGlyph } from "./app-glyph";
import { exitOverlay, rememberLaunch } from "@/lib/desktop/motion";

export function AppLauncher({ mode, onOpen, onClose }: { mode: "launcher" | "search"; onOpen: (id: DesktopAppId) => void; onClose: () => void }) {
  const { t, label, description } = useSpace();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const close = () => exitOverlay(backdrop.current, onClose);
  const open = (id: DesktopAppId) => { rememberLaunch(id); exitOverlay(backdrop.current, () => onOpen(id)); };
  const listId = useId();
  const apps = searchApps(query);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    root.current?.querySelector("input")?.focus();
    return () => { if (previous?.isConnected) previous.focus(); };
  }, []);
  return <div ref={backdrop} data-app-overlay className="os-overlay-backdrop" onPointerDown={(event) => { if (event.target === event.currentTarget) close(); }}><div ref={root} className={`os-launcher os-launcher-${mode}`} role="dialog" aria-modal="true" aria-label={mode === "search" ? t("Tìm nhanh chức năng", "Quick feature search") : t("Tất cả ứng dụng", "All apps")} onKeyDown={(event) => {
    if (event.key === "Escape") { event.stopPropagation(); close(); }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setSelected((value) => (value + (event.key === "ArrowDown" ? 1 : -1) + Math.max(1, apps.length)) % Math.max(1, apps.length)); }
    if (event.key === "Enter" && event.target instanceof HTMLInputElement && apps[selected]) { event.preventDefault(); open(apps[selected].id); }
    if (event.key === "Tab") {
      const elements = Array.from(root.current!.querySelectorAll<HTMLElement>("button, input")).filter((element) => element.tabIndex >= 0);
      if (event.shiftKey && document.activeElement === elements[0]) { event.preventDefault(); elements.at(-1)?.focus(); }
      if (!event.shiftKey && document.activeElement === elements.at(-1)) { event.preventDefault(); elements[0]?.focus(); }
    }
  }}><div className="os-launcher-search"><Search size={20} /><input role="combobox" aria-expanded="true" aria-autocomplete="list" aria-controls={listId} aria-activedescendant={apps[selected] ? `${listId}-${apps[selected].id}` : undefined} aria-label={t("Tìm ứng dụng", "Search apps")} value={query} onChange={(event) => { setQuery(event.target.value); setSelected(0); }} placeholder={t("Tìm ứng dụng hoặc chức năng…", "Search apps or features…")} /><button aria-label={t("Đóng tìm kiếm", "Close search")} onClick={close}><X size={19} /></button></div><div className="os-launcher-heading"><span>{mode === "search" ? t("CHỨC NĂNG TRONG GEEOSPACE", "GEEOSPACE FEATURES") : t("TẤT CẢ ỨNG DỤNG", "ALL APPS")}</span><kbd>ESC</kbd></div><div className="os-launcher-results" id={listId} role="listbox" aria-label={t("Chức năng phù hợp", "Matching features")}>{apps.map((app, index) => <button key={app.id} id={`${listId}-${app.id}`} role="option" tabIndex={-1} aria-selected={index === selected} className={index === selected ? "is-selected" : ""} onFocus={() => setSelected(index)} onClick={() => open(app.id)}><AppGlyph id={app.id} /><span><strong>{label(app.id)}</strong>{mode === "search" && <small>{description(app.id)}</small>}</span></button>)}{!apps.length && <p className="os-no-results">{t("Không tìm thấy chức năng phù hợp.", "No matching features.")}</p>}</div><footer>{t("Chỉ tìm trong danh mục ứng dụng. Chưa tìm dữ liệu cá nhân.", "Searches the app directory only. Personal data search is not available yet.")}</footer></div></div>;
}
