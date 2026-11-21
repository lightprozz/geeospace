// ---------------------------------------------------------------------------
// types/attendance.ts
// Zod schemas + inferred TypeScript types for Attendance & Catch-Up module
// Generated for geeo-lms-fe (Next.js 16) — Attendance Phase 1
// ---------------------------------------------------------------------------

import { z } from 'zod'

// ---------------------------------------------------------------------------
// CatchUp Type — const enum (project convention: no TS enum)
// Drives conditional form rendering in CatchUpUpsertDialog
// ---------------------------------------------------------------------------

export const CatchUpType = {
  BeforeClass: 1,
  TimeInWeek: 2,
  AnotherClass: 3,
  Online: 4,
} as const

export type CatchUpTypeValue =
  (typeof CatchUpType)[keyof typeof CatchUpType]

/** Label/value options for CatchUpType Select component */
export const CATCH_UP_TYPE_OPTIONS = [
  { value: CatchUpType.BeforeClass, label: '30 minutes before class started' },
  { value: CatchUpType.TimeInWeek, label: 'A time in this week' },
  { value: CatchUpType.AnotherClass, label: 'In another class' },
  { value: CatchUpType.Online, label: 'Online' },
] as const

// ---------------------------------------------------------------------------
// SingleLesson Type — const enum
// ---------------------------------------------------------------------------

export const SingleLessonType = {
  CatchUp: 1,
  WorkShop: 2,
  Online: 3,
  Other: 4,
} as const

export type SingleLessonTypeValue =
  (typeof SingleLessonType)[keyof typeof SingleLessonType]

/** Label/value options for SingleLessonType Select component */
export const SINGLE_LESSON_TYPE_OPTIONS = [
  { value: SingleLessonType.CatchUp, label: 'CatchUp' },
  { value: SingleLessonType.WorkShop, label: 'WorkShop' },
  { value: SingleLessonType.Online, label: 'Online' },
  { value: SingleLessonType.Other, label: 'Other' },
] as const

// ---------------------------------------------------------------------------
// CatchUpScheduleGrid — API list response (read-only)
// Matches GET /api/CatchUpSchedules/GetScheduleByTeacher/{teacherId}
// ---------------------------------------------------------------------------

export const CatchUpScheduleGridSchema = z.object({
  id: z.string(),
  type: z.number(),
  name: z.string(),
  lesson: z.string().nullable(),
  class: z.string().nullable(),
  catchUpTime: z.number(),
  level: z.string().nullable(),
  studentName: z.string().nullable(),
  startTime: z.string().nullable(),
  startTimeOfTheWeek: z.string().nullable(),
  startDateOfTheWeek: z.string().nullable(),
  beginDateFormat: z.string().nullable(),
  typeFormat: z.string().nullable(),
})

export type CatchUpScheduleGrid = z.infer<typeof CatchUpScheduleGridSchema>

// ---------------------------------------------------------------------------
// CatchUpFormValues — for create/edit form (react-hook-form + zodResolver)
// Conditional validation based on catchUpType
// ---------------------------------------------------------------------------

export const CatchUpFormSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    catchUpType: z.number().min(1).max(4),
    teacherId: z.string().min(1, 'Teacher is required'),
    studentId: z.string().min(1, 'Student is required'),
    catchUpStatus: z.number().default(0),

    // Type 1 — before class
    classLessonId: z.string().optional().default(''),
    catchUpTime: z.number().optional().default(30),

    // Type 2 — specific time this week
    startDate: z.string().optional().default(''),
    startTime: z.string().optional().default(''),

    // Type 3 — in another class
    newClassId: z.string().optional().default(''),
    isChangeClass: z.boolean().optional().default(false),

    // Type 4 — online
    linkOnline: z.string().optional().default(''),
  })
  .refine(
    (data) => {
      if (data.catchUpType === CatchUpType.BeforeClass) {
        return !!data.classLessonId
      }
      return true
    },
    { message: 'Class lesson is required for this type', path: ['classLessonId'] },
  )
  .refine(
    (data) => {
      if (data.catchUpType === CatchUpType.TimeInWeek) {
        return !!data.startDate && !!data.startTime
      }
      return true
    },
    { message: 'Start date and time are required', path: ['startDate'] },
  )
  .refine(
    (data) => {
      if (data.catchUpType === CatchUpType.AnotherClass) {
        return !!data.newClassId
      }
      return true
    },
    { message: 'Target class is required', path: ['newClassId'] },
  )
  .refine(
    (data) => {
      if (data.catchUpType === CatchUpType.Online) {
        return !!data.linkOnline
      }
      return true
    },
    { message: 'Online link is required', path: ['linkOnline'] },
  )

export type CatchUpFormValues = z.infer<typeof CatchUpFormSchema>

