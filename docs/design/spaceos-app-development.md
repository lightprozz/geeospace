# Building apps for Geeospace

This is the starting point for developers and AI collaborators adding apps to GeeO's internal platform. Each app must help staff complete work within a consistent SpaceOS experience, work independently, and respect existing data ownership and permissions. SaaS quality means reliable operations, security, and usability within the agreed internal scope.

## Find the decision owner

| Decision | Owning document |
|---|---|
| Work outcomes, business states, and actions | [Employee experience](./employee-experience.md) |
| Host, app, BFF, session, and data ownership | [Platform architecture](../architecture/platform-foundation.md) |
| Layout, responsive behavior, theme, state, and bridge | [Embedded app layout](./spaceos-embedded-app-layout.md) |
| Window chrome, navigation, and motion | [SpaceOS interaction](./spaceos-interaction-motion.md) |
| Mini icons, badges, popovers, and count semantics | [Notifications and app status](./spaceos-notifications-and-app-status.md) |
| Updates across window, connection, and session lifecycles | [App update workflow](./spaceos-app-update-workflow.md) |
| Data, access, environment, and incident responsibilities | [Service owners](../operations/service-owners.md) |

Docs record decisions, constraints, and navigation. Source, tests, and configuration prove current behavior. Plans and reports record progress and time-specific evidence. A research proposal is not an implemented API or SDK.

## Reusable foundations

Calendar and Notifications are independent Next.js apps in npm workspaces. Reuse the [embedded-app package](../../packages/embedded-app/package.json) for shadcn/ui primitives, theme, and bridge; keep business styles in the app. Avoid copying an entire sample app or the retired CSS/runtime into another foundation.

| Available in source | Not established by that implementation |
|---|---|
| App Router, shared UI/theme/bridge, per-instance state | Dynamic app registration SDK or Zustand sharing across iframes |
| Server adapter boundaries, payload validation, error states | Production Gee-O Auth sessions across all origins |
| Notifications bell with a separate polling status iframe | Shared push runtime, MQTT broker, or continuously running Service Worker |
| Window manager, launcher, static app registry | Dynamic multi-app status registration, pinning/overflow, or business bridge messages |
| HTTP, adapter, and browser harnesses | Automatic root CI coverage of every independent app artifact |

Validate layouts and contracts with test-only fixtures. Until a real source and session are available, show an unconfigured state. Fixtures must not become product runtime content.

## Minimum app brief

Record these answers in the feature plan. Move durable decisions to the owning docs once agreed; do not duplicate existing manifests or documentation.

| Topic | Required answer |
|---|---|
| Work and scope | User, desired outcome, primary action, exclusions, and acceptance evidence |
| Source and permissions | Source owner, actor/scope, object identity, state/version, and action eligibility |
| Surfaces | Standalone/embedded entry, valid destination/context, layout, and three sizing values from the layout standard |
| UI states | Loading, empty, no filter matches, expired session, forbidden, error, stale, and recovery |
| Local data | Per-instance state, persistable preferences, and real draft APIs/retention versus in-session retention |
| Optional status | Count/progress/status meaning, calculation source, visibility permissions, freshness, popover, and primary action |
| Integration | Artifact/origin, build and runtime configuration, session dependency, bridge version, and compatibility failure behavior |
| Validation and operations | Main journey, failure/access cases, support owner, and outstanding real-data prerequisites |

Not every app needs a toolbar icon or subscription. Register status only when staff need meaningful information at a glance while its window is closed.

## Delivery sequence

1. **Establish work and data contracts.** Reuse agreed journeys and verify sources, permissions, and mutation boundaries. Never invent approvers, deadlines, formulas, or destinations.
2. **Create an independent app using current patterns.** Keep Next.js/React/TypeScript, shared shadcn/ui, and semantic tokens. Consult the [workspace manifest](../../package.json), [Calendar](../../apps/calendar/package.json), and [Notifications](../../apps/notifications/package.json). Read the installed Next.js guides in `node_modules/next/dist/docs/` before writing framework-dependent code.
3. **Complete standalone presentation before host integration.** Provide app identity, primary content, source states, and narrow-viewport operation. Zustand owns per-instance UI state; business data and permissions belong to the server.
4. **Integrate through existing SpaceOS boundaries.** Use the [registry](../../lib/desktop/apps.ts), [workspace](../../components/desktop/desktop-workspace.tsx), [sample wrapper](../../components/desktop/embedded-calendar.tsx), and [shared bridge](../../packages/embedded-app/src/bridge.tsx). These are code integration points, not dynamic plugin installation. Navigation does not replace authorization.
5. **Connect the source adapter and validate access.** Resolve actors on the server; validate payloads, timeouts, and failures. Verify login, logout, and revocation in both modes before accepting private data integration.
6. **Add status and updates when needed.** Follow the common workflow with one summary owner. Version new messages and test compatibility. Do not add polling/connections per icon or window to bypass the missing shared runtime.
7. **Validate each artifact and journey.** Start at the smallest reliable test layer, then cover HTTP, bridge, and end-to-end boundaries. Document environment configuration, fixed ports, artifacts, rollback, and outstanding gates.

