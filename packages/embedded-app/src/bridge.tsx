"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

export type Locale = "vi" | "en";
type HostContext = { type: "spaceos:init"; version: 1; instanceId: string; theme: "light" | "dark"; locale: Locale; visible: boolean; reducedMotion: boolean };
export function parseHostContext(data: unknown, instance?: string): HostContext | undefined {
  if (!data || typeof data !== "object") return;
  const value = data as Record<string, unknown>;
  if (value.type !== "spaceos:init" || value.version !== 1 || typeof value.instanceId !== "string" || !value.instanceId || value.instanceId.length > 200 ||
      (instance && value.instanceId !== instance) || !["light", "dark"].includes(value.theme as string) || !["vi", "en"].includes(value.locale as string) ||
      typeof value.visible !== "boolean" || typeof value.reducedMotion !== "boolean") return;
  return value as HostContext;
}
type Bridge = { locale: Locale; visible: boolean; embedded: boolean; setLocale: (locale: Locale) => void; send: (payload: Record<string, unknown>) => void };
const Context = createContext<Bridge | null>(null);
export function SpaceOSProvider({ parentOrigin, children }: { parentOrigin: string; children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>("vi");
  const [visible, setVisible] = useState(false), [embedded, setEmbedded] = useState(false);
  const instance = useRef<string | undefined>(undefined), hostVisible = useRef(true);
  useEffect(() => {
    const framed = window.parent !== window && Boolean(parentOrigin);
    const visibility = () => setVisible(hostVisible.current && document.visibilityState === "visible");
    const pagehide = () => setVisible(false);
    hostVisible.current = !framed;
    queueMicrotask(() => { setEmbedded(framed); setLocale(navigator.language.startsWith("en") ? "en" : "vi"); visibility(); });
    const receive = (event: MessageEvent) => {
      if (!framed || event.origin !== parentOrigin || event.source !== window.parent) return;
      const context = parseHostContext(event.data, instance.current);
      if (!context) return;
      instance.current = context.instanceId;
      document.documentElement.dataset.presentation = "embedded";
      document.documentElement.dataset.theme = context.theme;
      document.documentElement.dataset.reducedMotion = String(context.reducedMotion);
      setLocale(context.locale); hostVisible.current = context.visible; visibility();
    };
    window.addEventListener("message", receive); document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", pagehide); window.addEventListener("pageshow", visibility);
    if (framed) window.parent.postMessage({ type: "spaceos:ready", version: 1 }, parentOrigin);
    return () => { window.removeEventListener("message", receive); document.removeEventListener("visibilitychange", visibility); window.removeEventListener("pagehide", pagehide); window.removeEventListener("pageshow", visibility); };
  }, [parentOrigin]);
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  const send = useCallback((payload: Record<string, unknown>) => {
    if (parentOrigin && instance.current) window.parent.postMessage({ ...payload, version: 1, instanceId: instance.current }, parentOrigin);
  }, [parentOrigin]);
  return <Context.Provider value={{ locale, visible, embedded, setLocale, send }}>{children}</Context.Provider>;
}
export function useSpaceOS() {
  const context = useContext(Context);
  if (!context) throw new Error("SpaceOSProvider is required");
  return context;
}
