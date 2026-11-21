import { isDesktopApp, type DesktopAppId } from "./apps";

export function isSafePath(path: unknown): path is string {
  return typeof path === "string" && path.length <= 512 && !/[\u0000-\u0020\u007f\\?#]/.test(path) && !path.startsWith("/") && !path.split("/").some(part => part === "." || part === "..");
}
export function formatAppHash(id: DesktopAppId, path = "") {
  return `#${id}${path ? "/" + path.split("/").map(encodeURIComponent).join("/") : ""}`;
}
export function parseAppHash(hash: string) {
  try {
    const [id, ...parts] = hash.replace(/^#/, "").split("/");
    const path = parts.map(decodeURIComponent).join("/");
    if (isDesktopApp(id) && isSafePath(path)) return { id, path };
  } catch { /* Malformed URL encoding is not an app route. */ }
}
