// ---------------------------------------------------------------------------
// Auth API — thin HTTP layer for AuthAPI (Duende IdentityServer) endpoints
// Replaces: LoginApp/@core/services/auth.service.ts +
//           LoginApp/@core/services/base/axiosInitialize.ts
// Uses native fetch() instead of axios for smaller bundle & Next.js alignment.
// ---------------------------------------------------------------------------

import { AUTH_API_URL } from "./constants"
import { isGeeoConfigured } from "@/lib/env"

// ---- Types ----------------------------------------------------------------

export interface TokenResponse {
  access_token: string
  refresh_token?: string
  token_type: string
  expires_in: number
  scope?: string
}

export interface UserInfo {
  sub: string
  name?: string
  email?: string
  role?: string | string[]
  isVerified?: string
  [key: string]: unknown
}

// ---- Token endpoint -------------------------------------------------------

/**
 * POST to `connect/token` with form-urlencoded payload.
 *
 * Supports three grant types:
 * - `password` — email/password login (ROPC)
 * - `refresh_token` — silent refresh
 * - `external_api` — Google auth_code exchange
 */
export async function postToken(
  payload: Record<string, string>,
): Promise<TokenResponse> {
  if (!isGeeoConfigured) throw new Error("Gee-O is not configured")
  const body = new URLSearchParams(payload)

  const res = await fetch(`${AUTH_API_URL}/connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  })

  if (!res.ok) {
    const errorText = await res.text().catch(() => "Unknown error")
    throw new Error(
      `Token request failed (${res.status}): ${errorText}`,
    )
  }

  return res.json() as Promise<TokenResponse>
}

// ---- UserInfo endpoint ----------------------------------------------------

/**
 * POST to `connect/userinfo` with access token to retrieve user claims.
 *
 * Token is sent as form body parameter (OIDC spec section 5.3.2) to avoid
 * CORS preflight — form-urlencoded is a simple Content-Type and no custom
 * headers are present, so browsers classify this as a simple request.
 */
export async function fetchUserInfo(
  accessToken: string,
): Promise<UserInfo> {
  if (!isGeeoConfigured) throw new Error("Gee-O is not configured")
  const body = new URLSearchParams({ access_token: accessToken })

  const res = await fetch(`${AUTH_API_URL}/connect/userinfo`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  })

  if (!res.ok) {
    throw new Error(`UserInfo request failed (${res.status})`)
  }

  return res.json() as Promise<UserInfo>
}
