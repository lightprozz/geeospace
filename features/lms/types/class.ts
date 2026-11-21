// ---------------------------------------------------------------------------
// types/class.ts
// Zod schemas + inferred TypeScript types for Class Management module
// Generated for geeo-lms-fe (Next.js 16) — Classes Phase 1
// ---------------------------------------------------------------------------

import { z } from 'zod'

// ---------------------------------------------------------------------------
// ClassCourseGrid — API list response (from ClassCourseGrid view model)
// Matches GET /api/ClassCourses/GetClassList/{userId}/{finishedClasses}
// ---------------------------------------------------------------------------

export const ClassCourseGridSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  levelId: z.string(),
  levelName: z.string(),
  campusId: z.string(),
  campusName: z.string().nullable().optional(),
  schedule: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  teachers: z.string().nullable().optional(),
  numberOfStudents: z.number().int(),
  teachingProgress: z.number().int(),
  isFinished: z.boolean(),
  // Optional fields for legacy or other purposes
  routeId: z.string().nullable().optional(),
  subId: z.string().nullable().optional(),
  lesson: z.string().nullable().optional(),
  subject: z.string().nullable().optional(),
  content: z.string().nullable().optional(),
  tb: z.string().nullable().optional(),
  notification: z.string().nullable().optional(),
  scheduleObj: z.unknown().nullable().optional(),
})

export type ClassCourseGrid = z.infer<typeof ClassCourseGridSchema>

// ---------------------------------------------------------------------------
// ClassTeacherInfo — parsed from "<br/>" joined teacher string
// ---------------------------------------------------------------------------

export interface ClassTeacherInfo {
  name: string
  englishName: string | null
  /** First teacher in API response = primary (MT), rest = co-teacher (CT) */
  isPrimary: boolean
}

// ---------------------------------------------------------------------------
// ClassItem — FE-ready display type (transformed from API response)
// ---------------------------------------------------------------------------

export interface ClassItem {
  id: string
  levelName: string
  className: string
  description: string | null
  scheduleDays: string          // "Mon, Wed"
  startTime: string             // "17:30"
  endTime: string               // "19:00"
  startDate: string             // "01/15/2026"
  endDate: string               // "12/30/2026"
  teachers: ClassTeacherInfo[]  // parsed from joined string
  studentCount: number
  remainingDays: number         // parsed from teachingProccess string
}

// ---------------------------------------------------------------------------
// Transform: API ClassCourseGrid → FE ClassItem
// ---------------------------------------------------------------------------

/**
 * Parse API teacher string into structured array.
 * API format variations:
 *   - "englishName1 - FullName1, englishName2 - FullName2"
 *   - "FullName1, FullName2"
 *   - "FullName1"
 *   - Legacy: "FullName1,<br/>FullName2"
 * First teacher = primary (MT), rest = co-teacher (CT)
 */
function parseTeachers(teacherStr: string): ClassTeacherInfo[] {
  if (!teacherStr || teacherStr.trim() === '') return []

  // Normalize: replace <br/> with comma, then split on comma
  const normalized = teacherStr
    .replace(/<br\s*\/?>/gi, ', ')
    .split(/,\s*/)
    .map((n) => n.trim())
    .filter(Boolean)

  return normalized.map((nameStr, index) => {
    // Try to split "englishName - FullName" format
    // Handle cases like "Hiep Nguyen - Nguyen Van A" or just "Nguyen Van A"
    const dashIndex = nameStr.indexOf(' - ')
    if (dashIndex > 0) {
      const englishName = nameStr.substring(0, dashIndex).trim()
      const fullName = nameStr.substring(dashIndex + 3).trim()
      return {
        name: fullName || nameStr,
        englishName: englishName || null,
        isPrimary: index === 0,
      }
    }
    // No dash format — full string is the name
    return {
      name: nameStr,
      englishName: null,
      isPrimary: index === 0,
    }
  })
}

/**
 * Transform raw API ClassCourseGrid response into FE-ready ClassItem.
 * Handles edge cases: empty teacher string, non-numeric progress, null description.
 */
