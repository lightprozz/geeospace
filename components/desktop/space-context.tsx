"use client";
import { createContext, useContext } from "react";
import type { Locale } from "@/lib/desktop/locale";
import { appEnglish } from "@/lib/desktop/locale";
import { appDefinition, type DesktopAppId } from "@/lib/desktop/apps";
export const SpaceContext = createContext<Locale>("vi");
export function useSpace(override?: Locale) {
  const context = useContext(SpaceContext);
  const locale = override ?? context;
  return {
    locale, t: (vi: string, en: string) => locale === "vi" ? vi : en,
    label: (id: DesktopAppId) => { const app = appDefinition(id); return locale === "vi" ? app.label : ("english" in app ? app.english : appEnglish[app.id])[0]; },
    description: (id: DesktopAppId) => { const app = appDefinition(id); return locale === "vi" ? app.description : ("english" in app ? app.english : appEnglish[app.id])[1]; },
  };
}
