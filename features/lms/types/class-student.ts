// ---------------------------------------------------------------------------
// types/class-student.ts
// Zod schemas + inferred types for ClassStudent module (per-class student roster)
// Matches: GET /api/ClassStudents/GetStudentByClass/{classId} response (StudentGrid VO)
// ---------------------------------------------------------------------------

import { z } from 'zod'

// ---------------------------------------------------------------------------
// ClassStudentGrid — student row in a class roster
// Same shape as backend StudentGrid VO (GeeO.Data/GridVo/StudentParentGrid.cs)
// ---------------------------------------------------------------------------

export const ClassStudentGridSchema = z.object({
  id: z.string(),                             // ClassStudent.Id (PK)
  studentId: z.string(),                       // Student.Id (FK) — used for /students/[id] navigation
  sortOrder: z.number().int(),
  studentName: z.string().nullable(),
  englishName: z.string().nullable(),
  birthday: z.string().nullable(),            // ISO date
  birthdayFormat: z.string().nullable(),      // Pre-formatted "DD/MM/YYYY"
  traits: z.string().nullable(),
  fatherName: z.string().nullable(),
  fatherPhone: z.string().nullable(),
  motherName: z.string().nullable(),
  motherPhone: z.string().nullable(),
  elAccount: z.string().nullable(),           // External learning platform account
  studentType: z.number().int(),              // ClassType enum: 0=Unknown, 1=Regular, 2=CatchUp, 3=Demo, 4=Suspended, 5=Terminated
  classType: z.string().nullable(),           // Description string
  studentTypeText: z.string().nullable(),     // Computed display text
  startTimeFormat: z.string().nullable(),
  endTimeFormat: z.string().nullable(),
  present: z.boolean(),
  suspendDate: z.string().nullable(),
  terminateDate: z.string().nullable(),
})

export type ClassStudentGrid = z.infer<typeof ClassStudentGridSchema>

// ---------------------------------------------------------------------------
// StudentSessionStats — per-student session data within a class
// Matches: GET /api/StudentReport/GetStudentPaymentStatistics/{classId}
// ---------------------------------------------------------------------------

export interface StudentSessionStats {
  studentId: string
  studentName: string | null
  englishName: string | null
  totalPayment: number
  numberOfSessions: number
  studiedSessions: number
  remainSessions: number
}
