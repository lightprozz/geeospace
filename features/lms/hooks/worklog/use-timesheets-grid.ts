'use client'
// ---------------------------------------------------------------------------
// hooks/worklog/use-timesheets-grid.ts
// Full-period, all-teachers fetch for the manager Timesheets grid (Phase 6).
// CLIENT-ONLY — 'use client' required for hooks.
//
// Rate-Limit Fix (2026-07-16): Replaced the N-request per-teacher fan-out with
// a single POST /worklog/query/all-teachers call. The new endpoint queries ALL
// specified teachers' worklogs in ONE database query, eliminating 429 errors
// on large rosters (45+ teachers) that the fan-out pattern triggered.
//
// AUTH: worklog.approve required (same as viewing another owner's worklogs).
// ---------------------------------------------------------------------------

import { useQuery, type QueryClient } from '@tanstack/react-query'
import { queryAllTeachersWorkLogs } from '@/features/lms/lib/worklog/api'
import { periodRange, type PeriodKey } from '@/features/lms/lib/worklog/payroll-cycle'
import type { WorkLogItemV2 } from '@/features/lms/types/worklog'

/** Contract's raised pageSize cap for the full-period grid (see v2-working-time-contract.md). */
const GRID_PAGE_SIZE = 2000

/**
 * Max concurrent page-walks for the single all-teachers query. 2000/page *
 * 50 = 100,000 rows in a single period is far beyond any real dataset.
 * Guards against an unbounded loop if `hasNext` were ever miscomputed
 * server-side; throws loudly instead of hanging the fetch.
 */
const MAX_PAGES = 50

/**
 * Pages through EVERY worklog for ALL teachers in `[from, to]` via a single
 * POST /worklog/query/all-teachers call, looping until `hasNext === false`.
 * The full-period-completeness requirement ("never compute totals over a
 * partial page") is enforced structurally here: the returned promise only
 * resolves once the last page has been fetched.
 */
async function fetchAllWorkLogsForTeachers(
  teacherIds: readonly string[],
  from: string,
  to: string,
): Promise<WorkLogItemV2[]> {
  const items: WorkLogItemV2[] = []
  let page = 1

  for (;;) {
    const result = await queryAllTeachersWorkLogs({
      teacherIds: [...teacherIds],
      from,
      to,
      page,
      pageSize: GRID_PAGE_SIZE,
    })
    items.push(...result.items)
    if (!result.hasNext) return items

    page += 1
    if (page > MAX_PAGES) {
      throw new Error(
        `All-teachers worklog page-walk (${from}..${to}) exceeded ${MAX_PAGES} pages — ` +
          `aborting instead of looping unbounded. Check the BE's hasNext computation.`,
      )
    }
  }
}

export const timesheetsGridKeys = {
  all: ['worklog', 'timesheets-grid'] as const,
  period: (periodKey: PeriodKey, teacherIds: readonly string[]) =>
    [...timesheetsGridKeys.all, periodKey, [...teacherIds].sort()] as const,
}

/**
 * Fetches every worklog for `teacherIds` within `periodKey`'s date range
 * using a single POST /worklog/query/all-teachers call. The `data` returned
 * is complete once the query resolves — no fan-out, no concurrency management.
 */
export function useTimesheetsGridData(
  periodKey: PeriodKey,
  teacherIds: readonly string[],
  options?: { enabled?: boolean },
) {
  const { from, to } = periodRange(periodKey)

  return useQuery({
    queryKey: timesheetsGridKeys.period(periodKey, [...teacherIds].sort()),
    queryFn: () => fetchAllWorkLogsForTeachers(teacherIds, from, to),
    enabled: (options?.enabled ?? true) && teacherIds.length > 0,
  })
}

/**
 * Patches ONE entry's status/updatedAt directly in the grid's cached data —
 * used after a successful approve/reject instead of refetching the whole
 * N-owner fan-out (the fan-out is already tight against the BE's
 * `table_read` rate limit; a full refetch per single-entry action is the
 * fastest way to blow that budget on a normal-sized roster). `setWorkLogStatus`
 * already returns the updated `WorkLogItemV2`, so this needs no network call.
 *
 * A no-op (via the updater returning `undefined`, which TanStack Query
 * treats as "leave the cache entry as-is") if the grid query hasn't been
 * fetched yet under this exact `periodKey`/`teacherIds` key.
 *
 * Reserve a full `refetch()` for the 409 CONFLICT recovery path — a stale
 * `updatedAt` means the cache may be wrong in ways a single-entry patch
 * can't fix.
 */
export function patchTimesheetsGridEntry(
  queryClient: QueryClient,
  periodKey: PeriodKey,
  teacherIds: readonly string[],
  updated: WorkLogItemV2,
): void {
  queryClient.setQueryData<WorkLogItemV2[]>(
    timesheetsGridKeys.period(periodKey, teacherIds),
    (old) => old?.map((item) => (item.id === updated.id ? updated : item)),
  )
}
