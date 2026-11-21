// ---------------------------------------------------------------------------
// types/class-lesson.ts
// Zod schemas + inferred TypeScript types for ClassLesson module
// API source: GET /api/ClassLesson/{classId} — ClassLessonGrid[]
// ---------------------------------------------------------------------------

import { z } from 'zod'

// ---------------------------------------------------------------------------
// ClassLessonGrid — lesson list row from GET /api/ClassLesson/{classId}
// Ordered by LessonPlan.CreatedDate
// ---------------------------------------------------------------------------

export const ClassLessonGridSchema = z.object({
  id: z.string(),                              // ClassLesson.Id (PK)
  lessonId: z.string(),                        // LessonPlan.Id (FK)
  level: z.string(),                           // StudyLevel.Name
  lesson: z.string(),                          // LessonPlan.Lesson (e.g. "Unit 1 - Hello World")
  subject: z.string(),                         // LessonPlan.Subject
  content: z.string(),                         // LessonPlan.Content
  tb: z.string().nullable(),                   // LessonPlan.Tb (textbook reference)
})

export type ClassLessonGrid = z.infer<typeof ClassLessonGridSchema>

// ---------------------------------------------------------------------------
// ClassLessonDetail — single lesson from GET /api/ClassLesson/GetClassLessonById/{id}
// Full entity with start/end time + nested classCourse + lesson.level
// ---------------------------------------------------------------------------

export const ClassLessonDetailSchema = z.object({
  id: z.string(),
  classId: z.string(),
  lessonId: z.string(),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  classCourse: z.object({
    id: z.string(),
    name: z.string().nullable(),
  }).nullable().optional(),
  lesson: z.object({
    id: z.string(),
    lesson: z.string().nullable(),
    subject: z.string().nullable(),
    content: z.string().nullable(),
    tb: z.string().nullable(),
    level: z.object({
      id: z.string(),
      name: z.string(),
    }).nullable().optional(),
    worksheetFileName: z.string().nullable().optional(),
  }).nullable().optional(),
})

export type ClassLessonDetail = z.infer<typeof ClassLessonDetailSchema>
