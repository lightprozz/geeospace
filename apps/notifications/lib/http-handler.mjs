import { privateJson } from "@geeo/embedded-app/server";
import { getNotifications } from "../notification-data.mjs";
export function createNotificationRoutes(load = getNotifications) {
  return async function handle(request, summary = false) {
    if (new URL(request.url).search) return privateJson({ code: "INVALID_QUERY" }, 400);
    try {
      const result = await load({ request });
      const data = await result.json();
      if (!result.ok) return privateJson({ code: data.code }, result.status);
      return privateJson(summary ? { status: "ready", count: data.events.length, observedAt: data.observedAt } : data);
    } catch { return privateJson({ code: "NOTIFICATIONS_UNAVAILABLE" }, 503); }
  };
}
export const handleNotifications = createNotificationRoutes();
