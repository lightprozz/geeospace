# Running Notifications locally

Notifications uses Next.js App Router, React, and TypeScript in `apps/notifications/`, with Node.js ≥22 <27. Shared UI/theme/bridge is in `packages/embedded-app/`. The fixed app port is 3300; SpaceOS uses 3100. Run `npm ci` from the root and check port ownership before starting. Do not choose another port to bypass an existing server.

```sh
SPACEOS_PARENT_ORIGIN=http://127.0.0.1:3100 npm --prefix apps/notifications run dev
```

For persistent local configuration, copy the app's environment sample into its Next.js local environment file without overwriting an existing file. Next.js loads that file for this app; host configuration does not replace it. The sample contains only the public parent origin. Keep local environment files ignored and restart development after changes.

Set `NEXT_PUBLIC_SPACEOS_NOTIFICATIONS_ORIGIN=http://127.0.0.1:3300` for SpaceOS and run `npm run dev`. This public origin is embedded at build time; rebuild production with the correct HTTPS origin. Host and app use different origins. Open `http://127.0.0.1:3300` standalone or SpaceOS `/notifications`. Stop only processes you started with Ctrl+C.

`SPACEOS_PARENT_ORIGIN` must be an exact HTTPS origin, or HTTP localhost/127.0.0.1 for development. Without it, standalone works and CSP rejects all frame ancestors. GET `/api/notifications` and `/api/status` reject extra queries and mutations. Responses are not cached. The bridge carries no token and provides no SSO. Production requires app sessions/cookies under the selected identity design.

Production uses `npm --prefix apps/notifications run build`, then `npm --prefix apps/notifications start`. Supply the same parent origin at build and runtime: CSP is built, bridge context reads runtime configuration. Rebuild after origin changes. The app has its own artifact; host builds do not build independent apps. No Notification session/API-token environment variable is wired in yet; the adapter needs real server integration.

## Real source integration

The default entry returns 503 `NOTIFICATIONS_NOT_CONFIGURED` without a GeeO session. Origin configuration connects presentation only. Never put tokens in `NEXT_PUBLIC_*`, URLs, localStorage, or postMessage.

Use `createNotificationsHandler` in [notification-data](../../apps/notifications/notification-data.mjs), passing the configured handler into `createNotificationRoutes(load)` in [HTTP handler](../../apps/notifications/lib/http-handler.mjs). Both Next.js routes use exported `handleNotifications`.

- `apiOrigin`: verified exact HTTPS origin with the legacy endpoint. The route comes from legacy callers; live authorized access remains unverified.
- `resolveActor(request)`: validate the server session, then return `subject`, `accessToken`, and `canReadUserEvents`. Never trust these from client-provided query/header fields. Backend recipient checks still apply.
- `sourceOffset`: only for offset-free upstream timestamps, with owner confirmation.

Keep the default adapter until resolver/access evidence exists. Do not reuse old bundle tokens or other people's credentials. No database, migration, or read-state is added here.

Keep 401/403/503 distinct from empty snapshots. Invalid payloads/timeouts are unavailable, not empty. `/api/status` contains count/observation time without titles. Updates currently poll every 60 seconds; no push or read receipts exist.

## Checks

```sh
npm --prefix apps/notifications test
npm run typecheck:apps
npm run build:apps
npx vitest run tests/unit/app-status.test.ts tests/unit/desktop-window.test.ts
npm run test:notifications
npm run test:embedded
npm run typecheck
npm run lint
npm run build
```

The [Notifications harness](../../playwright.notifications.config.ts) starts absent services, reuses local servers, and stops only servers it creates. Verify the Notifications origin when reusing SpaceOS. CI does not reuse servers. Fixtures remain test-only. Browser checks cover both modes, failures, search/details, responsive behavior, locale, and status channel. Choose relevant checks; use one local worker unless safe parallelism is justified.

See [Notifications design and badge semantics](../design/spaceos-notifications-and-app-status.md).
