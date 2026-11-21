'use client'
// ---------------------------------------------------------------------------
// hooks/requests/use-requests.ts
// TanStack Query read hooks for the FRM v2 requests INBOX (list + tab counts).
// CLIENT-ONLY — 'use client' required for hooks.
//
// Filter state is NOT owned here. The inbox screen drives tab/keyword/status/
// collection/archived/page from URL state (nuqs) and passes them in, so a
// filtered inbox is linkable and back/forward works. These hooks stay pure
// (filters in, query out) and hold no state of their own.
//
// Tab membership, filtering, counting and paging are ALL server-side — never
// partition or recount the returned page client-side.
// ---------------------------------------------------------------------------

import { useQuery, keepPreviousData } from '@tanstack/react-query'
import {
  fetchTabCounts,
  queryRequests,
  type RequestCountsFilters,
} from '@/features/lms/lib/requests/api'
import { requestKeys, type RequestListFilters } from '@/features/lms/lib/requests/query-keys'
import type { RequestTab } from '@/features/lms/types/request'

/**
 * POST /query — one page of the given tab.
 * `keepPreviousData` holds the current page visible while the next one loads,
 * so paging and filter changes do not blank the table.
 */
export function useRequestsQuery(
  tab: RequestTab,
  filters: RequestListFilters = {},
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: requestKeys.list(tab, filters),
    queryFn: () => queryRequests({ tab, ...filters }),
    enabled: options?.enabled ?? true,
    placeholderData: keepPreviousData,
  })
}

/**
 * POST /query/counts — the {action, created, viewer} tab-bar badges.
 * Deliberately a separate query from the list so turning a page does not
 * force a three-tab recount. Pass the SAME non-tab filters as the list, or
 * the badges will describe a different set than the table.
 */
export function useRequestTabCounts(
  filters: RequestCountsFilters = {},
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: requestKeys.counts(filters),
    queryFn: () => fetchTabCounts(filters),
    enabled: options?.enabled ?? true,
  })
}
