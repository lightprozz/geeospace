// ---------------------------------------------------------------------------
// Permission Store — reads permissions from GEEO.USERINFO cookie
// Permissions come from /connect/userinfo response, cached by useAuthStore.
// Backend re-validates via AuthAPI introspection on every API request.
// ---------------------------------------------------------------------------

import Cookies from "js-cookie"
import { create } from "zustand"

const COOKIE_USERINFO = "GEEO.USERINFO" as const

// ---- Helpers ----------------------------------------------------------------

function parsePermissionsCookie(): string[] {
  const raw = Cookies.get(COOKIE_USERINFO)
  if (!raw) {
    return []
  }
  try {
    const info = JSON.parse(raw)
    const perm = info.permission
    if (!perm) {
      return []
    }
    return (typeof perm === "string" ? perm.split(",") : Array.isArray(perm) ? perm : [])
      .filter((p: unknown): p is string => typeof p === "string").map((p: string) => p.trim()).filter(Boolean)
  } catch {
    return []
  }
}

// ---- Types ------------------------------------------------------------------

interface PermissionState {
  permissions: string[]
  isLoaded: boolean

  has: (perm: string) => boolean
  hasAny: (perms: string[]) => boolean
  hasAll: (perms: string[]) => boolean
  refresh: () => void
  initialize: () => void
}

// ---- Store ------------------------------------------------------------------

export const usePermissionStore = create<PermissionState>((set, get) => ({
  permissions: [],
  isLoaded: false,

  has: (perm) => get().permissions.includes(perm),

  hasAny: (perms) => perms.some((p) => get().permissions.includes(p)),

  hasAll: (perms) => perms.every((p) => get().permissions.includes(p)),

  // Re-read from cookie (useAuthStore.refreshToken updates the cookie)
  refresh: () => {
    set({ permissions: parsePermissionsCookie(), isLoaded: true })
  },

  // Read cookie synchronously — no API call needed
  initialize: () => {
    set({ permissions: parsePermissionsCookie(), isLoaded: true })
  },
}))