// ---------------------------------------------------------------------------
// CatchUp entity — full response from GET /api/CatchUpSchedules/{id}
// ---------------------------------------------------------------------------

export const CatchUpEntitySchema = z.object({
  id: z.string(),
  catchUpType: z.number(),
  catchUpTime: z.number(),
  name: z.string(),
  catchUpStatus: z.number(),
  teacherId: z.string(),
  studentId: z.string(),
  createDate: z.string(),
  startDate: z.string().nullable(),
  startTime: z.string().nullable(),
  classLessonId: z.string().nullable(),
  newClassId: z.string().nullable(),
  linkOnline: z.string().nullable(),
})

export type CatchUpEntity = z.infer<typeof CatchUpEntitySchema>

// ---------------------------------------------------------------------------
// AbsentStudent — from GetStudentCatchUpByTeacherId
// Students with Present==0 in teacher's classes
// ---------------------------------------------------------------------------

export const AbsentStudentSchema = z.object({
  studentName: z.string(),
  englishName: z.string().nullable(),
  class: z.string(),
  fatherName: z.string().nullable(),
  fatherPhone: z.string().nullable(),
  motherName: z.string().nullable(),
  motherPhone: z.string().nullable(),
})

export type AbsentStudent = z.infer<typeof AbsentStudentSchema>

// ---------------------------------------------------------------------------
// SingleLessonDto — API list/detail response
// Matches GET /api/SingleLessons
// ---------------------------------------------------------------------------

export const SingleLessonDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.number(),
  typeFormat: z.string().nullable(),
  roomId: z.string().nullable(),
  branchId: z.string().nullable(),
  startTime: z.string(),
  endTime: z.string(),
  startTimeStr: z.string().nullable(),
  endTimeStr: z.string().nullable(),
  isArchived: z.boolean(),
  numOfStudent: z.number(),
  studentIds: z.array(z.string()),
  teacherIds: z.array(z.string()),
})

export type SingleLessonDto = z.infer<typeof SingleLessonDtoSchema>

// ---------------------------------------------------------------------------
// SingleLessonFormValues — for create/edit form
// ---------------------------------------------------------------------------

export const SingleLessonFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.number().min(1).max(4),
  roomId: z.string().optional().default(''),
  branchId: z.string().optional().default(''),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  studentIds: z.array(z.string()).default([]),
  teacherIds: z.array(z.string()).default([]),
})

export type SingleLessonFormValues = z.infer<typeof SingleLessonFormSchema>

// ---------------------------------------------------------------------------
// Default form values
// ---------------------------------------------------------------------------

export const DEFAULT_CATCHUP_FORM: z.input<typeof CatchUpFormSchema> = {
  name: '',
  catchUpType: CatchUpType.BeforeClass,
  teacherId: '',
  studentId: '',
  catchUpStatus: 0,
  classLessonId: '',
  catchUpTime: 30,
  startDate: '',
  startTime: '',
  newClassId: '',
  isChangeClass: false,
  linkOnline: '',
}

export const DEFAULT_SINGLE_LESSON_FORM: SingleLessonFormValues = {
  name: '',
  type: SingleLessonType.CatchUp,
  roomId: '',
  branchId: '',
  startTime: '',
  endTime: '',
  studentIds: [],
  teacherIds: [],
}

// ---------------------------------------------------------------------------
// Supporting Lookup Types — for form selects
// ---------------------------------------------------------------------------

/** ClassLesson option — from GetClassLessonByTeacher (catch-up type 1) */
export const ClassLessonOptionSchema = z.object({
  id: z.string().optional(),
  level: z.string(),
  class: z.string(),
  lesson: z.string(),
  beginDateFormat: z.string(),
})

export type ClassLessonOption = z.infer<typeof ClassLessonOptionSchema>

/** ClassCourse option — from GetClassCourseSchedule (catch-up type 3) */
export const ClassCourseOptionSchema = z.object({
  id: z.string(),
  level: z.string(),
  class: z.string(),
  schedule: z.string().nullable(),
  startTimeLocal: z.string().nullable(),
  endTimeLocal: z.string().nullable(),
  teacher: z.string().nullable(),
})

export type ClassCourseOption = z.infer<typeof ClassCourseOptionSchema>

/** Student filtered by branch — for SingleLesson form */
export const BranchStudentSchema = z.object({
  id: z.string(),
  name: z.string(),
  englishName: z.string().nullable(),
  branchId: z.string().nullable(),
})

export type BranchStudent = z.infer<typeof BranchStudentSchema>

/** Teacher filtered by branch — for SingleLesson form */
export const BranchTeacherSchema = z.object({
  id: z.string(),
  name: z.string(),
  branchId: z.string().nullable(),
})

export type BranchTeacher = z.infer<typeof BranchTeacherSchema>
