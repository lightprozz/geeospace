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
    label: (id: DesktopAppId) => locale === "vi" ? appDefinition(id).label : appEnglish[id][0],
    description: (id: DesktopAppId) => locale === "vi" ? appDefinition(id).description : appEnglish[id][1],
  };
}
