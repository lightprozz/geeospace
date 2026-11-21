// ---------------------------------------------------------------------------
// types/schedule.ts
// Zod schemas + inferred TypeScript types for Schedule Management module
// Generated for geeo-lms-fe (Next.js 16) — Schedule Phase 1
// ---------------------------------------------------------------------------

import { z } from 'zod'

// ---------------------------------------------------------------------------
// Schedule — API list response
// Matches GET /api/Schedules/GetScheduleList/{userId}/{containsEndClass}
// Fields from legacy ListSchedule.js cols array
// ---------------------------------------------------------------------------

export const ScheduleSchema = z.object({
  id: z.string(),
  name: z.string(),

  // Day-of-week booleans — matches EditSchedule.js state
  monday: z.boolean(),
  tuesday: z.boolean(),
  wednesday: z.boolean(),
  thursday: z.boolean(),
  friday: z.boolean(),
  saturday: z.boolean(),
  sunday: z.boolean(),

  // Time fields — ISO datetime strings
  startTime: z.string(),
  endTime: z.string(),
  startDate: z.string(),
  endDate: z.string(),

  // Pre-formatted display string e.g. "Mon, Wed"
  scheduleFormat: z.string().optional(),

  // Classroom association
  classRoomId: z.string().nullable(),
  classRoomName: z.string().nullable().optional(),

  // Class (ClassCourse) association
  classCourseId: z.string().nullable(),
  classCourseName: z.string().nullable().optional(),

  // Campus info (derived)
  campusId: z.string().nullable().optional(),
  campusName: z.string().nullable().optional(),
})

export type Schedule = z.infer<typeof ScheduleSchema>

// ---------------------------------------------------------------------------
// ScheduleCalendarEvent — calendar view data
// Matches CalendarScheduler.js objCalendar mapping
// From GET /api/Schedules/GetAllDataCalendar
// ---------------------------------------------------------------------------

export const ScheduleCalendarEventSchema = z.object({
  id: z.string(),
  campusId: z.string().nullable(),
  title: z.string(),
  startTime: z.string(), // ISO datetime
  endTime: z.string(),   // ISO datetime
})

export type ScheduleCalendarEvent = z.infer<typeof ScheduleCalendarEventSchema>

// ---------------------------------------------------------------------------
// ScheduleFormValues — for create/edit form
// Matches EditSchedule.js schedule state shape
// Used with react-hook-form + zodResolver
// ---------------------------------------------------------------------------

export const ScheduleFormSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),

    // Day-of-week checkboxes
    monday: z.boolean(),
    tuesday: z.boolean(),
    wednesday: z.boolean(),
    thursday: z.boolean(),
    friday: z.boolean(),
    saturday: z.boolean(),
    sunday: z.boolean(),

    // Time (HH:mm format for native time inputs)
    startTime: z.string().min(1, 'Start time is required'),
    endTime: z.string().min(1, 'End time is required'),

    // Date (YYYY-MM-DD format for native date inputs)
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),

    // Optional associations (can be set via separate dialogs)
    classCourseId: z.string().nullable().optional(),
    classRoomId: z.string().nullable().optional(),
  })
  .refine(
    (data) =>
      data.monday ||
      data.tuesday ||
      data.wednesday ||
      data.thursday ||
      data.friday ||
      data.saturday ||
      data.sunday,
    {
      message: 'Select at least one day',
      path: ['monday'], // attach error to first day field
    },
  )

export type ScheduleFormValues = z.infer<typeof ScheduleFormSchema>

// ---------------------------------------------------------------------------
// Default form values for create mode
// ---------------------------------------------------------------------------

export const DEFAULT_SCHEDULE_FORM: ScheduleFormValues = {
  name: '',
  monday: false,
  tuesday: false,
  wednesday: false,
  thursday: false,
  friday: false,
  saturday: false,
  sunday: false,
  startTime: '',
  endTime: '',
  startDate: '',
  endDate: '',
  classCourseId: null,
  classRoomId: null,
}

// ---------------------------------------------------------------------------
// Day helpers — iterate & display day checkboxes
// ---------------------------------------------------------------------------

export const SCHEDULE_DAYS = [
  { key: 'monday', label: 'Mon', full: 'Monday' },
  { key: 'tuesday', label: 'Tue', full: 'Tuesday' },
  { key: 'wednesday', label: 'Wed', full: 'Wednesday' },
  { key: 'thursday', label: 'Thu', full: 'Thursday' },
  { key: 'friday', label: 'Fri', full: 'Friday' },
  { key: 'saturday', label: 'Sat', full: 'Saturday' },
  { key: 'sunday', label: 'Sun', full: 'Sunday' },
] as const

export type DayKey = (typeof SCHEDULE_DAYS)[number]['key']

