import type { LessonUnit } from '@/features/lms/types/lets-learn'

export function lessonUnitKey(unit: LessonUnit, index: number): string {
  return JSON.stringify([index, unit.id, unit.material?.url])
}
