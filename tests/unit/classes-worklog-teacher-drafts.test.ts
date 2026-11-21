import { describe, expect, it } from 'vitest'
import { withMissingTeacherDrafts } from '@/features/lms/classes/worklog-teacher-drafts'

interface Row {
  id: string | null
  teacherId: string
  subsForTeacherId: string
  isExpat: boolean
  effortType: string
}
const createDraft = (teacherId: string): Row => ({ id: null, teacherId, subsForTeacherId: '', isExpat: false, effortType: '' })
const saved: Row = { ...createDraft('teacher-1'), id: 'saved-1', effortType: 'main_teacher' }

describe('teacher worklog draft rows', () => {
  it('keeps an editor row for a teacher without shifts after another teacher saves', () => {
    const rows = withMissingTeacherDrafts([saved], ['teacher-1', 'teacher-2'], createDraft)
    expect(rows).toEqual([saved, createDraft('teacher-2')])
    expect(rows[0]).toBe(saved)
  })

  it('creates defaults for an empty response and deduplicates class teachers', () => {
    expect(withMissingTeacherDrafts([], ['teacher-1', 'teacher-1', 'teacher-2'], createDraft)).toEqual([
      createDraft('teacher-1'), createDraft('teacher-2'),
    ])
    expect(withMissingTeacherDrafts([], [], createDraft)).toEqual([])
  })

  it('preserves saved substitutes and expats without treating them as main teacher rows', () => {
    const substitute = { ...saved, id: 'substitute', teacherId: 'teacher-2', subsForTeacherId: 'teacher-1' }
    const expat = { ...saved, id: 'expat', teacherId: 'teacher-3', isExpat: true }
    expect(withMissingTeacherDrafts([saved, substitute, expat], ['teacher-1', 'teacher-2', 'teacher-3'], createDraft)).toEqual([
      saved, substitute, expat, createDraft('teacher-2'), createDraft('teacher-3'),
    ])
  })

  it('does not duplicate already represented teacher rows or discard saved teachers absent from the roster', () => {
    expect(withMissingTeacherDrafts([saved], ['teacher-1'], createDraft)).toEqual([saved])
    expect(withMissingTeacherDrafts([saved], [], createDraft)).toEqual([saved])
  })
})
