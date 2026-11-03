import { describe, expect, it } from "vitest";
import { exactAppOrigin, parseAppStatus, statusLifetime } from "@/lib/desktop/app-status";
const now = Date.now();
const message = { type: "spaceos:app-status", version: 1, appId: "notifications", instanceId: "frame-1", sequence: 1, status: "ready", count: 3, observedAt: new Date(now).toISOString() };
describe("app status boundary", () => {
  it("accepts only exact HTTPS or loopback origins", () => {
    expect(exactAppOrigin("http://127.0.0.1:3300")).toBe("http://127.0.0.1:3300");
    for (const origin of ["http://remote.example", "https://x.example/", "https://u:p@x.example", "javascript:alert(1)"]) expect(exactAppOrigin(origin)).toBeUndefined();
  });
  it("binds status to app, version, instance and monotonic sequence", () => {
    expect(parseAppStatus(message, "frame-1", 0, now)?.count).toBe(3);
    for (const patch of [{ appId: "calendar" }, { version: 2 }, { instanceId: "another" }, { sequence: 0 }, { count: -1 }, { count: Infinity }, { count: 0.5 }]) expect(parseAppStatus({ ...message, ...patch }, "frame-1", 0, now)).toBeUndefined();
    expect(parseAppStatus(message, "frame-1", 1, now)).toBeUndefined();
  });
  it("rejects stale, future and malformed observation times", () => {
    for (const observedAt of ["bad", new Date(now - statusLifetime - 1).toISOString(), new Date(now + 60_000).toISOString()]) expect(parseAppStatus({ ...message, observedAt }, "frame-1", 0, now)).toBeUndefined();
  });
  it("never treats unavailable as zero or includes arbitrary content", () => {
    expect(parseAppStatus({ ...message, status: "error" }, "frame-1", 0, now)).toBeUndefined();
    expect(parseAppStatus({ ...message, status: "error", count: null, observedAt: null, title: "private" }, "frame-1", 0, now)).toEqual({ status: "error", count: null, observedAt: null, sequence: 1 });
  });
});
