'use client'
// ---------------------------------------------------------------------------
// hooks/worklog/use-timesheets-grid.ts
// Full-period, all-teachers fetch for the manager Timesheets grid (Phase 6).
// CLIENT-ONLY — 'use client' required for hooks.
//
// Batch teachers up to the endpoint's cap rather than fetching per teacher.
//
// AUTH: worklog.approve required (same as viewing another owner's worklogs).
// ---------------------------------------------------------------------------

import { useQuery, type QueryClient } from '@tanstack/react-query'
import { queryAllTeachersWorkLogs } from '@/features/lms/lib/worklog/api'
import { periodRange, type PeriodKey } from '@/features/lms/lib/worklog/payroll-cycle'
import type { WorkLogItemV2 } from '@/features/lms/types/worklog'

/** Contract's raised pageSize cap for the full-period grid (see v2-working-time-contract.md). */
const GRID_PAGE_SIZE = 2000
const MAX_TEACHER_IDS = 200

/**
 * Guard each batch against an unbounded loop if the API misreports hasNext.
 */
const MAX_PAGES = 50

/**
 * Resolve only after all pages of all teacher batches have been fetched.
 */
async function fetchAllWorkLogsForTeachers(
  teacherIds: readonly string[],
  from: string,
  to: string,
): Promise<WorkLogItemV2[]> {
  const items: WorkLogItemV2[] = []
  const uniqueIds = [...new Set(teacherIds)]
  for (let offset = 0; offset < uniqueIds.length; offset += MAX_TEACHER_IDS) {
    const batch = uniqueIds.slice(offset, offset + MAX_TEACHER_IDS)
    for (let page = 1; ; page++) {
      const result = await queryAllTeachersWorkLogs({
        teacherIds: batch,
        from,
        to,
        page,
        pageSize: GRID_PAGE_SIZE,
      })
      items.push(...result.items)
      if (!result.hasNext) break
      if (page >= MAX_PAGES) {
        throw new Error(`All-teachers worklog query (${from}..${to}) exceeded ${MAX_PAGES} pages for one batch.`)
      }
    }
  }
  return items
}

export const timesheetsGridKeys = {
  all: ['worklog', 'timesheets-grid'] as const,
  period: (periodKey: PeriodKey, teacherIds: readonly string[]) =>
    [...timesheetsGridKeys.all, periodKey, [...teacherIds].sort()] as const,
}

/**
 * Fetches every worklog for `teacherIds` within `periodKey`'s date range
 * using the all-teachers endpoint in sequential batches.
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
