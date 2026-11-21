// ---------------------------------------------------------------------------
// lib/format-date.ts — Centralized DateTime formatting for table display
// Convention: dd/MM/yyyy for dates, HH:mm for time
// All ISO strings from backend pass through these utilities.
// ---------------------------------------------------------------------------

import { format, parseISO, isValid } from 'date-fns'

// ---------------------------------------------------------------------------
// Core parsing — null-safe ISO string → Date
// ---------------------------------------------------------------------------

/**
 * Parse ISO 8601 string to Date object.
 * Returns null for invalid/empty input.
 */
export function parseIso(isoString: string | null | undefined): Date | null {
  if (!isoString) return null
  try {
    const date = parseISO(isoString)
    return isValid(date) ? date : null
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Display formatters — ISO string → human-readable string
// ---------------------------------------------------------------------------

/**
 * Format ISO string as date only.
 * "2026-05-20T10:30:00.000Z" → "20/05/2026"
 * Returns "—" for invalid/null input.
 */
export function formatDate(isoString: string | null | undefined): string {
  const date = parseIso(isoString)
  return date ? format(date, 'dd/MM/yyyy') : '—'
}

/**
 * Format ISO string as date + time.
 * "2026-05-20T10:30:00.000Z" → "20/05/2026 10:30"
 * Returns "—" for invalid/null input.
 */
export function formatDateTime(isoString: string | null | undefined): string {
  const date = parseIso(isoString)
  return date ? format(date, 'dd/MM/yyyy HH:mm') : '—'
}

/**
 * Format ISO string or "HH:mm" string as time only.
 * "2026-05-20T10:30:00.000Z" → "10:30"
 * "17:30" → "17:30" (passthrough for already-formatted)
 * Returns "—" for invalid/null input.
 */
export function formatTime(isoString: string | null | undefined): string {
  if (!isoString) return '—'

  // If already in "HH:mm" format, return as-is
  if (/^\d{2}:\d{2}$/.test(isoString)) return isoString

  const date = parseIso(isoString)
  return date ? format(date, 'HH:mm') : '—'
}

// ---------------------------------------------------------------------------
// Sort comparator — for useClientTable sorting on date columns
// ---------------------------------------------------------------------------

/**
 * Compare two ISO date strings for sorting.
 * Handles nulls (null sorts last in ascending).
 * Returns negative if a < b, positive if a > b, 0 if equal.
 */
export function compareIsoDate(
  a: string | null | undefined,
  b: string | null | undefined,
): number {
  const dateA = parseIso(a)
  const dateB = parseIso(b)

  if (!dateA && !dateB) return 0
  if (!dateA) return 1 // null sorts last
  if (!dateB) return -1

  return dateA.getTime() - dateB.getTime()
}
