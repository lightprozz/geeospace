import { describe, expect, it } from "vitest";
import { readSettings } from "@/lib/config/env";
import { problemResponse } from "@/lib/http/problem";
import { loadReadOnlySource } from "@/lib/http/source-result";
import { GET as health } from "@/app/api/health/route";

describe("configuration boundary", () => {
  it("fails health closed outside development without a Worker request context", async () => {
    const response = await health();
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: "CONFIGURATION_INVALID", retryable: false });
  });
  it("requires an explicit HTTPS origin outside development", () => {
    expect(() => readSettings({ APP_ENV: "production" })).toThrow("APP_ORIGIN");
    expect(() => readSettings({ APP_ENV: "staging", APP_ORIGIN: "http://example.com" })).toThrow("APP_ORIGIN");
    expect(() => readSettings({ APP_ORIGIN: "https://user:password@example.com" })).toThrow("APP_ORIGIN");
    expect(() => readSettings({ APP_ORIGIN: "https://example.com/path" })).toThrow("APP_ORIGIN");
    expect(readSettings({}).auth.status).toBe("unconfigured");
  });
  it("rejects partial auth configuration without exposing values", () => {
    const secret = "do-not-expose";
    expect(() => readSettings({ GEEO_AUTH_CLIENT_ID: secret })).toThrow("GEEO_AUTH");
    try { readSettings({ GEEO_AUTH_ISSUER: secret, GEEO_AUTH_CLIENT_ID: "client" }); }
    catch (error) { expect(String(error)).not.toContain(secret); }
  });
  it("keeps issuer paths and rejects user-controlled URL components", () => {
    const settings = readSettings({ APP_ENV: "production", APP_ORIGIN: "https://space.example", GEEO_AUTH_ISSUER: "https://auth.example/identity", GEEO_AUTH_CLIENT_ID: "space" });
    expect(settings.auth.issuer).toBe("https://auth.example/identity");
    expect(() => readSettings({ APP_ORIGIN: "https://space.example?redirect=elsewhere" })).toThrow();
  });
});

describe("source isolation and response contracts", () => {
  it("keeps the available source when another fails", async () => {
    const results = await Promise.all([loadReadOnlySource(async () => ["real-result"], 100), loadReadOnlySource(async () => { throw Error("private upstream detail"); }, 100)]);
    expect(results[0]).toMatchObject({ status: "ready", data: ["real-result"] });
    expect(results[1]).toMatchObject({ status: "unavailable", reason: "failed" });
    expect(JSON.stringify(results[1])).not.toContain("private upstream detail");
    expect(results[1]).not.toHaveProperty("data");
  });
  it("settles a source even when it ignores cancellation", async () => {
    const result = await loadReadOnlySource(() => new Promise<never>(() => {}), 5);
    expect(result).toMatchObject({ status: "unavailable", reason: "timeout" });
  });
  it("propagates cancellation to cooperative read adapters", async () => {
    let aborted = false;
    const result = await loadReadOnlySource((signal) => new Promise<never>((_, reject) => {
      signal.addEventListener("abort", () => { aborted = true; reject(new Error("cancelled")); }, { once: true });
    }), 5);
    expect(aborted).toBe(true);
    expect(result).toMatchObject({ status: "unavailable", reason: "timeout" });
  });
  it("returns non-cacheable problem details with an independent request ID", async () => {
    const response = problemResponse(503, "UNCONFIGURED", "Chưa kết nối");
    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    const body = await response.json();
    expect(body).toMatchObject({ requestId: response.headers.get("X-Request-ID") });
    expect(response.headers.get("X-Request-ID")).not.toBe(problemResponse(503, "UNCONFIGURED", "Chưa kết nối").headers.get("X-Request-ID"));
  });
});