export function toClassItem(grid: ClassCourseGrid): ClassItem {
  return {
    id: grid.id,
    levelName: grid.levelName,
    className: grid.name,
    description: grid.description ?? null,
    scheduleDays: grid.schedule,
    startTime: grid.startTime,
    endTime: grid.endTime,
    startDate: grid.startDate,
    endDate: grid.endDate,
    teachers: parseTeachers(grid.teachers ?? ''),
    studentCount: grid.numberOfStudents,
    remainingDays: grid.teachingProgress,
  }
}

// ---------------------------------------------------------------------------
// Campus — for create/edit form dropdown
// Matches GET /api/Campus/GetCampusList/{userId}
// ---------------------------------------------------------------------------

export const CampusSchema = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
})

export type Campus = z.infer<typeof CampusSchema>

// ---------------------------------------------------------------------------
// ClassCourse Entity — full entity from GET /api/ClassCourses/{id}
// Used for edit mode (has levelId, campusId, schedule, classTeachers)
// ---------------------------------------------------------------------------

export const ClassCourseEntitySchema = z.object({
  id: z.string(),
  levelId: z.string(),
  campusId: z.string().nullable(),
  name: z.string().nullable(),
  description: z.string().nullable(),
  numberOfPupils: z.number().nullable().optional(),
  teachers: z.string().optional(),          // computed [NotMapped]
  teacherIds: z.array(z.string()).optional(), // computed [NotMapped] — ⚠️ returns names, not IDs (bug)
  level: z.object({
    id: z.string(),
    name: z.string(),
  }).nullable().optional(),
  schedule: z.object({
    id: z.string(),
    monday: z.boolean().nullable(),
    tuesday: z.boolean().nullable(),
    wednesday: z.boolean().nullable(),
    thursday: z.boolean().nullable(),
    friday: z.boolean().nullable(),
    saturday: z.boolean().nullable(),
    sunday: z.boolean().nullable(),
    startTime: z.string().nullable(),
    endTime: z.string().nullable(),
    startDate: z.string().nullable(),
    endDate: z.string().nullable(),
    classCourseId: z.string().nullable(),
  }).nullable().optional(),
  classTeachers: z.array(z.object({
    id: z.string(),
    classId: z.string(),
    teacherId: z.string(),
    isPrimary: z.boolean(),
    teacher: z.object({
      id: z.string(),
      fullName: z.string().optional(),
    }).nullable().optional(),
  })).optional(),
})

export type ClassCourseEntity = z.infer<typeof ClassCourseEntitySchema>

// ---------------------------------------------------------------------------
// Form Schemas (for react-hook-form + zodResolver)
// ---------------------------------------------------------------------------

export const CreateClassSchema = z.object({
  levelId: z.string().min(1, 'Level is required'),
  campusId: z.string().optional(),
  name: z.string().min(1, 'Class name is required'),
  description: z.string().optional(),
})

export type CreateClassInput = z.infer<typeof CreateClassSchema>

// ---------------------------------------------------------------------------
// ClassCourseInfo — Summary VO from GET /api/ClassCourses/GetClassInfo/{id}
// Contains student count, progress, notification — lighter than full entity
// ---------------------------------------------------------------------------

export const ClassCourseInfoSchema = z.object({
  id: z.string(),
  level: z.string(),
  class: z.string(),
  description: z.string().nullable(),
  schedule: z.union([z.string(), z.record(z.string(), z.unknown())]),
  startTimeLocal: z.string().optional().nullable(),
  endTimeLocal: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  numberOfStudents: z.number().int(),
  notification: z.string().nullable().optional(),
  teacher: z.string(),
  teachingProccess: z.string(),
  scheduleObj: z.unknown().nullable().optional(),
})

export type ClassCourseInfo = z.infer<typeof ClassCourseInfoSchema>

// ---------------------------------------------------------------------------
// ClassTeacherGrid — Teacher assignment from GET /api/ClassTeacher/{classId}
// Full teacher details with phone, email, role (isPrimary)
// ---------------------------------------------------------------------------

export const ClassTeacherGridSchema = z.object({
  id: z.string(),
  teacherId: z.string(),
  userName: z.string().nullable().optional(),
  phoneNumber: z.string().nullable().optional(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  fullName: z.string(),
  englishName: z.string().nullable().optional(),
  employeeCode: z.string().nullable().optional(),
  isPrimary: z.boolean(),
})

export type ClassTeacherGrid = z.infer<typeof ClassTeacherGridSchema>
