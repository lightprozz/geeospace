# Geeospace

Geeospace is an internal workspace for GeeO teachers and staff. It applies SaaS quality principles to usability, access control, consistency, and operations. SpaceOS provides a desktop menubar, dock, and windows; mobile uses Home and app sheets. Independent business apps use Next.js, shadcn/ui styled with GeeO tokens, and per-instance UI state.

**Start with the [SpaceOS app development guide](./design/spaceos-app-development.md).** It connects design decisions, integration points, and acceptance criteria for developers and AI collaborators.

## Design navigation

| Document | Decisions it owns |
|---|---|
| [Employee experience](./design/employee-experience.md) | Work outcomes, business identity and state, badges, context, drafts, and usability validation |
| [Platform architecture](./architecture/platform-foundation.md) | Host, apps, BFF, identity, data ownership, artifacts, and recovery |
| [Embedded app layout](./design/spaceos-embedded-app-layout.md) | Chrome and content, sizing, responsive layouts, tokens, UI state, and bridge |
| [Interaction and motion](./design/spaceos-interaction-motion.md) | Desktop/mobile shell, dock, focus, window lifecycle, materials, and selected utilities |
| [Notifications and app status](./design/spaceos-notifications-and-app-status.md) | Legacy notification data, mini icons and information, popovers, and summary semantics |
| [App update workflow](./design/spaceos-app-update-workflow.md) | Target runtime within an OS page, lifecycle, snapshot reconciliation, and transport boundaries |

## Current implementation and target design

The OS shell, independent Calendar and Notifications apps, and [shared UI/theme/bridge package](../packages/embedded-app/package.json) exist. Source adapters establish data and permission boundaries. Configuring origins connects presentation only. The [login route](../app/api/auth/login/route.ts) does not yet create a Gee-O Auth session. Notifications is unconfigured by default; Calendar offers the limited local evaluation path documented in its runbook. A launcher icon does not imply a complete business module.

The shared update runtime, business bridge extensions, and multi-app status registry are target designs. The Notifications toolbar currently uses a status iframe and polling. No broker, MQTT adapter, realtime push, or durable read-state has been implemented. Backend event production will be researched later. Legacy calendar snapshots are not a read/unread inbox.

Design docs define constraints; source, tests, and configuration establish current behavior. Plans and reports record execution and evidence at a point in time. They do not establish product certification or supersede the current design contract.

## Local development and source references

The [root manifest](../package.json) and [lockfile](../package-lock.json) own dependencies, workspaces, and scripts. Install with npm from the repository root. The `dev` script runs SpaceOS on its fixed project port. Start only the apps needed, check port ownership first, and stop processes you started when the task ends.

- [Local Calendar](./runbooks/calendar-local.md): independent app, parent origin, adapter, and local MVP limits.
- [Local Notifications](./runbooks/notifications-local.md): app-specific environment, artifact, and session integration boundary.
- [Local Workers](./runbooks/local-workers.md): OpenNext/Workers and local bindings.
- [Current CI](../.github/workflows/checks.yml): automated checks currently enabled; a host build does not replace independent app builds and tests.

The [app registry](../lib/desktop/apps.ts) is navigation metadata, not server authorization. [Host tokens](../app/globals.css) and [embedded tokens](../packages/embedded-app/src/theme.css) own theme values. Synthetic data belongs only in test fixtures. Source failures must not produce empty schedules, zero work counts, or fabricated payroll amounts.

## Operations and integration

- [Service owners](./operations/service-owners.md): responsibilities to confirm before enabling data, permissions, and rollout.
- [GeeO integration targets](./operations/integration-targets.md): verified Auth/API discovery routes and evidence limits.
- [Preferences and Weather](./operations/spaceos-preferences-weather.md): utility configuration and device-local data.
- [Local backup and restore](./runbooks/local-backup-restore.md): local rehearsal, distinct from production recovery.
- [SQL backup gate](./runbooks/geeo-sql-backup-restore.md): prerequisites for GeeO backend changes.

## Delivery and reference material

[App acceptance and release requirements](./design/spaceos-app-development.md#internal-saas-quality-acceptance) define the durable delivery contract. Local execution plans and historical reports are maintained separately under `plans/`; they are not prerequisites for navigating this documentation set.

Legacy source and reference images provide behavioral and visual evidence. They do not expand scope or authorize reuse of private data and assets. Preserve the selected OS experience and GeeO workflows; do not import commerce, booking, personal assets, accounts, or migrations from reference projects.
