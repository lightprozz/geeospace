import Cookies from "js-cookie";
import { create } from "zustand";
import { fetchUserInfo, postToken, type TokenResponse, type UserInfo } from "@/lib/auth/api";
import { CLIENT_ID, COOKIE_AUTH, COOKIE_DOMAIN, GrantType, SCOPES } from "@/lib/auth/constants";
import { getAuthCookie, type AuthCookieData } from "@/lib/auth/token";
import { isGeeoConfigured } from "@/lib/env";
import { usePermissionStore } from "./use-permission-store";

export interface AuthUser extends UserInfo { roles: string[] }
interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  initialize: () => Promise<void>;
  login: (username: string, password: string) => Promise<boolean>;
  loginWithGoogle: (authCode: string) => Promise<boolean>;
  logout: () => void;
  refreshToken: () => Promise<string | null>;
}

const COOKIE_USERINFO = "GEEO.USERINFO";
const resetListeners = new Set<() => void>();
export function onAuthReset(listener: () => void): () => void {
  resetListeners.add(listener);
  return () => { resetListeners.delete(listener); };
}
function notifyAuthReset() {
  for (const listener of [...resetListeners]) {
    try { listener(); } catch { /* One consumer must not prevent other session resets. */ }
  }
}
const cookieOptions = (): Cookies.CookieAttributes => ({
  path: "/", sameSite: "lax", secure: typeof location !== "undefined" && location.protocol === "https:",
  ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
});
function normalizeUser(info: UserInfo): AuthUser {
  const role = info.role;
  return { ...info, roles: (Array.isArray(role) ? role : role ? [role] : []).filter(r => typeof r === "string") };
}
function authCookie(data: TokenResponse, previousRefresh?: string): AuthCookieData {
  if (!data.access_token || !Number.isFinite(data.expires_in) || data.expires_in <= 0) throw new Error("Invalid token response");
  return {
    access_token: data.access_token, refresh_token: data.refresh_token ?? previousRefresh,
    token_type: data.token_type || "Bearer", expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
  };
}
function saveAuth(auth: AuthCookieData) { Cookies.set(COOKIE_AUTH, JSON.stringify(auth), cookieOptions()); }
function saveUser(info: UserInfo) {
  if (useAuthStore.getState().user?.sub !== info.sub) notifyAuthReset();
  Cookies.set(COOKIE_USERINFO, JSON.stringify(info), cookieOptions());
  usePermissionStore.getState().refresh();
}
let timer: ReturnType<typeof setTimeout> | undefined;
let refreshPromise: Promise<string | null> | null = null;
let initializePromise: Promise<void> | null = null;
let generation = 0;
function scheduleRefresh() {
  clearTimeout(timer);
  const auth = getAuthCookie();
  if (!auth) return;
  timer = setTimeout(() => { void useAuthStore.getState().refreshToken(); },
    Math.min(2147483647, Math.max(1000, (auth.expires_at - Math.floor(Date.now() / 1000) - 120) * 1000)));
}

async function signIn(payload: Record<string, string>): Promise<boolean> {
  if (!isGeeoConfigured) return false;
  const version = ++generation;
  clearTimeout(timer);
  try {
    const data = await postToken({ client_id: CLIENT_ID, ...payload });
    const auth = authCookie(data);
    const info = await fetchUserInfo(auth.access_token);
    if (version !== generation) return false;
    saveAuth(auth);
    saveUser(info);
    useAuthStore.setState({ user: normalizeUser(info), isAuthenticated: true, isLoading: false });
    scheduleRefresh();
    return true;
  } catch {
    if (version === generation) useAuthStore.getState().logout();
    return false;
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null, isLoading: true, isAuthenticated: false,
  initialize: () => {
    if (initializePromise) return initializePromise;
    const version = generation;
    initializePromise = Promise.resolve().then(async () => {
      if (!isGeeoConfigured) {
        if (version === generation) set({ user: null, isLoading: false, isAuthenticated: false });
        usePermissionStore.setState({ permissions: [], isLoaded: true });
        return;
      }
      if (!getAuthCookie()) { if (version === generation) get().logout(); return; }
      try {
        const auth = getAuthCookie()!;
        if (auth.expires_at <= Math.floor(Date.now() / 1000) + 120) {
          await get().refreshToken();
        } else {
          const info = await fetchUserInfo(auth.access_token);
          if (version !== generation) return;
          saveUser(info);
          set({ user: normalizeUser(info), isAuthenticated: true });
          scheduleRefresh();
        }
      } catch {
        if (version === generation) get().logout();
      } finally {
        if (version === generation) set({ isLoading: false });
      }
    }).finally(() => { initializePromise = null; });
    return initializePromise;
  },
  login: (username, password) => signIn({ grant_type: GrantType.PASSWORD, username, password }),
  loginWithGoogle: authCode => signIn({ grant_type: GrantType.EXTERNAL_API, username: "", password: "", auth_code: authCode }),
  logout: () => {
    generation++;
    clearTimeout(timer);
    for (const key of [COOKIE_AUTH, COOKIE_USERINFO]) Cookies.remove(key, cookieOptions());
    usePermissionStore.setState({ permissions: [], isLoaded: true });
    set({ user: null, isAuthenticated: false, isLoading: false });
    notifyAuthReset();
  },
  refreshToken: () => {
    if (refreshPromise) return refreshPromise;
    const version = generation;
    const promise = Promise.resolve().then(async (): Promise<string | null> => {
      if (!isGeeoConfigured) return null;
      const auth = getAuthCookie();
      if (!auth?.refresh_token) { get().logout(); return null; }
      for (let attempt = 0; attempt < 2; attempt++) {
        if (version !== generation) return null;
        try {
          const data = await postToken({
            client_id: CLIENT_ID, grant_type: GrantType.REFRESH_TOKEN,
            refresh_token: auth.refresh_token, scope: SCOPES,
          });
          if (version !== generation) return null;
          const updated = authCookie(data, auth.refresh_token);
          saveAuth(updated);
          try {
            const info = await fetchUserInfo(updated.access_token);
            if (version !== generation) return null;
            saveUser(info);
            set({ user: normalizeUser(info), isAuthenticated: true, isLoading: false });
          } catch { /* Keep a valid refreshed token when userinfo is temporarily unavailable. */ }
          if (version !== generation) return null;
          scheduleRefresh();
          return updated.access_token;
        } catch (error) {
          if (version !== generation) return null;
          const latest = getAuthCookie();
          if (latest && latest.refresh_token !== auth.refresh_token && latest.expires_at > Math.floor(Date.now() / 1000)) {
            try {
              const info = await fetchUserInfo(latest.access_token);
              if (version !== generation) return null;
              saveUser(info);
              set({ user: normalizeUser(info), isAuthenticated: true, isLoading: false });
              scheduleRefresh();
              return latest.access_token;
            } catch { break; }
          }
          if (attempt === 0 && !(error instanceof Error && error.message.startsWith("Token request failed (400)"))) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else break;
        }
      }
      if (version === generation) get().logout();
      return null;
    });
    refreshPromise = promise;
    void promise.finally(() => { if (refreshPromise === promise) refreshPromise = null; });
    return promise;
  },
}));
