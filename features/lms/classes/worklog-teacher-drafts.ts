import { ShiftTypeConstant } from '@/features/lms/types/worklog'

interface TeacherDraft {
  teacherId: string
  subsForTeacherId: string
  isExpat: boolean
}

interface ShiftDraft extends TeacherDraft {
  id: string | null
  effortType: string
  score: number
}

export function selectTeacherShift<T extends ShiftDraft>(rows: T[], teacherId: string, effortType: string, score: number): T[] {
  const remaining = effortType !== ShiftTypeConstant.Off
    ? rows.filter(row => row.subsForTeacherId !== teacherId)
    : rows
  const isAlone = effortType === ShiftTypeConstant.Alone || effortType === ShiftTypeConstant.AloneExpat
  return remaining.map(row => {
    if (row.subsForTeacherId || row.isExpat) return row
    if (row.teacherId === teacherId) return { ...row, effortType, score }
    if (isAlone && (row.id || row.effortType)) return { ...row, effortType: ShiftTypeConstant.Off }
    return row
  })
}

export function withMissingTeacherDrafts<T extends TeacherDraft>(
  saved: T[],
  teacherIds: string[],
  createDraft: (teacherId: string) => T,
): T[] {
  const represented = new Set(saved.filter(row => !row.subsForTeacherId && !row.isExpat).map(row => row.teacherId))
  const missing = [...new Set(teacherIds)].filter(id => !represented.has(id))
  return [...saved, ...missing.map(createDraft)]
}
