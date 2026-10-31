import { appEnglish } from "./locale";
import { modules } from "@/lib/platform/modules";

export const desktopApps = [
  ...modules,
  { id: "lms", label: "Lớp & giảng dạy", description: "Mở giao diện LMS Gee-O theo quyền của bạn.", icon: "school" },
  { id: "account", label: "Tài khoản", description: "Trạng thái kết nối Gee-O Auth.", icon: "user" },
  { id: "appearance", label: "Giao diện", description: "Hình nền, chế độ màu và độ trong suốt.", icon: "palette" },
] as const;
export type DesktopAppId = (typeof desktopApps)[number]["id"];
export function isDesktopApp(value: unknown): value is DesktopAppId {
  return typeof value === "string" && desktopApps.some((app) => app.id === value);
}
export function appDefinition(id: DesktopAppId) {
  return desktopApps.find((app) => app.id === id)!;
}
export function searchApps(query: string) {
  const normalize = (value: string) => value.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replaceAll("đ", "d").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const words = normalize(query).split(/\s+/).filter(Boolean);
  return desktopApps.filter((app) => {
    const text = normalize(`${app.label} ${app.description} ${appEnglish[app.id].join(" ")}`);
    return words.every((word) => text.includes(word));
  });
}
