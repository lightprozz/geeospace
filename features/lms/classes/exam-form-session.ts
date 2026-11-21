import type { ExamFormJson } from '@/features/lms/types/exam-result'

interface ExamFormSource {
  scores: ExamFormJson | null
  comment: string
}

export function resolveExamFormSession(
  key: string | null,
  template: ExamFormJson | null,
  draft: ExamFormSource | null,
  saved: ExamFormSource,
) {
  return {
    key,
    scores: draft?.scores ?? saved.scores ?? template,
    comment: draft?.comment ?? saved.comment,
    restored: draft !== null,
  }
}
