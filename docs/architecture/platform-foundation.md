# Geeospace architecture and data boundaries

Geeospace is an internal platform for GeeO teachers and staff. It applies SaaS quality principles to access control, consistency, operations, and usability. Commercial billing, subscription tiers, and a tenant control plane are outside scope. Authorization by user, campus, class, and business object remains mandatory.

## Host, apps, and business sources

Use Next.js App Router/React for SpaceOS and independent apps, with shadcn/ui and GeeO design tokens. Apps support both iframe and standalone presentation. Independent UI and build artifacts do not require separate databases, authentication services, or copies of GeeO business data.

| Boundary | Design responsibility | Implementation reference |
|---|---|---|
| SpaceOS host | Navigation, windows, chrome, presentation context, and toolbar summaries | [Registry](../../lib/desktop/apps.ts), [desktop workspace](../../components/desktop/desktop-workspace.tsx) |
| Independent Next.js app | Business UI, per-instance state, route handlers, and its own artifact | [Calendar](../../apps/calendar/package.json), [Notifications](../../apps/notifications/package.json) |
| Shared package | UI primitives, semantic tokens, bridge, and source-reading lifecycle; no app-specific business permissions | [Package exports](../../packages/embedded-app/package.json) |
| Backend for frontend (BFF) | Validate sessions and permissions, call sources, and minimize browser payloads | [Calendar adapter](../../apps/calendar/calendar-data.mjs), [Notifications adapter](../../apps/notifications/notification-data.mjs), [read-only source boundary](../../lib/http/source-result.ts) |
| Gee-O Auth and GeeO API | Central identity and existing business records | [Verified integration routes](../operations/integration-targets.md) |
| OS-owned update runtime | One connection/summary owner per OS page; distribution to authorized apps | [Target workflow](../design/spaceos-app-update-workflow.md); shared runtime not implemented |

Registry entries and window access are UI metadata, not read/write permissions. Apps accept presentation context only through a validated bridge. Identity, permissions, and private data require server verification. Dify and external iframes must not control the OS through arbitrary messages.

Calendar and Notifications have UI and adapter boundaries. Other business panels are not complete apps. The [login route](../../app/api/auth/login/route.ts) and default adapters do not provide a real Gee-O Auth session. An unconfigured state documents a limit; it does not establish production readiness.

## Cross-app identity: invariants and open decisions

Gee-O Auth is the sole identity authority. Host, embedded apps, and standalone apps must resolve the same `(issuer, subject)` identity. Do not create separate Geeospace accounts. Upstream access and refresh tokens stay on the server and must not enter `NEXT_PUBLIC_*`, URLs, localStorage, or the bridge.

**The session topology across independent origins is unresolved.** Auth and host/app owners must select session ownership, callbacks, standalone identity resolution, and logout/revocation paths. Do not assume host cookies work on an app origin or that the bridge provides SSO. Validate the selected approach in iframes and standalone tabs on target browsers, including cookie restrictions, beyond a single development configuration.

Implementation must preserve these requirements:

- Validate session and scope at each read/write boundary. Enforce object, campus, course, and recipient permissions at the authoritative source. Clients cannot expand permissions by choosing an actor or topic.
- Cover expiry, logout, user changes, campus/role changes, and account disabling. Clear data, caches, and subscriptions from the old context and reject late callbacks. Server policy protects data even before the client receives a revocation signal.
- Mutations require session-appropriate CSRF protection, concurrency control, and authorization at execution time. Browser cancellation does not prove that a server transaction was cancelled.
- Protect stored server tokens/sessions and implement rotation and revocation under the Auth contract. Avoid inconsistent per-app session rules introduced to bypass integration prerequisites.

These are design requirements, not evidence of completed authentication.

## Data ownership

The business timezone is `Asia/Ho_Chi_Minh`. Do not derive business days, occurrences, or work periods from the user's device timezone. A source timestamp without an offset requires owner confirmation before interpretation.

