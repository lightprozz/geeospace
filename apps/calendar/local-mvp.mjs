import { createCalendarEventsHandler } from "./calendar-data.mjs";

const apiOrigins = new Set(["https://dev-lms.gee-o.vn", "https://lms.gee-o.edu", "https://lms.gee-o.vn"]);

function claims(value) {
  return (Array.isArray(value) ? value : [value])
    .flatMap(item => typeof item === "string" ? item.split(",") : [])
    .map(item => item.trim()).filter(Boolean);
}

export function createLocalMvpHandler({ accessToken, host, port, parentOrigin, apiOrigin, sourceOffset, fetchImpl = fetch }) {
  if (host !== "127.0.0.1" || (parentOrigin && parentOrigin !== "http://127.0.0.1:3100") ||
      !/^[A-Za-z0-9._~+/-]+=*$/.test(accessToken)) {
    throw new Error("Calendar MVP requires a loopback configuration and a valid access token format");
  }

  const url = new URL(apiOrigin ?? "https://lms.gee-o.vn");
  if (!apiOrigins.has(url.origin) || url.href !== url.origin + "/") {
    throw new Error("Invalid Gee-O Calendar API origin");
  }

  // JWT metadata can reject an expired token early. UserInfo still verifies valid-looking tokens.
  let expiresAt;
  if (accessToken.split(".").length === 3) {
    try {
      const { exp } = JSON.parse(Buffer.from(accessToken.split(".")[1], "base64url"));
      if (Number.isFinite(exp)) expiresAt = exp * 1000;
    } catch {
      // Let UserInfo handle tokens we cannot parse.
    }
  }

  const handle = createCalendarEventsHandler({
    apiOrigin: url.origin,
    sourceOffset,
    fetchImpl,
    async resolveActor() {
      if (expiresAt !== undefined && expiresAt <= Date.now()) return null;
      const response = await fetchImpl(url.origin + "/auth/connect/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
        redirect: "error",
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      if (response.status === 401) return null;
      if (!response.ok) throw new Error("Gee-O UserInfo unavailable");
      const profile = await response.json();
      if (typeof profile.sub !== "string" || !profile.sub.trim()) return null;
      return {
        accessToken,
        permissions: claims(profile.permission),
        campusIds: claims(profile.branch_ids),
      };
    },
  });

  return input => {
    const headers = input.request.headers;
    const site = headers.get("sec-fetch-site");
    const origin = headers.get("origin");
    if (headers.get("host") !== `127.0.0.1:${port}` ||
        (site && site !== "same-origin" && site !== "none") ||
        (origin && origin !== `http://127.0.0.1:${port}`)) {
      return Response.json({ code: "CALENDAR_FORBIDDEN" }, { status: 403 });
    }
    return handle(input);
  };
}
