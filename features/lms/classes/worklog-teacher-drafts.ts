interface TeacherDraft {
  teacherId: string
  subsForTeacherId: string
  isExpat: boolean
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
