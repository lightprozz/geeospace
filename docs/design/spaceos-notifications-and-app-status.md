# Notifications and app status in SpaceOS

Notifications is an independent Next.js app embedded like Calendar under the [layout standard](./spaceos-embedded-app-layout.md). SpaceOS owns its window and toolbar; the app owns event content. Apply these information layers and the [development guide](./spaceos-app-development.md) to status for future apps.

## Notifications app

The reference becomes two regions: source/topic/search/preferences navigation and an updates area with time filters, list, and detail. Do not copy Leads, Sales, or Email groups from the image without verified GeeO sources. Embedded identity belongs to OS chrome; standalone shows a Notifications header. Use Calendar v1 semantic tokens, restrained GeeO red, solid surfaces, Inter/system sans, 14px content, and 12px metadata.

| Size | Rule |
|---|---|
| Initial desktop opening | 820px, constrained to workspace |
| Minimum resize | 320px under the current window manager |
| App viewport above 640px | 224px sidebar and flexible content |
| App viewport at or below 640px | Sources/search above the list; wrapping toolbar |
| Smallest viewport | 320px, 44px controls, no horizontal page scroll |

Search and filters support finding events again. Preserve reading context across theme/locale/minimize/restore. Topic grouping and automatic refresh are display preferences, not read-state. The [component](../../apps/notifications/components/notification-app.tsx) and [store](../../apps/notifications/lib/notification-store.ts) own current behavior. Details use a dialog with Escape, close control, and focus management.

Distinguish loading, unconfigured, sign-in required, forbidden, source failure, valid empty results, and no filter matches. Permission loss or refresh failure clears source content. Empty results require a valid response.

## Legacy evidence

`ClientAppv1/src/components/dashboard/Notifications.js` reads `GET /api/ClassEvents/GetEventsPerUser/{sub}`, groups by `subject`, and displays `title`/`startTime`. The bell menu in `src/components/common/layout/AppMainLayout.js` uses the same data. The dashboard calls an undefined `handleNotificationClick`; do not reproduce that defect.

- This is a user-scoped calendar snapshot, not evidence of a durable notification feed.
- `startTime` is event time, not notification publication time. Display in `Asia/Ho_Chi_Minh` with GMT+7.
- The badge counts snapshot events, not unread notifications or actionable tasks. Read/read-all actions are unsupported for this source.
- A snapshot alone does not establish newly created, changed, or cancelled events. Do not create reminders on source failure.
- Do not derive class deep links from titles/topics. Current items open details; LMS navigation needs verified destination and access contracts.

The [adapter](../../apps/notifications/notification-data.mjs) and [tests](../../apps/notifications/notification-data.test.mjs) own the projection. A server session resolver must establish the actor. Snapshot hashes are not durable read-state IDs. Missing timestamp offsets require owner confirmation. The [runbook](../runbooks/notifications-local.md) owns integration limits; no environment variable turns the bridge into a session.

## Three OS information layers

| Layer | Purpose | Current Notifications surface |
|---|---|---|
| Header icon | Glance and open a popover | 17px bell within the OS hit area; event count when known |
| Popover | Short summary and one primary action | Source state, observation time, mini-info preference, Open Notifications |
| Full app | Search, filter, and read details | Topic-grouped event list |

Keep event titles, names, and private content out of the toolbar. Do not blink icons, toast each snapshot, or reorder by count. Unknown state has no zero badge. Abbreviate large values to 99+ while accessible text/popover retain the full count. Mini information is off by default; host widths at or below 1100px retain icons only. Popovers use the top layer, Escape/outside-click, and trigger focus restoration.

For future apps, declare app ID, OS-owned icon, value type (count/progress/status), priority, and visibility permissions. The proposed desktop limit is three pinned apps beside utilities, with labeled overflow. Use one short line per item; no app-supplied HTML or arbitrary URLs. Only the bell is implemented; dynamic multi-app registration/pinning/overflow remains a proposal.

## Shared app-status design

Each app must define summary meaning before adding an icon. The dynamic registry is not implemented.

| Decision | Constraint |
|---|---|
| App/icon/label | OS-owned identity/icon; localized and accessible label; no arbitrary HTML |
| Value type | Count, progress, or status with explicit units/scope/business meaning |
| Source/access | Calculation source and audience; pinning grants no access |
| Freshness | Observation time and synchronization state; stale values are not live |
| Presentation | Priority/pinning/overflow fit the host; mini information is optional |
| Action | One primary popover action opening authorized app context |

[Count semantics](./employee-experience.md#count-semantics) separates events, unread, and needs-action. Keep names, event contents, quiz scores, and payroll amounts out of mini information. Private details belong in authenticated apps. Source errors/revocation must make unknown counts explicit.

## Current transport and transition

[AppStatusTray](../../components/desktop/app-status-tray.tsx) owns an iframe separate from the app window. [StatusChannel](../../apps/notifications/components/status-channel.tsx), [HTTP handlers](../../apps/notifications/lib/http-handler.mjs), and [status parser](../../lib/desktop/app-status.ts) own payloads, validation, and TTL; [tests](../../tests/unit/app-status.test.ts) verify the contract. Frame sequence is not a source revision.

The [shared source hook](../../packages/embedded-app/src/use-source.ts) currently polls according to visibility; there is no realtime push or read receipt. App content and toolbar status are separate consumers. Disabling list refresh does not disable the toolbar. Summaries minimize data and only registered frames with matching origin/source/instance may update them.

The [update workflow](./spaceos-app-update-workflow.md) owns the target runtime, summary replacement, invalidation, reconciliation, and transport choices. Do not run duplicate push connections in both status iframe and shared runtime. Transfer summary ownership explicitly and preserve bridge compatibility or provide a version transition.

Durable feeds, audience/expiry, and read-state remain required business capabilities. The legacy UI does not satisfy those gates. Backend event production remains a later research step.

## Local setup and checks

See the [Notifications runbook](../runbooks/notifications-local.md) for ports, configuration, session adapter, and checks.
