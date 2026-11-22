import type { DraftStudent } from '@/features/lms/stores/use-report-draft-store'

type AttendanceField = 'present' | 'starScore' | 'note'
export type AttendanceDraft = DraftStudent & {
  editedFields?: Partial<Record<AttendanceField, true>>
  editedCriteria?: number[]
}

export function editAttendanceField<K extends AttendanceField>(row: AttendanceDraft, field: K, value: AttendanceDraft[K]): AttendanceDraft {
  if (row[field] === value) return row
  return { ...row, [field]: value, editedFields: { ...row.editedFields, [field]: true } }
}

export function editAttendanceCriterion(row: AttendanceDraft, number: number, value: number): AttendanceDraft {
  if ((row.criteria[number] ?? 0) === value) return row
  return {
    ...row,
    criteria: { ...row.criteria, [number]: value },
    editedCriteria: [...new Set([...(row.editedCriteria ?? []), number])],
  }
}

export function restoreAttendanceDrafts(freshRows: DraftStudent[], drafts: AttendanceDraft[]): AttendanceDraft[] {
  const byId = new Map(drafts.map(row => [row.id, row]))
  return freshRows.map(fresh => {
    const draft = byId.get(fresh.id)
    if (!draft) return fresh
    const merged: AttendanceDraft = {
      ...fresh,
      criteria: { ...fresh.criteria },
      editedFields: draft.editedFields,
      editedCriteria: draft.editedCriteria,
    }
    if (draft.editedFields?.present) merged.present = draft.present
    if (draft.editedFields?.starScore) merged.starScore = draft.starScore
    if (draft.editedFields?.note) merged.note = draft.note
    for (const number of draft.editedCriteria ?? []) {
      merged.criteria[number] = draft.criteria[number] ?? 0
    }
    return merged
  })
}
