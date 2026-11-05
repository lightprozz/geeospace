# Running Calendar locally

Calendar uses Next.js App Router, React, and TypeScript with Node.js ≥22 <27. Its workspace is `apps/calendar/`, fixed port 3200; SpaceOS uses 3100. Shared UI/theme/bridge is in `packages/embedded-app/`. Run `npm ci` from the repository root. Check port ownership before starting; do not choose another port to bypass a live process.

```sh
SPACEOS_PARENT_ORIGIN=http://127.0.0.1:3100 npm --prefix apps/calendar run dev
```

Set `NEXT_PUBLIC_SPACEOS_CALENDAR_ORIGIN=http://127.0.0.1:3200` for SpaceOS and run `npm run dev`. The public value is embedded at build time; production requires rebuilding with the correct HTTPS origin. Host and app must have different origins. Open `http://127.0.0.1:3200` standalone or SpaceOS `/calendar`. Stop only processes you started, using Ctrl+C.

Production uses `npm --prefix apps/calendar run build`, then `npm --prefix apps/calendar start`. Supply the same `SPACEOS_PARENT_ORIGIN` during build and runtime: CSP is generated at build time, while bridge context reads runtime configuration. Rebuild after changing origins. Production needs a real session adapter; local MVP is disabled there.

`SPACEOS_PARENT_ORIGIN` must be an exact HTTPS origin, or HTTP localhost/127.0.0.1 for development. Without it, standalone works and CSP rejects all frame ancestors. `GET /api/events` accepts date-formatted `from`/`to`, with `to` after `from` and at most 42 days. Invalid ranges return 400 `INVALID_DATE_RANGE`. Responses are not cached. The [bridge](../../components/desktop/embedded-calendar.tsx) carries no token.

## Real source integration

Default entry has no GeeO session and returns 503 `CALENDAR_NOT_CONFIGURED`. Origin configuration connects presentation only. Never put tokens in `NEXT_PUBLIC_*`, URLs, localStorage, or postMessage.

Integrate `createCalendarEventsHandler` in [calendar-data](../../apps/calendar/calendar-data.mjs), `handleCalendar` in [HTTP handler](../../apps/calendar/lib/http-handler.mjs), and `createLocalMvpHandler` in [local MVP](../../apps/calendar/local-mvp.mjs):

- `GEEO_CALENDAR_MVP_ACCESS_TOKEN` is development-only. Production with it configured returns 503 `CALENDAR_MVP_DISABLED`. The token stays server-side.
- `GEEO_CALENDAR_API_ORIGIN` must be a verified exact origin. The local allowlist includes `https://dev-lms.gee-o.vn`, `https://lms.gee-o.vn`, and `https://lms.gee-o.edu`. Reject invalid configuration rather than probing endpoints.
- Set `GEEO_CALENDAR_SOURCE_OFFSET` only after owner confirmation for offset-free timestamps; never infer from the machine. Consult the app's environment sample.
- Local `resolveActor` validates through `/auth/connect/userinfo`, requires `permission` containing `class.schedule` and non-empty `branch_ids`. Backend campus checks remain mandatory.

Keep the default adapter until resolver and access evidence exist. Do not reuse old bundle tokens or other people's credentials.

## Checks

```sh
npm --prefix apps/calendar test
npm --prefix apps/calendar run typecheck
npm run test:embedded
```

The [embedded harness](../../playwright.embedded.config.ts) starts absent services on 3100/3200/3300, reuses local servers, and stops only those it creates. CI does not reuse servers. Fixtures are intercepted in tests only. Browser coverage includes both presentation modes, source failures, responsive behavior, locale, and filter retention on resize/theme.

See the [embedded layout standard](../design/spaceos-embedded-app-layout.md).
