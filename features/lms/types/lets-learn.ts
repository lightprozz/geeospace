// ---------------------------------------------------------------------------
// types/lets-learn.ts
// Type definitions for the Let's Learn lesson presentation feature
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// API response shapes
// ---------------------------------------------------------------------------

/** Material file attached to a lesson unit */
export interface LessonUnitMaterial {
  id: string
  url: string | null
  fileName: string | null
}

/**
 * Single unit (step) within a lesson.
 * Returned by both GetMyLesson and GetLessonPlanContent endpoints.
 */
export interface LessonUnit {
  id: string
  classLessonId: string
  unitId: string
  /** Estimated time in minutes (string from API) */
  time: string
  procedures: string
  description: string
  /** Text description of materials used (e.g. "Flashcards") */
  materials: string
  teacherActivities: string
  learningOutcome: string
  note: string
  /** Attached file — can be null when unit has no digital resource */
  material: LessonUnitMaterial | null
}

// ---------------------------------------------------------------------------
// Derived types
// ---------------------------------------------------------------------------

/** Content type resolved from material URL extension */
export type UnitContentType = 'pdf' | 'video' | 'image' | 'url' | 'unknown'

/** Source origin determining which API endpoint to call */
export type LetsLearnSource = 'classLesson' | 'lessonPlan'

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

const PDF_EXTENSIONS = ['.pdf']
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.avi', '.mkv']
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp']

/**
 * Resolve the content type of a lesson unit based on its material URL extension.
 * Falls back to 'url' if the URL starts with http(s) but has no recognized extension.
 * Returns 'unknown' when material or URL is null.
 */
export function resolveContentType(unit: LessonUnit): UnitContentType {
  const url = unit.material?.url
  if (!url) return 'unknown'

  // Normalize: strip query params and hash, then lowercase
  const cleanUrl = url.split('?')[0].split('#')[0].toLowerCase()

  if (PDF_EXTENSIONS.some((ext) => cleanUrl.endsWith(ext))) return 'pdf'
  if (VIDEO_EXTENSIONS.some((ext) => cleanUrl.endsWith(ext))) return 'video'
  if (IMAGE_EXTENSIONS.some((ext) => cleanUrl.endsWith(ext))) return 'image'

  // If it's a valid URL but no recognized extension → generic URL viewer
  if (url.startsWith('http://') || url.startsWith('https://')) return 'url'

  return 'unknown'
}

// ---------------------------------------------------------------------------
// V2 Lesson Delivery types
// ---------------------------------------------------------------------------

/** Lesson plan content for a class lesson (V2 endpoint) */
export interface LessonPlanContent {
  classLessonId: string
  className: string | null
  levelName: string | null
  lessonName: string | null
  subject: string | null
  content: string | null
  tb: string | null
  startTime: string | null
  endTime: string | null
}

/** Student attendance log entry (V2 endpoint) */
export interface StudentLog {
  id: string
  logId: string
  studentInfoId: string
  studentName: string
  englishName: string | null
  present: number
  starScore: number
  note: string | null
  sortOrder: number
}

/** Assessment criteria definition (V2 endpoint) */
export interface AssessmentCriteria {
  id: string
  criteriaNumber: number
  name: string | null
}

/** Student assessment score (V2 endpoint) */
export interface StudentAssessment {
  classLessonId: string
  studentId: string
  criteriaId: string
  criteriaNumber: number
  score: number
}
