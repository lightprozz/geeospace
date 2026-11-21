// ---------------------------------------------------------------------------
// types/holiday.ts
// TypeScript types for Holidays & Days Off Management
// ---------------------------------------------------------------------------

/**
 * Raw row from GET /api/AcademicManage/GetHolidays/{userId}
 * DB entity: Holidays table
 * - General row: classId = null, excludeDays = "[]"
 * - Class row: classId != null, holidayList = class days off, excludeDays = override days on
 */
export interface HolidayRow {
  id: string
  classId: string | null
  holidayList: string // JSON string: string[] of "yyyy-MM-dd"
  excludeDays: string // JSON string: string[] of "yyyy-MM-dd"
  createdDate: string
  createdBy: string
  modifiedDate: string | null
  modifiedBy: string | null
}

/**
 * Parsed client-side structure after processing raw HolidayRow[].
 * This is the shape used by all UI components.
 */
export interface HolidayData {
  /** System-wide holiday dates — "yyyy-MM-dd"[] */
  generalHolidays: string[]
  /** Class-specific additional days off — { [classId]: "yyyy-MM-dd"[] } */
  classHolidays: Record<string, string[]>
  /** Class-specific override days on (make-up) — { [classId]: "yyyy-MM-dd"[] } */
  classExcludeDays: Record<string, string[]>
}

/**
 * Payload item for POST /api/AcademicManage/SaveHolidays
 * Upsert logic: match by classId (null = general row)
 */
export interface SaveHolidayInput {
  classId: string | null
  holidayList: string // JSON.stringify(string[])
  excludeDays: string // JSON.stringify(string[])
  createdBy: string
}
