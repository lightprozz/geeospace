# Browser-side Gee-O authentication

Set the public variables in `.env.example` in `.env.local`, then restart Next.
Both `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_AUTH_API_URL` are required; without
either, Account retains its unconfigured state and auth/API helpers never fetch.
Use HTTPS origins in production. There are no localhost fallback endpoints.
These values are public build-time configuration, never client secrets.

Sign in from Account or the menubar. LMS windows prompt for sign-in until
authentication completes; the desktop remains usable during initialization.
There is no login route, route redirect, BFF integration, or permission-based
app hiding. The existing server auth route and server config are unchanged.

The browser uses AuthAPI `connect/token` (password or Google external_api grant)
and `connect/userinfo`. Google is optional: set `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
and register the workspace origin with Google and the auth-code exchange with
AuthAPI. The Google provider/scripts are loaded only when configured and the
Account form is shown. Backend CORS must allow the workspace origin and API
Authorization/Content-Type/X-Idempotency-Key headers.

`GEEO.AUTH` stores `access_token`, `refresh_token`, `token_type`, `expires_at`
(Unix seconds); `GEEO.USERINFO` stores the raw userinfo claims. Both use path
`/`, SameSite=Lax and Secure on HTTPS (HTTP is supported for local development).
Set `NEXT_PUBLIC_COOKIE_DOMAIN` to the shared parent domain to share cookies
with frontendv2. Blank keeps them host-only. These are frontendv2-compatible,
JavaScript-readable session cookies, not HttpOnly BFF sessions. Logout removes
them at the configured path/domain and clears permissions; it does not revoke
the identity provider session.

`@/lib/auth/token` is browser-only; its async compatibility APIs do not read
server cookies. `getValidToken()` proactively refreshes within 120 seconds of
expiry. Refresh is single-flight, retries once after one second (except rejected
400 grants), re-fetches claims, and schedules the next refresh. API 401s refresh
and retry once, then log out without leaving the desktop. API 403s remain typed
errors, without navigation. `apiFetch` returns undefined for empty 2xx bodies.

Permissions are available through `usePermissionStore.has/hasAny/hasAll` and
updated with user claims. They are a UI convenience; authorization remains the
backend's responsibility.

`onAuthReset(listener)` from `@/stores/use-auth-store` registers synchronous
cache/draft cleanup and returns an unsubscribe function. It fires on every
logout and before publishing a different user subject (including initial sign-in),
but not for a refresh of the same subject. Listener errors are isolated so one
consumer cannot prevent other resets or logout.

Playwright starts an additional isolated Next dev server on port 3101 with
fake HTTPS API origins and `.next/auth` output. Auth/group tests mock these
origins; the regular server on 3100 stays unconfigured. No live backend or
Google identity is required for the mocks.
