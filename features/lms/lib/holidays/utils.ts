// ---------------------------------------------------------------------------
// lib/holidays/utils.ts
// Pure utility functions for Holidays domain — parsing, grouping, payload build
// ---------------------------------------------------------------------------

import type {
  HolidayRow,
  HolidayData,
  SaveHolidayInput,
} from '@/features/lms/types/holiday'

/**
 * Safely parse a JSON string into string[].
 * Returns empty array on malformed or empty input.
 */
function safeParseJsonArray(json: string | null | undefined): string[] {
  if (!json) return []
  try {
    const parsed: unknown = JSON.parse(json)
    if (Array.isArray(parsed)) {
      return parsed.filter((v): v is string => typeof v === 'string')
    }
    return []
  } catch {
    return []
  }
}

/**
 * Transform raw HolidayRow[] from API into typed HolidayData.
 *
 * - General row (classId === null): holidayList → generalHolidays
 * - Class rows (classId !== null): holidayList → classHolidays[classId],
 *   excludeDays → classExcludeDays[classId]
 */
export function parseHolidayRows(rows: HolidayRow[]): HolidayData {
  let generalHolidays: string[] = []
  const classHolidays: Record<string, string[]> = {}
  const classExcludeDays: Record<string, string[]> = {}

  for (const row of rows) {
    if (!row.classId) {
      generalHolidays = safeParseJsonArray(row.holidayList)
    } else {
      classHolidays[row.classId] = safeParseJsonArray(row.holidayList)
      classExcludeDays[row.classId] = safeParseJsonArray(row.excludeDays)
    }
  }

  return { generalHolidays, classHolidays, classExcludeDays }
}

/**
 * Build the save payload from HolidayData (reverse of parseHolidayRows).
 *
 * Produces one row for general holidays (classId = null, excludeDays = "[]")
 * + one row per class that has any holidays or excludeDays.
 */
export function buildSavePayload(
  data: HolidayData,
  userId: string,
): SaveHolidayInput[] {
  const payload: SaveHolidayInput[] = []

  // General holidays row — always included
  payload.push({
    classId: null,
    holidayList: JSON.stringify(data.generalHolidays),
    excludeDays: JSON.stringify([]),
    createdBy: userId,
  })

  // Class-specific rows — union of classHolidays + classExcludeDays keys
  const classIds = [
    ...new Set([
      ...Object.keys(data.classHolidays),
      ...Object.keys(data.classExcludeDays),
    ]),
  ]

  for (const classId of classIds) {
    payload.push({
      classId,
      holidayList: JSON.stringify(data.classHolidays[classId] ?? []),
      excludeDays: JSON.stringify(data.classExcludeDays[classId] ?? []),
      createdBy: userId,
    })
  }

  return payload
}

/**
 * Group date strings by year (first 4 characters).
 * Returns { "2026": ["2026-01-01", ...], "2025": [...] }
 * Sorted within each year.
 */
export function groupByYear(dates: string[]): Record<string, string[]> {
  const map: Record<string, string[]> = {}

  for (const d of dates) {
    const year = d.substring(0, 4)
    if (!map[year]) map[year] = []
    map[year].push(d)
  }

  // Sort dates within each year
  for (const year of Object.keys(map)) {
    map[year].sort()
  }

  return map
}

/**
 * Extract available years from date strings, sorted descending (most recent first).
 * Limits to the last 3 years.
 */
export function getAvailableYears(dates: string[]): string[] {
  const years = [...new Set(dates.map((d) => d.substring(0, 4)))]
  return years.sort().reverse().slice(0, 3)
}
