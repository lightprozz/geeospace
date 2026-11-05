# SpaceOS embedded app layout and theme standard v1

Calendar is the implementation reference for GeeO-controlled apps using the SpaceOS bridge. Start new apps with the [development guide](./spaceos-app-development.md). This document owns layout, theme, UI state, and behavior inside windows.

[Notifications](./spaceos-notifications-and-app-status.md) applies this standard to source/topic navigation and event content. Apps do not duplicate the host menubar, dock, or traffic lights inside an iframe.

## Calendar brief

- Register: Product. Teachers/staff view schedules beside other windows or on smaller devices while travelling.
- Prioritize date ranges, filters, and schedule scanning. Use restrained GeeO red, neutral light background #f8f8fa, text #201f26, and accent #b12536; dark mode preserves semantic roles.
- Prefer Inter with system sans fallback. The date range is the primary typographic anchor; calendar rhythm and today's marker provide identity.
- Variance 3, motion 2, density 6. Remove redundant embedded branding while preserving clear controls and source states from 320px upward.

## Surface ownership

| Region | Rule |
|---|---|
| OS chrome | SpaceOS owns app name, close/minimize, window dragging, and standalone opening |
| Standalone identity | Show a compact name/icon header; hide redundant identity after valid embedded context |
| Business toolbar | Keep current context, navigation, and related actions. Calendar includes date range, GMT+7, today, previous/next, view, and branch |
| Content | Prioritize the schedule, list, or table. Details emphasize object name/action; forms group tasks and place save predictably |
| Feedback | Put loading, empty, expired-session, forbidden, and source errors near content, with recovery when available |

This host/app separation follows the surface distinction illustrated by [Shopify App Home](https://shopify.dev/docs/apps/build/app-home).

## Window sizing and responsive layout

Record three CSS-pixel values before integration. Distinguish desktop window width from the app's inner viewport.

| Value | Meaning | Calendar |
|---|---|---|
| Default opening width | First desktop opening, constrained to workspace | 820px |
| Minimum desktop resize width | Proposed comfortable working width beside other apps | 480px proposed |
| Smallest supported viewport | Mobile, narrow windows, and zoom validation | 320px |

- **Wide desktop:** Calendar shows a seven-column week above 640px app viewport; navigation, dates, and view share a row when space permits.
- **Narrow desktop:** At 640px or less, week view becomes a daily list and toolbar groups wrap. Preserve dates, filters, and mode during resize.
- **Mobile:** Below 768px host width, SpaceOS uses an app sheet. Respond to its actual width, allow vertical scrolling, and provide 44px primary touch targets. Month view retains a date-selection grid and opens the agenda.
- **Insufficient width:** Prefer compact content or a sheet. App-specific desktop limits belong to the window manager when supported; page-level iframe `min-width` must not overflow mobile or zoomed layouts.

The current window manager has a shared 320px minimum. Calendar's 480px value is a design proposal, not an enforced per-app limit; its layout still supports 320px.

## Tokens and behavior

- Use semantic tokens for app background, surfaces, secondary areas, text, muted text, borders, accent, selection, and focus. Business colors keep their meaning in both themes. Reading surfaces are solid with light borders.
- Use a 4px spacing rhythm, embedded gutters of 12–16px, standalone gutters up to 28px, and toolbar group gaps of 8–12px. Desktop controls are at least 36px high; primary touch controls are 44px. Calendar month cells size date buttons to their columns.
- Body text is 13–14px, metadata 12px, contextual headings 16–20px. Use weight for hierarchy. Control radius is 8px and content-region radius 10px.
- Standalone follows system theme. Embedded context supplies resolved theme, locale, and reduced motion. Preserve dates, view, and filters across changes. OS chrome owns window motion; Calendar provides immediate state feedback.
- [Semantic tokens](../../packages/embedded-app/src/theme.css) and [UI primitives](../../packages/embedded-app/src/ui/) are shared shadcn/ui-style source. Bundle from each app's origin; app styles must not replace GeeO design with library presets. Primitive focus/keyboard support still requires validation in real components and journeys.

## Independent app stack and state

Keep Next.js App Router, React, TypeScript, and npm workspaces. The [shared package](../../packages/embedded-app/package.json) supplies UI/theme/bridge; [architecture](../architecture/platform-foundation.md) owns artifact, BFF, and session boundaries. Both presentation modes use one business implementation.

| State | Ownership and constraint |
|---|---|
| Geometry/chrome | Host; apps cannot alter the window store through arbitrary messages |
| Dates, filters, tabs, selection | Per-instance app store; preserve across resize/theme/minimize |
| Business data/permissions | Server source; client snapshots/caches are not authoritative |
| Toolbar summary | One OS-side owner under the update workflow, not whichever window has focus |
| Preferences | Persist display choices only; storage failure must not block work |
| Drafts | Source contract and retention; never sensitive forms in preferences |

Create Zustand stores per instance, never a server singleton holding user state. Zustand does not synchronize iframes, tabs, or devices automatically. See [Calendar store](../../apps/calendar/lib/calendar-store.ts), [Notifications store](../../apps/notifications/lib/notification-store.ts), and [state tests](../../tests/unit/embedded-state.test.ts). The [source hook](../../packages/embedded-app/src/use-source.ts) owns current reading lifecycle; its internal counter is not a business revision.

The [shared bridge](../../packages/embedded-app/src/bridge.tsx) and [host wrapper](../../components/desktop/embedded-calendar.tsx) own v1. Validate version, exact origin/source, and instance before accepting context. The bridge carries theme, locale, reduced motion, and visibility; it provides no SSO, permission proof, mutations, or draft service. New payloads need versioned contracts and tests on both sides.

[Notifications/status](./spaceos-notifications-and-app-status.md) owns toolbar semantics. [Calendar](../runbooks/calendar-local.md) and [Notifications](../runbooks/notifications-local.md) runbooks own setup. Origins connect presentation, not identity or data access.

The [update workflow](./spaceos-app-update-workflow.md) proposes an OS-owned runtime separating window consumers from toolbar summaries. It is not yet provided by the current bridge.

## App review checks

- Validate both modes at 320, 375, 768, and 1440 CSS px, the app's desktop minimum, and both sides of layout breakpoints. Resize the desktop window and test the mobile sheet separately. Measure the inner viewport; wrap toolbar groups without page-level horizontal scrolling. See [WCAG Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html).
- Validate VI/EN, light/dark, reduced motion, keyboard, and visible focus. Normal text contrast is at least 4.5:1; focus boundaries at least 3:1.
- Validate real-data and loading/empty/forbidden/error states. Theme and resize preserve filters, drafts, and context.
- Embedded identity appears once in window chrome; standalone identity remains recognizable. Business controls work in both modes.
- Cover handshake/version failure, expiry, revocation, and user changes without retaining old private context. Design unsaved-work behavior explicitly for forms.
