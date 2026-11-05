# Employee experience and business contracts

Geeospace helps teachers and staff identify their next task, act with existing context, understand who is responsible next, and follow consistent outcomes. Teachers, staff, and people holding multiple roles use one product. Authorized scope determines content without manual role switching to find work.

The platform serves internal GeeO users with SaaS quality expectations. Validate the OS shell through task completion and context recovery. Multiple windows must not be required to complete a task.

## Selected design direction

Keep the desktop menubar, wallpaper/wordmark, dock, and windows, plus mobile Home and app sheets. Retain Weather, VI/EN, the GeeO companion with pause/hide, and advanced Appearance. Adding an app does not reverse these choices. [SpaceOS interaction and motion](./spaceos-interaction-motion.md) owns chrome/lifecycle; [embedded app layout](./spaceos-embedded-app-layout.md) owns content.

Register: Product. Scene: teachers/staff switching desktop tasks and completing focused work on phones. Direction: familiar OS interaction, concise controls, clear state and next steps. Signature: host menubar/dock/windows, with app content centered on the task and primary action.

Keep GeeO primary and semantic colors, locally bundled Inter with Vietnamese coverage, light/dark/system themes, and reduced motion. Use solid reading surfaces and glass for controls. [Host tokens](../../app/globals.css) and [app tokens](../../packages/embedded-app/src/theme.css) own values. Dark primary foreground must support small-text contrast rather than copying an unsuitable reference pair. Geeospace adjustments do not change the LMS design system.

## One task, one authoritative state

Today, inbox, and detail are views of the same process. They do not create another workflow engine or a completion action bypassing the source.

| Concept | Required semantics |
|---|---|
| Business identity | Stable source/object/action context, including step/occurrence when needed; never title-based |
| Source version/state | New versions of the same step do not create another task; a new step has its own context |
| Can act / reason | The authoritative source determines eligibility and why; badges do not establish permissions |
| Waiting on / next step | Permission-filtered person/unit and next step; explicitly unknown when unavailable |
| Freshness | Distinguish verified, stale, and unavailable; timeout does not mean completion |
| Navigation context | Required IDs, date/period, tab, and filters, with limits/allowlists and destination reauthorization |

`ActionProjection` is a proposed source-derived contract, not an implemented shared module. Adapters must supply consistent identity, state/version, eligibility, context, and freshness. Do not copy full requests/schedules/work records into D1 merely to create projections. [Architecture](../architecture/platform-foundation.md) owns storage/access boundaries.

After a mutation or LMS-side change, invalidate/reconcile every surface using the business identity. Remove actionable work only after source confirmation. Reading does not approve a request; unread state must not revive completed work. Realtime signals do not replace authoritative outcomes.

## Count semantics

- **Event count:** snapshot items within an explicit scope; the legacy Notifications source currently establishes only this meaning.
- **Unread count:** recipient read-state for durable notification identities, stored server-side.
- **Needs-action count:** business actions still eligible under current permissions/source state.

Never add these counts together or label event count as new notifications. State the scope; unknown data must not appear as zero. [Notifications and app status](./spaceos-notifications-and-app-status.md) owns toolbar/popover presentation.

## Context, drafts, and uncertain submissions

Preserve dates, filters, and reading position across theme changes, resize, and minimize. Clear private context on user changes. URLs contain only necessary allowlisted context, not tokens, form answers, or amounts. Prefill still requires server validation and sender confirmation.

Promise draft recovery after reload only with real save/load/delete APIs, ownership, versioning, and retention. A `Draft` enum proves none of these. Otherwise retain input in-session and warn before leaving, stating the limit. Do not substitute sensitive localStorage forms for server drafts. Unsaved-work handling covers app close, close-all, and form navigation; the current bridge does not solve it automatically.

A lost submission response means an uncertain outcome. Preserve input and reconcile with a source-supported receipt/operation ID before opening the created record or retrying safely. Client-generated IDs alone do not establish upstream idempotency. Resolve version conflicts using current state and user input; never overwrite blindly or auto-approve.

## Domain boundaries

| Area | Business constraints |
|---|---|
| Today and Calendar/LMS | Prioritize upcoming/actionable work; verify occurrences, teacher assignment, campus scope, and destination IDs rather than inferring sessions from membership |
| My Requests | Reuse Forms Runtime; distinguish sender/processor and waitingOn/nextStep; require real receivers/templates before submission or discrepancy reporting |
| Work and payroll | Separate Worklog, Worktime, and payslips; show actual periods; no added check-in or personal editing rights; formulas/publication need their own specification |
| Learning/quizzes | Explain mandatory/optional courses, assigners, and completion rules; require content/attempt versions, server grading, idempotency, and file permissions |
| Notifications | Audience, validity, durable feed, and read-state belong to the source; legacy snapshots do not satisfy this contract |
| Dify assistant | Shared feature catalog; manual search/buttons work without AI; generic metadata grants neither private access nor mutations |

Validate teacher LMS handoff, approver processing, contextual request submission, work/payroll discrepancy reporting, learning/quiz completion, cross-surface consistency, and manual/AI feature navigation. Never fabricate approvers, SLAs, records, deep links, or AI answers to fill missing integrations.

## Recovery and usability evidence

Distinguish loading, unconfigured, sign-in required, forbidden, failure, valid empty results, and no filter matches per source. Failure must not hide healthy sources. [Workspace region](../../components/workspace-region.tsx) is an existing UI boundary, not evidence of every real integration.

The first usability round (U1) covers login → Today/calendar → LMS/requests → outcomes with representative staff. U2 adds learning/inbox/Dify and available payroll scope. Measure independent completion, time, errors, re-entry, app/login switching, and state comprehension. Do not rank productivity or capture private records/payroll in UX telemetry.

A small formative sample finds problems without proving company-wide effectiveness. Product owners set baselines/thresholds before testing; proposed numbers are not SLAs. Builds/screenshots/fixtures do not replace real feedback. Resolve access failures, data loss, and task blockers before rollout regardless of average scores.

The [app development guide](./spaceos-app-development.md#internal-saas-quality-acceptance) owns acceptance and operational/full release requirements. U1/U2 do not waive them; deferred payroll capabilities must not be marked complete.
