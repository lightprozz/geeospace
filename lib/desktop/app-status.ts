export type AppStatus = {
  status: "ready" | "loading" | "unconfigured" | "unauthorized" | "forbidden" | "error" | "stale";
  count: number | null;
  observedAt: string | null;
};
export const disconnectedStatus: AppStatus = { status: "unconfigured", count: null, observedAt: null };
export const statusLifetime = 150_000;

export function notificationsOrigin() {
  const value = process.env.NEXT_PUBLIC_SPACEOS_NOTIFICATIONS_ORIGIN;
  return exactAppOrigin(value);
}
export function exactAppOrigin(value: string | undefined) {
  try {
    const url = new URL(value ?? "");
    if (url.origin === value && (url.protocol === "https:" ||
        (url.protocol === "http:" && ["127.0.0.1", "localhost"].includes(url.hostname)))) return value;
  } catch { /* Unconfigured integrations stay closed. */ }
}

/** Called only after origin and WindowProxy ownership have been checked. */
export function parseAppStatus(value: unknown, instanceId: string, previousSequence: number, now: number): (AppStatus & { sequence: number }) | undefined {
  if (!value || typeof value !== "object") return;
  const data = value as Record<string, unknown>;
  if (data.type !== "spaceos:app-status" || data.version !== 1 || data.appId !== "notifications" || data.instanceId !== instanceId ||
      !Number.isSafeInteger(data.sequence) || (data.sequence as number) <= previousSequence ||
      !["ready", "unconfigured", "unauthorized", "forbidden", "error"].includes(data.status as string)) return;
  if (data.status === "ready") {
    if (!Number.isSafeInteger(data.count) || (data.count as number) < 0 || (data.count as number) > 5000 || typeof data.observedAt !== "string") return;
    const observed = Date.parse(data.observedAt);
    if (!Number.isFinite(observed) || observed > now + 30_000 || now - observed > statusLifetime) return;
  } else if (data.count !== null || data.observedAt !== null) return;
  return { status: data.status as AppStatus["status"], count: data.count as number | null, observedAt: data.observedAt as string | null, sequence: data.sequence as number };
}
