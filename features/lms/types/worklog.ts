// ---------------------------------------------------------------------------
// types/worklog.ts
// TypeScript interfaces for Teacher Worklog feature
// Maps to WorkLogDto / ShiftTypeOptions on the backend
// ---------------------------------------------------------------------------

import { z } from 'zod'

// NOTE: the v1 `WorkLogEntry`/`ShiftTypeOption`/`WorkLogStatus`/`DEFAULT_WORK_LOG`
// types that used to live here (consumed by v1 `/api/WorkLog/*`) were removed
// after the Class Detail worklog pane cutover to WRK v2 — see
// `WorkLogItemV2`/`ShiftOption`/`WorkLogStatusV2` below and
// `lib/worklog/api.ts`. Zero remaining consumers verified via repo-wide grep
// at cutover time.

/**
 * Shift type constants — matches BE ShiftTypeConstant. Domain vocabulary
 * shared by v1 and v2 (the `effortType` string values are unchanged between
 * the two API generations).
 */
export const ShiftTypeConstant = {
  MainTeacher: 'main_teacher',
  CoTeacher: 'co_teacher',
  MainFull: 'main_full',
  Full: 'full',
  Alone: 'alone',
  AloneExpat: 'alone_expat',
  Half: 'half',
  MtHalf: 'mt_half',
  CtHalf: 'ct_half',
  MfHalf: 'mf_half',
  ExpatHalf: 'expat_half',
  CatchUp: 'catchup',
  Off: 'off',
  Other: 'other',
  SingleLesson: 'single_lesson',
} as const

/**
 * Effort type groups for filtering options by teacher role.
 */
export const EXPAT_OPTIONS = ['full', 'expat_half'] as const
export const EXCLUDE_MAIN_OPTIONS = ['off'] as const

/**
 * When expat is active, Main Teacher is limited to these half-shifts only.
 * Co-Teacher is limited to ct_half only.
 * Both can also select Alone (which contains 'alone').
 */
export const MT_HALF_OPTIONS = ['mt_half', 'mf_half'] as const
export const CT_HALF_OPTIONS = ['ct_half'] as const

/**
 * Teacher from center-wide list — from GET /api/AspNetUsers/teacher
 * Used for substitute and expat teacher selection.
 * Mirrors AspNetUserVo on the backend.
 */
export interface AllTeacher {
  id: string
  email: string
  employeeCode: string | null
  firstName: string
  lastName: string
  phoneNumber: string | null
  englishName: string | null
  elAccount: string | null
  isExpat: boolean
  /** Computed fullName for display (firstName + " " + lastName) */
  fullName: string
}

// ---------------------------------------------------------------------------
// ============================ V2 (WRK v2) ===================================
// Canonical contract: GeeOBEv2/docs/api-endpoints-frontendv2/v2-working-time-contract.md
// Consumed by lib/worklog/api.ts + hooks/worklog/*. The Class Detail worklog
// pane, lib/classes/api.ts, and hooks/classes/use-classes.ts have all cut
// over to these types — `/api/WorkLog/*` (v1) has no remaining FE caller.
// ---------------------------------------------------------------------------

/**
 * WorkLog status enum — v2 BE spelling/semantics (WorkLogStatus enum in
 * GeeO.Data.Models/WorkLog.cs). Deliberately a SEPARATE const from the v1
 * `WorkLogStatus` above: the v1 const is spelled `Waiting` (one 't'); the BE
 * enum member is `Waitting` (two 't's). Do not conflate the two — v2 API
 * bodies/responses use these numeric values only, never the label spelling.
 */
export const WorkLogStatusV2 = {
  Waitting: 0,
  Accepted: 1,
  Rejected: 2,
} as const

export type WorkLogStatusV2Value =
  (typeof WorkLogStatusV2)[keyof typeof WorkLogStatusV2]

/**
 * WorkLogItemV2 — projection of a v1 WorkLog row + server-resolved grid
 * fields (classId/className/level/teacherName), per the locked v2 contract.
 * `updatedAt` is the optimistic-concurrency token echoed back as the
 * `If-Unmodified-Since` header on PUT/DELETE/status.
 *
 * `evaluate` (Amendment 2): now exposed on reads — was write-only before
 * (create/update accepted it but GetById/query never echoed it back).
 */
export const WorkLogItemV2Schema = z.object({
  id: z.string(),
  teacherId: z.string(),
  subsForTeacherId: z.string().nullable().optional(),
  teacherLessonLogId: z.string().nullable().optional(),
  singleLessonId: z.string().nullable().optional(),
  effortType: z.string(),
  status: z.number(),
  isExpat: z.boolean(),
  evaluate: z.boolean(),
  isEvent: z.boolean(),
  eventTime: z.number(),
  score: z.number(),
  lessonStart: z.string().nullable().optional(),
  comment: z.string().nullable().optional(),
  order: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  classId: z.string().nullable().optional(),
  className: z.string().nullable().optional(),
  level: z.string().nullable().optional(),
  teacherName: z.string().nullable().optional(),
})

export type WorkLogItemV2 = z.infer<typeof WorkLogItemV2Schema>

/**
 * ShiftOption — GET /worklog/shift-options item (DB ShiftTypes.Value/Name/
 * Score/Alias). `alias` mirrors the v1 `ShiftTypeOption.alias` field.
 */
export const ShiftOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
  score: z.number(),
  alias: z.string().optional(),
})

export type ShiftOption = z.infer<typeof ShiftOptionSchema>

/**
 * TimebookSummary — POST /worklog/summary/query response. `total` INCLUDES
 * `otherShift` (v2 fix vs. the legacy BE `TeacherTimebookSummary.Total`,
 * which omits it — do not reuse that computation client-side).
 */
export const TimebookSummarySchema = z.object({
  mtShift: z.number(),
  mfShift: z.number(),
  ctShift: z.number(),
  halfShift: z.number(),
  aloneShift: z.number(),
  catchUpShift: z.number(),
  otherShift: z.number(),
  supShift: z.number(),
  daysOff: z.number(),
  total: z.number(),
})

export type TimebookSummary = z.infer<typeof TimebookSummarySchema>

/**
 * AttendanceItem — check-in/check-out/attendance-me response
 * (WorkingTimeDtoV2). `workType`: 0 Office | 1 HalfDay | 2 Off | 3 Online.
 * `status`: 0 Waitting | 1 Active.
 */
export const AttendanceItemSchema = z.object({
  id: z.string(),
  staffId: z.string(),
  campusId: z.string().nullable().optional(),
  checkInTime: z.string().nullable().optional(),
  checkOutTime: z.string().nullable().optional(),
  workHours: z.number(),
  workType: z.number(),
  status: z.number(),
  createdAt: z.string(),
})

export type AttendanceItem = z.infer<typeof AttendanceItemSchema>