| Data | Owner and limits |
|---|---|
| Schedules/classes, requests, work records, and payroll | GeeO; scoped BFF access without a second business system |
| UI and preferences | Host/app within their boundaries; persist only non-sensitive display preferences and geometry |
| Sessions and tokens | Server under the selected Auth topology; never shared user state during server rendering |
| Enrollment, quizzes, and completion | D1 is the proposed store for new business capabilities; schema, permissions, concurrency, and recovery remain prerequisites |
| Private learning files | R2 is proposed; access, upload lifecycle, quotas, and retention must precede real data |
| Notifications and read-state | Require durable identity and audience policy; legacy calendar snapshots do not meet this contract |
| Projections and summaries | Source-derived identity, version, and freshness; never independent approval or completion authorities |

[Employee experience](../design/employee-experience.md) owns business identity, drafts, badges, and uncertain submission outcomes. The [update workflow](../design/spaceos-app-update-workflow.md) owns synchronization and reconciliation. The current [schema](../../db/schema.ts) is a binding registry, not an implemented business schema.

Source failures are distinct from valid empty data and must not disable unrelated healthy sources. Keep personal data out of static exports, public caches, support logs/prompts, and preferences. Data owners must establish retention, deletion, export, and audit policies before the relevant module; do not invent retention periods.

## Artifacts, configuration, and operations

The host targets Cloudflare/OpenNext. [Wrangler configuration](../../wrangler.jsonc) and [runtime settings](../../lib/platform/runtime.ts) own bindings and runtime configuration. Local capability tests do not establish provisioned production accounts, resources, or deployments. Independent apps have separate artifacts; building the host does not build or deploy every app. Verify each app's production hosting against its runtime and session model.

Each app needs its own configuration runbook. Host environment files do not configure another app. Public embedding origins must match the built artifact; parent origin, CSP, and bridge configuration must agree at build and runtime. [Shared server helpers](../../packages/embedded-app/server.mjs) own origin validation and headers. The [Calendar](../runbooks/calendar-local.md) and [Notifications](../runbooks/notifications-local.md) runbooks own concrete setup routes. Document variable names and credential retrieval routes, never secret values.

The [manifest](../../package.json) and [lockfile](../../package-lock.json) own versions and overrides. Do not document a clean audit as a permanent property. Triage advisories by execution path and upgrade compatibly; do not force a downgrade to make an audit pass. [CI](../../.github/workflows/checks.yml) shows enabled checks; [app development](../design/spaceos-app-development.md) defines artifact coverage expectations.

Current health checks establish configuration/context/binding presence, not end-to-end business availability. Distinguish liveness, dependency readiness, and per-source availability when integrating. Correlation IDs, app/source errors, latency, and synchronization signals must support troubleshooting without recording tokens or private records.

## Migration and recovery before real data

[Storage integration tests](../../tests/integration/storage.test.ts), [local Workers](../runbooks/local-workers.md), and [local backup/restore](../runbooks/local-backup-restore.md) establish local capabilities. Fixtures do not prove learning schema correctness, SQL Server backups, real cookie/session behavior, or production recovery. Local snapshot tool limits are not product quotas.

Business migrations must be forward-only, versioned, and compatible with the app artifact. Before schema changes or bulk writes, record the target, current schema, backup receipt/checksum, and isolated restore destination. Verify recovery through the [SQL backup gate](../runbooks/geeo-sql-backup-restore.md) or the source owner's runbook. Mark a migration applied only after success.

Use expand → checkpointed backfill → reader/writer transition → contract in a later release for breaking schema changes. Do not assume a cross-D1/R2 transaction: uploads need pending/committed states, checksums, and cleanup. On failure, stop affected writers and preserve receipts and failed copies. Prefer forward fixes or a compatible app artifact. Restoring over newer data requires an owner decision and integrity checks.

[Service owners](../operations/service-owners.md) establish responsibility, retention, target load, RPO/RTO, support, and rollback. [Release requirements](../design/spaceos-app-development.md#internal-saas-quality-acceptance) cannot be replaced by successful local builds.
