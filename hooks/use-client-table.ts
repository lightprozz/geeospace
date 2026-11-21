'use client'
// ---------------------------------------------------------------------------
// hooks/use-client-table.ts
// Generic client-side table processing: search, filter, sort, paginate.
// Used by all data tables EXCEPT Materials (which uses server-side query).
//
// Usage:
//   const { items, totalFiltered, totalPages, ... } = useClientTable({
//     data: allClasses,
//     searchQuery: 'math',
//     searchFields: ['className', 'levelName'],
//     sort: { field: 'className', desc: false },
//     page: 1,
//     pageSize: 20,
//   })
// ---------------------------------------------------------------------------

import { useMemo, useEffect } from 'react'

import { parseIso } from '@/lib/format-date'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ClientFilter<T> {
  field: keyof T
  operator: 'eq' | 'neq' | 'contains'
  value: string
}

export interface ClientSort<T> {
  field: keyof T
  desc: boolean
}

export interface UseClientTableOptions<T> {
  /** Full dataset from API (unfiltered, unsorted) */
  data: T[]
  /** Fields to run text search across (OR match) */
  searchFields?: (keyof T)[]
  /** Current search text */
  searchQuery?: string
  /** Structured filters (AND logic between filters) */
  filters?: ClientFilter<T>[]
  /** Custom predicate filter (e.g., complex multi-field logic) */
  filterPredicate?: (item: T) => boolean
  /** Current sort state */
  sort?: ClientSort<T> | null
  /** Callback to update sort state (for external state management) */
  onSortChange?: (sort: ClientSort<T> | null) => void
  /** localStorage key for persisting sort preference (e.g., 'classes-table-sort') */
  sortStorageKey?: string
  /** Default sort when no explicit sort is set */
  defaultSort?: ClientSort<T>
  /** Current page (1-indexed) */
  page?: number
  /** Items per page */
  pageSize?: number
}

export interface UseClientTableResult<T> {
  /** Current page items (post search → filter → sort → paginate) */
  items: T[]
  /** All items after search + filter, before pagination */
  filteredItems: T[]
  /** Total count after search + filter */
  totalFiltered: number
  /** Total pages based on filteredItems / pageSize */
  totalPages: number
  /** Current page (1-indexed) */
  page: number
  /** Current page size */
  pageSize: number
  /** Display range start: "1" in "1–20 of 143" */
  rangeStart: number
  /** Display range end: "20" in "1–20 of 143" */
  rangeEnd: number
  /** True if filteredItems is empty */
  isEmpty: boolean
  /** True if any search or filter is active */
  isFiltered: boolean
}

// ---------------------------------------------------------------------------
// Sort value extractor — auto-detects type for proper comparison
// ---------------------------------------------------------------------------

function getSortValue(value: unknown): string | number | null {
  if (value == null) return null
  if (typeof value === 'number') return value
  if (typeof value === 'boolean') return value ? 1 : 0
  if (typeof value === 'string') {
    // Try to detect ISO date string
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      const date = parseIso(value)
      if (date) return date.getTime()
    }
    // Try numeric string
    const num = Number(value)
    if (!isNaN(num) && value.trim() !== '') return num
    // Fallback to lowercase string
    return value.toLowerCase()
  }
  return String(value).toLowerCase()
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useClientTable<T extends Record<string, unknown>>(
  options: UseClientTableOptions<T>,
): UseClientTableResult<T> {
  const {
    data,
    searchFields = [],
    searchQuery = '',
    filters = [],
    filterPredicate,
    sort: externalSort,
    defaultSort,
    page = 1,
    pageSize = 20,
    sortStorageKey,
    onSortChange,
  } = options

  // ── Sort state with localStorage persistence ──
  const sort = useMemo(() => {
    // If external sort is provided, use it (for controlled components)
    if (externalSort !== undefined) return externalSort

    // Otherwise, try to load from localStorage
    if (sortStorageKey && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(sortStorageKey)
        if (stored) return JSON.parse(stored) as ClientSort<T>
      } catch { /* ignore */ }
    }

    return null
  }, [externalSort, sortStorageKey])

  // Persist sort to localStorage when it changes (for uncontrolled mode)
  useEffect(() => {
    if (sortStorageKey && typeof window !== 'undefined' && sort && onSortChange) {
      localStorage.setItem(sortStorageKey, JSON.stringify(sort))
    }
  }, [sort, sortStorageKey, onSortChange])

  // ── Step 1: Search ──
  const searched = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q || searchFields.length === 0) return data

    return data.filter((item) =>
      searchFields.some((field) => {
        const val = item[field]
        if (val == null) return false
        return String(val).toLowerCase().includes(q)
      }),
    )
  }, [data, searchQuery, searchFields])

  // ── Step 2: Filter ──
  const filtered = useMemo(() => {
    let result = searched

    // Apply structured filters (AND logic)
    for (const filter of filters) {
      result = result.filter((item) => {
        const val = item[filter.field]
        const valStr = val == null ? '' : String(val).toLowerCase()
        const filterVal = filter.value.toLowerCase()

        switch (filter.operator) {
          case 'eq':
            return valStr === filterVal
          case 'neq':
            return valStr !== filterVal
          case 'contains':
            return valStr.includes(filterVal)
          default:
            return true
        }
      })
    }

    // Apply custom predicate
    if (filterPredicate) {
      result = result.filter(filterPredicate)
    }

    return result
  }, [searched, filters, filterPredicate])

  // ── Step 3: Sort ──
  const sorted = useMemo(() => {
    const activeSort = sort ?? defaultSort
    if (!activeSort) return filtered

    const { field, desc } = activeSort
    const multiplier = desc ? -1 : 1

    return [...filtered].sort((a, b) => {
      const aVal = getSortValue(a[field])
      const bVal = getSortValue(b[field])

      // Nulls sort last regardless of direction
      if (aVal === null && bVal === null) return 0
      if (aVal === null) return 1
      if (bVal === null) return -1

      // Compare by type
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return (aVal - bVal) * multiplier
      }

      // String comparison
      return String(aVal).localeCompare(String(bVal)) * multiplier
    })
  }, [filtered, sort, defaultSort])

  // ── Step 4: Paginate ──
  const result = useMemo(() => {
    const totalFiltered = sorted.length
    const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize))
    const safePage = Math.min(Math.max(1, page), totalPages)
    const start = (safePage - 1) * pageSize
    const items = sorted.slice(start, start + pageSize)

    const rangeStart = totalFiltered === 0 ? 0 : start + 1
    const rangeEnd = Math.min(start + pageSize, totalFiltered)

    const isFiltered =
      searchQuery.trim() !== '' ||
      filters.length > 0 ||
      filterPredicate != null

    return {
      items,
      filteredItems: sorted,
      totalFiltered,
      totalPages,
      page: safePage,
      pageSize,
      rangeStart,
      rangeEnd,
      isEmpty: totalFiltered === 0,
      isFiltered,
    }
  }, [sorted, page, pageSize, searchQuery, filters, filterPredicate])

  return result
}