Iterate as evidence requires while preserving authorization and source prerequisites before exposing private data.

## Configuration and compatibility

Each app needs its own local environment file and a sample containing only public values or non-sensitive placeholders. Ignore files containing secrets. Do not assume an app loads the host's environment file. See the [Notifications](../runbooks/notifications-local.md) and [Calendar](../runbooks/calendar-local.md) runbooks.

Public embedding origins are separate from server credentials. Parent origin, CSP, and bridge must agree at build and runtime; changing public origins may require rebuilding. Without a configured parent, honor the standalone contract. Never use `*` or unrestricted CORS to bypass handshake failures.

Each rollout must identify compatible host, app, and shared-package versions. Preserve the served bridge version or provide an explicit transition. Incompatibility needs a recoverable error or standalone fallback. Owners must verify callbacks, session topology, and deployment targets rather than infer them from local ports.

## Internal SaaS quality acceptance

These criteria define evidence to collect, not certification. Use [OWASP ASVS](https://asvs.owasp.org/) for security and target [WCAG 2.2 AA](https://www.w3.org/TR/WCAG22/) across actual journeys. Record verification scope at acceptance.

| Area | Required evidence |
|---|---|
| Work outcomes | Staff find work, act, and understand outcomes/who is responsible next; measure journeys in U1/U2 rather than open windows |
| Access and sessions | No cross-user/scope exposure; object/campus checks, expiry, logout/revocation, context changes, and removal of previous-user data |
| Consistency | Today/inbox/detail share source identity/state; read does not complete work; stale/errors do not create false zeros or success |
| Writes | Server validation/policy, concurrency, double-submit protection, and reconciliation of uncertain outcomes |
| UX/accessibility | Both presentation modes, mobile/desktop, VI/EN, light/dark, reflow, keyboard/focus, reduced motion, and alternatives to dragging |
| Lifecycle/updates | Preserve context across resize/theme/minimize; release consumers on close; reject obsolete snapshots/callbacks |
| Privacy | No private titles in the toolbar, bridge tokens, records in logs, or sensitive drafts in preferences; retention has an owner |
| Performance | Measure opening, interaction, multiple-app resources, hidden/restore, and mobile; set budgets against target devices/load |
| Release | Build/typecheck/test each artifact and shared contract; target-environment smoke and compatible rollback |
| Operations | Support owner, lookup reference, error/latency visibility, dependency readiness, backup/restore, and verified RPO/RTO |

[CI](../../.github/workflows/checks.yml) owns enabled automation. The [root manifest](../../package.json), [embedded harness](../../playwright.embedded.config.ts), and [Notifications harness](../../playwright.notifications.config.ts) own scripts/configurations. Root CI does not yet invoke independent app gates. Include artifact and shared-contract coverage in app delivery; past manual runs do not protect future changes.

Fixtures belong only in tests. Real integration requires authorized environments/accounts. Choose checks by risk and changed contracts; broad browser/load suites need a purpose. Builds, screenshots, and fixtures do not replace usability, live authorization, or production restore evidence.

Operational release requires the foundation/runtime, identity, Today/calendar/LMS, requests/work records, learning/quizzes, durable notifications, Dify integration, and payroll presentation shell to satisfy their gates. Full completion additionally requires the authoritative payroll backend, calculation, and publication workflow. Early usability rounds do not waive these requirements. Partial app delivery does not complete dependent modules.

## Open decisions before dependent integration

- Auth must settle cross-origin sessions, callbacks, and logout; embedding configuration alone does not provide SSO.
- Data owners must establish identity/version, permissions, freshness, and retention. Legacy events are not a durable inbox.
- Runtime/source owners must settle snapshot boundaries and replay/reconciliation when researching the backend. MQTT remains a candidate adapter.
- Product/operations must establish U1/U2 participants, target load/devices, budgets, SLOs, RPO/RTO, and support routes rather than invent thresholds.

These decisions do not prevent UI and contract work but must precede dependent integration. Keep validation results and execution issues in plans/reports rather than pass counts or audit timestamps in design standards.
