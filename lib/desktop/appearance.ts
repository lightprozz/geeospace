import type { Locale } from "./locale";
export const accents = { geeo: "#ef4444", blue: "#497ece", green: "#39856c", violet: "#8b65bb", amber: "#ae772b" } as const;
export type Look = {
  mode: "system" | "light" | "dark"; wallpaper: "geeo" | "dusk" | "forest" | "aurora" | "ocean" | "mono" | "image" | "video";
  glass: boolean; material: "auto" | "frost" | "glass" | "opaque"; image?: string; locale: Locale; accent: keyof typeof accents; dim: number;
  motion: boolean; companionHidden: boolean; companionPaused: boolean; mediaRevision: number;
};
export const defaultLook: Look = { mode: "dark", wallpaper: "geeo", glass: true, material: "auto", locale: "vi", accent: "geeo", dim: 35, motion: true, companionHidden: false, companionPaused: false, mediaRevision: 0 };
export const lookKey = "geeospace.desktop.appearance.v1";
/** Additive migration of UI-only preferences; never accepts remote media or private records. */
export function readLook(raw: string | null): Look {
  try {
    const value = JSON.parse(raw ?? "null") as Partial<Look> | null;
    if (!value || !["system", "light", "dark"].includes(value.mode!) || !["geeo", "dusk", "forest", "aurora", "ocean", "mono", "image", "video"].includes(value.wallpaper!) || typeof value.glass !== "boolean") return { ...defaultLook };
    const image = typeof value.image === "string" && value.image.length < 4500000 && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value.image) ? value.image : undefined;
    return {
      ...defaultLook, material: ["auto", "frost", "glass", "opaque"].includes(value.material!) ? value.material! : "auto", mode: value.mode!, wallpaper: value.wallpaper === "image" && !image ? "geeo" : value.wallpaper!, glass: value.glass, image,
      locale: value.locale === "en" ? "en" : "vi", accent: value.accent && Object.hasOwn(accents, value.accent) ? value.accent : "geeo",
      dim: typeof value.dim === "number" && Number.isFinite(value.dim) ? Math.max(0, Math.min(80, Math.round(value.dim))) : 35,
      motion: value.motion !== false, companionHidden: value.companionHidden === true, companionPaused: value.companionPaused === true,
      mediaRevision: typeof value.mediaRevision === "number" && Number.isSafeInteger(value.mediaRevision) && value.mediaRevision >= 0 ? value.mediaRevision : 0,
    };
  } catch { return { ...defaultLook }; }
}
