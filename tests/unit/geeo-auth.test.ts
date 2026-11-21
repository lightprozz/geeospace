import { afterEach, beforeEach, expect, it, vi } from "vitest";

const cookies = vi.hoisted(() => new Map<string, string>());
vi.mock("js-cookie", () => ({ default: {
  get: (key: string) => cookies.get(key),
  set: (key: string, value: string) => cookies.set(key, value),
  remove: (key: string) => cookies.delete(key),
} }));
const tokenResponse = { access_token: "access-new", refresh_token: "refresh-new", token_type: "Bearer", expires_in: 900 };
const user = { sub: "teacher", name: "Test Teacher", email: "teacher@example.test", role: ["Teacher"], permission: "classes.read,classes.write" };
const json = (value: unknown, status = 200) => Response.json(value, { status });
let store: (typeof import("@/stores/use-auth-store"))["useAuthStore"] | undefined;
beforeEach(() => {
  vi.resetModules();
  cookies.clear();
  vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.geeo.test");
  vi.stubEnv("NEXT_PUBLIC_AUTH_API_URL", "https://auth.geeo.test");
  vi.stubEnv("NEXT_PUBLIC_COOKIE_DOMAIN", "");
  vi.stubGlobal("window", {});
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => {
  store?.getState().logout();
  store = undefined;
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
async function load() {
  const auth = await import("@/stores/use-auth-store");
  store = auth.useAuthStore;
  return { store, token: await import("@/lib/auth/token"), client: await import("@/lib/api-client") };
}
function session(expires = Math.floor(Date.now() / 1000) + 900) {
  cookies.set("GEEO.AUTH", JSON.stringify({ access_token: "access-old", refresh_token: "refresh-old", token_type: "Bearer", expires_at: expires }));
}
it("wires LMS requests to the authenticated API, including void results and ProblemDetails", async () => {
  await load();
  session();
  const { installLmsBrowserTransport } = await import("@/features/lms/lib/browser-transport");
  const { api, resolveApiUrl } = await import("@/features/lms/lib/transport");
  const dispose = installLmsBrowserTransport();
  try {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("uploaded"))
      .mockResolvedValueOnce(Response.json({ status: 403, title: "Forbidden", errorCode: "NO_ACCESS" }, {
        status: 403, headers: { "Content-Type": "application/problem+json" },
      }));
    const data = new FormData();
    data.set("file", "example");
    await expect(api.post("/upload", data, { responseType: "void" })).resolves.toBeUndefined();
    expect(fetch).toHaveBeenCalledWith("https://api.geeo.test/upload", expect.objectContaining({
      method: "POST", body: data, headers: {
        authorization: "Bearer access-old", "x-idempotency-key": expect.any(String),
      },
    }));
    await expect(api.get("/restricted")).rejects.toMatchObject({
      name: "ApiError", status: 403, problem: { errorCode: "NO_ACCESS" },
    });
    expect(resolveApiUrl("/file/lesson%20plan")).toBe("https://api.geeo.test/file/lesson%20plan");
  } finally {
    dispose();
  }
});
it("parses token cookies safely and checks the 120-second expiry boundary", async () => {
  const { token } = await load();
  expect(token.getAuthCookie()).toBeUndefined();
  expect(await token.getAccessTokenRawAsync()).toBeNull();
  for (const raw of ["bad", "null", "123", "{}", '{"access_token":"x","token_type":"Bearer","expires_at":"999"}']) {
    cookies.set("GEEO.AUTH", raw);
    expect(token.getAuthCookie()).toBeUndefined();
  }
  const now = Math.floor(Date.now() / 1000);
  session(now + 120);
  expect(await token.isTokenExpiringSoonAsync()).toBe(true);
  session(now + 121);
  expect(token.isTokenExpiringSoon()).toBe(false);
  expect(await token.getValidToken()).toBe("access-old");
  expect(token.getAuthHeaders()).toEqual({ Authorization: "Bearer access-old" });
  expect(fetch).not.toHaveBeenCalled();
});
it.each([
  ["explicit.pdf", 'attachment; filename="server.pdf"', "explicit.pdf"],
  ["", 'attachment; filename="server.pdf"', ""],
  [undefined, "attachment; filename=plain.pdf", "plain.pdf"],
  [undefined, 'attachment; filename="a;b.pdf"', "a;b.pdf"],
  [undefined, "attachment; filename=plain.pdf; filename*=UTF-8''caf%C3%A9.pdf", "café.pdf"],
  [undefined, "attachment; filename*=UTF-8''bad%ZZ; filename=fallback.pdf", "fallback.pdf"],
  [undefined, "attachment; filename*=UTF-8''bad%ZZ", ""],
  [undefined, null, ""],
])("downloads blobs with filename %s / %s", async (fileName, disposition, expected) => {
  const { client } = await load();
  session();
  const anchor = { href: "", download: undefined as string | undefined, rel: "", style: { display: "" }, click: vi.fn(), remove: vi.fn() };
  vi.stubGlobal("document", { createElement: vi.fn(() => anchor), body: { appendChild: vi.fn() } });
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
  const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  vi.useFakeTimers();
  vi.mocked(fetch).mockResolvedValueOnce(new Response("pdf", { headers: disposition ? { "Content-Disposition": disposition } : {} }));
  await client.downloadAuthenticated("/file", fileName ?? undefined);
  expect(anchor.download).toBe(expected);
  expect(anchor.href).toBe("blob:test");
  expect(anchor.click).toHaveBeenCalledOnce();
  expect(anchor.remove).toHaveBeenCalledOnce();
  await vi.runOnlyPendingTimersAsync();
  expect(revoke).toHaveBeenCalledWith("blob:test");
  vi.restoreAllMocks();
});
it("posts form-encoded token and userinfo payloads, including error cases", async () => {
  const { postToken, fetchUserInfo } = await import("@/lib/auth/api");
  vi.mocked(fetch).mockResolvedValueOnce(json(tokenResponse)).mockResolvedValueOnce(json(user));
  await postToken({ grant_type: "password", username: "a+b@example.test", password: "a&b" });
  await fetchUserInfo("a+b");
  expect(fetch).toHaveBeenNthCalledWith(1, "https://auth.geeo.test/connect/token", expect.objectContaining({ method: "POST", body: "grant_type=password&username=a%2Bb%40example.test&password=a%26b" }));
  expect(fetch).toHaveBeenNthCalledWith(2, "https://auth.geeo.test/connect/userinfo", expect.objectContaining({ body: "access_token=a%2Bb", headers: { "Content-Type": "application/x-www-form-urlencoded" } }));
  vi.mocked(fetch).mockResolvedValueOnce(new Response("invalid_grant", { status: 400 })).mockResolvedValueOnce(new Response(null, { status: 401 }));
  await expect(postToken({})).rejects.toThrow("Token request failed (400)");
  await expect(fetchUserInfo("x")).rejects.toThrow("UserInfo request failed (401)");
});
it("logs in, stores compatible cookies/roles/permissions, initializes and logs out", async () => {
  const { store } = await load();
  vi.mocked(fetch).mockResolvedValueOnce(json(tokenResponse)).mockResolvedValueOnce(json(user)).mockResolvedValueOnce(json(user));
  expect(await store.getState().login("teacher@example.test", "password")).toBe(true);
  const payload = new URLSearchParams(String(vi.mocked(fetch).mock.calls[0][1]?.body));
  expect(Object.fromEntries(payload)).toEqual({ client_id: "react_client_id", grant_type: "password", username: "teacher@example.test", password: "password" });
  expect(store.getState()).toMatchObject({ isAuthenticated: true, isLoading: false, user: { roles: ["Teacher"] } });
  expect(JSON.parse(cookies.get("GEEO.AUTH")!)).toMatchObject({ access_token: "access-new", refresh_token: "refresh-new", token_type: "Bearer", expires_at: expect.any(Number) });
  expect(JSON.parse(cookies.get("GEEO.USERINFO")!)).toEqual(user);
  const { usePermissionStore } = await import("@/stores/use-permission-store");
  expect(usePermissionStore.getState().has("classes.read")).toBe(true);
  expect(usePermissionStore.getState().hasAny(["other", "classes.write"])).toBe(true);
  await Promise.all([store.getState().initialize(), store.getState().initialize()]);
  expect(fetch).toHaveBeenCalledTimes(3);
  store.getState().logout();
  expect(cookies.size).toBe(0);
  expect(usePermissionStore.getState().permissions).toEqual([]);
  expect(store.getState()).toMatchObject({ user: null, isAuthenticated: false });
});
it("initializes expired sessions through refresh and clears orphaned claims without fetching", async () => {
  const { store, token } = await load();
  session(Math.floor(Date.now() / 1000) - 1);
  vi.mocked(fetch).mockResolvedValueOnce(json(tokenResponse)).mockResolvedValueOnce(json(user));
  await store.getState().initialize();
  expect(store.getState()).toMatchObject({ isAuthenticated: true, isLoading: false });
  expect(await token.getValidToken()).toBe("access-new");
  expect(fetch).toHaveBeenCalledTimes(2);
  cookies.delete("GEEO.AUTH");
  await store.getState().initialize();
  expect(cookies.has("GEEO.USERINFO")).toBe(false);
  expect(store.getState()).toMatchObject({ isAuthenticated: false, isLoading: false });
  expect(fetch).toHaveBeenCalledTimes(2);
});
it.each([JSON.stringify(user), undefined, "bad", "null", "{}"])("initializes an expiring session when userinfo fails with cached claims %s", async cached => {
  const { store, token } = await load();
  session(Math.floor(Date.now() / 1000) + 60);
  if (cached !== undefined) cookies.set("GEEO.USERINFO", cached);
  vi.mocked(fetch).mockResolvedValueOnce(json(tokenResponse)).mockRejectedValueOnce(new Error("offline"));
  await store.getState().initialize();
  const restored = cached === JSON.stringify(user);
  expect(store.getState()).toMatchObject({
    isAuthenticated: restored, isLoading: false,
    user: restored ? { ...user, roles: ["Teacher"] } : null,
  });
  expect(await token.getValidToken()).toBe("access-new");
  const { usePermissionStore } = await import("@/stores/use-permission-store");
  expect(usePermissionStore.getState().has("classes.read")).toBe(restored);
  expect(fetch).toHaveBeenCalledTimes(2);
});
it("notifies auth-reset listeners on identity changes and logout, and supports unsubscribe", async () => {
  const { store } = await load();
  const { onAuthReset } = await import("@/stores/use-auth-store");
  const first = vi.fn(), second = vi.fn();
  const unsubscribe = onAuthReset(first);
  onAuthReset(() => { throw new Error("consumer failure"); });
  const stopSecond = onAuthReset(second);
  vi.mocked(fetch).mockResolvedValueOnce(json(tokenResponse)).mockResolvedValueOnce(json(user));
  await store.getState().login("teacher", "password");
  expect(first).toHaveBeenCalledTimes(1);
  vi.mocked(fetch).mockResolvedValueOnce(json(tokenResponse)).mockResolvedValueOnce(json(user));
  await store.getState().refreshToken();
  expect(first).toHaveBeenCalledTimes(1);
  vi.mocked(fetch).mockResolvedValueOnce(json(tokenResponse)).mockResolvedValueOnce(json({ ...user, sub: "another-user" }));
  await store.getState().refreshToken();
  expect(first).toHaveBeenCalledTimes(2);
  unsubscribe();
  store.getState().logout();
  expect(first).toHaveBeenCalledTimes(2);
  expect(second).toHaveBeenCalledTimes(3);
  stopSecond();
});
it("uses the external_api code exchange and handles rejected credentials without a partial session", async () => {
  const { store } = await load();
  vi.mocked(fetch).mockResolvedValueOnce(json(tokenResponse)).mockResolvedValueOnce(json({ ...user, role: "Teacher" }));
  expect(await store.getState().loginWithGoogle("google-code")).toBe(true);
  expect(new URLSearchParams(String(vi.mocked(fetch).mock.calls[0][1]?.body)).get("auth_code")).toBe("google-code");
  expect(new URLSearchParams(String(vi.mocked(fetch).mock.calls[0][1]?.body)).get("grant_type")).toBe("external_api");
  store.getState().logout();
  vi.mocked(fetch).mockResolvedValueOnce(json(tokenResponse)).mockResolvedValueOnce(new Response(null, { status: 500 }));
  expect(await store.getState().login("teacher", "wrong")).toBe(false);
  expect(cookies.size).toBe(0);
});
it("refreshes single-flight, retries once, preserves a non-rotated refresh token and schedules proactive refresh", async () => {
  vi.useFakeTimers();
  const { store } = await load();
  session();
  vi.mocked(fetch).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(json({ ...tokenResponse, refresh_token: undefined })).mockResolvedValueOnce(json(user));
  const first = store.getState().refreshToken(), second = store.getState().refreshToken();
  expect(first).toBe(second);
  await vi.advanceTimersByTimeAsync(1000);
  expect(await first).toBe("access-new");
  expect(fetch).toHaveBeenCalledTimes(3);
  expect(JSON.parse(cookies.get("GEEO.AUTH")!).refresh_token).toBe("refresh-old");
  vi.mocked(fetch).mockResolvedValueOnce(json(tokenResponse)).mockResolvedValueOnce(json(user));
  await vi.advanceTimersByTimeAsync(780000);
  expect(fetch).toHaveBeenCalledTimes(5);
});
it("logs out after exhausted refresh retries, and does not retry invalid grants", async () => {
  vi.useFakeTimers();
  const { store } = await load();
  session();
  vi.mocked(fetch).mockRejectedValue(new Error("offline"));
  const pending = store.getState().refreshToken();
  await vi.advanceTimersByTimeAsync(1000);
  expect(await pending).toBeNull();
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(cookies.size).toBe(0);
  session();
  vi.mocked(fetch).mockReset().mockResolvedValue(new Response("invalid_grant", { status: 400 }));
  expect(await store.getState().refreshToken()).toBeNull();
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("does not revive a session when logout happens during a refresh", async () => {
  const { store } = await load();
  session();
  let resolve!: (response: Response) => void;
  vi.mocked(fetch).mockImplementationOnce(() => new Promise(r => { resolve = r; }));
  const pending = store.getState().refreshToken();
  await Promise.resolve();
  store.getState().logout();
  resolve(json(tokenResponse));
  expect(await pending).toBeNull();
  expect(cookies.size).toBe(0);
});
it("retries API 401 once with the refreshed token, preserving body and idempotency, then logs out on another 401", async () => {
  const { client, store } = await load();
  session();
  vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 401 })).mockResolvedValueOnce(json(tokenResponse)).mockResolvedValueOnce(json(user)).mockResolvedValueOnce(json({ ok: true }));
  expect(await client.api.post("/api/v2/example", { name: "test" })).toEqual({ ok: true });
  const initial = vi.mocked(fetch).mock.calls[0][1]!, retry = vi.mocked(fetch).mock.calls[3][1]!;
  expect(new Headers(retry.headers).get("authorization")).toBe("Bearer access-new");
  expect(new Headers(retry.headers).get("x-idempotency-key")).toBe(new Headers(initial.headers).get("x-idempotency-key"));
  expect(retry.body).toBe(initial.body);
  vi.mocked(fetch).mockReset().mockResolvedValueOnce(new Response(null, { status: 401 })).mockResolvedValueOnce(json(tokenResponse)).mockResolvedValueOnce(json(user)).mockResolvedValueOnce(new Response(null, { status: 401 }));
  await expect(client.api.get("/denied")).rejects.toMatchObject({ status: 401 });
  expect(store.getState().isAuthenticated).toBe(false);
  expect(cookies.size).toBe(0);
});
it("keeps DELETE as the method even when caller options specify another method", async () => {
  const { client } = await load();
  session();
  vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 204 }));
  await client.api.delete("/example", { method: "POST", headers: { "X-Test": "preserved" } });
  expect(fetch).toHaveBeenCalledWith("https://api.geeo.test/example", expect.objectContaining({
    method: "DELETE", headers: expect.objectContaining({ "x-test": "preserved" }),
  }));
});
it("maps ProblemDetails, supports interceptors, and accepts any empty successful response", async () => {
  const { client } = await load();
  session();
  const request = vi.fn(), response = vi.fn();
  client.addRequestInterceptor(request);
  client.addResponseInterceptor(response);
  const problem = { type: "validation", title: "Invalid", status: 422, detail: "Invalid field", errorCode: "FIELD" };
  vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(problem), { status: 422, headers: { "Content-Type": "application/problem+json" } }));
  await expect(client.api.get("/invalid")).rejects.toMatchObject({ name: "ApiError", status: 422, message: "[FIELD] Invalid field", problem });
  expect(request).toHaveBeenCalledTimes(1);
  expect(response).toHaveBeenCalledTimes(1);
  for (const status of [200, 201, 202, 204, 205, 299]) {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status }));
    expect(await client.apiFetch("/legacy-upload")).toBeUndefined();
  }
  vi.mocked(fetch).mockResolvedValueOnce(new Response("  "));
  expect(await client.apiFetch("/empty")).toBeUndefined();
});
it.each([
  [JSON.stringify({ title: "Lesson not found" }), "application/json", "Lesson not found"],
  [JSON.stringify({ title: "Lesson not found", detail: "  Choose another lesson.  " }), "application/problem+json", "Choose another lesson."],
  [JSON.stringify({ title: "Lesson not found", detail: " " }), "text/plain", "Lesson not found"],
  [JSON.stringify({ title: 42, detail: [] }), "application/json", "Request failed (404)"],
  ["{}", "application/problem+json", "Request failed (404)"],
  ["", "application/json", "Request failed (404)"],
  ["{invalid", "application/problem+json", "Request failed (404)"],
  ["[]", "application/json", "Request failed (404)"],
  ["null", "application/json", "Request failed (404)"],
  ["Lesson unavailable", "text/plain", "Lesson unavailable"],
])("extracts readable API errors from %s (%s)", async (body, contentType, message) => {
  await load();
  session();
  const { installLmsBrowserTransport } = await import("@/features/lms/lib/browser-transport");
  const { api } = await import("@/features/lms/lib/transport");
  const dispose = installLmsBrowserTransport();
  try {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(body, { status: 404, headers: { "Content-Type": contentType } }));
    await expect(api.get("/missing")).rejects.toMatchObject({ name: "ApiError", status: 404, message });
  } finally {
    dispose();
  }
});
it.each(["NEXT_PUBLIC_API_URL", "NEXT_PUBLIC_AUTH_API_URL"])("does not fetch when %s is missing", async variable => {
  vi.stubEnv(variable, "");
  const { store, client, token } = await load();
  const { postToken, fetchUserInfo } = await import("@/lib/auth/api");
  session();
  await store.getState().initialize();
  expect(await store.getState().login("a", "b")).toBe(false);
  expect(await store.getState().loginWithGoogle("code")).toBe(false);
  expect(await store.getState().refreshToken()).toBeNull();
  expect(await token.getValidToken()).toBeNull();
  await expect(postToken({})).rejects.toThrow("not configured");
  await expect(fetchUserInfo("token")).rejects.toThrow("not configured");
  await expect(client.apiFetch("/anything")).rejects.toThrow("not configured");
  await expect(client.downloadAuthenticated("/file")).rejects.toThrow("not configured");
  expect(fetch).not.toHaveBeenCalled();
});