// ---------------------------------------------------------------------------
// Utility: extract active days as short labels from a Schedule
// ---------------------------------------------------------------------------

export function getActiveDays(schedule: Schedule): string[] {
  return SCHEDULE_DAYS.filter(({ key }) => schedule[key]).map(({ label }) => label)
}

// ---------------------------------------------------------------------------
// CalendarSession — internal type for timetable view
// Derived from ScheduleCalendarEvent + shift mapping
// ---------------------------------------------------------------------------

export interface CalendarSession {
  id: string
  className: string
  room: string
  teacher: string
  startTime: string // "HH:mm"
  endTime: string   // "HH:mm"
  date: Date
  shiftCode: string // A1, A2, B1, B2, C1-C4
  isEvent: boolean
  campusId: string | null
}

// ---------------------------------------------------------------------------
// Shift color utility — maps shift code to Tailwind classes
// A shifts = indigo, B shifts = orange, C shifts = emerald, C3/C4 = rose
// ---------------------------------------------------------------------------

export function getShiftColor(code: string): {
  bg: string
  text: string
  dot: string
} {
  if (code.startsWith('A')) {
    return {
      bg: 'bg-indigo-100 dark:bg-indigo-950/40',
      text: 'text-indigo-700 dark:text-indigo-300',
      dot: 'bg-indigo-500',
    }
  }
  if (code.startsWith('B')) {
    return {
      bg: 'bg-orange-100 dark:bg-orange-950/40',
      text: 'text-orange-700 dark:text-orange-300',
      dot: 'bg-orange-500',
    }
  }
  if (code.startsWith('C')) {
    return {
      bg: 'bg-emerald-100 dark:bg-emerald-950/40',
      text: 'text-emerald-700 dark:text-emerald-300',
      dot: 'bg-emerald-500',
    }
  }
// Default fallback
return {
  bg: 'bg-secondary',
  text: 'text-secondary-foreground',
  dot: 'bg-muted-foreground',
}
}

// ---------------------------------------------------------------------------
// Shift definitions — time ranges for each shift code
// Derived from TimetableView.tsx mockup generateMockSessions
// ---------------------------------------------------------------------------

export const SHIFTS = [
  { code: 'A1', name: 'T3/T5 (17:00-19:00)', start: '17:00', end: '19:00', isEvent: false },
  { code: 'A2', name: 'T3/T5 (19:00+)', start: '19:00', end: '21:00', isEvent: false },
  { code: 'B1', name: 'T4/T6 (17:00-19:00)', start: '17:00', end: '19:00', isEvent: false },
  { code: 'B2', name: 'T4/T6 (19:00+)', start: '19:00', end: '21:00', isEvent: false },
  { code: 'C1', name: 'T7/CN (08:00-10:30)', start: '08:00', end: '10:30', isEvent: false },
  { code: 'C2', name: 'T7/CN (10:30-12:00)', start: '10:30', end: '12:00', isEvent: false },
  { code: 'C3', name: 'T7/CN (15:00-16:30)', start: '15:00', end: '16:30', isEvent: false },
  { code: 'C4', name: 'T7/CN (16:30-18:00)', start: '16:30', end: '18:00', isEvent: false },
] as const

/**
 * Derive a shift code based on day of week and start time.
 * T3/T5 -> A, T4/T6 -> B, T7/CN -> C
 */
export function deriveShiftCode(date: Date, startTimeStr: string): string {
  const day = date.getDay() // 0 = Sun, 1 = Mon, ... 6 = Sat
  const [sh, sm] = startTimeStr.split(':').map(Number)
  const startMins = sh * 60 + sm

  // T3/T5 (Tue=2, Thu=4)
  if (day === 2 || day === 4) {
    if (sh >= 17 && sh < 19) return 'A1'
    if (sh >= 19) return 'A2'
    return 'A1' // fallback
  }

  // T4/T6 (Wed=3, Fri=5)
  if (day === 3 || day === 5) {
    if (sh >= 17 && sh < 19) return 'B1'
    if (sh >= 19) return 'B2'
    return 'B1' // fallback
  }

  // T7/CN (Sat=6, Sun=0)
  if (day === 6 || day === 0) {
    if (startMins >= 8 * 60 && startMins < 10 * 60 + 30) return 'C1' // 08:00 - 10:30
    if (startMins >= 10 * 60 + 30 && startMins < 12 * 60) return 'C2' // 10:30 - 12:00
    if (startMins >= 15 * 60 && startMins < 16 * 60 + 30) return 'C3' // 15:00 - 16:30
    if (startMins >= 16 * 60 + 30) return 'C4' // 16:30+
    return 'C1' // fallback
  }

  // Custom fallback for Mondays or anomalies
  return 'A1'
}
