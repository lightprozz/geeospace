import { isDesktopApp, type DesktopAppId } from "./apps";

export function isSafePath(path: unknown): path is string {
  return typeof path === "string" && path.length <= 512 && !/[\u0000-\u0020\u007f\\?#]/.test(path) && !path.startsWith("/") && !path.split("/").some(part => part === "." || part === "..");
}
export function formatAppHash(id: DesktopAppId, path = "") {
  return `#${id}${path ? "/" + path.split("/").map(encodeURIComponent).join("/") : ""}`;
}
export function parseAppHash(hash: string) {
  try {
    const [rawId, ...parts] = hash.replace(/^#/, "").split("/");
    const id = rawId === "lms-requests" ? "requests" : rawId === "lets-learn" ? "lms-lets-learn" : rawId;
    const path = parts.map(decodeURIComponent).join("/");
    if (isDesktopApp(id) && isSafePath(path)) return { id, path };
  } catch { /* Malformed URL encoding is not an app route. */ }
}
