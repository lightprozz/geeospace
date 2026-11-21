"use client"

// ---------------------------------------------------------------------------
// use-sort.ts
// Shared hook for table column sorting with localStorage persistence
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SortDirection = 'asc' | 'desc'

export interface SortConfig<TColumn extends string> {
  column: TColumn | null
  direction: SortDirection
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Shared hook for table column sorting with localStorage persistence.
 *
 * @param storageKey - Unique key for localStorage (e.g., 'students-table-sort')
 * @param defaultColumn - Default column to sort by (null = no default sort)
 * @param validColumns - List of valid column names for type safety
 */
export function useSort<TColumn extends string>(
  storageKey: string,
  defaultColumn: TColumn | null = null,
  validColumns?: readonly TColumn[]
) {
  const [sortConfig, setSortConfig] = useState<SortConfig<TColumn>>(() => {
    if (typeof window === 'undefined') {
      return { column: defaultColumn, direction: 'asc' }
    }

    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        // Validate stored column is still a valid column
        if (validColumns && parsed.column && !validColumns.includes(parsed.column)) {
          return { column: defaultColumn, direction: 'asc' }
        }
        return parsed
      }
    } catch {
      // ignore parse errors
    }

    return { column: defaultColumn, direction: 'asc' }
  })

  // Persist to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify(sortConfig))
    }
  }, [storageKey, sortConfig])

  const toggleSort = useCallback((column: TColumn) => {
    setSortConfig(prev => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }, [])

  const clearSort = useCallback(() => {
    setSortConfig({ column: defaultColumn, direction: 'asc' })
  }, [defaultColumn])

  const setSort = useCallback((column: TColumn, direction?: SortDirection) => {
    setSortConfig(prev => ({
      column,
      direction: direction ?? (prev.column === column && prev.direction === 'desc' ? 'asc' : 'desc')
    }))
  }, [])

  return {
    sortConfig,
    toggleSort,
    clearSort,
    setSort,
    isSorted: sortConfig.column !== null,
  }
}

// ---------------------------------------------------------------------------
// Helper: parse date for sorting (handles dd/MM/yyyy and ISO formats)
// ---------------------------------------------------------------------------

export function parseDateForSort(dateStr: string | null | undefined): string {
  if (!dateStr) return ''

  // Try dd/MM/yyyy format first
  const ddMM = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (ddMM) {
    // Convert to ISO-like for proper sorting: YYYYMMDD
    return `${ddMM[3]}${ddMM[2].padStart(2, '0')}${ddMM[1].padStart(2, '0')}`
  }

  // Fallback: try to parse as date
  try {
    const d = new Date(dateStr)
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0].replace(/-/g, '')
    }
  } catch {
    // ignore
  }

  return dateStr
}

// ---------------------------------------------------------------------------
// Helper: sort array by column with birthday-today priority
// ---------------------------------------------------------------------------

export interface SortableItem {
  isBirthdayToday?: () => boolean
}

export function sortWithBirthdayPriority<T extends SortableItem>(
  items: T[],
  sortColumn: string | null,
  sortFn: (a: T, b: T) => number
): T[] {
  if (!sortColumn) {
    // Default: birthday-today first, then original order
    return [...items].sort((a, b) => {
      const aBday = a.isBirthdayToday?.() ? 0 : 1
      const bBday = b.isBirthdayToday?.() ? 0 : 1
      return aBday - bBday
    })
  }

  // Column sort: birthday-today first, then sort within each group
  const regularItems: T[] = []
  const birthdayTodayItems: T[] = []

  items.forEach(item => {
    if (item.isBirthdayToday?.()) {
      birthdayTodayItems.push(item)
    } else {
      regularItems.push(item)
    }
  })

  return [
    ...birthdayTodayItems.sort(sortFn),
    ...regularItems.sort(sortFn)
  ]
}
