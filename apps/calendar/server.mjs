import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { loadEnvFile } from "node:process";
import { pathToFileURL } from "node:url";
import { getCalendarEvents as defaultCalendarEvents } from "./calendar-data.mjs";
import { isDay } from "./public/dates.mjs";
import { createLocalMvpHandler } from "./local-mvp.mjs";

const assets = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/calendar.mjs": ["calendar.mjs", "text/javascript; charset=utf-8"],
  "/dates.mjs": ["dates.mjs", "text/javascript; charset=utf-8"],
  "/spaceos-app-v1.css": ["spaceos-app-v1.css", "text/css; charset=utf-8"],
  "/calendar-icon.svg": ["calendar-icon.svg", "image/svg+xml"],
  "/calendar.css": ["calendar.css", "text/css; charset=utf-8"],
};

function parentOrigin(value) {
  if (!value) return "";
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || url.origin !== value) {
    throw new Error("SPACEOS_PARENT_ORIGIN must be an exact HTTP(S) origin");
  }
  return value;
}

function reply(response, status, type, body) {
  response.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
  response.end(body);
}

function json(response, status, body) {
  reply(response, status, "application/json; charset=utf-8", JSON.stringify(body));
}

async function events(request, response, url, getCalendarEvents) {
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (!isDay(from) || !isDay(to) || to <= from || Date.parse(to) - Date.parse(from) > 42 * 86_400_000) {
    return json(response, 400, { code: "INVALID_DATE_RANGE" });
  }

  const upstream = await getCalendarEvents({
    request: new Request(url, { headers: request.headers }),
    from,
    to,
  });
  const body = await upstream.text();
  reply(response, upstream.status, "application/json; charset=utf-8", body);
}

export function createCalendarServer({ spaceOrigin, getCalendarEvents = defaultCalendarEvents } = {}) {
  const parent = parentOrigin(spaceOrigin);
  const policy = [
    "default-src 'self'",
    "base-uri 'none'",
    "object-src 'none'",
    "form-action 'self'",
    `frame-ancestors ${parent || "'none'"}`,
  ].join("; ");

  return createServer(async (request, response) => {
    response.setHeader("Content-Security-Policy", policy);
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "no-referrer");

    try {
      const url = new URL(request.url, "http://localhost");
      if (request.method !== "GET") {
        response.setHeader("Allow", "GET");
        return json(response, 405, { code: "METHOD_NOT_ALLOWED" });
      }
      if (url.pathname === "/api/events") return await events(request, response, url, getCalendarEvents);
      if (!Object.hasOwn(assets, url.pathname)) return json(response, 404, { code: "NOT_FOUND" });

      const [file, type] = assets[url.pathname];
      let body = await readFile(new URL(`./public/${file}`, import.meta.url), "utf8");
      if (file === "index.html") body = body.replace("__SPACEOS_PARENT_ORIGIN__", parent);
      reply(response, 200, type, body);
    } catch {
      if (!response.headersSent) json(response, 500, { code: "CALENDAR_UNAVAILABLE" });
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    loadEnvFile(new URL("./.env", import.meta.url));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const host = process.env.HOST || "127.0.0.1";
  const port = Number(process.env.PORT || 3200);
  const spaceOrigin = process.env.SPACEOS_PARENT_ORIGIN;
  const accessToken = process.env.GEEO_CALENDAR_MVP_ACCESS_TOKEN;
  if (accessToken && process.env.NODE_ENV === "production") {
    throw new Error("Calendar MVP access token mode is local development only");
  }
  const getCalendarEvents = accessToken ? createLocalMvpHandler({
    accessToken, host, port, parentOrigin: spaceOrigin,
    apiOrigin: process.env.GEEO_CALENDAR_API_ORIGIN,
    sourceOffset: process.env.GEEO_CALENDAR_SOURCE_OFFSET,
  }) : defaultCalendarEvents;
  createCalendarServer({ spaceOrigin, getCalendarEvents })
    .listen(port, host, () => console.log(`GeeO Calendar listening at http://${host}:${port}`));
}
