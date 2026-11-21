// ---------------------------------------------------------------------------
// types/exam-result.ts
// Types, constants, and utilities for the Exam Results module
// Data model: ExamResultForm template (per Level×ExamType) → ExamResult (per Student)
// Legacy: ExamResult.js + ExamResultUtils.js + ExamResultDialog.js
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Parsed from examResultJson / examFormJson (inner JSON structure)
// ---------------------------------------------------------------------------

/** A single overall (soft-skill) evaluation item */
export interface ExamOverallItem {
  /** English skill name — e.g. "Confidence" */
  name: string
  /** Vietnamese skill name — e.g. "Sự tự tin" */
  altName: string
  /** Evaluation score: "0"–"4" (string per legacy, 4=Good, 1=Need to improve) */
  evaluation: string
}

/** A single academic (hard-skill) scoring item */
export interface ExamAcademicItem {
  /** Subject name — e.g. "Speaking" */
  name: string
  /** Max score / weight — stored as string per legacy */
  weight: string
  /** Actual score — stored as string per legacy */
  score: string
}

/** The parsed JSON structure inside examResultJson / examFormJson */
export interface ExamFormJson {
  examName: string
  examType: number
  overall: ExamOverallItem[]
  academic: ExamAcademicItem[]
}

// ---------------------------------------------------------------------------
// API response types
// ---------------------------------------------------------------------------

/** Response from GET api/AcademicManage/GetExamResultForm/{classId}/{studentId}/{examType} */
export interface ExamResultResponse {
  id?: string
  classId: string
  studentId: string
  examType: number
  /** Stringified ExamFormJson — MUST JSON.parse() before use */
  examResultJson: string
  teacherComment: string
  createdDate?: string
}

/** Response from GET /api/v2/class/classes/{classId}/exams/templates */
export interface ExamTemplateResponse {
  id: string
  levelId: string
  examType: number
  examName: string
  /** Template JSON (stringified ExamFormJson) */
  examFormJson: string
}

/** Body for POST api/AcademicManage/CreateExamResult */
export interface SaveExamResultInput {
  classId: string
  studentId: string
  examType: number
  /** Stringified ExamFormJson — MUST JSON.stringify() before send */
  examResultJson: string
  teacherComment: string
  modifiedBy: string
}

// ---------------------------------------------------------------------------
// Print template props — contract between data layer and render layer
// ---------------------------------------------------------------------------

export interface PrintTemplateProps {
  // ── Student Info ──
  student: {
    name: string
    englishName: string
  }

  // ── Class Context ──
  className: string
  mainTeacher: string
  coTeacher?: string
  startDate: string

  // ── Exam Metadata ──
  examTitle: string

  // ── Overall Performance (dynamic array) ──
  overallScores: Array<{
    skillName: string
    skillNameVi: string
    value: number // 1-4 scale
  }>

  // ── Academic Performance (dynamic array) ──
  academicScores: Array<{
    subjectName: string
    score: number
    maxScore: number
  }>

  // ── Computed by parent ──
  totalPercent: number
  resultLabel: string

  // ── Teacher Comment ──
  comment: string

  // ── Scale Reference (for rendering) ──
  evaluationScales: EvaluationScale[]

  // ── Branding ──
  backgroundImageUrl?: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export interface EvaluationScale {
  readonly value: number
  readonly label: string
  readonly labelVi: string
}

export const EVALUATION_SCALES: readonly EvaluationScale[] = [
  { value: 4, label: 'Good', labelVi: 'Tốt' },
  { value: 3, label: 'Fairly Good', labelVi: 'Khá tốt' },
  { value: 2, label: 'Fair', labelVi: 'Khá' },
  { value: 1, label: 'Need to improve', labelVi: 'Cần cải thiện' },
] as const

/** Default exam form template — matches legacy `this.newTemplate` */
export const DEFAULT_EXAM_FORM: ExamFormJson = {
  examName: '',
  examType: 1,
  overall: [
    { name: 'Confidence', altName: 'Sự tự tin', evaluation: '0' },
    { name: 'Behavior', altName: 'Cách ứng xử', evaluation: '0' },
    { name: 'Concentration', altName: 'Sự tập trung', evaluation: '0' },
    { name: 'Progression', altName: 'Sự tiến bộ', evaluation: '0' },
    { name: 'Teamwork', altName: 'Làm việc nhóm', evaluation: '0' },
  ],
  academic: [
    { name: 'Speaking', weight: '10', score: '0' },
    { name: 'Listening', weight: '8', score: '0' },
    { name: 'Phonics', weight: '6', score: '0' },
    { name: 'Reading & Writing', weight: '20', score: '0' },
  ],
}

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

/**
 * Calculate exam result label from total percentage.
 * Ported from legacy ExamResultUtils.calcExamResult()
 */
export function calcExamResult(totalPercent: number): string {
  if (totalPercent >= 95) return 'EXCELLENT'
  if (totalPercent >= 80) return 'VERY GOOD'
  if (totalPercent >= 70) return 'GOOD'
  if (totalPercent >= 60) return 'FAIR'
  return 'AVERAGE'
}

/**
 * Safely parse examResultJson / examFormJson string.
 * Falls back to DEFAULT_EXAM_FORM on parse failure.
 */
export function parseExamFormJson(jsonString: string): ExamFormJson {
  try {
    const parsed = JSON.parse(jsonString) as ExamFormJson
    // Validate minimal structure
    if (parsed && Array.isArray(parsed.overall) && Array.isArray(parsed.academic)) {
      return parsed
    }
    return { ...DEFAULT_EXAM_FORM }
  } catch {
    return { ...DEFAULT_EXAM_FORM }
  }
}

/**
 * Calculate total percentage from academic scores.
 * Returns { total, maxTotal, percent }
 */
export function calculateAcademicTotal(
  academic: ExamAcademicItem[],
): { total: number; maxTotal: number; percent: number } {
  const total = academic.reduce((sum, item) => sum + (parseFloat(item.score) || 0), 0)
  const maxTotal = academic.reduce((sum, item) => sum + (parseFloat(item.weight) || 0), 0)
  const percent = maxTotal > 0 ? (total / maxTotal) * 100 : 0
  return { total, maxTotal, percent }
}
