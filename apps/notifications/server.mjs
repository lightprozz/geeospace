import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { loadEnvFile } from "node:process";
import { pathToFileURL } from "node:url";
import { getNotifications as defaultNotifications } from "./notification-data.mjs";

const assets = {
  "/": ["index.html", "text/html"],
  "/status": ["status.html", "text/html"],
  "/notifications.mjs": ["notifications.mjs", "text/javascript"],
  "/notification-model.mjs": ["notification-model.mjs", "text/javascript"],
  "/bridge.mjs": ["bridge.mjs", "text/javascript"],
  "/status.mjs": ["status.mjs", "text/javascript"],
  "/notifications.css": ["notifications.css", "text/css"],
  "/spaceos-app-v1.css": ["spaceos-app-v1.css", "text/css"],
  "/notification-icon.svg": ["notification-icon.svg", "image/svg+xml"],
};
function exactOrigin(value) {
  if (!value) return "";
  const url = new URL(value);
  if (url.origin !== value || (url.protocol !== "https:" &&
      !(url.protocol === "http:" && ["127.0.0.1", "localhost"].includes(url.hostname)))) {
    throw new Error("SPACEOS_PARENT_ORIGIN must be an exact HTTPS or loopback origin");
  }
  return value;
}
function reply(response, status, type, body) {
  response.writeHead(status, { "Content-Type": `${type}; charset=utf-8`, "Cache-Control": "private, no-store" });
  response.end(body);
}
const json = (response, status, body) => reply(response, status, "application/json", JSON.stringify(body));

export function createNotificationsServer({ spaceOrigin, getNotifications = defaultNotifications } = {}) {
  const parent = exactOrigin(spaceOrigin);
  return createServer(async (request, response) => {
    response.setHeader("Content-Security-Policy", `default-src 'self'; base-uri 'none'; object-src 'none'; form-action 'none'; frame-ancestors ${parent || "'none'"}`);
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "no-referrer");
    try {
      const url = new URL(request.url, "http://localhost");
      if (request.method !== "GET") {
        response.setHeader("Allow", "GET");
        return json(response, 405, { code: "METHOD_NOT_ALLOWED" });
      }
      if (url.pathname === "/api/notifications" || url.pathname === "/api/status") {
        if (url.search) return json(response, 400, { code: "INVALID_QUERY" });
        const result = await getNotifications({ request: new Request(url, { headers: request.headers }) });
        const data = await result.json();
        if (!result.ok) return json(response, result.status, { code: data.code });
        return json(response, 200, url.pathname === "/api/status"
          ? { status: "ready", count: data.events.length, observedAt: data.observedAt }
          : data);
      }
      if (!Object.hasOwn(assets, url.pathname)) return json(response, 404, { code: "NOT_FOUND" });
      const [file, type] = assets[url.pathname];
      let body = await readFile(new URL(`./public/${file}`, import.meta.url), "utf8");
      if (type === "text/html") body = body.replace("__SPACEOS_PARENT_ORIGIN__", parent);
      reply(response, 200, type, body);
    } catch { if (!response.headersSent) json(response, 503, { code: "NOTIFICATIONS_UNAVAILABLE" }); }
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { loadEnvFile(new URL("./.env", import.meta.url)); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  const host = process.env.HOST || "127.0.0.1", port = Number(process.env.PORT || 3300);
  createNotificationsServer({ spaceOrigin: process.env.SPACEOS_PARENT_ORIGIN })
    .listen(port, host, () => console.log(`GeeO Notifications listening at http://${host}:${port}`));
}
