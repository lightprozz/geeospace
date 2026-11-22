// ---------------------------------------------------------------------------
// requests-filters.ts — URL-shareable filter state via nuqs v2
//
// nuqs v2: useQueryState(key) returns [value, setter] where value is
// string | null. We wrap each hook to provide typed return values.
// The setter always accepts string | null (nuqs contract); callers pass
// RequestTab values directly and TypeScript narrows them at call sites.
// ---------------------------------------------------------------------------

import { useQueryState } from '@/features/forms/window-adapter'
import { useCallback } from 'react'

import type { RequestTab } from '@/features/lms/types/request'

// ---------------------------------------------------------------------------
// Individual filter hooks
// ---------------------------------------------------------------------------

/** Active tab: 'action' | 'created' | 'viewer'. */
export function useActiveTab(): [
  RequestTab | null,
  (tab: RequestTab) => void,
] {
  const [value, setValue] = useQueryState('tab')
  const setter = useCallback(
    (tab: RequestTab) => setValue(tab),
    [setValue],
  )
  return [value as RequestTab | null, setter]
}

/** Collection filter — null = all collections. */
export function useCollectionId(): [
  string | null,
  (id: string | null) => void,
] {
  const [value, setValue] = useQueryState('collectionId')
  const setter = useCallback(
    (id: string | null) => setValue(id),
    [setValue],
  )
  return [value as string | null, setter]
}

/** Status filter — null = all statuses. */
export function useStatusFilter(): [
  string | null,
  (status: string | null) => void,
] {
  const [value, setValue] = useQueryState('status')
  const setter = useCallback(
    (status: string | null) => setValue(status),
    [setValue],
  )
  return [value as string | null, setter]
}

/** Keyword search — null = no filter. */
export function useKeywordFilter(): [
  string | null,
  (keyword: string | null) => void,
] {
  const [value, setValue] = useQueryState('keyword')
  const setter = useCallback(
    (keyword: string | null) => setValue(keyword),
    [setValue],
  )
  return [value as string | null, setter]
}

/** Archived toggle — 'true' = include archived, null = hide archived. */
export function useArchivedFilter(): [
  string | null,
  (archived: string | null) => void,
] {
  const [value, setValue] = useQueryState('archived')
  const setter = useCallback(
    (archived: string | null) => setValue(archived),
    [setValue],
  )
  return [value as string | null, setter]
}

/** Current page. */
export function usePageFilter(): [
  string | null,
  (page: string | null) => void,
] {
  const [value, setValue] = useQueryState('page')
  const setter = useCallback(
    (page: string | null) => setValue(page),
    [setValue],
  )
  return [value as string | null, setter]
}

/** Page size. */
export function usePageSizeFilter(): [
  string | null,
  (pageSize: string | null) => void,
] {
  const [value, setValue] = useQueryState('pageSize')
  const setter = useCallback(
    (pageSize: string | null) => setValue(pageSize),
    [setValue],
  )
  return [value as string | null, setter]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns a stable callback that resets the page to '1'.
 * Call this in toolbar/sidebar handlers when any filter changes.
 */
export function useResetPage() {
  const [, setPage] = usePageFilter()
  return useCallback(() => setPage('1'), [setPage])
}
