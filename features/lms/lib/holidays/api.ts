// ---------------------------------------------------------------------------
// lib/holidays/api.ts — V2 Holidays API
// Routes: api/v2/academic/holidays/*
// Fully migrated to V2 — no V1 gap endpoints remaining.
// ---------------------------------------------------------------------------

import { api } from '@/features/lms/lib/transport'
import type { HolidayRow, SaveHolidayInput } from '@/features/lms/types/holiday'

// ---- V2 route prefix --------------------------------------------------------

const HOLIDAYS_API = '/api/v2/academic/Holidays'

// ---- V2 Response types ------------------------------------------------------

interface HolidayV2Response {
  generalHolidays: string[]
  classHolidays: {
    classId: string
    className: string | null
    daysOff: string[]
    excludeDays: string[]
  }[]
}

// =========================================================================
// Holidays — V2
// =========================================================================

/** GET /api/v2/academic/Holidays (returns structured data, campus-scoped) */
export async function fetchHolidays(_userId: string): Promise<HolidayRow[]> {
  const result = await api.get<HolidayV2Response>(HOLIDAYS_API)

  // Convert V2 structured response to V1-compatible HolidayRow[] for backward compat
  const rows: HolidayRow[] = []

  // Helper to sanitize backend butchered JSON array strings
  // e.g., ["[\"2019-01-01\"", "\"2019-01-31\""] -> ["2019-01-01", "2019-01-31"]
  const sanitizeDates = (rawArr: string[]): string[] => {
    if (!Array.isArray(rawArr) || rawArr.length === 0) return []
    return rawArr
      .join(',')
      .replace(/[\[\]\\"]/g, '')
      .split(',')
      .map((d) => d.trim())
      .filter((d) => d.length > 0)
  }

  // General row
  rows.push({
    id: 'general',
    classId: null,
    holidayList: JSON.stringify(sanitizeDates(result.generalHolidays)),
    excludeDays: '[]',
    createdDate: '',
    createdBy: '',
    modifiedDate: null,
    modifiedBy: null,
  })

  // Class rows
  for (const ch of result.classHolidays) {
    rows.push({
      id: ch.classId,
      classId: ch.classId,
      holidayList: JSON.stringify(sanitizeDates(ch.daysOff)),
      excludeDays: JSON.stringify(sanitizeDates(ch.excludeDays)),
      createdDate: '',
      createdBy: '',
      modifiedDate: null,
      modifiedBy: null,
    })
  }

  return rows
}

/** PUT /api/v2/academic/Holidays/general */
export async function saveGeneralHolidays(holidays: string[]): Promise<void> {
  await api.put(`${HOLIDAYS_API}/general`, { holidays })
}

/** PUT /api/v2/academic/Holidays/classes/{classId} */
export async function saveClassHolidays(
  classId: string,
  daysOff: string[],
  excludeDays: string[],
): Promise<void> {
  await api.put(`${HOLIDAYS_API}/classes/${classId}`, { daysOff, excludeDays })
}

/**
 * V2 wrapper for legacy saveHolidays — splits payload into general + class calls.
 * Maintains backward compatibility with existing UI components.
 */
export async function saveHolidays(payload: SaveHolidayInput[]): Promise<void> {
  for (const item of payload) {
    if (item.classId === null) {
      // General holidays
      const holidays: string[] = JSON.parse(item.holidayList || '[]')
      await saveGeneralHolidays(holidays)
    } else {
      // Class-specific
      const daysOff: string[] = JSON.parse(item.holidayList || '[]')
      const excludeDays: string[] = JSON.parse(item.excludeDays || '[]')
      await saveClassHolidays(item.classId, daysOff, excludeDays)
    }
  }
}

/** POST /api/v2/academic/Holidays/rebuild-lessons */
export async function resetClassLessons(): Promise<void> {
  await api.post(`${HOLIDAYS_API}/rebuild-lessons`, {})
}
