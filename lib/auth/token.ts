import Cookies from "js-cookie";
import { COOKIE_AUTH } from "./constants";
import { isGeeoConfigured } from "@/lib/env";

export interface AuthCookieData {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_at: number;
}

export function getAuthCookie(): AuthCookieData | undefined {
  try {
    const raw = Cookies.get(COOKIE_AUTH);
    if (!raw) return;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return;
    const auth = value as AuthCookieData;
    if (typeof auth.access_token !== "string" || !auth.access_token || typeof auth.token_type !== "string" ||
      typeof auth.expires_at !== "number" || !Number.isFinite(auth.expires_at) ||
      (auth.refresh_token !== undefined && typeof auth.refresh_token !== "string")) return;
    return auth;
  } catch { return; }
}
export async function getAuthCookieAsync() { return getAuthCookie(); }
export function isTokenExpiringSoon() {
  const auth = getAuthCookie();
  return !auth || auth.expires_at <= Math.floor(Date.now() / 1000) + 120;
}
export async function isTokenExpiringSoonAsync() { return isTokenExpiringSoon(); }
export function getAccessTokenRaw(): string | null { return getAuthCookie()?.access_token ?? null; }
export async function getAccessTokenRawAsync() { return getAccessTokenRaw(); }
export function getAccessTokenSync() { return getAccessTokenRaw(); }
export function getAuthHeaders(): Record<string, string> {
  const token = getAccessTokenSync();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
export async function getValidToken(): Promise<string | null> {
  if (!isGeeoConfigured || typeof window === "undefined") return null;
  if (!isTokenExpiringSoon()) return getAccessTokenRaw();
  const { useAuthStore } = await import("@/stores/use-auth-store");
  return useAuthStore.getState().refreshToken();
}
