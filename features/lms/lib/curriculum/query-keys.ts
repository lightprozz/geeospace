// ---------------------------------------------------------------------------
// lib/curriculum/query-keys.ts
// Centralized TanStack Query key factories for Curriculum module
// Prevents cache key drift across hooks
// ---------------------------------------------------------------------------

export const studyLevelKeys = {
  all: ['study-levels'] as const,
  detail: (id: string) => ['study-levels', id] as const,
  exam: (levelId: string) => ['study-levels', levelId, 'exam'] as const,
}

export const lessonPlanKeys = {
  all: ['lesson-plans'] as const,
  byLevel: (levelId: string) => ['lesson-plans', 'by-level', levelId] as const,
  detail: (id: string) => ['lesson-plans', id] as const,
  content: (lessonId: string) => ['lesson-plans', lessonId, 'content'] as const,
  deleted: (lessonId: string) => ['lesson-plans', lessonId, 'deleted'] as const,
  related: (lessonId: string) => ['lesson-plans', lessonId, 'related'] as const,
}

export const unitPlanKeys = {
  all: ['unit-plans'] as const,
  byLesson: (lessonId: string) => ['unit-plans', 'by-lesson', lessonId] as const,
}

export const examFrameKeys = {
  byLevel: (levelId: string) => ['exam-frames', levelId] as const,
}
