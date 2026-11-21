// ---------------------------------------------------------------------------
// Auth Constants — shared across auth-api, auth-store, and middleware
// Migrated from: LoginApp/@core/constants/common.ts + config-global.ts
// ---------------------------------------------------------------------------

/** Cookie key used to persist the OIDC token set (access, refresh, expires_at) */
export const COOKIE_AUTH = "GEEO.AUTH" as const

/** OAuth 2.0 client_id registered in AuthAPI (Duende IdentityServer) */
export const CLIENT_ID = "react_client_id" as const

/** Requested OIDC scopes */
export const SCOPES =
  "openid profile email roles name geeo_api offline_access" as const

/** OAuth 2.0 grant types used by this app */
export const GrantType = {
  PASSWORD: "password",
  REFRESH_TOKEN: "refresh_token",
  EXTERNAL_API: "external_api",
} as const

/** AuthAPI base URL — read from env at build time */
export const AUTH_API_URL =
  (process.env.NEXT_PUBLIC_AUTH_API_URL ?? "").trim().replace(/\/+$/, "")

/** Cookie domain for cross-subdomain sharing */
export const COOKIE_DOMAIN = process.env.NEXT_PUBLIC_COOKIE_DOMAIN ?? ""

/** Google OAuth client ID */
export const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ""
